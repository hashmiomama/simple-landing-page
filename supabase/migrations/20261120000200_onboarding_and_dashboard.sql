-- Reuse the existing nullable social preference and its stored values.
alter type public.social_comfort rename value 'solo' to 'quiet';
alter type public.social_comfort rename value 'large_group' to 'social';

update public.user_preferences
set social_comfort = null
where social_comfort = 'flexible';

create type public.budget_preference as enum ('free_only', 'low', 'any');

alter table public.user_preferences
  add column onboarding_completed boolean not null default false,
  add column wants_online boolean not null default true,
  add column budget_preference public.budget_preference not null default 'any',
  add constraint user_preferences_social_comfort_check
    check (social_comfort in ('quiet', 'small_group', 'social'));

grant update (onboarding_completed, wants_online, budget_preference)
on public.user_preferences to authenticated;

create function public.validate_preferred_categories()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from unnest(new.opportunity_category_slugs) as selected(slug)
    where not exists (
      select 1 from public.opportunity_categories as category
      where category.slug = selected.slug
    )
  ) then
    raise exception 'Use opportunity category slugs from the catalog' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_preferred_categories()
from public, anon, authenticated;

create trigger validate_preferred_categories
before insert or update of opportunity_category_slugs on public.user_preferences
for each row execute function public.validate_preferred_categories();

-- Retire the longer signup pseudonyms before enforcing the new maximum length.
-- At most 13 sequence digits plus the seven-character prefix fit the new limit.
create sequence public.signup_username_number maxvalue 9999999999999;
revoke all on sequence public.signup_username_number from public, anon, authenticated, service_role;

alter table public.profiles
  add constraint profiles_username_format_check
  check (username collate "C" ~ '^[a-z0-9_]{3,20}$') not valid;

do $$
declare
  account record;
begin
  for account in select id from public.profiles where length(username) > 20 loop
    loop
      begin
        update public.profiles
        set username = 'member_' || nextval('public.signup_username_number')
        where id = account.id and length(username) > 20;
        exit;
      exception when unique_violation then
        -- A user may already own this name. Try the next sequence number.
        null;
      end;
    end loop;
  end loop;
end;
$$;

alter table public.profiles validate constraint profiles_username_format_check;

