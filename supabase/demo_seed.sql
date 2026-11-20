-- Optional fictional fixtures for local development. Run after seed.sql.
begin;

-- Fixture owners have stable IDs, fictional email addresses, and no password or identity.
insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('d3e00000-0000-4000-9000-000000000001', 'authenticated', 'authenticated', 'ink-lantern@example.invalid', now(), now()),
  ('d3e00000-0000-4000-9000-000000000002', 'authenticated', 'authenticated', 'cloud-apricot@example.invalid', now(), now()),
  ('d3e00000-0000-4000-9000-000000000003', 'authenticated', 'authenticated', 'sage-kite@example.invalid', now(), now())
on conflict (id) do nothing;

insert into public.organisations (
  id, owner_id, name, organisation_type, website_url, official_email,
  representative_name, representative_title, representative_email, evidence_notes, status
)
values
  ('d3e00000-0000-4000-a000-000000000001', 'd3e00000-0000-4000-9000-000000000001', 'Fictional Ink Lantern Foundation', 'NGO', 'https://example.invalid/ink-lantern', 'ink-lantern@example.invalid', 'Demo Representative One', 'Coordinator', 'representative-one@example.invalid', 'Fictional local seed fixture.', 'approved'),
  ('d3e00000-0000-4000-a000-000000000002', 'd3e00000-0000-4000-9000-000000000002', 'Fictional Cloud Apricot Society', 'Student society', 'https://example.invalid/cloud-apricot', 'cloud-apricot@example.invalid', 'Demo Representative Two', 'Coordinator', 'representative-two@example.invalid', 'Fictional local seed fixture.', 'approved'),
  ('d3e00000-0000-4000-a000-000000000003', 'd3e00000-0000-4000-9000-000000000003', 'Fictional Sage Kite Studio', 'Event organiser', 'https://example.invalid/sage-kite', 'sage-kite@example.invalid', 'Demo Representative Three', 'Coordinator', 'representative-three@example.invalid', 'Fictional local seed fixture.', 'approved')
on conflict (id) do nothing;

insert into public.user_roles (user_id, role)
select owner_id, 'organisation'
from public.organisations
where id in (
  'd3e00000-0000-4000-a000-000000000001',
  'd3e00000-0000-4000-a000-000000000002',
  'd3e00000-0000-4000-a000-000000000003'
)
on conflict (user_id, role) do nothing;

insert into public.opportunities (
  id, title, category_slug, organisation_name, description, source_url,
  eligibility, city, country, location, format, cost_or_funding, status,
  deadline, last_verified_at
)
select
  demo.id::uuid, '[Demo] ' || demo.title, demo.category_slug,
  'Fictional Lantern Studio',
  'Fictional test listing for the Count me in dashboard.',
  'https://example.invalid/opportunities/' || demo.id,
  demo.eligibility, demo.city, 'Pakistan', coalesce(demo.city, 'Online'),
  demo.format::public.event_format, demo.cost, 'approved',
  now() + make_interval(days => demo.days_until_deadline), now()
from (values
  ('d3e00000-0000-4000-8000-000000000001', 'Ink Lantern Scholarship', 'scholarships', 'Lahore', 'physical', 'Fully funded', 'Open to all', 4),
  ('d3e00000-0000-4000-8000-000000000002', 'Cloud Apricot Hackathon', 'hackathons', 'Karachi', 'hybrid', 'Free', 'Open to all', 7),
  ('d3e00000-0000-4000-8000-000000000003', 'Sage Kite Photography Workshop', 'workshops', 'Islamabad', 'physical', 'PKR 1200', 'Open to all', 9),
  ('d3e00000-0000-4000-8000-000000000004', 'Blue Teacup Library Volunteer Day', 'volunteering', 'Rawalpindi', 'physical', 'Free', 'Residents of Rawalpindi', 11),
  ('d3e00000-0000-4000-8000-000000000005', 'Paper Comet Research Placement', 'research-opportunities', 'Peshawar', 'hybrid', 'Free', 'Ages 18+', 13),
  ('d3e00000-0000-4000-8000-000000000006', 'Mango Atlas Design Internship', 'internships', 'Multan', 'physical', 'Free', 'Open to all', 16),
  ('d3e00000-0000-4000-8000-000000000007', 'Fig Compass Writing Course', 'courses', null, 'online', 'PKR 750', 'Open to all', 18),
  ('d3e00000-0000-4000-8000-000000000008', 'Coral Thimble Social Enterprise Lab', 'entrepreneurship', 'Quetta', 'hybrid', 'PKR 2800', 'Open to all', 21),
  ('d3e00000-0000-4000-8000-000000000009', 'Marble Finch Model UN', 'muns', 'Faisalabad', 'physical', 'PKR 1800', 'Ages 18+', 23),
  ('d3e00000-0000-4000-8000-000000000010', 'Cedar Raft Illustration Contest', 'competitions', 'Hyderabad', 'hybrid', 'Free', 'Open to all', 26),
  ('d3e00000-0000-4000-8000-000000000011', 'Amber Telescope Exchange', 'exchange-programmes', 'Karachi', 'physical', 'Fully funded', 'Open to all', 30),
  ('d3e00000-0000-4000-8000-000000000012', 'Frosted Mint Digital Fellowship', 'fellowships', null, 'online', 'Free', 'Open to all', 35),
  ('d3e00000-0000-4000-8000-000000000013', 'Salt Maple Archive Assistant', 'jobs', 'Lahore', 'physical', 'Paid role', 'Open to all', 14),
  ('d3e00000-0000-4000-8000-000000000014', 'Lilac Tram Design Conference', 'conferences', 'Karachi', 'hybrid', 'Partially funded', 'Open to all', 20),
  ('d3e00000-0000-4000-8000-000000000015', 'Whistling Cedar Accessibility Certification', 'certifications', null, 'online', 'Free', 'Open to all', 27)
) as demo(id, title, category_slug, city, format, cost, eligibility, days_until_deadline)
on conflict (id) do update
set deadline = excluded.deadline,
    status = excluded.status;

