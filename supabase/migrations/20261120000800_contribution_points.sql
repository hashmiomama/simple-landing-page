create table public.point_rules (
  reason text primary key check (reason in ('opportunity_approved', 'experience_approved')),
  points integer not null check (points > 0)
);

insert into public.point_rules (reason, points)
values ('opportunity_approved', 10), ('experience_approved', 10)
on conflict (reason) do nothing;

create table public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  points integer not null,
  reason text not null check (reason in ('opportunity_approved', 'experience_approved', 'correction', 'revoked')),
  source_table text not null,
  source_id uuid not null,
  created_at timestamptz not null default now(),
  constraint point_transactions_source_reason_key unique (user_id, reason, source_table, source_id),
  constraint point_transactions_reason_sign_check check (
    (reason = 'opportunity_approved' and source_table = 'opportunities' and points > 0)
    or (reason = 'experience_approved' and source_table = 'solo_experiences' and points > 0)
    or (reason = 'revoked' and source_table in ('opportunities', 'solo_experiences') and points < 0)
    or (reason = 'correction' and points <> 0)
  )
);

create index point_transactions_user_history_idx on public.point_transactions (user_id, created_at desc, id desc);

alter table public.point_rules enable row level security;
alter table public.point_transactions enable row level security;
revoke all on public.point_rules, public.point_transactions from public, anon, authenticated, service_role;
grant select on public.point_rules, public.point_transactions to authenticated;
grant update (points) on public.point_rules to authenticated;

create policy authenticated_read on public.point_rules for select to authenticated using ((select auth.uid()) is not null);
create policy admin_update on public.point_rules for update to authenticated
using ((select public.has_role((select auth.uid()), 'admin')))
with check ((select public.has_role((select auth.uid()), 'admin')));
create policy owner_read on public.point_transactions for select to authenticated
using (user_id = (select auth.uid()));

