create type public.experience_category as enum (
  'art_and_culture', 'slow_experiences', 'learn_something_new', 'outdoor_exploration'
);

alter table public.user_preferences
  add column experience_category_slugs public.experience_category[] not null default '{}',
  add constraint user_preferences_experience_categories_no_nulls
    check (array_position(experience_category_slugs, null) is null);

grant update (experience_category_slugs) on public.user_preferences to authenticated;

alter table public.solo_experiences
  add column latitude numeric(9,6),
  add column longitude numeric(9,6),
  add column opening_hours text,
  add column social_level public.social_comfort,
  add column safety_considerations text,
  add column accessibility_information text,
  add column cover_url text,
  add constraint solo_experiences_coordinates_check check (
    (latitude is null) = (longitude is null)
    and latitude between -90 and 90 and longitude between -180 and 180
  ),
  add constraint solo_experiences_social_level_check
    check (social_level in ('quiet', 'small_group', 'social'));

-- Keep the existing text column. Normalize known labels and preserve any other legacy values.
update public.solo_experiences
set category = replace(lower(btrim(category)), ' ', '_')
where replace(lower(btrim(category)), ' ', '_') in (
    'art_and_culture', 'slow_experiences', 'learn_something_new', 'outdoor_exploration'
  )
  and category <> replace(lower(btrim(category)), ' ', '_');

create index solo_experiences_lower_city_idx on public.solo_experiences (lower(btrim(city)));
create index solo_experiences_cost_idx on public.solo_experiences (cost);
create index solo_experiences_social_level_idx on public.solo_experiences (social_level);
create index solo_experiences_review_queue_idx on public.solo_experiences (status, created_at desc, id desc);

create table public.solo_experience_tags (
  experience_id uuid not null references public.solo_experiences(id) on delete cascade,
  interest_slug text not null references public.interests(slug) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (experience_id, interest_slug)
);

create index solo_experience_tags_interest_slug_idx on public.solo_experience_tags (interest_slug);
alter table public.solo_experience_tags enable row level security;
revoke all on public.solo_experience_tags from public, anon, authenticated, service_role;
grant select on public.solo_experience_tags to anon, authenticated;
grant select, insert, update, delete on public.solo_experience_tags to service_role;

drop policy admin_access on public.solo_experiences;
revoke insert, update, delete on public.solo_experiences from authenticated;
grant select on public.solo_experiences to anon, authenticated;
grant update (title, description, category, city, location, source_url, cost, duration_minutes,
  latitude, longitude, opening_hours, social_level, safety_considerations, accessibility_information, cover_url)
on public.solo_experiences to authenticated;

create policy public_approved_read on public.solo_experiences for select to anon, authenticated
using (status = 'approved');

create policy admin_read on public.solo_experiences for select to authenticated
using ((select public.has_role((select auth.uid()), 'admin')));

create policy own_draft_read on public.solo_experiences for select to authenticated
using (submitted_by = (select auth.uid()) and status in ('pending', 'rejected', 'needs_info'));

create policy own_draft_update on public.solo_experiences for update to authenticated
using (submitted_by = (select auth.uid()) and status in ('pending', 'rejected', 'needs_info'))
with check (submitted_by = (select auth.uid()) and status in ('pending', 'rejected', 'needs_info'));

-- The parent table's RLS determines which tags the caller can see.
create policy readable_experience_tags on public.solo_experience_tags for select to anon, authenticated
using (exists (
  select 1 from public.solo_experiences as experience
  where experience.id = solo_experience_tags.experience_id
));

