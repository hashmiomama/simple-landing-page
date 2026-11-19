insert into public.interests (slug, name)
values
  ('reading', 'Reading'),
  ('photography', 'Photography'),
  ('painting', 'Painting'),
  ('hiking', 'Hiking'),
  ('coding', 'Coding'),
  ('volunteering', 'Volunteering'),
  ('writing', 'Writing'),
  ('music', 'Music'),
  ('cooking', 'Cooking'),
  ('gardening', 'Gardening'),
  ('sketching', 'Sketching'),
  ('design', 'Design'),
  ('public-speaking', 'Public speaking'),
  ('research', 'Research'),
  ('sports', 'Sports')
on conflict (slug) do nothing;

insert into public.opportunity_categories (slug, name, category_group)
values
  ('scholarships', 'Scholarships', 'academic'),
  ('exchange-programmes', 'Exchange programmes', 'academic'),
  ('research-opportunities', 'Research opportunities', 'academic'),
  ('conferences', 'Conferences', 'academic'),
  ('muns', 'MUNs', 'academic'),
  ('internships', 'Internships', 'professional'),
  ('jobs', 'Jobs', 'professional'),
  ('hackathons', 'Hackathons', 'professional'),
  ('entrepreneurship', 'Entrepreneurship', 'professional'),
  ('fellowships', 'Fellowships', 'professional'),
  ('volunteering', 'Volunteering', 'personal_development'),
  ('workshops', 'Workshops', 'personal_development'),
  ('courses', 'Courses', 'personal_development'),
  ('certifications', 'Certifications', 'personal_development'),
  ('competitions', 'Competitions', 'personal_development')
on conflict (slug) do nothing;