update public.opportunities as listing
set organisation_id = org.id,
    organisation_name = org.name,
    submitted_by = org.owner_id
from (values
  ('d3e00000-0000-4000-8000-000000000001'::uuid, 'd3e00000-0000-4000-a000-000000000001'::uuid),
  ('d3e00000-0000-4000-8000-000000000002'::uuid, 'd3e00000-0000-4000-a000-000000000002'::uuid),
  ('d3e00000-0000-4000-8000-000000000003'::uuid, 'd3e00000-0000-4000-a000-000000000003'::uuid)
) as link(listing_id, organisation_id)
join public.organisations as org on org.id = link.organisation_id
where listing.id = link.listing_id;

update public.opportunities
set starts_at = deadline + interval '7 days',
    ends_at = deadline + interval '8 days'
where id in (
  'd3e00000-0000-4000-8000-000000000002',
  'd3e00000-0000-4000-8000-000000000003',
  'd3e00000-0000-4000-8000-000000000014'
);

insert into public.opportunity_tags (opportunity_id, interest_slug)
values
  ('d3e00000-0000-4000-8000-000000000001', 'writing'),
  ('d3e00000-0000-4000-8000-000000000001', 'reading'),
  ('d3e00000-0000-4000-8000-000000000002', 'coding'),
  ('d3e00000-0000-4000-8000-000000000002', 'design'),
  ('d3e00000-0000-4000-8000-000000000003', 'photography'),
  ('d3e00000-0000-4000-8000-000000000003', 'design'),
  ('d3e00000-0000-4000-8000-000000000004', 'volunteering'),
  ('d3e00000-0000-4000-8000-000000000004', 'reading'),
  ('d3e00000-0000-4000-8000-000000000005', 'research'),
  ('d3e00000-0000-4000-8000-000000000005', 'coding'),
  ('d3e00000-0000-4000-8000-000000000006', 'design'),
  ('d3e00000-0000-4000-8000-000000000006', 'sketching'),
  ('d3e00000-0000-4000-8000-000000000007', 'writing'),
  ('d3e00000-0000-4000-8000-000000000007', 'reading'),
  ('d3e00000-0000-4000-8000-000000000008', 'volunteering'),
  ('d3e00000-0000-4000-8000-000000000008', 'public-speaking'),
  ('d3e00000-0000-4000-8000-000000000009', 'public-speaking'),
  ('d3e00000-0000-4000-8000-000000000009', 'research'),
  ('d3e00000-0000-4000-8000-000000000010', 'painting'),
  ('d3e00000-0000-4000-8000-000000000010', 'sketching'),
  ('d3e00000-0000-4000-8000-000000000011', 'research'),
  ('d3e00000-0000-4000-8000-000000000011', 'photography'),
  ('d3e00000-0000-4000-8000-000000000012', 'coding'),
  ('d3e00000-0000-4000-8000-000000000012', 'volunteering'),
  ('d3e00000-0000-4000-8000-000000000013', 'reading'),
  ('d3e00000-0000-4000-8000-000000000014', 'design'),
  ('d3e00000-0000-4000-8000-000000000015', 'coding')
on conflict (opportunity_id, interest_slug) do nothing;

commit;