create or replace function public.enqueue_notification(
  p_user_id uuid, p_type text, p_title text, p_body text, p_link text, p_dedupe_key text
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  category public.notification_category;
  notification_id uuid;
begin
  if p_user_id is null then return null; end if;
  category := case p_type
    when 'opportunity_alert' then 'new_opportunities'::public.notification_category
    when 'deadline_approaching' then 'deadline_reminders'::public.notification_category
    when 'custom_reminder' then 'deadline_reminders'::public.notification_category
    when 'verification_update' then 'verification_updates'::public.notification_category
    when 'activity_update' then 'activity_updates'::public.notification_category
    when 'group_message' then 'group_messages'::public.notification_category
    when 'points' then 'account'::public.notification_category
    when 'account' then 'account'::public.notification_category
  end;
  if category is null or nullif(btrim(p_title), '') is null then
    raise exception 'Use a supported notification type and title' using errcode = '22023';
  end if;
  if p_link is not null and (p_link !~ '^/([^/]|$)' or strpos(p_link, chr(92)) > 0 or p_link ~ '[[:cntrl:]]') then
    raise exception 'Use a same-site notification link path' using errcode = '22023';
  end if;
  if public.notification_frequency_for(p_user_id, category, 'in_app') = 'off' then
    return null;
  end if;

  insert into public.notifications (user_id, kind, title, body, link_path, dedupe_key)
  values (p_user_id, p_type, btrim(p_title), p_body, p_link, p_dedupe_key)
  on conflict on constraint notifications_user_dedupe_key do nothing
  returning id into notification_id;
  return notification_id;
end;
$$;

create function public.award_points(
  p_user_id uuid, p_reason text, p_source_table text, p_source_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  awarded integer;
begin
  if p_user_id is null or p_user_id = auth.uid() then return; end if;

  insert into public.point_transactions (user_id, points, reason, source_table, source_id)
  select p_user_id, rule.points, rule.reason, p_source_table, p_source_id
  from public.point_rules as rule where rule.reason = p_reason
  on conflict on constraint point_transactions_source_reason_key do nothing
  returning points into awarded;

  if awarded is not null then
    perform public.create_notification(p_user_id, 'points',
      format('You earned %s points', awarded), 'Your contribution was approved.', '/profile/points');
  end if;
end;
$$;

create function public.revoke_contribution_points(
  p_user_id uuid, p_reason text, p_source_table text, p_source_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  deduction integer;
begin
  insert into public.point_transactions (user_id, points, reason, source_table, source_id)
  select award.user_id, -award.points, 'revoked', award.source_table, award.source_id
  from public.point_transactions as award
  where award.user_id = p_user_id and award.reason = p_reason
    and award.source_table = p_source_table and award.source_id = p_source_id
  on conflict on constraint point_transactions_source_reason_key do nothing
  returning points into deduction;

  if deduction is not null then
    perform public.create_notification(p_user_id, 'points', 'Contribution points revoked',
      format('%s points were removed because the contribution was rejected.', -deduction), '/profile/points');
  end if;
end;
$$;

revoke all on function public.award_points(uuid, text, text, uuid), public.revoke_contribution_points(uuid, text, text, uuid)
from public, anon, authenticated, service_role;

create or replace function public.admin_review_opportunity(p_id uuid, p_decision text, p_note text default null)
returns table (opportunity_id uuid, status public.review_status, last_verified_at timestamptz, review_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewer uuid := auth.uid();
  listing public.opportunities;
  next_status public.review_status;
  clean_note text := nullif(btrim(p_note), '');
  verification_time timestamptz;
  new_review_id uuid;
begin
  if not public.has_role(reviewer, 'admin') then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_decision is null or p_decision not in ('approve', 'reject', 'request_info') then
    raise exception 'Unknown review decision' using errcode = '22023';
  end if;
  if p_decision <> 'approve' and clean_note is null then
    raise exception 'Provide a note for the submitter' using errcode = '23514';
  end if;

  select opportunity.* into listing from public.opportunities as opportunity
  where opportunity.id = p_id and opportunity.status <> 'archived' for update;
  if not found then
    raise exception 'No reviewable listing found' using errcode = 'P0002';
  end if;

  if p_decision = 'approve' then
    if cardinality(public.opportunity_missing_fields(listing)) > 0
      or not public.is_http_url(listing.source_url)
      or listing.deadline <= now()
      or listing.ends_at <= now() then
      raise exception 'Resolve missing fields, invalid source URLs and expired dates before approving'
        using errcode = '23514';
    end if;
    next_status := 'approved';
    verification_time := now();
  elsif p_decision = 'reject' then
    next_status := 'rejected';
  else
    next_status := 'needs_info';
  end if;

  update public.opportunities as opportunity
  set status = next_status, last_verified_at = verification_time
  where opportunity.id = p_id;

  insert into public.verification_reviews (opportunity_id, reviewer_id, reviewer_kind, status, decision, note)
  values (p_id, reviewer, 'admin', next_status, p_decision, clean_note)
  returning id into new_review_id;

  insert into public.admin_audit_logs (actor_id, action, target_table, target_id, details)
  values (reviewer, 'review_opportunity', 'opportunities', p_id::text,
    jsonb_build_object('decision', p_decision, 'previous_status', listing.status,
      'status', next_status, 'review_id', new_review_id, 'note', clean_note));

  if p_decision = 'approve' then
    perform public.award_points(listing.submitted_by, 'opportunity_approved', 'opportunities', p_id);
  elsif p_decision = 'reject' then
    perform public.revoke_contribution_points(listing.submitted_by, 'opportunity_approved', 'opportunities', p_id);
  end if;

  return query select p_id, next_status, verification_time, new_review_id;
end;
$$;

create or replace function public.admin_review_experience(p_id uuid, p_decision text, p_note text default null)
returns table (experience_id uuid, status public.review_status)
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewer uuid := auth.uid();
  experience public.solo_experiences;
  next_status public.review_status;
  note text := nullif(btrim(p_note), '');
begin
  if not public.has_role(reviewer, 'admin') then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_decision is null or p_decision not in ('approve', 'reject', 'request_info') then
    raise exception 'Unknown experience review decision' using errcode = '22023';
  end if;
  if p_decision <> 'approve' and note is null then
    raise exception 'Provide a note for this decision' using errcode = '23514';
  end if;

  select listing.* into experience from public.solo_experiences as listing
  where listing.id = p_id and listing.status <> 'archived'
  for update;
  if not found then
    raise exception 'No reviewable experience found' using errcode = 'P0002';
  end if;

  if p_decision = 'approve' then
    perform public.validate_experience_content(experience);
    if not exists (select 1 from public.solo_experience_tags as tag where tag.experience_id = p_id) then
      raise exception 'Add at least one interest tag before approving' using errcode = '23514';
    end if;
    next_status := 'approved';
  elsif p_decision = 'reject' then
    next_status := 'rejected';
  else
    next_status := 'needs_info';
  end if;

  update public.solo_experiences as listing set status = next_status where listing.id = p_id;
  insert into public.admin_audit_logs (actor_id, action, target_table, target_id, details)
  values (reviewer, 'review_experience', 'solo_experiences', p_id::text,
    jsonb_build_object('decision', p_decision, 'previous_status', experience.status, 'status', next_status, 'note', note));
  if p_decision = 'approve' then
    perform public.award_points(experience.submitted_by, 'experience_approved', 'solo_experiences', p_id);
  elsif p_decision = 'reject' then
    perform public.revoke_contribution_points(experience.submitted_by, 'experience_approved', 'solo_experiences', p_id);
  end if;

  return query select p_id, next_status;
end;
$$;

create function public.level_for_points(p_total bigint)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_total >= 200 then 'Pathfinder'
    when p_total >= 100 then 'Trailblazer'
    when p_total >= 50 then 'Contributor'
    when p_total >= 20 then 'Explorer'
    else 'Newcomer'
  end;
$$;

create function public.get_my_points()
returns table (
  total_points bigint, level_name text, next_level_name text, points_to_next_level bigint,
  approved_opportunities bigint, approved_experiences bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with caller as (select (select auth.uid()) as id),
  balance as (
    select caller.id, greatest(0, coalesce((
      select sum(entry.points) from public.point_transactions as entry where entry.user_id = caller.id
    ), 0)) as total
    from caller where caller.id is not null
  )
  select balance.total, public.level_for_points(balance.total),
    case when next.threshold is not null then public.level_for_points(next.threshold) end,
    case when next.threshold is not null then next.threshold - balance.total end,
    (select count(*) from public.opportunities as listing
      where listing.submitted_by = balance.id and listing.status = 'approved'),
    (select count(*) from public.solo_experiences as listing
      where listing.submitted_by = balance.id and listing.status = 'approved')
  from balance
  left join lateral (
    select minimum as threshold from (values (20), (50), (100), (200)) as levels(minimum)
    where minimum > balance.total order by minimum limit 1
  ) as next on true;
$$;

create function public.list_my_point_history(p_limit integer default 20, p_offset integer default 0)
returns table (
  id uuid, reason text, points integer, source_table text, source_id uuid,
  source_title text, created_at timestamptz, total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select entry.id, entry.reason, entry.points, entry.source_table, entry.source_id,
    coalesce(opportunity.title, experience.title), entry.created_at, count(*) over ()
  from public.point_transactions as entry
  left join public.opportunities as opportunity on entry.source_table = 'opportunities' and entry.source_id = opportunity.id
  left join public.solo_experiences as experience on entry.source_table = 'solo_experiences' and entry.source_id = experience.id
  where entry.user_id = (select auth.uid())
  order by entry.created_at desc, entry.id desc
  limit least(100, greatest(1, coalesce(p_limit, 20)))
  offset greatest(0, coalesce(p_offset, 0));
$$;

create function public.get_points_leaderboard(p_limit integer default 10)
returns table (username text, avatar_url text, total_points bigint, level_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select profile.username, profile.avatar_url, ranking.total, public.level_for_points(ranking.total)
  from (
    select entry.user_id, sum(entry.points) as total
    from public.point_transactions as entry
    group by entry.user_id having sum(entry.points) >= 1
  ) as ranking
  join public.profiles as profile on profile.id = ranking.user_id
  where (select auth.uid()) is not null
  order by ranking.total desc, profile.username
  limit least(100, greatest(1, coalesce(p_limit, 10)));
$$;

revoke all on function public.level_for_points(bigint), public.get_my_points(),
  public.list_my_point_history(integer, integer), public.get_points_leaderboard(integer)
from public, anon, authenticated;

grant execute on function public.level_for_points(bigint), public.get_my_points(),
  public.list_my_point_history(integer, integer), public.get_points_leaderboard(integer)
to authenticated;

-- Backfill known submitters without sending notifications. An identifiable self-approval
-- only qualifies if there is also a recorded approval by another reviewer.
insert into public.point_transactions (user_id, points, reason, source_table, source_id)
select listing.submitted_by, rule.points, rule.reason, 'opportunities', listing.id
from public.opportunities as listing
join public.point_rules as rule on rule.reason = 'opportunity_approved'
where listing.status = 'approved' and listing.submitted_by is not null
  and (
    not exists (
      select 1 from public.verification_reviews as review
      where review.opportunity_id = listing.id and review.decision = 'approve'
        and review.reviewer_id = listing.submitted_by
    )
    or exists (
      select 1 from public.verification_reviews as review
      where review.opportunity_id = listing.id and review.decision = 'approve'
        and review.reviewer_id <> listing.submitted_by
    )
  )
union all
select listing.submitted_by, rule.points, rule.reason, 'solo_experiences', listing.id
from public.solo_experiences as listing
join public.point_rules as rule on rule.reason = 'experience_approved'
where listing.status = 'approved' and listing.submitted_by is not null
  and (
    not exists (
      select 1 from public.admin_audit_logs as audit
      where audit.action = 'review_experience' and audit.target_table = 'solo_experiences'
        and audit.target_id = listing.id::text and audit.details ->> 'decision' = 'approve'
        and audit.actor_id = listing.submitted_by
    )
    or exists (
      select 1 from public.admin_audit_logs as audit
      where audit.action = 'review_experience' and audit.target_table = 'solo_experiences'
        and audit.target_id = listing.id::text and audit.details ->> 'decision' = 'approve'
        and audit.actor_id <> listing.submitted_by
    )
  )
on conflict on constraint point_transactions_source_reason_key do nothing;
