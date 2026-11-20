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

-- Pending prototypes for verification. Replaying refreshes pending deadlines and preserves decisions.
insert into public.opportunities as listing (
  id, submitted_by, title, category_slug, organisation_name, description,
  source_url, eligibility, location, city, country, format, cost_or_funding, deadline
)
values
  ('d3e00000-0000-4000-8000-000000000016', 'd3e00000-0000-4000-9000-000000000001',
    '[Demo] Willow Lantern Reading Workshop', 'workshops', 'Fictional Willow Lantern Collective',
    'Fictional verification fixture for a free reading workshop.',
    'https://example.invalid/review/willow-lantern', 'Open to all', 'Lahore', 'Lahore', 'Pakistan', 'physical', 'Free', now() + interval '21 days'),
  ('d3e00000-0000-4000-8000-000000000017', 'd3e00000-0000-4000-9000-000000000002',
    '[Demo] Indigo Bookmark Fellowship', 'fellowships', 'Fictional Indigo Bookmark Studio',
    'Temporary description for incomplete verification fixture.',
    'https://example.invalid/review/indigo-bookmark', 'Open to all', 'Online', null, 'Pakistan', 'online', 'Fully funded', now() + interval '24 days'),
  ('d3e00000-0000-4000-8000-000000000018', 'd3e00000-0000-4000-9000-000000000003',
    '[Demo] Amber Teacup Prize', 'competitions', 'Fictional Amber Teacup Studio',
    'Fictional flagging fixture. Act now and send money for a processing fee. No payments are accepted.',
    'https://example.invalid/review/amber-teacup', 'Open to all', 'Karachi', 'Karachi', 'Pakistan', 'hybrid', 'Registration fee', now() + interval '28 days')
on conflict (id) do update set deadline = excluded.deadline
where listing.status = 'pending';

-- Simulate a legacy incomplete row after the normal insert validation.
update public.opportunities set description = ''
where id = 'd3e00000-0000-4000-8000-000000000017'
  and status = 'pending' and description = 'Temporary description for incomplete verification fixture.';

insert into public.opportunity_tags (opportunity_id, interest_slug)
select fixture.id::uuid, fixture.slug
from (values
  ('d3e00000-0000-4000-8000-000000000016', 'reading'),
  ('d3e00000-0000-4000-8000-000000000017', 'research'),
  ('d3e00000-0000-4000-8000-000000000018', 'design')
) as fixture(id, slug)
where not exists (
  select 1 from public.opportunity_tags as tag where tag.opportunity_id = fixture.id::uuid
)
on conflict (opportunity_id, interest_slug) do nothing;

-- Fictional solo experiences. Coordinates are sample map pins for Karachi neighbourhoods.
insert into public.solo_experiences (
  id, submitted_by, title, description, category, city, location, latitude, longitude,
  cost, currency, duration_minutes, opening_hours, social_level,
  safety_considerations, accessibility_information, status
)
select
  ('d6e00000-0000-4000-8000-' || lpad(demo.number::text, 12, '0'))::uuid,
  case when demo.number > 10 then
    ('d3e00000-0000-4000-9000-' || lpad((demo.number - 10)::text, 12, '0'))::uuid
  end,
  '[Demo] ' || demo.title, 'Fictional prototype listing. Venue, hours and prices are illustrative.',
  demo.category, 'Karachi', demo.location, demo.latitude, demo.longitude, demo.cost, 'PKR',
  demo.duration, demo.hours, demo.social::public.social_comfort,
  case when demo.category = 'outdoor_exploration'
    then 'Use marked public paths in daylight and check conditions before visiting.'
    else 'Check the venue and any booking requirements before visiting.' end,
  'Accessibility has not been verified. Check step-free access and facilities before visiting.',
  case when demo.number > 10 then 'pending'::public.review_status else 'approved'::public.review_status end