create function public.validate_experience_content(p_experience public.solo_experiences)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if num_nonnulls(nullif(btrim(p_experience.title), ''), nullif(btrim(p_experience.description), ''),
    nullif(btrim(p_experience.city), ''), nullif(btrim(p_experience.location), ''),
    nullif(btrim(p_experience.safety_considerations), ''), nullif(btrim(p_experience.accessibility_information), '')) <> 6 then
    raise exception 'Complete the title, description, city, location, safety and accessibility fields' using errcode = '23514';
  end if;
  if p_experience.category is null or not exists (
    select 1 from unnest(enum_range(null::public.experience_category)) as category(slug)
    where category.slug::text = p_experience.category
  ) then
    raise exception 'Choose a supported experience category' using errcode = '23514';
  end if;
  if p_experience.latitude is null or p_experience.longitude is null
    or p_experience.latitude not between -90 and 90 or p_experience.longitude not between -180 and 180 then
    raise exception 'Enter valid latitude and longitude' using errcode = '23514';
  end if;
  if p_experience.cost is null or p_experience.cost < 0 or p_experience.cost = 'NaN'::numeric
    or p_experience.duration_minutes is null or p_experience.duration_minutes <= 0 then
    raise exception 'Enter a non-negative cost and positive duration' using errcode = '23514';
  end if;
  if p_experience.social_level is null or p_experience.social_level not in ('quiet', 'small_group', 'social') then
    raise exception 'Choose a supported social interaction level' using errcode = '23514';
  end if;
  if (p_experience.source_url is not null and not public.is_http_url(p_experience.source_url))
    or (p_experience.cover_url is not null and not public.is_http_url(p_experience.cover_url)) then
    raise exception 'Use absolute HTTP or HTTPS URLs' using errcode = '23514';
  end if;
end;
$$;

revoke all on function public.validate_experience_content(public.solo_experiences) from public, anon, authenticated, service_role;
grant execute on function public.validate_experience_content(public.solo_experiences) to authenticated, service_role;

create function public.validate_experience_content_trigger()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform public.validate_experience_content(new);
  return new;
end;
$$;

revoke all on function public.validate_experience_content_trigger() from public, anon, authenticated, service_role;

create trigger validate_experience_content
before insert or update of title, description, category, city, location, source_url, cost, duration_minutes,
  latitude, longitude, opening_hours, social_level, safety_considerations, accessibility_information, cover_url
on public.solo_experiences for each row execute function public.validate_experience_content_trigger();

create function public.replace_experience_tags(p_id uuid, p_interest_slugs text[])
returns text[]
language plpgsql
set search_path = ''
as $$
declare
  tags text[];
begin
  if coalesce(cardinality(p_interest_slugs), 0) = 0 or exists (
    select 1 from unnest(p_interest_slugs) as selected(slug)
    where not exists (select 1 from public.interests as interest where interest.slug = selected.slug)
  ) then
    raise exception 'Choose at least one valid interest tag' using errcode = '23514';
  end if;

  select array_agg(distinct selected.slug order by selected.slug) into tags
  from unnest(p_interest_slugs) as selected(slug);
  delete from public.solo_experience_tags as tag
  where tag.experience_id = p_id and not (tag.interest_slug = any(tags));
  insert into public.solo_experience_tags (experience_id, interest_slug)
  select p_id, selected.slug from unnest(tags) as selected(slug)
  on conflict on constraint solo_experience_tags_pkey do nothing;
  return tags;
end;
$$;

revoke all on function public.replace_experience_tags(uuid, text[]) from public, anon, authenticated, service_role;

