create type public.app_role as enum ('member', 'organisation', 'admin');
create type public.category_group as enum ('academic', 'professional', 'personal_development');
create type public.social_comfort as enum ('solo', 'small_group', 'large_group', 'flexible');
create type public.review_status as enum ('pending', 'approved', 'rejected', 'archived');
create type public.event_format as enum ('online', 'physical', 'hybrid');
create type public.reviewer_kind as enum ('ai', 'admin');
create type public.application_status as enum ('interested', 'preparing', 'submitted', 'interview', 'accepted', 'rejected', 'withdrawn');
create type public.activity_status as enum ('proposed', 'recruiting', 'planning', 'confirmed', 'completed', 'cancelled');
create type public.participant_status as enum ('pending', 'accepted', 'declined', 'withdrawn');
create type public.identity_status as enum ('pending', 'verified', 'rejected', 'expired');
create type public.report_status as enum ('open', 'investigating', 'resolved', 'dismissed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (
    username ~ '^[a-z0-9_]{3,39}$'
    and (
      username !~ '^member_[0-9a-f]{32}$'
      or username = 'member_' || replace(id::text, '-', '')
    )
  ),
  avatar_url text,
  bio text,
  is_identity_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_private (
  user_id uuid not null references public.profiles(id) on delete cascade primary key,
  legal_name text,
  date_of_birth date,
  gender text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  primary key (user_id, role),
  created_at timestamptz not null default now()
);

create index user_roles_role_idx on public.user_roles (role);