from (values
  (1, 'Indigo Courtyard Gallery', 'art_and_culture', 'Clifton gallery district', 24.8167, 67.0354, 0, 50, 'Tue–Sun, 11:00–18:00', 'quiet'),
  (2, 'Harbour Stories Museum', 'art_and_culture', 'Civil Lines district', 24.8526, 67.0267, 350, 75, 'Tue–Sun, 10:00–17:00', 'small_group'),
  (3, 'Kite String Print Gallery', 'art_and_culture', 'Frere Hall area', 24.8476, 67.033, 200, 45, 'Wed–Sun, 12:00–18:00', 'quiet'),
  (4, 'Paper Fig Bookshop', 'slow_experiences', 'Zamzama commercial area', 24.8154, 67.0478, 0, 40, 'Daily, 12:00–20:00', 'quiet'),
  (5, 'Sea Oat Reading Café', 'slow_experiences', 'Boat Basin area', 24.8171, 67.0272, 650, 60, 'Daily, 10:00–20:00', 'quiet'),
  (6, 'Clay Kettle Pottery Workshop', 'learn_something_new', 'DHA Phase 6', 24.792, 67.064, 1800, 90, 'Sat–Sun, by booking', 'small_group'),
  (7, 'Mango Paper Sketch Workshop', 'learn_something_new', 'Bahadurabad area', 24.8811, 67.0664, 900, 75, 'Sat, 15:00–17:00', 'social'),
  (8, 'Casuarina Park Walk', 'outdoor_exploration', 'Hill Park area', 24.8721, 67.0725, 0, 55, 'Daylight hours', 'quiet'),
  (9, 'Silver Shell Beach Photo Walk', 'outdoor_exploration', 'Clifton shoreline', 24.7878, 67.043, 0, 45, 'Daylight hours', 'social'),
  (10, 'Saltbush Garden Loop', 'outdoor_exploration', 'Bagh Ibn-e-Qasim area', 24.812, 67.028, 0, 35, 'Daylight hours', 'small_group'),
  (11, 'Tin Sparrow Café Journaling', 'slow_experiences', 'PECHS neighbourhood', 24.8654, 67.0628, 500, 60, 'Daily, 11:00–19:00', 'quiet'),
  (12, 'Blue Thread Watercolour Class', 'learn_something_new', 'Gulshan-e-Iqbal area', 24.918, 67.0924, 1100, 80, 'Sun, by booking', 'social')
) as demo(number, title, category, location, latitude, longitude, cost, duration, hours, social)
on conflict (id) do nothing;

insert into public.solo_experience_tags (experience_id, interest_slug)
select tag.experience_id::uuid, tag.interest_slug
from (values
  ('d6e00000-0000-4000-8000-000000000001', 'painting'),
  ('d6e00000-0000-4000-8000-000000000001', 'design'),
  ('d6e00000-0000-4000-8000-000000000002', 'research'),
  ('d6e00000-0000-4000-8000-000000000002', 'photography'),
  ('d6e00000-0000-4000-8000-000000000003', 'sketching'),
  ('d6e00000-0000-4000-8000-000000000003', 'design'),
  ('d6e00000-0000-4000-8000-000000000004', 'reading'),
  ('d6e00000-0000-4000-8000-000000000004', 'writing'),
  ('d6e00000-0000-4000-8000-000000000005', 'reading'),
  ('d6e00000-0000-4000-8000-000000000005', 'writing'),
  ('d6e00000-0000-4000-8000-000000000006', 'painting'),
  ('d6e00000-0000-4000-8000-000000000006', 'design'),
  ('d6e00000-0000-4000-8000-000000000007', 'sketching'),
  ('d6e00000-0000-4000-8000-000000000007', 'design'),
  ('d6e00000-0000-4000-8000-000000000008', 'hiking'),
  ('d6e00000-0000-4000-8000-000000000008', 'photography'),
  ('d6e00000-0000-4000-8000-000000000009', 'photography'),
  ('d6e00000-0000-4000-8000-000000000009', 'hiking'),
  ('d6e00000-0000-4000-8000-000000000010', 'gardening'),
  ('d6e00000-0000-4000-8000-000000000010', 'hiking'),
  ('d6e00000-0000-4000-8000-000000000011', 'writing'),
  ('d6e00000-0000-4000-8000-000000000011', 'reading'),
  ('d6e00000-0000-4000-8000-000000000012', 'painting'),
  ('d6e00000-0000-4000-8000-000000000012', 'sketching')
) as tag(experience_id, interest_slug)
where not exists (
  select 1 from public.solo_experience_tags as existing where existing.experience_id = tag.experience_id::uuid
)
on conflict (experience_id, interest_slug) do nothing;

-- A user-neutral fixture near the alert threshold. A tester can save or track it.
insert into public.opportunities (
  id, title, category_slug, organisation_name, description, source_url,
  eligibility, location, format, cost_or_funding, deadline, status, last_verified_at
)
values (
  'd5e00000-0000-4000-8000-000000000001',
  '[Demo] Paper Lantern Portfolio Clinic', 'workshops', 'Fictional Paper Lantern Studio',
  'Fictional deadline fixture for the application tracker and calendar.',
  'https://example.invalid/demo/portfolio-clinic', 'Open to all', 'Online', 'online', 'Free',
  now() + interval '48 hours', 'approved', now()
)
on conflict (id) do update set deadline = excluded.deadline;

insert into public.opportunity_tags (opportunity_id, interest_slug)
values ('d5e00000-0000-4000-8000-000000000001', 'design')
on conflict (opportunity_id, interest_slug) do nothing;

commit;