create function public.recommend_experience(
  p_title text, p_description text, p_category text, p_city text, p_location text,
  p_latitude numeric, p_longitude numeric, p_cost numeric, p_duration_minutes integer,
  p_social_level public.social_comfort, p_safety_considerations text, p_accessibility_information text,
  p_interest_slugs text[], p_opening_hours text default null, p_cover_url text default null,
  p_source_url text default null
)
returns table (experience_id uuid, status public.review_status)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  new_id uuid;
begin
  if not public.has_role(caller, 'member') then
    raise exception 'A signed-in member account is required' using errcode = '42501';
  end if;
  if p_cost < 0 then
    raise exception 'Cost must be non-negative' using errcode = '23514';
  end if;
  if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
    raise exception 'Enter valid latitude and longitude' using errcode = '23514';
  end if;

  insert into public.solo_experiences (
    submitted_by, title, description, category, city, location, latitude, longitude, cost,
    currency, duration_minutes, social_level, safety_considerations, accessibility_information,
    opening_hours, cover_url, source_url, status
  )
  values (caller, btrim(p_title), btrim(p_description), btrim(p_category), btrim(p_city), btrim(p_location),
    p_latitude, p_longitude, p_cost, 'PKR', p_duration_minutes, p_social_level,
    btrim(p_safety_considerations), btrim(p_accessibility_information), nullif(btrim(p_opening_hours), ''),
    nullif(btrim(p_cover_url), ''), nullif(btrim(p_source_url), ''), 'pending')
  returning id into new_id;

  perform public.replace_experience_tags(new_id, p_interest_slugs);
  return query select new_id, 'pending'::public.review_status;
end;
$$;

create function public.set_experience_tags(p_id uuid, p_interest_slugs text[])
returns table (experience_id uuid, interest_slugs text[])
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.solo_experiences as experience
  where experience.id = p_id and experience.submitted_by = (select auth.uid())
    and experience.status in ('pending', 'rejected', 'needs_info')
  for update;
  if not found then
    raise exception 'No editable experience found' using errcode = '42501';
  end if;

  return query select p_id, public.replace_experience_tags(p_id, p_interest_slugs);
end;
$$;

