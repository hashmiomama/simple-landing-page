alter type public.activity_status rename value 'recruiting' to 'gathering_interest';

alter table public.activities
  add column coordinator_id uuid references public.profiles(id) on delete restrict,
  add column min_participants integer not null default 2,
  add column estimated_budget numeric not null default 0 check (estimated_budget >= 0),
  add column social_level text not null default 'small_group' check (social_level in ('quiet','small_group','social')),
  add column participation text not null default 'open' check (participation in ('open','women_only')),
  add column experience_level text not null default 'any' check (experience_level in ('beginner','intermediate','any')),
  add column proposed_dates timestamptz[] not null default '{}',
  add column cover_url text,
  add column venue_address text,
  add column public_venue_confirmed boolean not null default false,
  add column cancellation_reason text;

-- Preserve legacy assignments. New and changed rows must satisfy the new limits.
update public.activities set coordinator_id = created_by;
alter table public.activities
  alter column coordinator_id set not null,
  alter column capacity set default 6,
  add constraint activity_group_size check (
    min_participants >= 1 and capacity is not null and capacity between min_participants and 12
  ) not valid,
  add constraint activity_final_arrangements check (
    status not in ('confirmed','completed') or (
      starts_at is not null and nullif(btrim(location), '') is not null and
      (format = 'online' or (public_venue_confirmed and nullif(btrim(venue_address), '') is not null))
    )
  ) not valid;
create index activities_coordinator_idx on public.activities(coordinator_id);

alter table public.activity_participants
  add column request_message text,
  add column id uuid not null default gen_random_uuid();

-- Realtime needs a readable primary key. Keep the user UUID and request text
-- private while keeping the original composite uniqueness and foreign keys.
alter table public.activity_messages drop constraint activity_messages_activity_id_user_id_fkey;
alter table public.polls drop constraint polls_activity_id_created_by_fkey;
alter table public.poll_votes drop constraint poll_votes_activity_id_user_id_fkey;
alter table public.activity_feedback drop constraint activity_feedback_activity_id_user_id_fkey;
alter table public.activity_participants
  drop constraint activity_participants_pkey,
  add primary key (id),
  add unique (activity_id, user_id);
alter table public.activity_messages add foreign key (activity_id, user_id)
  references public.activity_participants(activity_id, user_id) on delete cascade;
alter table public.polls add foreign key (activity_id, created_by)
  references public.activity_participants(activity_id, user_id) on delete cascade;
alter table public.poll_votes add foreign key (activity_id, user_id)
  references public.activity_participants(activity_id, user_id) on delete cascade;
alter table public.activity_feedback add foreign key (activity_id, user_id)
  references public.activity_participants(activity_id, user_id) on delete cascade;

insert into public.activity_participants(activity_id, user_id, status)
select id, coordinator_id, 'accepted' from public.activities
on conflict (activity_id, user_id) do update set status = 'accepted';

alter table public.activity_messages
  add column deleted_at timestamptz,
  add constraint activity_message_max_length check (length(body) <= 2000) not valid;
alter table public.polls add column kind text not null default 'other'
  check (kind in ('date_time','venue','other'));
alter table public.activity_feedback
  add column report_issue boolean not null default false,
  add column share_author boolean not null default false;

revoke all on public.activities, public.activity_participants, public.activity_messages,
  public.polls, public.poll_options, public.poll_votes, public.activity_feedback
from public, anon, authenticated;
grant select (id, activity_id, status, updated_at) on public.activity_participants to authenticated;
grant select on public.activity_messages, public.polls, public.poll_options, public.poll_votes to authenticated;

drop policy admin_access on public.activity_participants;
drop policy admin_access on public.activity_messages;
drop policy admin_access on public.polls;
drop policy admin_access on public.poll_options;
drop policy admin_access on public.poll_votes;

create function public.can_read_activity_room(p_activity_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.activity_participants
    where activity_id = p_activity_id and user_id = auth.uid() and status = 'accepted'
  );
$$;