create or replace function public.bootstrap_account(account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  while not exists (select 1 from public.profiles where id = account_id) loop
    insert into public.profiles (id, username)
    values (account_id, 'member_' || nextval('public.signup_username_number'::regclass))
    on conflict do nothing;
  end loop;

  insert into public.profile_private (user_id) values (account_id)
  on conflict (user_id) do nothing;

  insert into public.user_preferences (user_id) values (account_id)
  on conflict (user_id) do nothing;

  insert into public.notification_preferences (user_id) values (account_id)
  on conflict (user_id) do nothing;

  insert into public.user_roles (user_id, role) values (account_id, 'member')
  on conflict (user_id, role) do nothing;
end;
$$;

create function public.is_username_available(p_username text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(p_username collate "C" ~ '^[a-z0-9_]{3,20}$', false)
    and not exists (
      select 1 from public.profiles where username = p_username
    );
$$;

revoke all on function public.is_username_available(text) from public, anon, authenticated;
grant execute on function public.is_username_available(text) to anon, authenticated;

create policy signed_in_read on public.opportunity_categories
for select to authenticated
using ((select auth.uid()) is not null);

-- Phase 1 uses approved for listings that are ready for public display.
grant select on public.opportunities, public.opportunity_tags to anon;

create policy published_read on public.opportunities
for select to anon, authenticated
using (status = 'approved' and (deadline is null or deadline > now()));

create policy published_tags_read on public.opportunity_tags
for select to anon, authenticated
using (exists (
  select 1 from public.opportunities as listing
  where listing.id = opportunity_tags.opportunity_id
    and listing.status = 'approved'
    and (listing.deadline is null or listing.deadline > now())
));

drop policy admin_access on public.saved_opportunities;
revoke update on public.saved_opportunities from authenticated;
revoke insert on public.saved_opportunities from authenticated;
grant insert (user_id, opportunity_id) on public.saved_opportunities to authenticated;

create policy owner_read on public.saved_opportunities
for select to authenticated
using (user_id = (select auth.uid()));

create policy owner_insert on public.saved_opportunities
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy owner_delete on public.saved_opportunities
for delete to authenticated
using (user_id = (select auth.uid()));

create function public.get_recommended_opportunities(p_limit int default 10)
returns table (
  id uuid,
  organisation_id uuid,
  submitted_by uuid,
  category_slug text,
  title text,
  organisation_name text,
  description text,
  source_url text,
  deadline timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  eligibility text,
  location text,
  city text,
  country text,
  format public.event_format,
  cost_or_funding text,
  cover_url text,
  status public.review_status,
  last_verified_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  total_score numeric,
  interest_score int,
  category_score int,
  location_score int,
  social_comfort_score numeric,
  budget_score int,
  recency_score int
)
language sql
stable
security invoker
set search_path = ''
as $$
  with caller as (
    select (select auth.uid()) as user_id
  ),
  candidates as (
    select
      listing,
      prefs.user_id,
      prefs.opportunity_category_slugs,
      prefs.city as preferred_city,
      prefs.wants_online,
      prefs.social_comfort,
      prefs.budget_preference,
      prefs.max_budget,
      prefs.currency,
      case
        when listing.category_slug in ('courses', 'certifications', 'research-opportunities', 'scholarships')
          then 'quiet'
        when listing.category_slug in ('conferences', 'muns', 'hackathons', 'competitions', 'exchange-programmes')
          then 'social'
        else 'small_group'
      end as social_setting,
      case
        when lower(btrim(listing.cost_or_funding)) in ('free', 'fully funded') then 0
        when btrim(listing.cost_or_funding) ~* '^PKR [0-9]{1,9}(\.[0-9]{1,2})?$'
          then substring(btrim(listing.cost_or_funding) from '[0-9]+\.?[0-9]*')::numeric
      end as cost_pkr
    from caller
    join public.user_preferences as prefs on prefs.user_id = caller.user_id
    left join public.profile_private as private_profile on private_profile.user_id = caller.user_id
    cross join public.opportunities as listing
    where listing.status = 'approved'
      and (listing.deadline is null or listing.deadline > now())
      and case
        when lower(btrim(listing.eligibility)) = 'open to all' then true
        when btrim(listing.eligibility) ~* '^Residents of .+$' then
          lower(btrim(prefs.city)) = lower(substring(btrim(listing.eligibility) from 14))
        when btrim(listing.eligibility) ~* '^Ages [0-9]{1,3}\+$' then
          extract(year from age(current_date, private_profile.date_of_birth)) >=
          substring(btrim(listing.eligibility) from '[0-9]+')::int
        else false
      end
  ),
  factors as (
    select
      listing,
      case when exists (
        select 1
        from public.opportunity_tags as tag
        join public.user_interests as interest using (interest_slug)
        where tag.opportunity_id = (listing).id and interest.user_id = candidates.user_id
      ) then 35 else 0 end as interest_score,
      case when (listing).category_slug = any(opportunity_category_slugs)
        then 20 else 0 end as category_score,
      case when (wants_online and (listing).format in ('online', 'hybrid'))
        or ((listing).format in ('physical', 'hybrid')
          and lower(btrim((listing).city)) = lower(nullif(btrim(preferred_city), '')))
        then 15 else 0 end as location_score,
      case
        when social_comfort is null then 7.5
        when social_comfort::text = social_setting then 15
        when social_comfort = 'small_group' or social_setting = 'small_group' then 7.5
        else 0
      end as social_comfort_score,
      case
        when budget_preference = 'any' then 10
        when cost_pkr = 0 then 10
        when budget_preference = 'low' and cost_pkr <=
          case when currency = 'PKR' then coalesce(max_budget, 2500) else 2500 end then 10
        else 0
      end as budget_score,
      case when (listing).created_at >= now() - interval '30 days'
        then 5 else 0 end as recency_score
    from candidates
  )
  select
    (listing).*,
    interest_score + category_score + location_score + social_comfort_score + budget_score + recency_score
      as total_score,
    interest_score, category_score, location_score, social_comfort_score, budget_score, recency_score
  from factors
  order by total_score desc, (listing).deadline asc nulls last, (listing).id
  limit least(100, greatest(0, coalesce(p_limit, 10)));
$$;

create function public.get_dashboard_summary()
returns table (
  saved_count bigint,
  saved_due_in_14_days_count bigint,
  upcoming_deadlines jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  with saved as (
    select opportunity_id
    from public.saved_opportunities
    where user_id = (select auth.uid())
  ),
  upcoming as (
    select listing.id as opportunity_id, listing.title, listing.deadline
    from saved
    join public.opportunities as listing on listing.id = saved.opportunity_id
    where listing.status = 'approved' and listing.deadline > now()
  ),
  next_five as (
    select * from upcoming
    order by deadline, opportunity_id
    limit 5
  )
  select
    (select count(*) from saved),
    (select count(*) from upcoming where deadline <= now() + interval '14 days'),
    coalesce(
      (select jsonb_agg(to_jsonb(next_five) order by deadline, opportunity_id) from next_five),
      '[]'::jsonb
    );
$$;

revoke all on function public.get_recommended_opportunities(int), public.get_dashboard_summary()
from public, anon, authenticated;
grant execute on function public.get_recommended_opportunities(int), public.get_dashboard_summary()
to authenticated;