create function public.search_experiences(
  p_keyword text default null, p_category text default null, p_city text default null,
  p_max_cost numeric default null, p_social_level public.social_comfort default null,
  p_interest_slugs text[] default null, p_limit integer default 20, p_offset integer default 0
)
returns table (
  id uuid,
  submitted_by uuid,
  title text,
  description text,
  category text,
  city text,
  location text,
  source_url text,
  cost numeric,
  currency text,
  duration_minutes integer,
  status public.review_status,
  created_at timestamptz,
  updated_at timestamptz,
  latitude numeric,
  longitude numeric,
  opening_hours text,
  social_level public.social_comfort,
  safety_considerations text,
  accessibility_information text,
  cover_url text,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    experience.id, experience.submitted_by, experience.title, experience.description,
    experience.category, experience.city, experience.location, experience.source_url,
    experience.cost, experience.currency, experience.duration_minutes, experience.status,
    experience.created_at, experience.updated_at, experience.latitude, experience.longitude,
    experience.opening_hours, experience.social_level, experience.safety_considerations,
    experience.accessibility_information, experience.cover_url,
    count(*) over ()
  from public.solo_experiences as experience
  where experience.status = 'approved'
    and (nullif(btrim(p_keyword), '') is null or strpos(
      lower(concat_ws(' ', experience.title, experience.description, experience.location, experience.city)),
      lower(btrim(p_keyword))
    ) > 0)
    and (p_category is null or experience.category = p_category)
    and (nullif(btrim(p_city), '') is null or lower(btrim(experience.city)) = lower(btrim(p_city)))
    and (p_max_cost is null or (experience.cost <= p_max_cost and
      (experience.cost = 0 or coalesce(experience.currency, 'PKR') = 'PKR')))
    and (p_social_level is null or experience.social_level = p_social_level)
    and (coalesce(cardinality(p_interest_slugs), 0) = 0 or exists (
      select 1 from public.solo_experience_tags as tag
      where tag.experience_id = experience.id and tag.interest_slug = any(p_interest_slugs)
    ))
  order by experience.created_at desc, experience.id desc
  limit least(100, greatest(1, coalesce(p_limit, 20)))
  offset greatest(0, coalesce(p_offset, 0));
$$;

create function public.get_experience(p_id uuid)
returns table (
  id uuid,
  submitted_by uuid,
  title text,
  description text,
  category text,
  city text,
  location text,
  source_url text,
  cost numeric,
  currency text,
  duration_minutes integer,
  status public.review_status,
  created_at timestamptz,
  updated_at timestamptz,
  latitude numeric,
  longitude numeric,
  opening_hours text,
  social_level public.social_comfort,
  safety_considerations text,
  accessibility_information text,
  cover_url text,
  tags jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    experience.id, experience.submitted_by, experience.title, experience.description,
    experience.category, experience.city, experience.location, experience.source_url,
    experience.cost, experience.currency, experience.duration_minutes, experience.status,
    experience.created_at, experience.updated_at, experience.latitude, experience.longitude,
    experience.opening_hours, experience.social_level, experience.safety_considerations,
    experience.accessibility_information, experience.cover_url,
    coalesce((
      select jsonb_agg(jsonb_build_object('slug', interest.slug, 'name', interest.name)
        order by interest.name, interest.slug)
      from public.solo_experience_tags as tag
      join public.interests as interest on interest.slug = tag.interest_slug
      where tag.experience_id = experience.id
    ), '[]'::jsonb)
  from public.solo_experiences as experience
  where experience.id = p_id and experience.status = 'approved';
$$;

create function public.get_recommended_experiences(p_limit integer default 10)
returns table (
  id uuid,
  submitted_by uuid,
  title text,
  description text,
  category text,
  city text,
  location text,
  source_url text,
  cost numeric,
  currency text,
  duration_minutes integer,
  status public.review_status,
  created_at timestamptz,
  updated_at timestamptz,
  latitude numeric,
  longitude numeric,
  opening_hours text,
  social_level public.social_comfort,
  safety_considerations text,
  accessibility_information text,
  cover_url text,
  total_score integer,
  social_comfort_score integer,
  interest_score integer,
  budget_score integer,
  location_score integer,
  category_score integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with factors as (
    select experience as listing,
      case
        when prefs.social_comfort is null or experience.social_level is null then 15
        when prefs.social_comfort = experience.social_level then 30
        when prefs.social_comfort = 'small_group' or experience.social_level = 'small_group' then 15
        else 0
      end as social_comfort_score,
      case when exists (
        select 1
        from public.solo_experience_tags as tag
        join public.user_interests as interest using (interest_slug)
        where tag.experience_id = experience.id and interest.user_id = prefs.user_id
      ) then 30 else 0 end as interest_score,
      case
        when prefs.budget_preference = 'any' or experience.cost = 0 then 15
        when prefs.budget_preference = 'low' and coalesce(experience.currency, 'PKR') = 'PKR'
          and experience.cost <= case when prefs.currency = 'PKR' then coalesce(prefs.max_budget, 2500) else 2500 end
          then 15
        else 0
      end as budget_score,
      case when lower(btrim(experience.city)) = lower(nullif(btrim(prefs.city), '')) then 15 else 0 end as location_score,
      case when experience.category = any(prefs.experience_category_slugs::text[]) then 10 else 0 end as category_score
    from public.user_preferences as prefs
    cross join public.solo_experiences as experience
    where prefs.user_id = (select auth.uid()) and experience.status = 'approved'
  )
  select
    (listing).id, (listing).submitted_by, (listing).title, (listing).description,
    (listing).category, (listing).city, (listing).location, (listing).source_url, (listing).cost,
    (listing).currency, (listing).duration_minutes, (listing).status, (listing).created_at,
    (listing).updated_at, (listing).latitude, (listing).longitude, (listing).opening_hours,
    (listing).social_level, (listing).safety_considerations, (listing).accessibility_information,
    (listing).cover_url,
    social_comfort_score + interest_score + budget_score + location_score + category_score as total_score,
    social_comfort_score, interest_score, budget_score, location_score, category_score
  from factors
  order by total_score desc, (listing).created_at desc, (listing).id desc
  limit least(100, greatest(0, coalesce(p_limit, 10)));
$$;

create function public.admin_list_experiences(
  p_status text default 'pending', p_limit integer default 20, p_offset integer default 0
)
returns table (
  id uuid,
  submitted_by uuid,
  title text,
  description text,
  category text,
  city text,
  location text,
  source_url text,
  cost numeric,
  currency text,
  duration_minutes integer,
  status public.review_status,
  created_at timestamptz,
  updated_at timestamptz,
  latitude numeric,
  longitude numeric,
  opening_hours text,
  social_level public.social_comfort,
  safety_considerations text,
  accessibility_information text,
  cover_url text,
  submitter_username text,
  tags jsonb,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_status is not null and p_status not in ('pending', 'approved', 'rejected', 'needs_info') then
    raise exception 'Unknown experience status' using errcode = '22023';
  end if;

  return query
  select
    experience.id, experience.submitted_by, experience.title, experience.description,
    experience.category, experience.city, experience.location, experience.source_url,
    experience.cost, experience.currency, experience.duration_minutes, experience.status,
    experience.created_at, experience.updated_at, experience.latitude, experience.longitude,
    experience.opening_hours, experience.social_level, experience.safety_considerations,
    experience.accessibility_information, experience.cover_url,
    profile.username,
    coalesce((
      select jsonb_agg(jsonb_build_object('slug', interest.slug, 'name', interest.name)
        order by interest.name, interest.slug)
      from public.solo_experience_tags as tag
      join public.interests as interest on interest.slug = tag.interest_slug
      where tag.experience_id = experience.id
    ), '[]'::jsonb),
    count(*) over ()
  from public.solo_experiences as experience
  left join public.profiles as profile on profile.id = experience.submitted_by
  where experience.status <> 'archived'
    and (p_status is null or experience.status = p_status::public.review_status)
  order by experience.created_at desc, experience.id desc
  limit least(100, greatest(1, coalesce(p_limit, 20)))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

create function public.admin_review_experience(p_id uuid, p_decision text, p_note text default null)
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
  return query select p_id, next_status;
end;
$$;

-- PostgreSQL requires recreating a function to append an OUT column.
drop function public.admin_dashboard_stats();

create function public.admin_dashboard_stats()
returns table (
  registered_users bigint, published_opportunities bigint, pending_submissions bigint,
  pending_organisations bigint, open_reports bigint, pending_experiences bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  return query select
    (select count(*) from auth.users),
    (select count(*) from public.opportunities as listing
      where public.opportunity_is_public(listing.status, listing.deadline, listing.ends_at)),
    (select count(*) from public.opportunities as listing where listing.status = 'pending'),
    (select count(*) from public.organisations as org where org.status = 'pending'),
    (select count(*) from public.reports as report where report.status = 'open'),
    (select count(*) from public.solo_experiences as experience where experience.status = 'pending');
end;
$$;

revoke all on function
  public.search_experiences(text, text, text, numeric, public.social_comfort, text[], integer, integer),
  public.get_experience(uuid),
  public.get_recommended_experiences(integer),
  public.recommend_experience(text, text, text, text, text, numeric, numeric, numeric, integer,
    public.social_comfort, text, text, text[], text, text, text),
  public.set_experience_tags(uuid, text[]),
  public.admin_list_experiences(text, integer, integer),
  public.admin_review_experience(uuid, text, text),
  public.admin_dashboard_stats()
from public, anon, authenticated;

grant execute on function
  public.search_experiences(text, text, text, numeric, public.social_comfort, text[], integer, integer),
  public.get_experience(uuid)
to anon, authenticated;

grant execute on function
  public.get_recommended_experiences(integer),
  public.recommend_experience(text, text, text, text, text, numeric, numeric, numeric, integer,
    public.social_comfort, text, text, text[], text, text, text),
  public.set_experience_tags(uuid, text[]),
  public.admin_list_experiences(text, integer, integer),
  public.admin_review_experience(uuid, text, text),
  public.admin_dashboard_stats()
to authenticated;
