-- Optional fictional fixtures for local development. Run after seed.sql.
begin;

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
  ('d3e00000-0000-4000-8000-000000000012', 'Frosted Mint Digital Fellowship', 'fellowships', null, 'online', 'Free', 'Open to all', 35)
) as demo(id, title, category_slug, city, format, cost, eligibility, days_until_deadline)
on conflict (id) do update
set deadline = excluded.deadline,
    status = excluded.status;

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
  ('d3e00000-0000-4000-8000-000000000012', 'volunteering')
on conflict (opportunity_id, interest_slug) do nothing;

commit;
