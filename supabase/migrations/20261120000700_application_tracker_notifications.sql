-- This migration is applied after the already-issued Phase 6 migration.
alter type public.application_status rename value 'submitted' to 'applied';
alter type public.application_status add value if not exists 'shortlisted';

update public.applications set status = 'preparing' where status = 'interested';

alter table public.applications
  alter column status set default 'preparing',
  add column applied_at timestamptz,
  add column interview_at timestamptz,
  add constraint applications_current_status_check check (status <> 'interested');

drop policy admin_access on public.applications;
revoke insert, update, delete on public.applications from authenticated;
grant insert (user_id, opportunity_id, status, notes, applied_at, interview_at),
  update (status, notes, applied_at, interview_at), delete on public.applications to authenticated;

create policy owner_read on public.applications for select to authenticated
using (user_id = (select auth.uid()));
create policy owner_insert on public.applications for insert to authenticated
with check (
  user_id = (select auth.uid())
  and public.get_opportunity_status(opportunity_id) in ('available', 'expired')
);
create policy owner_update on public.applications for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy owner_delete on public.applications for delete to authenticated
using (user_id = (select auth.uid()));

create function public.upsert_application(
  p_opportunity_id uuid, p_status public.application_status, p_notes text default null,
  p_applied_at timestamptz default null, p_interview_at timestamptz default null
)
returns setof public.applications
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  existing public.applications;
begin
  if caller is null then return; end if;

  -- An existing personal tracker remains editable when its listing is taken down.
  update public.applications as application
  set status = p_status, notes = p_notes, applied_at = p_applied_at, interview_at = p_interview_at
  where application.user_id = caller and application.opportunity_id = p_opportunity_id
  returning application.* into existing;
  if found then
    return next existing;
    return;
  end if;

  return query insert into public.applications as application
    (user_id, opportunity_id, status, notes, applied_at, interview_at)
  values (caller, p_opportunity_id, p_status, p_notes, p_applied_at, p_interview_at)
  on conflict (user_id, opportunity_id) do update set
    status = excluded.status, notes = excluded.notes, applied_at = excluded.applied_at,
    interview_at = excluded.interview_at
  returning application.*;
end;
$$;

