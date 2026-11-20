-- Compare against text in policies because the new enum label becomes usable at commit.
alter type public.review_status add value if not exists 'needs_info';

alter table public.verification_reviews
  add column decision text check (decision in ('approve', 'reject', 'request_info')),
  add column note text;

create index verification_reviews_listing_history_idx
on public.verification_reviews (opportunity_id, created_at desc, id desc);

create index opportunities_review_queue_idx
on public.opportunities (status, created_at desc, id desc);

alter policy own_submission_read on public.opportunities
using (
  submitted_by = (select auth.uid())
  and (status::text in ('pending', 'rejected', 'needs_info')
    or (status = 'approved' and public.owns_approved_organisation(organisation_id)))
);

alter policy own_submission_update on public.opportunities
using (
  submitted_by = (select auth.uid())
  and (
    (organisation_id is null and status::text in ('pending', 'rejected', 'needs_info'))
    or (status::text in ('pending', 'rejected', 'needs_info', 'approved')
      and public.owns_approved_organisation(organisation_id))
  )
)
with check (
  submitted_by = (select auth.uid())
  and status::text in ('pending', 'rejected', 'needs_info')
  and (organisation_id is null or public.owns_approved_organisation(organisation_id))
);

alter policy own_submission_tags_read on public.opportunity_tags
using (exists (
  select 1 from public.opportunities as listing
  where listing.id = opportunity_tags.opportunity_id
    and listing.submitted_by = (select auth.uid())
    and (listing.status::text in ('pending', 'rejected', 'needs_info')
      or (listing.status = 'approved' and public.owns_approved_organisation(listing.organisation_id)))
));

-- Keep decision history append-only for browser clients.
drop policy admin_access on public.verification_reviews;
revoke insert, update, delete on public.verification_reviews from authenticated;
create policy admin_read on public.verification_reviews for select to authenticated
using ((select public.has_role((select auth.uid()), 'admin')));

create function public.opportunity_missing_fields(p_listing public.opportunities)
returns text[]
language sql
stable
set search_path = ''
as $$
  select coalesce(array_agg(field.name order by field.position) filter (where field.missing), '{}'::text[])
  from (values
    (1, 'title', nullif(btrim(p_listing.title), '') is null),
    (2, 'category_slug', nullif(btrim(p_listing.category_slug), '') is null),
    (3, 'organisation_name', nullif(btrim(p_listing.organisation_name), '') is null),
    (4, 'description', nullif(btrim(p_listing.description), '') is null),
    (5, 'source_url', nullif(btrim(p_listing.source_url), '') is null),
    (6, 'eligibility', nullif(btrim(p_listing.eligibility), '') is null),
    (7, 'location', nullif(btrim(p_listing.location), '') is null),
    (8, 'format', p_listing.format is null),
    (9, 'cost_or_funding', nullif(btrim(p_listing.cost_or_funding), '') is null),
    (10, 'interest_tags', not exists (
      select 1 from public.opportunity_tags as tag where tag.opportunity_id = p_listing.id
    ))
  ) as field(position, name, missing);
$$;

revoke all on function public.opportunity_missing_fields(public.opportunities)
from public, anon, authenticated;