create function public.activity_message_visible(p_activity_id uuid, p_author uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_read_activity_room(p_activity_id) and not exists (
    select 1 from public.blocked_users where blocker_id = auth.uid() and blocked_id = p_author
  );
$$;

create function public.is_activity_coordinator(p_activity_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.activities where id = p_activity_id and coordinator_id = auth.uid());
$$;

create policy activity_membership_read on public.activity_participants for select to authenticated
using (user_id = (select auth.uid()) or
  (status = 'accepted' and public.can_read_activity_room(activity_id)) or
  (status = 'pending' and public.is_activity_coordinator(activity_id)));
create policy activity_message_read on public.activity_messages for select to authenticated
using (public.activity_message_visible(activity_id, user_id));
create policy activity_poll_read on public.polls for select to authenticated
using (public.can_read_activity_room(activity_id));
create policy activity_poll_option_read on public.poll_options for select to authenticated
using (exists (select 1 from public.polls where id = poll_options.poll_id));
create policy activity_vote_read on public.poll_votes for select to authenticated
using (public.can_read_activity_room(activity_id));

create policy blocked_users_owner_read on public.blocked_users for select to authenticated
using (blocker_id = (select auth.uid()));
create policy blocked_users_owner_add on public.blocked_users for insert to authenticated
with check (blocker_id = (select auth.uid()));
create policy blocked_users_owner_remove on public.blocked_users for delete to authenticated
using (blocker_id = (select auth.uid()));
revoke update on public.blocked_users from authenticated;

create function public.activity_women_only_eligible(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profile_private
    where user_id = p_user_id and lower(btrim(gender::text)) = 'female');
$$;

create function public.activity_has_block(p_first uuid, p_second uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.blocked_users
    where (blocker_id = p_first and blocked_id = p_second)
       or (blocker_id = p_second and blocked_id = p_first));
$$;

create function public.lock_activity(p_id uuid, p_access text)
returns public.activities language plpgsql security definer set search_path = '' as $$
declare item public.activities;
begin
  select * into item from public.activities where id = p_id for update;
  if auth.uid() is null or item.id is null
    or (p_access = 'coordinator' and item.coordinator_id <> auth.uid())
    or (p_access = 'room' and not public.can_read_activity_room(p_id)) then
    raise exception 'Activity is unavailable' using errcode = '42501';
  end if;
  return item;
end;
$$;

create function public.notify_activity_members(
  p_id uuid, p_title text, p_body text, p_include_pending boolean default false
) returns void language sql security definer set search_path = '' as $$
  select public.create_notification(member.user_id, 'activity_update', p_title,
    case when member.status = 'accepted' then p_body end, '/community/' || p_id)
  from public.activity_participants as member
  where member.activity_id = p_id and member.user_id <> auth.uid()
    and (member.status = 'accepted' or (p_include_pending and member.status = 'pending'));
$$;

create function public.create_activity(
  p_title text, p_interest_slug text, p_description text, p_city text,
  p_min_participants integer, p_max_participants integer, p_estimated_budget numeric,
  p_social_level text, p_participation text, p_experience_level text,
  p_proposed_dates timestamptz[], p_suggested_venue text default null,
  p_cover_url text default null, p_format public.event_format default 'physical'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  new_id uuid;
begin
  if caller is null or (p_participation = 'women_only' and not public.activity_women_only_eligible(caller)) then
    raise exception 'You are not eligible to create this activity' using errcode = '42501';
  end if;
  if coalesce(length(btrim(p_title)),0) not between 1 and 160
     or coalesce(length(btrim(p_description)),0) not between 1 and 5000
     or coalesce(length(btrim(p_city)),0) not between 1 and 120
     or coalesce(cardinality(p_proposed_dates),0) not between 1 and 12
     or exists (select 1 from unnest(p_proposed_dates) as proposed(at) where at is null or at <= now())
     or (p_cover_url is not null and p_cover_url !~* '^https?://[^[:space:]/]+[^[:space:]]*$') then
    raise exception 'Check the activity details and proposed dates' using errcode = '22023';
  end if;

  insert into public.activities (
    created_by, coordinator_id, title, interest_slug, description, city, min_participants, capacity,
    estimated_budget, social_level, participation, experience_level, proposed_dates, location, cover_url, format
  ) values (
    caller, caller, btrim(p_title), p_interest_slug, btrim(p_description), btrim(p_city),
    p_min_participants, p_max_participants, p_estimated_budget, p_social_level, p_participation,
    p_experience_level, p_proposed_dates, nullif(btrim(p_suggested_venue),''), p_cover_url, p_format
  ) returning id into new_id;
  insert into public.activity_participants(activity_id, user_id, status) values (new_id, caller, 'accepted');
  return new_id;
end;
$$;

create function public.request_to_join(p_activity_id uuid, p_message text default null)
returns public.participant_status language plpgsql security definer set search_path = '' as $$
declare
  item public.activities := public.lock_activity(p_activity_id, 'signed_in');
  caller uuid := auth.uid();
begin
  if item.status in ('completed','cancelled') or caller in (item.created_by, item.coordinator_id)
     or public.activity_has_block(caller,item.created_by) or public.activity_has_block(caller,item.coordinator_id)
     or (item.participation = 'women_only' and not public.activity_women_only_eligible(caller)) then
    raise exception 'You are not eligible to join this activity' using errcode = '42501';
  end if;
  if length(btrim(p_message)) > 1000 then
    raise exception 'Keep the request message to 1000 characters' using errcode = '22023';
  end if;
  if (select count(*) from public.activity_participants where activity_id = item.id and status = 'accepted') >= item.capacity then
    raise exception 'This activity is full' using errcode = '23514';
  end if;

  insert into public.activity_participants(activity_id, user_id, request_message)
  values (item.id, caller, nullif(btrim(p_message),''))
  on conflict (activity_id,user_id) do update
    set status = 'pending', request_message = excluded.request_message
    where activity_participants.status = 'withdrawn';
  if not found then
    raise exception 'You already have a request or membership' using errcode = '23505';
  end if;
  update public.activities set status = 'gathering_interest' where id = item.id and status = 'proposed';
  perform public.create_notification(item.coordinator_id, 'activity_update', 'New join request', item.title, '/community/' || item.id);
  return 'pending';
end;
$$;

create function public.respond_to_join_request(p_activity_id uuid, p_user_id uuid, p_decision text)
returns public.participant_status language plpgsql security definer set search_path = '' as $$
declare
  item public.activities := public.lock_activity(p_activity_id, 'coordinator');
  decision public.participant_status;
begin
  if p_decision is null or p_decision not in ('accept','decline') or item.status in ('completed','cancelled') then
    raise exception 'Invalid join decision' using errcode = '22023';
  end if;
  if p_decision = 'accept' then
    if public.activity_has_block(p_user_id,item.created_by) or public.activity_has_block(p_user_id,item.coordinator_id)
       or (item.participation = 'women_only' and not public.activity_women_only_eligible(p_user_id)) then
      raise exception 'This request cannot be accepted' using errcode = '42501';
    end if;
    if (select count(*) from public.activity_participants where activity_id = item.id and status = 'accepted') >= item.capacity then
      raise exception 'This activity is full' using errcode = '23514';
    end if;
    decision := 'accepted';
  else
    decision := 'declined';
  end if;
  update public.activity_participants set status = decision
  where activity_id = item.id and user_id = p_user_id and status = 'pending';
  if not found then raise exception 'Pending request not found' using errcode = 'P0002'; end if;
  if decision = 'accepted' then
    update public.activities set status = 'planning' where id = item.id and status in ('proposed','gathering_interest');
  end if;
  perform public.create_notification(p_user_id,'activity_update','Join request ' || decision,item.title,'/community/' || item.id);
  return decision;
end;
$$;

create function public.leave_activity(p_activity_id uuid)
returns public.participant_status language plpgsql security definer set search_path = '' as $$
declare item public.activities := public.lock_activity(p_activity_id, 'signed_in');
begin
  if item.coordinator_id = auth.uid() or item.status in ('completed','cancelled') then
    raise exception 'This membership cannot be withdrawn' using errcode = '42501';
  end if;
  update public.activity_participants set status = 'withdrawn'
  where activity_id = item.id and user_id = auth.uid() and status in ('pending','accepted');
  if not found then raise exception 'Active membership not found' using errcode = 'P0002'; end if;
  return 'withdrawn';
end;
$$;

create function public.transfer_activity_coordinator(p_activity_id uuid, p_username text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  item public.activities := public.lock_activity(p_activity_id, 'coordinator');
  next_coordinator uuid;
begin
  select member.user_id into next_coordinator
  from public.activity_participants as member
  join public.profiles as profile on profile.id = member.user_id
  where member.activity_id = item.id and member.status = 'accepted' and profile.username = p_username;
  if item.status in ('completed','cancelled') or next_coordinator is null or next_coordinator = auth.uid() then
    raise exception 'Choose another accepted participant for an active activity' using errcode = '22023';
  end if;
  update public.activities set coordinator_id = next_coordinator where id = item.id;
  perform public.notify_activity_members(item.id, 'Activity coordinator changed', item.title);
end;
$$;

create function public.confirm_activity(
  p_activity_id uuid, p_starts_at timestamptz, p_venue text, p_venue_address text, p_public_venue boolean
) returns public.activity_status language plpgsql security definer set search_path = '' as $$
declare item public.activities := public.lock_activity(p_activity_id, 'coordinator');
begin
  if (item.status not in ('planning','confirmed')
       and not (item.status in ('proposed','gathering_interest') and item.min_participants = 1))
     or (item.status = 'confirmed' and item.starts_at <= now())
     or p_starts_at is null or p_starts_at <= now() or nullif(btrim(p_venue),'') is null
     or (item.format <> 'online' and (p_public_venue is distinct from true or nullif(btrim(p_venue_address),'') is null))
     or (select count(*) from public.activity_participants where activity_id = item.id and status = 'accepted') < item.min_participants then
    raise exception 'Confirm a future time and suitable venue once enough participants are accepted' using errcode = '23514';
  end if;
  update public.activities set status = 'confirmed', starts_at = p_starts_at, ends_at = null, location = btrim(p_venue),
    venue_address = nullif(btrim(p_venue_address),''), public_venue_confirmed = coalesce(p_public_venue,false)
  where id = item.id;
  perform public.notify_activity_members(item.id,
    case when item.status = 'confirmed' then 'Activity arrangements changed' else 'Activity confirmed' end,
    format('%s · %s · %s (PKT)', item.title, btrim(p_venue),
      to_char(p_starts_at at time zone 'Asia/Karachi','DD Mon YYYY HH24:MI')));
  return 'confirmed';
end;
$$;

create function public.finish_activity_cancellation(p_id uuid, p_reason text)
returns public.activity_status language plpgsql security definer set search_path = '' as $$
begin
  if nullif(btrim(p_reason),'') is null or length(btrim(p_reason)) > 1000 then
    raise exception 'Provide a cancellation reason up to 1000 characters' using errcode = '22023';
  end if;
  update public.activities set status = 'cancelled', cancellation_reason = btrim(p_reason)
  where id = p_id and status not in ('completed','cancelled');
  if not found then raise exception 'Activity cannot be cancelled' using errcode = '23514'; end if;
  perform public.notify_activity_members(p_id,'Activity cancelled',btrim(p_reason),true);
  return 'cancelled';
end;
$$;

create function public.cancel_activity(p_activity_id uuid, p_reason text)
returns public.activity_status language plpgsql security definer set search_path = '' as $$
begin
  perform public.lock_activity(p_activity_id,'coordinator');
  return public.finish_activity_cancellation(p_activity_id,p_reason);
end;
$$;

create function public.complete_activity(p_activity_id uuid)
returns public.activity_status language plpgsql security definer set search_path = '' as $$
begin
  perform public.lock_activity(p_activity_id,'coordinator');
  update public.activities set status = 'completed'
  where id = p_activity_id and status = 'confirmed' and starts_at <= now();
  if not found then raise exception 'Only a confirmed activity that has started can be completed' using errcode = '23514'; end if;
  perform public.notify_activity_members(p_activity_id,'Activity completed','Share feedback about your activity.');
  return 'completed';
end;
$$;

create function public.list_activity_participants(p_activity_id uuid)
returns table (username text, is_coordinator boolean)
language sql stable security definer set search_path = '' as $$
  select profile.username, member.user_id = activity.coordinator_id
  from public.activity_participants as member
  join public.activities as activity on activity.id = member.activity_id
  join public.profiles as profile on profile.id = member.user_id
  where member.activity_id = p_activity_id and member.status = 'accepted'
    and public.can_read_activity_room(p_activity_id)
  order by (member.user_id = activity.coordinator_id) desc, profile.username;
$$;

create function public.list_activity_join_requests(p_activity_id uuid)
returns table (user_id uuid, username text, request_message text, requested_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select member.user_id, profile.username, member.request_message, member.updated_at
  from public.activity_participants as member
  join public.activities as activity on activity.id = member.activity_id
  join public.profiles as profile on profile.id = member.user_id
  where member.activity_id = p_activity_id and member.status = 'pending' and activity.coordinator_id = auth.uid()
  order by member.updated_at, profile.username;
$$;

create function public.post_activity_message(p_activity_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  item public.activities := public.lock_activity(p_activity_id,'room');
  caller uuid := auth.uid();
  new_id uuid;
  path text := '/community/' || item.id;
begin
  if item.status in ('cancelled','completed') or coalesce(length(btrim(p_body)),0) not between 1 and 2000 then
    raise exception 'Use an active room and a message between 1 and 2000 characters' using errcode = '22023';
  end if;
  insert into public.activity_messages(activity_id,user_id,body)
  values (item.id,caller,btrim(p_body)) returning id into new_id;

  perform public.create_notification(member.user_id,'group_message','New activity discussion message',item.title,path)
  from public.activity_participants as member
  where member.activity_id = item.id and member.user_id <> caller and member.status = 'accepted'
    and not public.activity_has_block(member.user_id,caller)
    and not exists (select 1 from public.notifications as notice
      where notice.user_id = member.user_id and notice.kind = 'group_message'
        and notice.link_path = path and notice.read_at is null);
  return new_id;
end;
$$;

create function public.delete_activity_message(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- Redact in place so Realtime sends an RLS-checked UPDATE and reports
  -- referencing the message retain their link.
  update public.activity_messages
  set body = '[Message deleted]', deleted_at = now()
  where id = p_id and user_id = auth.uid() and deleted_at is null;
  if not found then
    raise exception 'Message is unavailable' using errcode = '42501';
  end if;
end;
$$;

create function public.create_poll(
  p_activity_id uuid, p_question text, p_kind text, p_options text[], p_closes_at timestamptz default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  item public.activities := public.lock_activity(p_activity_id,'room');
  new_id uuid;
begin
  if item.status in ('completed','cancelled') or coalesce(length(btrim(p_question)),0) not between 1 and 300
     or p_kind is null or p_kind not in ('date_time','venue','other')
     or coalesce(cardinality(p_options),0) not between 2 and 10
     or exists (select 1 from unnest(p_options) as options(label)
       where coalesce(length(btrim(label)),0) not between 1 and 160)
     or (select count(distinct lower(btrim(label))) from unnest(p_options) as options(label)) <> cardinality(p_options)
     or p_closes_at <= now() then
    raise exception 'Use an active activity, a question and 2 to 10 distinct options' using errcode = '22023';
  end if;
  insert into public.polls(activity_id,created_by,question,kind,closes_at)
  values (item.id,auth.uid(),btrim(p_question),p_kind,p_closes_at) returning id into new_id;
  insert into public.poll_options(poll_id,label)
  select new_id,btrim(label) from unnest(p_options) as options(label);
  perform public.notify_activity_members(item.id,'New planning poll',btrim(p_question));
  return new_id;
end;
$$;

create function public.cast_vote(p_poll_id uuid, p_option_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  item public.activities;
  poll public.polls;
begin
  item := public.lock_activity((select activity_id from public.polls where id = p_poll_id),'room');
  select * into poll from public.polls where id = p_poll_id;
  if item.status in ('completed','cancelled') or poll.closes_at <= clock_timestamp() then
    raise exception 'This poll is closed' using errcode = '23514';
  end if;
  if not exists (select 1 from public.poll_options where poll_id = p_poll_id and id = p_option_id) then
    raise exception 'Choose an option from this poll' using errcode = '22023';
  end if;
  insert into public.poll_votes(poll_id,activity_id,option_id,user_id)
  values (p_poll_id,item.id,p_option_id,auth.uid())
  on conflict (poll_id,user_id) do update set option_id = excluded.option_id;
  return p_option_id;
end;
$$;

create function public.close_poll(p_poll_id uuid)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare closed timestamptz;
begin
  perform public.lock_activity((select activity_id from public.polls where id = p_poll_id),'coordinator');
  update public.polls set closes_at = least(closes_at, now()) where id = p_poll_id returning closes_at into closed;
  return closed;
end;
$$;

create function public.get_poll_results(p_poll_id uuid)
returns table (option_id uuid, label text, vote_count bigint, caller_voted boolean)
language sql stable security definer set search_path = '' as $$
  select opt.id,opt.label,count(vote.user_id),coalesce(bool_or(vote.user_id = auth.uid()),false)
  from public.polls as poll
  join public.poll_options as opt on opt.poll_id = poll.id
  left join public.poll_votes as vote on vote.poll_id = poll.id and vote.option_id = opt.id
  where poll.id = p_poll_id and public.can_read_activity_room(poll.activity_id)
  group by opt.id,opt.label order by opt.label,opt.id;
$$;

create function public.submit_activity_feedback(
  p_activity_id uuid, p_rating integer, p_comment text default null,
  p_report_issue boolean default false, p_share_author boolean default false
) returns void language plpgsql security definer set search_path = '' as $$
declare item public.activities := public.lock_activity(p_activity_id,'room');
begin
  if item.status <> 'completed' or coalesce(p_rating,0) not between 1 and 5
     or length(btrim(p_comment)) > 2000 then
    raise exception 'Feedback requires a completed activity, a rating of 1 to 5 and at most 2000 characters'
      using errcode = '22023';
  end if;
  insert into public.activity_feedback(activity_id,user_id,rating,comment,report_issue,share_author)
  values (item.id,auth.uid(),p_rating,nullif(btrim(p_comment),''),coalesce(p_report_issue,false),coalesce(p_share_author,false));
  if p_report_issue then
    insert into public.reports(reporter_id,activity_id,reason,details)
    values (auth.uid(),item.id,'Activity feedback issue',nullif(btrim(p_comment),''));
  end if;
end;
$$;

create function public.get_activity_feedback(p_activity_id uuid)
returns table (response_count bigint, average_rating numeric, comments jsonb)
language sql stable security definer set search_path = '' as $$
  select count(feedback.user_id), round(avg(feedback.rating),2),
    case when activity.coordinator_id = auth.uid() then coalesce(
      jsonb_agg(jsonb_build_object('comment',feedback.comment,'username',
        case when feedback.share_author then profile.username end) order by feedback.comment)
      filter (where feedback.comment is not null), '[]'::jsonb) end
  from public.activities as activity
  left join public.activity_feedback as feedback on feedback.activity_id = activity.id
  left join public.profiles as profile on profile.id = feedback.user_id
  where activity.id = p_activity_id and activity.status = 'completed' and public.can_read_activity_room(activity.id)
  group by activity.coordinator_id;
$$;

-- Shared projection for discovery. Clients use the RPCs below.
create view public.activity_summaries as
select activity.id, activity.title, activity.interest_slug, activity.description, activity.city,
  activity.min_participants, activity.capacity as max_participants, activity.estimated_budget,
  activity.social_level, activity.participation, activity.experience_level, activity.format,
  activity.status, activity.cover_url, activity.created_at,
  profile.username as coordinator_username,
  (select count(*) from public.activity_participants as member
    where member.activity_id = activity.id and member.status = 'accepted') as participant_count
from public.activities as activity
join public.profiles as profile on profile.id = activity.coordinator_id;
revoke all on public.activity_summaries from public, anon, authenticated;

create function public.search_activities(
  p_keyword text default null, p_category text default null, p_city text default null,
  p_social_level text default null, p_participation text default null, p_experience_level text default null,
  p_max_budget numeric default null, p_status public.activity_status default null,
  p_limit integer default 20, p_offset integer default 0
) returns table (activity jsonb, total_count bigint)
language sql stable security definer set search_path = '' as $$
  select to_jsonb(summary), count(*) over ()
  from public.activity_summaries as summary
  where auth.uid() is not null and summary.status <> 'cancelled'
    and (nullif(btrim(p_keyword),'') is null or
      strpos(lower(summary.title || ' ' || summary.description),lower(btrim(p_keyword))) > 0)
    and (p_category is null or summary.interest_slug = p_category)
    and (p_city is null or lower(summary.city) = lower(btrim(p_city)))
    and (p_social_level is null or summary.social_level = p_social_level)
    and (p_participation is null or summary.participation = p_participation)
    and (p_experience_level is null or summary.experience_level = p_experience_level)
    and (p_max_budget is null or summary.estimated_budget <= p_max_budget)
    and (p_status is null or summary.status = p_status)
  order by summary.created_at desc, summary.id
  limit least(100,greatest(1,coalesce(p_limit,20))) offset greatest(0,coalesce(p_offset,0));
$$;

create function public.get_activity(p_id uuid)
returns table (
  activity jsonb, relationship text, eligibility_message text,
  proposed_dates timestamptz[], starts_at timestamptz, venue text,
  venue_address text, public_venue_confirmed boolean, cancellation_reason text
)
language sql stable security definer set search_path = '' as $$
  select to_jsonb(summary),
    case when item.coordinator_id = caller.id then 'coordinator'
      when member.status in ('pending','accepted','declined') then member.status::text else 'none' end,
    case when item.participation = 'women_only' and not public.activity_women_only_eligible(caller.id)
      then 'Your profile is not eligible to join this women-only activity.' end,
    case when member.status = 'accepted' then item.proposed_dates end,
    case when member.status = 'accepted' then item.starts_at end,
    case when member.status = 'accepted' then item.location end,
    case when member.status = 'accepted' then item.venue_address end,
    case when member.status = 'accepted' then item.public_venue_confirmed end,
    case when member.status = 'accepted' then item.cancellation_reason end
  from public.activity_summaries as summary
  join public.activities as item on item.id = summary.id
  cross join (select auth.uid() as id) as caller
  left join public.activity_participants as member on member.activity_id = item.id and member.user_id = caller.id
  where item.id = p_id and caller.id is not null
    and (item.status <> 'cancelled' or member.status in ('pending','accepted','declined') or item.created_by = caller.id);
$$;

create function public.list_my_activities(p_role text default null)
returns table (activity jsonb, relationship text)
language sql stable security definer set search_path = '' as $$
  select to_jsonb(summary), case when item.coordinator_id = caller.id then 'coordinator'
    when member.status in ('pending','accepted','declined') then member.status::text else 'none' end
  from public.activity_summaries as summary
  join public.activities as item on item.id = summary.id
  cross join (select auth.uid() as id) as caller
  left join public.activity_participants as member on member.activity_id = item.id and member.user_id = caller.id
  where (item.created_by = caller.id or member.status in ('accepted','pending','declined'))
    and (p_role is null or case p_role
      when 'created' then item.created_by = caller.id
      when 'coordinator' then item.coordinator_id = caller.id
      when 'accepted' then member.status = 'accepted' and item.coordinator_id <> caller.id
      when 'pending' then member.status = 'pending'
      when 'declined' then member.status = 'declined'
      else false end)
  order by summary.created_at desc, summary.id;
$$;

create function public.admin_list_activities(
  p_status public.activity_status default null, p_limit integer default 20, p_offset integer default 0
) returns table (activity jsonb, total_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_role(auth.uid(),'admin') then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  return query select to_jsonb(summary), count(*) over ()
  from public.activity_summaries as summary
  where p_status is null or summary.status = p_status
  order by summary.created_at desc, summary.id
  limit least(100,greatest(1,coalesce(p_limit,20))) offset greatest(0,coalesce(p_offset,0));
end;
$$;

create function public.admin_cancel_activity(p_id uuid, p_note text)
returns public.activity_status language plpgsql security definer set search_path = '' as $$
declare item public.activities;
begin
  if not public.has_role(auth.uid(),'admin') then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  item := public.lock_activity(p_id,'signed_in');
  perform public.finish_activity_cancellation(p_id,p_note);
  insert into public.admin_audit_logs(actor_id,action,target_table,target_id,details)
  values (auth.uid(),'cancel_activity','activities',p_id::text,
    jsonb_build_object('previous_status',item.status,'status','cancelled','note',btrim(p_note)));
  return 'cancelled';
end;
$$;

-- Use the existing Inbox helper and the same filter the message writer checks.
create index notifications_unread_activity_message_idx on public.notifications(user_id, link_path)
where kind = 'group_message' and read_at is null;

create or replace function public.get_my_calendar(p_from timestamptz, p_to timestamptz)
returns table (event_type text, id uuid, title text, event_at timestamptz, link_path text, done boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with caller as (select (select auth.uid()) as id),
  events as (
    select 'saved_deadline'::text as event_type, opportunity.id, opportunity.title,
      opportunity.deadline as event_at, '/opportunities/' || opportunity.id as link_path, false as done
    from caller
    join public.saved_opportunities as bookmark on bookmark.user_id = caller.id
    join public.opportunities as opportunity on opportunity.id = bookmark.opportunity_id
    where opportunity.status = 'approved'

    union all
    select 'application_deadline', application.id, opportunity.title, opportunity.deadline, '/applications', false
    from caller
    join public.applications as application on application.user_id = caller.id
    join public.opportunities as opportunity on opportunity.id = application.opportunity_id
    where opportunity.status = 'approved'

    union all
    select 'reminder', reminder.id, reminder.title, reminder.remind_at,
      case when reminder.application_id is not null then '/applications'
        when opportunity.id is not null then '/opportunities/' || opportunity.id else '/calendar' end,
      reminder.done
    from caller
    join public.reminders as reminder on reminder.user_id = caller.id
    left join public.opportunities as opportunity
      on opportunity.id = reminder.opportunity_id and opportunity.status = 'approved'

    union all
    select 'interview', application.id, coalesce(opportunity.title, 'Interview'),
      application.interview_at, '/applications', false
    from caller
    join public.applications as application on application.user_id = caller.id
    left join public.opportunities as opportunity
      on opportunity.id = application.opportunity_id and opportunity.status = 'approved'
    where application.status = 'interview'

    union all
    select 'activity', activity.id, activity.title, activity.starts_at, '/community/' || activity.id, false
    from caller
    join public.activity_participants as member on member.user_id = caller.id and member.status = 'accepted'
    join public.activities as activity on activity.id = member.activity_id and activity.status = 'confirmed'
  )
  select events.* from events
  where events.event_at >= p_from and events.event_at < p_to
  order by events.event_at, events.event_type, events.id;
$$;

-- Refresh on changes, then fetch the role-aware RPC projection.
do $$
declare relation_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach relation_name in array array['activity_messages','polls','poll_options','poll_votes','activity_participants']
    loop
      if not exists (
        select 1 from pg_publication_tables where pubname = 'supabase_realtime'
          and schemaname = 'public' and tablename = relation_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I',relation_name);
      end if;
    end loop;
  end if;
end;
$$;

revoke all on function public.activity_women_only_eligible(uuid), public.activity_has_block(uuid,uuid),
  public.lock_activity(uuid,text), public.notify_activity_members(uuid,text,text,boolean),
  public.finish_activity_cancellation(uuid,text)
from public, anon, authenticated, service_role;

revoke all on function
  public.can_read_activity_room(uuid), public.activity_message_visible(uuid,uuid), public.is_activity_coordinator(uuid),
  public.create_activity(text,text,text,text,integer,integer,numeric,text,text,text,timestamptz[],text,text,public.event_format),
  public.request_to_join(uuid,text), public.respond_to_join_request(uuid,uuid,text), public.leave_activity(uuid),
  public.transfer_activity_coordinator(uuid,text), public.confirm_activity(uuid,timestamptz,text,text,boolean),
  public.cancel_activity(uuid,text), public.complete_activity(uuid), public.list_activity_participants(uuid),
  public.list_activity_join_requests(uuid), public.post_activity_message(uuid,text), public.delete_activity_message(uuid),
  public.create_poll(uuid,text,text,text[],timestamptz), public.cast_vote(uuid,uuid), public.close_poll(uuid),
  public.get_poll_results(uuid), public.submit_activity_feedback(uuid,integer,text,boolean,boolean),
  public.get_activity_feedback(uuid), public.search_activities(text,text,text,text,text,text,numeric,public.activity_status,integer,integer),
  public.get_activity(uuid), public.list_my_activities(text),
  public.admin_list_activities(public.activity_status,integer,integer), public.admin_cancel_activity(uuid,text)
from public, anon, authenticated;

grant execute on function
  public.can_read_activity_room(uuid), public.activity_message_visible(uuid,uuid), public.is_activity_coordinator(uuid),
  public.create_activity(text,text,text,text,integer,integer,numeric,text,text,text,timestamptz[],text,text,public.event_format),
  public.request_to_join(uuid,text), public.respond_to_join_request(uuid,uuid,text), public.leave_activity(uuid),
  public.transfer_activity_coordinator(uuid,text), public.confirm_activity(uuid,timestamptz,text,text,boolean),
  public.cancel_activity(uuid,text), public.complete_activity(uuid), public.list_activity_participants(uuid),
  public.list_activity_join_requests(uuid), public.post_activity_message(uuid,text), public.delete_activity_message(uuid),
  public.create_poll(uuid,text,text,text[],timestamptz), public.cast_vote(uuid,uuid), public.close_poll(uuid),
  public.get_poll_results(uuid), public.submit_activity_feedback(uuid,integer,text,boolean,boolean),
  public.get_activity_feedback(uuid), public.search_activities(text,text,text,text,text,text,numeric,public.activity_status,integer,integer),
  public.get_activity(uuid), public.list_my_activities(text),
  public.admin_list_activities(public.activity_status,integer,integer), public.admin_cancel_activity(uuid,text)
to authenticated;
