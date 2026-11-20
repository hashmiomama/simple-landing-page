alter table public.organisations
  add column organisation_type text,
  add column official_email text,
  add column representative_name text,
  add column representative_title text,
  add column representative_email text,
  add column evidence_notes text,
  add constraint organisations_one_request_per_owner unique (owner_id);

alter table public.opportunities
  add column search_document tsvector generated always as (
    setweight(to_tsvector('pg_catalog.english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('pg_catalog.english', coalesce(organisation_name, '') || ' ' || coalesce(category_slug, '')), 'B') ||
    setweight(to_tsvector('pg_catalog.english', coalesce(description, '') || ' ' || coalesce(location, '') || ' ' || coalesce(city, '')), 'C')
  ) stored;

create index opportunities_search_document_idx on public.opportunities using gin (search_document);
create index opportunities_lower_city_idx on public.opportunities (lower(btrim(city)));
create index opportunities_format_idx on public.opportunities (format);
create index opportunities_starts_at_idx on public.opportunities (starts_at);
create index opportunities_ends_at_idx on public.opportunities (ends_at);
create index opportunities_created_at_idx on public.opportunities (created_at desc);

create function public.opportunity_is_public(
  p_status public.review_status, p_deadline timestamptz, p_ends_at timestamptz
)
returns boolean
language sql
stable
as $$
  select p_status = 'approved'
    and (p_deadline is null or p_deadline > pg_catalog.now())
    and (p_ends_at is null or p_ends_at > pg_catalog.now());
$$;

revoke all on function public.opportunity_is_public(public.review_status, timestamptz, timestamptz) from public;
grant execute on function public.opportunity_is_public(public.review_status, timestamptz, timestamptz)
to anon, authenticated, service_role;

alter policy published_read on public.opportunities
using (public.opportunity_is_public(status, deadline, ends_at));

alter policy published_tags_read on public.opportunity_tags
using (exists (
  select 1 from public.opportunities as listing
  where listing.id = opportunity_tags.opportunity_id
    and public.opportunity_is_public(listing.status, listing.deadline, listing.ends_at)
));

grant select on public.opportunity_categories to anon;
create policy guest_catalog_read on public.opportunity_categories for select to anon
using (true);

create function public.is_http_url(p_url text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    p_url ~* '^https?://[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*(:[0-9]{1,5})?([/?#][^[:space:]<>]*)?$'
    and strpos(p_url, chr(92)) = 0
    and coalesce(substring(lower(p_url) from '^https?://[^/:?#]+:([0-9]{1,5})')::int between 1 and 65535, true),
    false
  );
$$;

revoke all on function public.is_http_url(text) from public, anon;
grant execute on function public.is_http_url(text) to authenticated, service_role;

-- New requests require complete contact and evidence details. The new columns remain nullable for legacy rows.
create function public.organisation_request_complete(p_request public.organisations)
returns boolean
language sql
stable
set search_path = ''
as $$
  select num_nonnulls(
    nullif(btrim(p_request.name), ''),
    nullif(btrim(p_request.organisation_type), ''),
    nullif(btrim(p_request.representative_name), ''),
    nullif(btrim(p_request.representative_title), ''),
    nullif(btrim(p_request.evidence_notes), '')
  ) = 5
  and public.is_http_url(btrim(p_request.website_url))
  and coalesce(btrim(p_request.official_email) ~ '^[^[:space:]@]+@[^[:space:]@.]+(\.[^[:space:]@.]+)+$', false)
  and coalesce(btrim(p_request.representative_email) ~ '^[^[:space:]@]+@[^[:space:]@.]+(\.[^[:space:]@.]+)+$', false);
$$;

revoke all on function public.organisation_request_complete(public.organisations) from public, anon;
grant execute on function public.organisation_request_complete(public.organisations) to authenticated;

drop policy admin_access on public.organisations;
revoke insert, update, delete on public.organisations from authenticated;
alter table public.organisations alter column owner_id set default auth.uid();
grant insert (name, description, website_url, organisation_type, official_email,
  representative_name, representative_title, representative_email, evidence_notes)
on public.organisations to authenticated;
grant update (name, description, website_url, organisation_type, official_email,
  representative_name, representative_title, representative_email, evidence_notes)
on public.organisations to authenticated;

create policy owner_or_admin_read on public.organisations for select to authenticated
using (owner_id = (select auth.uid()) or (select public.has_role((select auth.uid()), 'admin')));

create policy owner_request_insert on public.organisations for insert to authenticated
with check (
  owner_id = (select auth.uid()) and status = 'pending'
  and public.organisation_request_complete(organisations)
);

create policy owner_request_update on public.organisations for update to authenticated
using (owner_id = (select auth.uid()) and status = 'pending')
with check (
  owner_id = (select auth.uid()) and status = 'pending'
  and public.organisation_request_complete(organisations)
);

create function public.review_organisation(
  org_id uuid, decision public.review_status, note text default null
)
returns table (organisation_id uuid, status public.review_status)
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewer uuid := auth.uid();
  request public.organisations;
begin
  if not public.has_role(reviewer, 'admin') then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if decision is null or decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected' using errcode = '22023';
  end if;

  select * into request from public.organisations as org
  where org.id = org_id and org.status = 'pending'
  for update;
  if not found then
    raise exception 'No pending organisation request found' using errcode = 'P0002';
  end if;
  if decision = 'approved' and not public.organisation_request_complete(request) then
    raise exception 'Complete all organisation registration details before approving' using errcode = '23514';
  end if;

  update public.organisations as org set status = decision where org.id = request.id;
  if decision = 'approved' then
    insert into public.user_roles (user_id, role) values (request.owner_id, 'organisation')
    on conflict (user_id, role) do nothing;
  end if;

  insert into public.admin_audit_logs (actor_id, action, target_table, target_id, details)
  values (reviewer, 'review_organisation', 'organisations', request.id::text,
          jsonb_build_object('decision', decision, 'note', nullif(btrim(note), '')));

  return query select request.id, decision;
end;
$$;

revoke all on function public.review_organisation(uuid, public.review_status, text) from public, anon, authenticated;
grant execute on function public.review_organisation(uuid, public.review_status, text) to authenticated;

create function public.owns_approved_organisation(p_organisation_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select public.has_role((select auth.uid()), 'organisation') and exists (
    select 1 from public.organisations as org
    where org.id = p_organisation_id and org.owner_id = (select auth.uid()) and org.status = 'approved'
  );
$$;

revoke all on function public.owns_approved_organisation(uuid) from public, anon;
grant execute on function public.owns_approved_organisation(uuid) to authenticated;

-- Authenticated submissions go through the atomic RPC. Owners can update content fields on existing rows.
drop policy admin_access on public.opportunities;
revoke insert, update, delete on public.opportunities from authenticated;
grant update (title, category_slug, organisation_name, description, source_url, deadline,
  starts_at, ends_at, eligibility, location, city, country, format, cost_or_funding, cover_url)
on public.opportunities to authenticated;

create policy admin_read on public.opportunities for select to authenticated
using ((select public.has_role((select auth.uid()), 'admin')));

create policy own_submission_read on public.opportunities for select to authenticated
using (
  submitted_by = (select auth.uid())
  and (status in ('pending', 'rejected')
    or (status = 'approved' and public.owns_approved_organisation(organisation_id)))
);

create policy own_submission_update on public.opportunities for update to authenticated
using (
  submitted_by = (select auth.uid())
  and (
    (organisation_id is null and status in ('pending', 'rejected'))
    or (status in ('pending', 'rejected', 'approved') and public.owns_approved_organisation(organisation_id))
  )
)
with check (
  submitted_by = (select auth.uid())
  and status in ('pending', 'rejected')
  and (organisation_id is null or public.owns_approved_organisation(organisation_id))
);

drop policy admin_access on public.opportunity_tags;
revoke insert, update, delete on public.opportunity_tags from authenticated;

create policy admin_read on public.opportunity_tags for select to authenticated
using ((select public.has_role((select auth.uid()), 'admin')));

create policy own_submission_tags_read on public.opportunity_tags for select to authenticated
using (exists (
  select 1 from public.opportunities as listing
  where listing.id = opportunity_tags.opportunity_id
    and listing.submitted_by = (select auth.uid())
    and (listing.status in ('pending', 'rejected')
      or (listing.status = 'approved' and public.owns_approved_organisation(listing.organisation_id)))
));

create function public.validate_opportunity_submission()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and current_user <> 'authenticated' then
    return new;
  end if;

  if num_nonnulls(
    nullif(btrim(new.title), ''), nullif(btrim(new.category_slug), ''),
    nullif(btrim(new.organisation_name), ''), nullif(btrim(new.description), ''),
    nullif(btrim(new.eligibility), ''), nullif(btrim(new.location), ''),
    nullif(btrim(new.cost_or_funding), ''), new.format
  ) <> 8 then
    raise exception 'Complete all required listing fields' using errcode = '23514';
  end if;
  if not public.is_http_url(new.source_url) or (new.cover_url is not null and not public.is_http_url(new.cover_url)) then
    raise exception 'Use an absolute HTTP or HTTPS URL' using errcode = '23514';
  end if;
  if (tg_op = 'INSERT' or new.deadline is distinct from old.deadline) and new.deadline < now() then
    raise exception 'The deadline cannot be in the past' using errcode = '23514';
  end if;
  if new.ends_at < new.starts_at then
    raise exception 'The end date must be on or after the start date' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' and new.organisation_id is not null
    and new.organisation_name is distinct from old.organisation_name then
    raise exception 'The official listing uses the approved organisation name' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and old.status = 'approved' then
    new.status := 'pending';
    new.last_verified_at := null;
  end if;
  return new;
end;
$$;

revoke all on function public.validate_opportunity_submission() from public, anon, authenticated;
create trigger validate_opportunity_submission
before insert or update on public.opportunities
for each row execute function public.validate_opportunity_submission();

create function public.submit_opportunity(
  p_title text,
  p_category_slug text,
  p_organisation_name text,
  p_description text,
  p_source_url text,
  p_eligibility text,
  p_location text,
  p_mode public.event_format,
  p_cost_or_funding text,
  p_interest_slugs text[],
  p_deadline timestamptz default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_city text default null,
  p_country text default null,
  p_cover_url text default null,
  p_organisation_id uuid default null
)
returns table (opportunity_id uuid, status public.review_status)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  listing_id uuid;
  organisation_name text := btrim(p_organisation_name);
begin
  if caller is null or (p_organisation_id is null and not public.has_role(caller, 'member')) then
    raise exception 'A signed-in member account is required' using errcode = '42501';
  end if;
  if coalesce(cardinality(p_interest_slugs), 0) = 0 or exists (
    select 1 from unnest(p_interest_slugs) as tag(slug)
    where not exists (select 1 from public.interests as interest where interest.slug = tag.slug)
  ) then
    raise exception 'Choose at least one valid interest tag' using errcode = '23514';
  end if;
  if not exists (select 1 from public.opportunity_categories as cat where cat.slug = p_category_slug) then
    raise exception 'Choose a valid opportunity category' using errcode = '23514';
  end if;
  if p_organisation_id is not null then
    if not public.has_role(caller, 'organisation') then
      raise exception 'An approved organisation account is required' using errcode = '42501';
    end if;

    select org.name into organisation_name from public.organisations as org
    where org.id = p_organisation_id and org.owner_id = caller and org.status = 'approved'
    for share;
    if not found then
      raise exception 'You can submit official listings only for your approved organisation' using errcode = '42501';
    end if;
  end if;

  insert into public.opportunities (
    title, category_slug, organisation_name, description, source_url, eligibility,
    location, format, cost_or_funding, deadline, starts_at, ends_at, city, country, cover_url,
    organisation_id, submitted_by, status, last_verified_at
  )
  values (
    btrim(p_title), p_category_slug, organisation_name, btrim(p_description), btrim(p_source_url),
    btrim(p_eligibility), btrim(p_location), p_mode, btrim(p_cost_or_funding), p_deadline, p_starts_at,
    p_ends_at, nullif(btrim(p_city), ''), nullif(btrim(p_country), ''), nullif(btrim(p_cover_url), ''),
    p_organisation_id, caller, 'pending', null
  ) returning id into listing_id;

  insert into public.opportunity_tags (opportunity_id, interest_slug)
  select distinct listing_id, tag.slug from unnest(p_interest_slugs) as tag(slug);

  return query select listing_id, 'pending'::public.review_status;
end;
$$;

revoke all on function public.submit_opportunity(text, text, text, text, text, text, text, public.event_format, text, text[], timestamptz, timestamptz, timestamptz, text, text, text, uuid)
from public, anon, authenticated;
grant execute on function public.submit_opportunity(text, text, text, text, text, text, text, public.event_format, text, text[], timestamptz, timestamptz, timestamptz, text, text, text, uuid)
to authenticated;

create function public.search_opportunities(
  p_keyword text default null,
  p_category_slugs text[] default null,
  p_interest_slugs text[] default null,
  p_city text default null,
  p_mode public.event_format default null,
  p_deadline_before timestamptz default null,
  p_start_after timestamptz default null,
  p_free_only boolean default false,
  p_funded_only boolean default false,
  p_verified_only boolean default false,
  p_sort text default 'relevance',
  p_limit int default 20,
  p_offset int default 0
)
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
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with input as (
    select case when nullif(btrim(p_keyword), '') is not null
      then websearch_to_tsquery('pg_catalog.english', btrim(p_keyword)) end as keyword_query,
      nullif(lower(btrim(p_city)), '') as city_filter,
      case when p_sort in ('relevance', 'newest', 'nearest_deadline', 'upcoming_date')
        then p_sort else 'relevance' end as sort_by
  )
  select
    listing.id, listing.organisation_id, listing.submitted_by, listing.category_slug,
    listing.title, listing.organisation_name, listing.description, listing.source_url,
    listing.deadline, listing.starts_at, listing.ends_at, listing.eligibility, listing.location,
    listing.city, listing.country, listing.format, listing.cost_or_funding, listing.cover_url,
    listing.status, listing.last_verified_at, listing.created_at, listing.updated_at,
    count(*) over () as total_count
  from public.opportunities as listing
  cross join input
  where public.opportunity_is_public(listing.status, listing.deadline, listing.ends_at)
    and (input.keyword_query is null or listing.search_document @@ input.keyword_query)
    and (coalesce(cardinality(p_category_slugs), 0) = 0 or listing.category_slug = any(p_category_slugs))
    and (coalesce(cardinality(p_interest_slugs), 0) = 0 or exists (
      select 1 from public.opportunity_tags as tag
      where tag.opportunity_id = listing.id and tag.interest_slug = any(p_interest_slugs)
    ))
    and (input.city_filter is null or lower(btrim(listing.city)) = input.city_filter)
    and (p_mode is null or listing.format = p_mode)
    and (p_deadline_before is null or listing.deadline <= p_deadline_before)
    and (p_start_after is null or listing.starts_at >= p_start_after)
    and (not coalesce(p_free_only, false) or lower(btrim(listing.cost_or_funding)) in ('free', 'fully funded', 'pkr 0', 'pkr 0.0', 'pkr 0.00'))
    and (not coalesce(p_funded_only, false) or lower(btrim(listing.cost_or_funding)) in ('funded', 'fully funded', 'partially funded'))
    and (not coalesce(p_verified_only, false) or listing.last_verified_at is not null)
  order by
    case when input.sort_by = 'relevance' then ts_rank(listing.search_document, input.keyword_query) end desc nulls last,
    case when input.sort_by = 'nearest_deadline' then listing.deadline end asc nulls last,
    case when input.sort_by = 'upcoming_date' and listing.starts_at >= now() then listing.starts_at end asc nulls last,
    listing.created_at desc, listing.id
  limit least(100, greatest(1, coalesce(p_limit, 20)))
  offset greatest(0, coalesce(p_offset, 0));
$$;

revoke all on function public.search_opportunities(text, text[], text[], text, public.event_format, timestamptz, timestamptz, boolean, boolean, boolean, text, int, int)
from public, anon, authenticated;
grant execute on function public.search_opportunities(text, text[], text[], text, public.event_format, timestamptz, timestamptz, boolean, boolean, boolean, text, int, int)
to anon, authenticated;

create function public.get_opportunity(p_id uuid)
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
  tags jsonb,
  saved boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    listing.id, listing.organisation_id, listing.submitted_by, listing.category_slug,
    listing.title, listing.organisation_name, listing.description, listing.source_url,
    listing.deadline, listing.starts_at, listing.ends_at, listing.eligibility, listing.location,
    listing.city, listing.country, listing.format, listing.cost_or_funding, listing.cover_url,
    listing.status, listing.last_verified_at, listing.created_at, listing.updated_at,
    coalesce((
      select jsonb_agg(jsonb_build_object('slug', interest.slug, 'name', interest.name) order by interest.name, interest.slug)
      from public.opportunity_tags as tag
      join public.interests as interest on interest.slug = tag.interest_slug
      where tag.opportunity_id = listing.id
    ), '[]'::jsonb),
    exists (
      select 1 from public.saved_opportunities as bookmark
      where bookmark.user_id = (select auth.uid()) and bookmark.opportunity_id = listing.id
    )
  from public.opportunities as listing
  where listing.id = p_id
    and public.opportunity_is_public(listing.status, listing.deadline, listing.ends_at);
$$;

revoke all on function public.get_opportunity(uuid) from public, anon, authenticated;
grant execute on function public.get_opportunity(uuid) to anon, authenticated;

alter policy owner_insert on public.saved_opportunities
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.opportunities as listing
    where listing.id = saved_opportunities.opportunity_id
      and public.opportunity_is_public(listing.status, listing.deadline, listing.ends_at)
  )
);

create function public.list_saved_opportunities()
returns table (
  opportunity_id uuid, title text, deadline timestamptz, saved_at timestamptz, is_expired boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select listing.id, listing.title, listing.deadline, bookmark.created_at,
    not public.opportunity_is_public(listing.status, listing.deadline, listing.ends_at)
  from public.saved_opportunities as bookmark
  join public.opportunities as listing on listing.id = bookmark.opportunity_id
  where bookmark.user_id = (select auth.uid()) and listing.status = 'approved'
  order by bookmark.created_at desc, listing.id;
$$;

revoke all on function public.list_saved_opportunities() from public, anon, authenticated;
grant execute on function public.list_saved_opportunities() to authenticated;

drop policy admin_access on public.reports;
revoke insert, update, delete on public.reports from authenticated;
alter table public.reports alter column reporter_id set default auth.uid();
grant insert (opportunity_id, reason, details) on public.reports to authenticated;

create policy owner_or_admin_read on public.reports for select to authenticated
using (reporter_id = (select auth.uid()) or (select public.has_role((select auth.uid()), 'admin')));

create policy owner_opportunity_report on public.reports for insert to authenticated
with check (
  reporter_id = (select auth.uid()) and status = 'open' and opportunity_id is not null
  and reported_user_id is null and solo_experience_id is null and activity_id is null and message_id is null
  and exists (
    select 1 from public.opportunities as listing
    where listing.id = reports.opportunity_id
      and public.opportunity_is_public(listing.status, listing.deadline, listing.ends_at)
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('opportunity-covers', 'opportunity-covers', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Public bucket URLs serve files. The read policy grants owners the metadata access used for delete.
create policy opportunity_cover_owner_read on storage.objects for select to authenticated
using (bucket_id = 'opportunity-covers' and owner_id = (select auth.uid()::text));

create policy opportunity_cover_owner_upload on storage.objects for insert to authenticated
with check (
  bucket_id = 'opportunity-covers'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy opportunity_cover_owner_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'opportunity-covers'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- Keep the Phase 2 RPC result contracts and apply the same publication rule.
create or replace function public.get_recommended_opportunities(p_limit int default 10)
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
    where public.opportunity_is_public(listing.status, listing.deadline, listing.ends_at)
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
    (listing).id, (listing).organisation_id, (listing).submitted_by, (listing).category_slug,
    (listing).title, (listing).organisation_name, (listing).description, (listing).source_url,
    (listing).deadline, (listing).starts_at, (listing).ends_at, (listing).eligibility,
    (listing).location, (listing).city, (listing).country, (listing).format,
    (listing).cost_or_funding, (listing).cover_url, (listing).status, (listing).last_verified_at,
    (listing).created_at, (listing).updated_at,
    interest_score + category_score + location_score + social_comfort_score + budget_score + recency_score
      as total_score,
    interest_score, category_score, location_score, social_comfort_score, budget_score, recency_score
  from factors
  order by total_score desc, (listing).deadline asc nulls last, (listing).id
  limit least(100, greatest(0, coalesce(p_limit, 10)));
$$;

create or replace function public.get_dashboard_summary()
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
    where public.opportunity_is_public(listing.status, listing.deadline, listing.ends_at)
      and listing.deadline > now()
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