create function public.admin_list_submissions(
  p_status text default 'pending', p_limit integer default 20, p_offset integer default 0
)
returns table (
  id uuid, title text, category_slug text, status public.review_status,
  submitted_by uuid, submitter_username text, organisation_name text,
  deadline timestamptz, created_at timestamptz, last_verified_at timestamptz, total_count bigint
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
    raise exception 'Unknown submission status' using errcode = '22023';
  end if;

  return query
  select listing.id, listing.title, listing.category_slug, listing.status, listing.submitted_by,
    profile.username, listing.organisation_name, listing.deadline,
    listing.created_at, listing.last_verified_at, count(*) over ()
  from public.opportunities as listing
  left join public.profiles as profile on profile.id = listing.submitted_by
  where listing.status <> 'archived'
    and (p_status is null or listing.status = p_status::public.review_status)
  order by listing.created_at desc, listing.id desc
  limit least(100, greatest(1, coalesce(p_limit, 20)))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

create function public.admin_get_submission(p_id uuid)
returns table (listing jsonb, tags jsonb, submitter_username text, reviews jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  return query
  select to_jsonb(opportunity) - 'search_document',
    coalesce((
      select jsonb_agg(jsonb_build_object('slug', interest.slug, 'name', interest.name)
        order by interest.name, interest.slug)
      from public.opportunity_tags as tag
      join public.interests as interest on interest.slug = tag.interest_slug
      where tag.opportunity_id = opportunity.id
    ), '[]'::jsonb),
    profile.username,
    coalesce((
      select jsonb_agg(to_jsonb(recent) order by recent.created_at desc, recent.id desc)
      from (
        select review.id, review.reviewer_id, review.reviewer_kind, reviewer.username as reviewer_username,
          review.status, review.decision, review.note, review.report, review.created_at
        from public.verification_reviews as review
        left join public.profiles as reviewer on reviewer.id = review.reviewer_id
        where review.opportunity_id = opportunity.id
        order by review.created_at desc, review.id desc
        limit 10
      ) as recent
    ), '[]'::jsonb)
  from public.opportunities as opportunity
  left join public.profiles as profile on profile.id = opportunity.submitted_by
  where opportunity.id = p_id;
end;
$$;

create function public.admin_review_opportunity(p_id uuid, p_decision text, p_note text default null)
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

  return query select p_id, next_status, verification_time, new_review_id;
end;
$$;

create function public.list_opportunity_review_notes(p_id uuid)
returns table (decision text, note text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select review.decision, review.note, review.created_at
  from public.verification_reviews as review
  join public.opportunities as listing on listing.id = review.opportunity_id
  where listing.id = p_id
    and listing.submitted_by = (select auth.uid())
    and review.decision is not null and review.note is not null
  order by review.created_at desc, review.id desc;
$$;

create function public.resubmit_opportunity(p_id uuid)
returns table (opportunity_id uuid, status public.review_status)
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing public.opportunities;
begin
  select opportunity.* into listing from public.opportunities as opportunity
  where opportunity.id = p_id and opportunity.submitted_by = (select auth.uid())
    and opportunity.status::text = 'needs_info' for update;
  if not found or (listing.organisation_id is not null and not public.owns_approved_organisation(listing.organisation_id)) then
    raise exception 'No eligible submission found' using errcode = '42501';
  end if;
  if cardinality(public.opportunity_missing_fields(listing)) > 0
    or not public.is_http_url(listing.source_url)
    or listing.deadline <= now()
    or listing.ends_at <= now() then
    raise exception 'Complete the required fields and correct the source URL or expired dates before resubmitting'
      using errcode = '23514';
  end if;

  update public.opportunities as opportunity set status = 'pending', last_verified_at = null
  where opportunity.id = p_id;

  return query select p_id, 'pending'::public.review_status;
end;
$$;

create function public.admin_verification_report(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewer uuid := auth.uid();
  listing public.opportunities;
  missing_fields text[];
  tags text[];
  duplicates jsonb;
  text_to_check text;
  mail_domain text;
  payment_flag boolean;
  urgency_flag boolean;
  free_email_flag boolean;
  source_valid boolean;
  source_https boolean;
  deadline_valid boolean;
  event_dates_valid boolean;
  action text;
  reason text;
  generated_report jsonb;
begin
  if not public.has_role(reviewer, 'admin') then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select opportunity.* into listing from public.opportunities as opportunity
  where opportunity.id = p_id for share;
  if not found then
    raise exception 'No listing found' using errcode = 'P0002';
  end if;

  missing_fields := public.opportunity_missing_fields(listing);
  select coalesce(array_agg(tag.interest_slug order by tag.interest_slug), '{}'::text[]) into tags
  from public.opportunity_tags as tag where tag.opportunity_id = p_id;

  select coalesce(jsonb_agg(to_jsonb(candidate) order by candidate.created_at desc, candidate.id desc), '[]'::jsonb)
  into duplicates
  from (
    select other.id, other.title, other.created_at,
      lower(btrim(other.title)) = lower(btrim(listing.title)) as matching_title,
      btrim(other.source_url) = btrim(listing.source_url) as matching_source_url
    from public.opportunities as other
    where other.id <> p_id
      and (
        (nullif(btrim(listing.title), '') is not null and lower(btrim(other.title)) = lower(btrim(listing.title)))
        or (nullif(btrim(listing.source_url), '') is not null and btrim(other.source_url) = btrim(listing.source_url))
      )
    order by other.created_at desc, other.id desc
    limit 10
  ) as candidate;

  select nullif(lower(split_part(btrim(org.official_email), '@', 2)), '') into mail_domain
  from public.organisations as org where org.id = listing.organisation_id;
  free_email_flag := mail_domain in ('gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
    'live.com', 'icloud.com', 'aol.com', 'proton.me', 'protonmail.com');
  text_to_check := concat_ws(' ', listing.title, listing.description, listing.eligibility, listing.cost_or_funding);
  payment_flag := text_to_check ~* '\m(registration[[:space:]]+fee|send[[:space:]]+money|processing[[:space:]]+fee)\M';
  urgency_flag := text_to_check ~* '\m(act[[:space:]]+now|urgent|limited[[:space:]]+time|immediate[[:space:]]+payment|expires[[:space:]]+today)\M';
  source_valid := public.is_http_url(listing.source_url);
  source_https := source_valid and listing.source_url ~* '^https://';
  deadline_valid := listing.deadline > now();
  event_dates_valid := listing.ends_at > listing.starts_at;

  if cardinality(missing_fields) > 0 or not source_valid
    or deadline_valid is false or event_dates_valid is false then
    action := 'request_info';
    reason := 'Clarify missing fields or correct the source URL or dates.';
  elsif payment_flag and urgency_flag then
    action := 'reject';
    reason := 'Payment and urgency wording appear together. Review both signals before deciding.';
  elsif not source_https or jsonb_array_length(duplicates) > 0
    or payment_flag or urgency_flag or free_email_flag is true then
    action := 'request_info';
    reason := 'Check the flagged URL, possible duplicates or wording and contact signals.';
  else
    action := 'approve';
    reason := 'No blocking rule was triggered. Manually check the source and organiser before approval.';
  end if;

  generated_report := jsonb_build_object(
    'method', 'rules',
    'generated_at', now(),
    'extracted_fields', (to_jsonb(listing) - 'search_document') || jsonb_build_object('interest_tags', tags),
    'missing_required_fields', missing_fields,
    'checks', jsonb_build_object(
      'required_fields', case when cardinality(missing_fields) = 0 then 'passed' else 'failed' end,
      'source_url_well_formed', case when source_valid then 'passed' else 'failed' end,
      'source_url_https', case when source_https then 'passed' else 'failed' end,
      'deadline_in_future', case when deadline_valid then 'passed' when deadline_valid is false then 'failed' else 'needs manual verification' end,
      'end_after_start', case when event_dates_valid then 'passed' when event_dates_valid is false then 'failed' else 'needs manual verification' end,
      'eligibility_present', case when 'eligibility' = any(missing_fields) then 'failed' else 'passed' end,
      'cost_present', case when 'cost_or_funding' = any(missing_fields) then 'failed' else 'passed' end,
      'duplicate_scan', case when jsonb_array_length(duplicates) > 0 then 'failed' else 'passed' end,
      'payment_wording', case when payment_flag then 'failed' else 'passed' end,
      'urgency_wording', case when urgency_flag then 'failed' else 'passed' end,
      'organisation_email_domain', case when free_email_flag then 'failed' when free_email_flag is false then 'passed' else 'needs manual verification' end,
      'source_page_matches', 'needs manual verification',
      'organiser_identity', 'needs manual verification'
    ),
    'duplicate_indicators', duplicates,
    'scam_indicators', jsonb_build_object(
      'payment_wording', payment_flag, 'urgency_wording', urgency_flag, 'free_email_domain', free_email_flag,
      'organisation_email_domain', mail_domain
    ),
    'recommended_action', action,
    'reason', reason
  );

  insert into public.verification_reviews (opportunity_id, reviewer_id, reviewer_kind, status, report)
  values (p_id, reviewer, 'admin', listing.status, generated_report);
  return generated_report;
end;
$$;

create function public.admin_list_organisations(p_status text default 'pending')
returns setof public.organisations
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_status is not null and p_status not in ('pending', 'approved', 'rejected', 'archived') then
    raise exception 'Unknown organisation status' using errcode = '22023';
  end if;
  return query
  select org.* from public.organisations as org
  where p_status is null or org.status = p_status::public.review_status
  order by org.created_at desc, org.id desc;
end;
$$;

create function public.admin_dashboard_stats()
returns table (
  registered_users bigint, published_opportunities bigint, pending_submissions bigint,
  pending_organisations bigint, open_reports bigint
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
    (select count(*) from public.reports as report where report.status = 'open');
end;
$$;

create function public.admin_list_audit_logs(p_limit integer default 20, p_offset integer default 0)
returns table (
  id uuid, actor_id uuid, actor_username text, action text, target_table text,
  target_id text, details jsonb, created_at timestamptz, total_count bigint
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

  return query
  select audit.id, audit.actor_id, profile.username, audit.action, audit.target_table,
    audit.target_id, audit.details, audit.created_at, count(*) over ()
  from public.admin_audit_logs as audit
  left join public.profiles as profile on profile.id = audit.actor_id
  order by audit.created_at desc, audit.id desc
  limit least(100, greatest(1, coalesce(p_limit, 20)))
  offset greatest(0, coalesce(p_offset, 0));
end;
$$;

create function public.get_opportunity_status(p_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case
      when public.opportunity_is_public(listing.status, listing.deadline, listing.ends_at) then 'available'
      else 'expired'
    end
    from public.opportunities as listing
    where listing.id = p_id and listing.status = 'approved'
  ), 'unavailable');
$$;

create function public.set_opportunity_tags(p_id uuid, p_interest_slugs text[])
returns table (opportunity_id uuid, interest_slugs text[])
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  admin boolean := public.has_role(caller, 'admin');
  listing public.opportunities;
  new_tags text[];
begin
  select opportunity.* into listing
  from public.opportunities as opportunity
  where opportunity.id = p_id
    and (admin or (opportunity.submitted_by = caller and opportunity.status::text in ('pending', 'rejected', 'needs_info')))
  for update;
  if not found then
    raise exception 'No editable listing found' using errcode = '42501';
  end if;

  if coalesce(cardinality(p_interest_slugs), 0) = 0 or exists (
    select 1 from unnest(p_interest_slugs) as selected(slug)
    where not exists (select 1 from public.interests as interest where interest.slug = selected.slug)
  ) then
    raise exception 'Choose at least one valid interest tag' using errcode = '23514';
  end if;

  select array_agg(distinct selected.slug order by selected.slug) into new_tags
  from unnest(p_interest_slugs) as selected(slug);
  delete from public.opportunity_tags as tag
  where tag.opportunity_id = p_id and not (tag.interest_slug = any(new_tags));
  insert into public.opportunity_tags (opportunity_id, interest_slug)
  select p_id, selected.slug from unnest(new_tags) as selected(slug)
  on conflict on constraint opportunity_tags_pkey do nothing;

  return query select p_id, new_tags;
end;
$$;

revoke all on function
  public.admin_list_submissions(text, integer, integer),
  public.admin_get_submission(uuid),
  public.admin_review_opportunity(uuid, text, text),
  public.admin_verification_report(uuid),
  public.admin_list_organisations(text),
  public.admin_dashboard_stats(),
  public.admin_list_audit_logs(integer, integer),
  public.list_opportunity_review_notes(uuid),
  public.resubmit_opportunity(uuid),
  public.set_opportunity_tags(uuid, text[])
from public, anon, authenticated;

grant execute on function
  public.admin_list_submissions(text, integer, integer),
  public.admin_get_submission(uuid),
  public.admin_review_opportunity(uuid, text, text),
  public.admin_verification_report(uuid),
  public.admin_list_organisations(text),
  public.admin_dashboard_stats(),
  public.admin_list_audit_logs(integer, integer),
  public.list_opportunity_review_notes(uuid),
  public.resubmit_opportunity(uuid),
  public.set_opportunity_tags(uuid, text[])
to authenticated;

revoke all on function public.get_opportunity_status(uuid) from public, anon, authenticated;
grant execute on function public.get_opportunity_status(uuid) to anon, authenticated;