create function public.list_my_applications(p_status public.application_status default null)
returns table (
  id uuid, user_id uuid, opportunity_id uuid, status public.application_status,
  notes text, applied_at timestamptz, interview_at timestamptz,
  created_at timestamptz, updated_at timestamptz, opportunity_title text,
  organisation_name text, deadline timestamptz, is_expired boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select application.id, application.user_id, application.opportunity_id, application.status,
    application.notes, application.applied_at, application.interview_at,
    application.created_at, application.updated_at, opportunity.title,
    opportunity.organisation_name, opportunity.deadline,
    case when opportunity.id is not null
      then not public.opportunity_is_public(opportunity.status, opportunity.deadline, opportunity.ends_at)
    end
  from public.applications as application
  left join public.opportunities as opportunity
    on opportunity.id = application.opportunity_id and opportunity.status = 'approved'
  where application.user_id = (select auth.uid())
    and (p_status is null or application.status = p_status)
  order by application.updated_at desc, application.id;
$$;

create function public.delete_application(p_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  with deleted as (
    delete from public.applications where id = p_id and user_id = (select auth.uid()) returning id
  )
  select exists (select 1 from deleted);
$$;

alter table public.reminders
  add column note text,
  add column opportunity_id uuid references public.opportunities(id) on delete set null,
  add column done boolean not null default false,
  add constraint reminders_one_link_check check (num_nonnulls(opportunity_id, application_id) <= 1);

create index reminders_opportunity_id_idx on public.reminders (opportunity_id);
create index reminders_due_idx on public.reminders (remind_at) where not done and sent_at is null;
create index applications_interview_at_idx on public.applications (user_id, interview_at) where status = 'interview';

drop policy admin_access on public.reminders;
revoke insert, update, delete on public.reminders from authenticated;
grant insert (user_id, title, note, remind_at, application_id, opportunity_id, done),
  update (title, note, remind_at, application_id, opportunity_id, done), delete on public.reminders to authenticated;

create policy owner_read on public.reminders for select to authenticated
using (user_id = (select auth.uid()));
create policy owner_insert on public.reminders for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (opportunity_id is null or public.get_opportunity_status(opportunity_id) in ('available', 'expired'))
);
create policy owner_update on public.reminders for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
create policy owner_delete on public.reminders for delete to authenticated
using (user_id = (select auth.uid()));

create function public.validate_reminder()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if nullif(btrim(new.title), '') is null then
    raise exception 'Enter a reminder title' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' then
    if new.opportunity_id is distinct from old.opportunity_id and new.opportunity_id is not null
      and current_user = 'authenticated'
      and public.get_opportunity_status(new.opportunity_id) not in ('available', 'expired') then
      raise exception 'Choose a published opportunity' using errcode = '42501';
    end if;
    if new.remind_at is distinct from old.remind_at then new.sent_at := null; end if;
  end if;
  return new;
end;
$$;

revoke all on function public.validate_reminder() from public, anon, authenticated;

create trigger validate_reminder
before insert or update of title, remind_at, opportunity_id on public.reminders
for each row execute function public.validate_reminder();

create function public.create_reminder(
  p_title text, p_remind_at timestamptz, p_note text default null,
  p_opportunity_id uuid default null, p_application_id uuid default null
)
returns setof public.reminders
language sql
security invoker
set search_path = ''
as $$
  insert into public.reminders (user_id, title, remind_at, note, opportunity_id, application_id)
  values ((select auth.uid()), btrim(p_title), p_remind_at, p_note, p_opportunity_id, p_application_id)
  returning *;
$$;

create function public.update_reminder(
  p_id uuid, p_title text, p_remind_at timestamptz, p_note text default null,
  p_opportunity_id uuid default null, p_application_id uuid default null, p_done boolean default null
)
returns setof public.reminders
language sql
security invoker
set search_path = ''
as $$
  update public.reminders as reminder set title = btrim(p_title), remind_at = p_remind_at, note = p_note,
    opportunity_id = p_opportunity_id, application_id = p_application_id, done = coalesce(p_done, reminder.done)
  where reminder.id = p_id and reminder.user_id = (select auth.uid())
  returning reminder.*;
$$;

create function public.delete_reminder(p_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  with deleted as (
    delete from public.reminders where id = p_id and user_id = (select auth.uid()) returning id
  )
  select exists (select 1 from deleted);
$$;

create function public.list_my_reminders()
returns setof public.reminders
language sql
stable
security invoker
set search_path = ''
as $$
  select reminder.* from public.reminders as reminder
  where reminder.user_id = (select auth.uid())
  order by reminder.remind_at, reminder.id;
$$;

create function public.get_my_calendar(p_from timestamptz, p_to timestamptz)
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

    -- Phase 7: UNION ALL the caller's confirmed activity events with the same six columns.
  )
  select events.* from events
  where events.event_at >= p_from and events.event_at < p_to
  order by events.event_at, events.event_type, events.id;
$$;

alter table public.notifications
  add column link_path text,
  add column dedupe_key text,
  add constraint notifications_user_dedupe_key unique (user_id, dedupe_key);

create type public.notification_category as enum (
  'new_opportunities', 'deadline_reminders', 'verification_updates', 'activity_updates', 'group_messages', 'account'
);
create type public.notification_channel as enum ('in_app', 'email');
create type public.notification_frequency as enum ('instant', 'daily', 'off');

alter table public.notification_preferences
  alter column email_enabled set default true,
  add column channel_frequencies jsonb not null default '{}',
  add constraint notification_preferences_frequencies_object
    check (jsonb_typeof(channel_frequencies) = 'object');

-- Carry forward old channel and category opt-outs as explicit overrides.
update public.notification_preferences as prefs set channel_frequencies = coalesce((
  select jsonb_object_agg(category.name || ':' || channel.name, 'off'::text)
  from (values
    ('new_opportunities', prefs.opportunity_updates),
    ('deadline_reminders', prefs.deadline_reminders),
    ('verification_updates', true),
    ('activity_updates', prefs.activity_updates),
    ('group_messages', true),
    ('account', true)
  ) as category(name, enabled)
  cross join (values ('in_app', prefs.in_app_enabled), ('email', prefs.email_enabled)) as channel(name, enabled)
  where not category.enabled or not channel.enabled
), '{}'::jsonb);

revoke update (in_app_enabled, email_enabled, deadline_reminders, activity_updates, opportunity_updates)
on public.notification_preferences from authenticated;

create function public.notification_frequency_for(
  p_user_id uuid, p_category public.notification_category, p_channel public.notification_channel
)
returns public.notification_frequency
language sql
stable
set search_path = ''
as $$
  select coalesce((
    select (prefs.channel_frequencies ->> (p_category::text || ':' || p_channel::text))::public.notification_frequency
    from public.notification_preferences as prefs where prefs.user_id = p_user_id
  ), case when p_channel = 'in_app' then 'instant'::public.notification_frequency
          else 'daily'::public.notification_frequency end);
$$;

revoke all on function public.notification_frequency_for(uuid, public.notification_category, public.notification_channel)
from public, anon, authenticated;

create function public.get_my_notification_preferences()
returns table (
  category public.notification_category, channel public.notification_channel,
  frequency public.notification_frequency
)
language sql
stable
security definer
set search_path = ''
as $$
  select category.value, channel.value,
    public.notification_frequency_for(caller.id, category.value, channel.value)
  from (select (select auth.uid()) as id) as caller
  cross join unnest(enum_range(null::public.notification_category)) as category(value)
  cross join unnest(enum_range(null::public.notification_channel)) as channel(value)
  where caller.id is not null
  order by category.value, channel.value;
$$;

create function public.set_my_notification_preferences(
  p_category public.notification_category,
  p_channel public.notification_channel,
  p_frequency public.notification_frequency
)
returns table (
  category public.notification_category, channel public.notification_channel,
  frequency public.notification_frequency
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Sign in to update notification preferences' using errcode = '42501';
  end if;
  if p_category is null or p_channel is null or p_frequency is null then
    raise exception 'Choose a category, channel, and frequency' using errcode = '22023';
  end if;

  insert into public.notification_preferences as prefs (user_id, channel_frequencies)
  values (caller, jsonb_build_object(p_category::text || ':' || p_channel::text, p_frequency))
  on conflict (user_id) do update
  set channel_frequencies = prefs.channel_frequencies || excluded.channel_frequencies;

  return query select p_category, p_channel, p_frequency;
end;
$$;

create function public.list_my_notifications(
  p_limit integer default 20, p_offset integer default 0, p_unread_only boolean default false
)
returns table (notifications jsonb, total_count bigint, unread_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with inbox as not materialized (
    select item.id, item.kind as type, item.title, item.body, item.link_path, item.read_at, item.created_at
    from public.notifications as item
    where item.user_id = (select auth.uid())
  ),
  page as (
    select * from inbox
    where not coalesce(p_unread_only, false) or read_at is null
    order by created_at desc, id desc
    limit least(100, greatest(1, coalesce(p_limit, 20)))
    offset greatest(0, coalesce(p_offset, 0))
  ),
  counts as (
    select count(*) as total, count(*) filter (where read_at is null) as unread from inbox
  )
  select coalesce((select jsonb_agg(to_jsonb(page) order by created_at desc, id desc) from page), '[]'::jsonb),
    counts.total, counts.unread from counts;
$$;

create function public.mark_notification_read(p_id uuid)
returns table (id uuid, read_at timestamptz)
language sql
security invoker
set search_path = ''
as $$
  update public.notifications as item set read_at = coalesce(item.read_at, now())
  where item.id = p_id and item.user_id = (select auth.uid())
  returning item.id, item.read_at;
$$;

create function public.mark_all_notifications_read()
returns bigint
language sql
security invoker
set search_path = ''
as $$
  with marked as (
    update public.notifications as item set read_at = now()
    where item.user_id = (select auth.uid()) and item.read_at is null returning item.id
  )
  select count(*) from marked;
$$;

create function public.enqueue_notification(
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

revoke all on function public.enqueue_notification(uuid, text, text, text, text, text)
from public, anon, authenticated, service_role;

create function public.create_notification(
  p_user_id uuid, p_type text, p_title text, p_body text default null, p_link text default null
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select public.enqueue_notification(p_user_id, p_type, p_title, p_body, p_link, null);
$$;

revoke all on function public.create_notification(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_notification(uuid, text, text, text, text) to service_role;

create function public.notify_verification_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
  subject text;
  link text;
  title text;
begin
  if tg_table_name = 'organisations' then
    recipient := new.owner_id;
    subject := new.name;
    link := '/organisation/register';
    title := 'Organisation review update';
  elsif tg_table_name = 'solo_experiences' then
    recipient := new.submitted_by;
    subject := new.title;
    link := '/my-experience-recommendations';
    title := 'Experience review update';
  else
    recipient := new.submitted_by;
    subject := new.title;
    link := '/my-submissions';
    title := 'Opportunity review update';
  end if;

  perform public.create_notification(recipient, 'verification_update', title, case new.status
    when 'approved' then subject || ' was approved.'
    when 'rejected' then subject || ' was rejected.'
    else subject || ' needs more information.'
  end, link);
  return new;
end;
$$;

revoke all on function public.notify_verification_status() from public, anon, authenticated;

create trigger notify_opportunity_review after update of status on public.opportunities
for each row when (old.status is distinct from new.status and new.status in ('approved', 'rejected', 'needs_info'))
execute function public.notify_verification_status();

create trigger notify_organisation_review after update of status on public.organisations
for each row when (old.status is distinct from new.status and new.status in ('approved', 'rejected'))
execute function public.notify_verification_status();

create trigger notify_experience_review after update of status on public.solo_experiences
for each row when (old.status is distinct from new.status and new.status in ('approved', 'rejected', 'needs_info'))
execute function public.notify_verification_status();

create function public.generate_deadline_notifications()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  event record;
  notification_id uuid;
  reminder_key text;
  created_count integer := 0;
begin
  for event in
    select tracked.user_id, opportunity.id, opportunity.title, opportunity.deadline
    from (
      select user_id, opportunity_id from public.saved_opportunities
      union
      select user_id, opportunity_id from public.applications
    ) as tracked
    join public.opportunities as opportunity on opportunity.id = tracked.opportunity_id
    where public.opportunity_is_public(opportunity.status, opportunity.deadline, opportunity.ends_at)
      and opportunity.deadline > now() and opportunity.deadline <= now() + interval '72 hours'
  loop
    notification_id := public.enqueue_notification(event.user_id, 'deadline_approaching',
      'Deadline approaching', event.title, '/opportunities/' || event.id,
      'deadline:' || event.id || ':' || extract(epoch from event.deadline)::text);
    if notification_id is not null then created_count := created_count + 1; end if;
  end loop;

  for event in
    select reminder.id, reminder.user_id, reminder.title, reminder.note, reminder.remind_at,
      case when reminder.application_id is not null then '/applications'
        when opportunity.id is not null then '/opportunities/' || opportunity.id else '/calendar' end as link
    from public.reminders as reminder
    left join public.opportunities as opportunity
      on opportunity.id = reminder.opportunity_id and opportunity.status = 'approved'
    where not reminder.done and reminder.sent_at is null and reminder.remind_at <= now()
    for update of reminder skip locked
  loop
    reminder_key := 'reminder:' || event.id || ':' || extract(epoch from event.remind_at)::text;
    notification_id := public.enqueue_notification(event.user_id, 'custom_reminder',
      event.title, event.note, event.link, reminder_key);
    if notification_id is not null or exists (
      select 1 from public.notifications as item
      where item.user_id = event.user_id and item.dedupe_key = reminder_key
    ) then
      update public.reminders as reminder set sent_at = now() where reminder.id = event.id;
    end if;
    if notification_id is not null then created_count := created_count + 1; end if;
  end loop;
  return created_count;
end;
$$;

revoke all on function public.generate_deadline_notifications() from public, anon, authenticated;
grant execute on function public.generate_deadline_notifications() to service_role;

revoke all on function
  public.upsert_application(uuid, public.application_status, text, timestamptz, timestamptz),
  public.list_my_applications(public.application_status),
  public.delete_application(uuid),
  public.create_reminder(text, timestamptz, text, uuid, uuid),
  public.update_reminder(uuid, text, timestamptz, text, uuid, uuid, boolean),
  public.delete_reminder(uuid),
  public.list_my_reminders(),
  public.get_my_calendar(timestamptz, timestamptz),
  public.list_my_notifications(integer, integer, boolean),
  public.mark_notification_read(uuid),
  public.mark_all_notifications_read(),
  public.get_my_notification_preferences(),
  public.set_my_notification_preferences(public.notification_category, public.notification_channel, public.notification_frequency)
from public, anon, authenticated;

grant execute on function
  public.upsert_application(uuid, public.application_status, text, timestamptz, timestamptz),
  public.list_my_applications(public.application_status),
  public.delete_application(uuid),
  public.create_reminder(text, timestamptz, text, uuid, uuid),
  public.update_reminder(uuid, text, timestamptz, text, uuid, uuid, boolean),
  public.delete_reminder(uuid),
  public.list_my_reminders(),
  public.get_my_calendar(timestamptz, timestamptz),
  public.list_my_notifications(integer, integer, boolean),
  public.mark_notification_read(uuid),
  public.mark_all_notifications_read(),
  public.get_my_notification_preferences(),
  public.set_my_notification_preferences(public.notification_category, public.notification_channel, public.notification_frequency)
to authenticated;

-- Keep migrations usable on local PostgreSQL builds without the Supabase Cron module.
do $$
begin
  if not exists (select 1 from pg_catalog.pg_available_extensions where name = 'pg_cron') then
    raise notice 'pg_cron is unavailable. See the README to schedule deadline notifications manually.';
    return;
  end if;

  execute 'create extension if not exists pg_cron with schema pg_catalog';
  execute 'select cron.schedule($1, $2, $3)' using
    'application-deadline-notifications', '0 * * * *', 'select public.generate_deadline_notifications();';
exception when others then
  raise warning 'Could not schedule deadline notifications (%). See the README for setup.', sqlerrm;
end;
$$;