create table public.opportunity_categories (
  slug text primary key,
  name text not null unique,
  category_group public.category_group not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade primary key,
  city text,
  country text,
  social_comfort public.social_comfort,
  personality_type text,
  max_budget numeric(12,2) check (max_budget >= 0),
  currency text check (currency ~ '^[A-Z]{3}$'),
  opportunity_category_slugs text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_preferences_city_idx on public.user_preferences (city);

create table public.interests (
  slug text primary key,
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_interests (
  user_id uuid not null references public.profiles(id) on delete cascade,
  interest_slug text not null references public.interests(slug) on delete cascade,
  primary key (user_id, interest_slug),
  created_at timestamptz not null default now()
);

create index user_interests_interest_slug_idx on public.user_interests (interest_slug);

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  description text,
  website_url text,
  status public.review_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index organisations_owner_id_idx on public.organisations (owner_id);
create index organisations_status_idx on public.organisations (status);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations(id) on delete set null,
  submitted_by uuid references public.profiles(id) on delete set null,
  category_slug text not null references public.opportunity_categories(slug) on delete restrict,
  title text not null,
  organisation_name text not null,
  description text not null,
  source_url text not null,
  deadline timestamptz,
  starts_at timestamptz,
  ends_at timestamptz,
  eligibility text not null,
  location text not null,
  city text,
  country text,
  format public.event_format not null,
  cost_or_funding text not null,
  cover_url text,
  status public.review_status not null default 'pending',
  last_verified_at timestamptz,
  check (ends_at >= starts_at),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index opportunities_organisation_id_idx on public.opportunities (organisation_id);
create index opportunities_submitted_by_idx on public.opportunities (submitted_by);
create index opportunities_category_slug_idx on public.opportunities (category_slug);
create index opportunities_city_idx on public.opportunities (city);
create index opportunities_deadline_idx on public.opportunities (deadline);
create index opportunities_status_idx on public.opportunities (status);

create table public.opportunity_tags (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  interest_slug text not null references public.interests(slug) on delete cascade,
  primary key (opportunity_id, interest_slug),
  created_at timestamptz not null default now()
);

create index opportunity_tags_interest_slug_idx on public.opportunity_tags (interest_slug);

create table public.verification_reviews (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewer_kind public.reviewer_kind not null,
  status public.review_status not null,
  report jsonb not null default '{}',
  check (jsonb_typeof(report) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index verification_reviews_opportunity_id_idx on public.verification_reviews (opportunity_id);
create index verification_reviews_reviewer_id_idx on public.verification_reviews (reviewer_id);
create index verification_reviews_status_idx on public.verification_reviews (status);

create table public.saved_opportunities (
  user_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  primary key (user_id, opportunity_id),
  created_at timestamptz not null default now()
);

create index saved_opportunities_opportunity_id_idx on public.saved_opportunities (opportunity_id);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  status public.application_status not null default 'interested',
  notes text,
  unique (user_id, opportunity_id),
  unique (id, user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applications_opportunity_id_idx on public.applications (opportunity_id);
create index applications_user_id_status_idx on public.applications (user_id, status);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  application_id uuid,
  title text not null,
  remind_at timestamptz not null,
  sent_at timestamptz,
  foreign key (application_id, user_id) references public.applications(id, user_id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reminders_user_id_idx on public.reminders (user_id);
create index reminders_application_id_user_id_idx on public.reminders (application_id, user_id);
create index reminders_remind_at_idx on public.reminders (remind_at);

create table public.solo_experiences (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references public.profiles(id) on delete set null,
  title text not null,
  description text not null,
  category text not null,
  city text not null,
  location text not null,
  source_url text,
  cost numeric(12,2) check (cost >= 0),
  currency text check (currency ~ '^[A-Z]{3}$'),
  duration_minutes integer check (duration_minutes > 0),
  status public.review_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index solo_experiences_submitted_by_idx on public.solo_experiences (submitted_by);
create index solo_experiences_category_idx on public.solo_experiences (category);
create index solo_experiences_city_idx on public.solo_experiences (city);
create index solo_experiences_status_idx on public.solo_experiences (status);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  interest_slug text not null references public.interests(slug) on delete restrict,
  title text not null,
  description text not null,
  city text,
  format public.event_format not null,
  location text,
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer check (capacity > 0),
  status public.activity_status not null default 'proposed',
  check (ends_at >= starts_at),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index activities_created_by_idx on public.activities (created_by);
create index activities_interest_slug_idx on public.activities (interest_slug);
create index activities_city_idx on public.activities (city);
create index activities_status_idx on public.activities (status);
create index activities_starts_at_idx on public.activities (starts_at);

create table public.activity_participants (
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.participant_status not null default 'pending',
  primary key (activity_id, user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index activity_participants_user_id_idx on public.activity_participants (user_id);
create index activity_participants_activity_id_status_idx on public.activity_participants (activity_id, status);

create table public.activity_messages (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null,
  body text not null check (length(btrim(body)) > 0),
  foreign key (activity_id, user_id) references public.activity_participants(activity_id, user_id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index activity_messages_activity_id_user_id_idx on public.activity_messages (activity_id, user_id);
create index activity_messages_activity_id_created_at_idx on public.activity_messages (activity_id, created_at);

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  created_by uuid not null,
  question text not null check (length(btrim(question)) > 0),
  closes_at timestamptz,
  unique (id, activity_id),
  foreign key (activity_id, created_by) references public.activity_participants(activity_id, user_id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index polls_activity_id_created_by_idx on public.polls (activity_id, created_by);
create index polls_closes_at_idx on public.polls (closes_at);

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null check (length(btrim(label)) > 0),
  unique (poll_id, label),
  unique (poll_id, id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.poll_votes (
  poll_id uuid not null,
  activity_id uuid not null,
  option_id uuid not null,
  user_id uuid not null,
  primary key (poll_id, user_id),
  foreign key (poll_id, activity_id) references public.polls(id, activity_id) on delete cascade,
  foreign key (poll_id, option_id) references public.poll_options(poll_id, id) on delete cascade,
  foreign key (activity_id, user_id) references public.activity_participants(activity_id, user_id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index poll_votes_poll_id_activity_id_idx on public.poll_votes (poll_id, activity_id);
create index poll_votes_poll_id_option_id_idx on public.poll_votes (poll_id, option_id);
create index poll_votes_activity_id_user_id_idx on public.poll_votes (activity_id, user_id);

create table public.activity_feedback (
  activity_id uuid not null,
  user_id uuid not null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  primary key (activity_id, user_id),
  foreign key (activity_id, user_id) references public.activity_participants(activity_id, user_id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notifications_user_id_created_at_idx on public.notifications (user_id, created_at desc);
create index notifications_user_id_unread_idx on public.notifications (user_id) where read_at is null;

create table public.notification_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade primary key,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  deadline_reminders boolean not null default true,
  activity_updates boolean not null default true,
  opportunity_updates boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.identity_verifications (
  user_id uuid not null references public.profiles(id) on delete cascade primary key,
  status public.identity_status not null default 'pending',
  provider_reference text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index identity_verifications_status_idx on public.identity_verifications (status);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id) on delete set null,
  reported_user_id uuid references public.profiles(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete cascade,
  solo_experience_id uuid references public.solo_experiences(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete cascade,
  message_id uuid references public.activity_messages(id) on delete cascade,
  reason text not null check (length(btrim(reason)) > 0),
  details text,
  status public.report_status not null default 'open',
  check (num_nonnulls(reported_user_id, opportunity_id, solo_experience_id, activity_id, message_id) = 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reports_reporter_id_idx on public.reports (reporter_id);
create index reports_reported_user_id_idx on public.reports (reported_user_id);
create index reports_opportunity_id_idx on public.reports (opportunity_id);
create index reports_solo_experience_id_idx on public.reports (solo_experience_id);
create index reports_activity_id_idx on public.reports (activity_id);
create index reports_message_id_idx on public.reports (message_id);
create index reports_status_idx on public.reports (status);

create table public.blocked_users (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id),
  created_at timestamptz not null default now()
);

create index blocked_users_blocked_id_idx on public.blocked_users (blocked_id);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_table text not null,
  target_id text not null,
  details jsonb not null default '{}',
  check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

create index admin_audit_logs_actor_id_idx on public.admin_audit_logs (actor_id);
create index admin_audit_logs_created_at_idx on public.admin_audit_logs (created_at desc);

-- Reset Supabase default grants before adding the Phase 1 client permissions.
revoke all on table
  public.profiles,
  public.profile_private,
  public.user_roles,
  public.opportunity_categories,
  public.user_preferences,
  public.interests,
  public.user_interests,
  public.organisations,
  public.opportunities,
  public.opportunity_tags,
  public.verification_reviews,
  public.saved_opportunities,
  public.applications,
  public.reminders,
  public.solo_experiences,
  public.activities,
  public.activity_participants,
  public.activity_messages,
  public.polls,
  public.poll_options,
  public.poll_votes,
  public.activity_feedback,
  public.notifications,
  public.notification_preferences,
  public.identity_verifications,
  public.reports,
  public.blocked_users,
  public.admin_audit_logs
from public, anon, authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.user_roles enable row level security;
alter table public.opportunity_categories enable row level security;
alter table public.user_preferences enable row level security;
alter table public.interests enable row level security;
alter table public.user_interests enable row level security;
alter table public.organisations enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_tags enable row level security;
alter table public.verification_reviews enable row level security;
alter table public.saved_opportunities enable row level security;
alter table public.applications enable row level security;
alter table public.reminders enable row level security;
alter table public.solo_experiences enable row level security;
alter table public.activities enable row level security;
alter table public.activity_participants enable row level security;
alter table public.activity_messages enable row level security;
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;
alter table public.activity_feedback enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.identity_verifications enable row level security;
alter table public.reports enable row level security;
alter table public.blocked_users enable row level security;
alter table public.admin_audit_logs enable row level security;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.profile_private
for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.opportunity_categories
for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.user_preferences
for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.interests
for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.organisations
for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.opportunities
for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.verification_reviews
for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.applications
for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.reminders
for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.solo_experiences
for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.activities
for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.activity_participants
for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.activity_messages
for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.polls
for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.poll_options
for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.poll_votes
for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.activity_feedback
for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.notifications
for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.notification_preferences
for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.identity_verifications
for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.reports
for each row execute function public.set_updated_at();

create function public.bootstrap_account(account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (account_id, 'member_' || replace(account_id::text, '-', ''))
  on conflict (id) do nothing;

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

revoke all on function public.bootstrap_account(uuid) from public, anon, authenticated;

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.bootstrap_account(new.id);
  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

select public.bootstrap_account(id) from auth.users;

create function public.sync_identity_badge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.profiles set is_identity_verified = false where id = old.user_id;
  else
    if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id then
      update public.profiles set is_identity_verified = false where id = old.user_id;
    end if;
    update public.profiles
    set is_identity_verified = (new.status = 'verified')
    where id = new.user_id;
  end if;
  return null;
end;
$$;

revoke all on function public.sync_identity_badge() from public, anon, authenticated;

create trigger sync_identity_badge
after insert or update or delete on public.identity_verifications
for each row execute function public.sync_identity_badge();
