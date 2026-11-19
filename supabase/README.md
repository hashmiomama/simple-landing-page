# Supabase Phase 1

## Apply migrations locally

With Docker running and the Supabase CLI installed, run these commands from the repository root.

```powershell
supabase start
supabase db reset --local
supabase db lint --local
```

The reset replaces local database data and replays the migrations and [seed SQL](seed.sql). On a fresh stack, `supabase start` already applies migrations and seeds. Use the reset to verify a clean replay. The seed contains the interest catalog and all 15 opportunity categories. It can be run repeatedly.

## Create the first admin

Create the account through local Supabase Auth, then open local Studio at `http://127.0.0.1:54323` and copy its user UUID from Authentication. In the local SQL editor, replace the placeholder with that UUID and run the statement as the database owner. The signup trigger has already created the profile and assigned the member role.

```sql
insert into public.user_roles (user_id, role)
values ('REPLACE_WITH_AUTH_USER_UUID'::uuid, 'admin')
on conflict (user_id, role) do nothing
returning user_id, role;
```

Roles are additive. Guests use Supabase's `anon` role. An authenticated session can check its own membership with `rpc('has_role', { user_id: session.user.id, role: 'admin' })`.

## Phase 1 frontend access

Use the Supabase publishable key and the current user's session. The policy migration is the [SQL for review](migrations/20261120000100_foundation_policies.sql).

| Table | Readable rows and columns | Client writes |
| --- | --- | --- |
| `profiles` | Public. `id`, `username`, `avatar_url`, `bio`, `is_identity_verified`, `created_at`, `updated_at`. | Owners update `username`, `avatar_url`, `bio`. Usernames use 3–39 lowercase letters, digits or underscores. Signup reserves a generated pseudonym for each account. |
| `profile_private` | Owner and admins. `user_id`, `legal_name`, `date_of_birth`, `gender`, `created_at`, `updated_at`. | Owners update `legal_name`, `date_of_birth`, `gender`. All three can be filled in during onboarding. |
| `user_roles` | Owner and admins. `user_id`, `role`, `created_at`. | Admins insert `user_id` and `role`, or delete an assignment. |
| `user_preferences` | Owner. `user_id`, `city`, `country`, `social_comfort`, `personality_type`, `max_budget`, `currency`, `opportunity_category_slugs`, `created_at`, `updated_at`. | Owners update the preference fields. Use the slugs in `seed.sql` for onboarding category selections. |
| `interests` | Public. `slug`, `name`, `created_at`, `updated_at`. | Admins manage the catalog. |
| `user_interests` | Public. `user_id`, `interest_slug`, `created_at`. | Owners insert `user_id` and `interest_slug`, or delete a selection. |
| `notification_preferences` | Owner. `user_id`, `in_app_enabled`, `email_enabled`, `deadline_reminders`, `activity_updates`, `opportunity_updates`, `created_at`, `updated_at`. | Owners update the five settings. |
| `notifications` | Recipient. `id`, `user_id`, `kind`, `title`, `body`, `read_at`, `created_at`, `updated_at`. | Recipients update `read_at`. Trusted server code creates notifications. |
| `admin_audit_logs` | Admins. `id`, `actor_id`, `action`, `target_table`, `target_id`, `details`, `created_at`. | Trusted server code appends entries. |

The remaining tables have admin-only client policies until their feature phases. This includes the category catalog and opportunity listings, so the public directory becomes available in Phase 3. Identity verification records hold status and an opaque provider reference. Public profiles expose the badge, which is synchronized from verification status. Account email remains in Supabase Auth.

## Table reference

| Table | Purpose |
| --- | --- |
| `profiles` | Public pseudonym, avatar, bio and verification badge. |
| `profile_private` | Owner's legal name, date of birth and gender. |
| `user_roles` | Role assignments for registered accounts. |
| `opportunity_categories` | Opportunity taxonomy from section 7. |
| `user_preferences` | Onboarding preferences for location, social comfort, personality, budget and categories. |
| `interests` | Interest catalog. |
| `user_interests` | Public profile interest selections. |
| `organisations` | Organisation accounts and their review status. |
| `opportunities` | Opportunity listings and their verification status. |
| `opportunity_tags` | Links between opportunities and interests. |
| `verification_reviews` | AI and administrator verification reviews. |
| `saved_opportunities` | Member bookmarks. |
| `applications` | Personal application tracking. |
| `reminders` | Deadline and personal reminders. |
| `solo_experiences` | Solo experience recommendations. |
| `activities` | Proposed and scheduled group activities. |
| `activity_participants` | Memberships and join decisions. |
| `activity_messages` | Planning-room messages. |
| `polls` | Planning-room polls. |
| `poll_options` | Options belonging to each poll. |
| `poll_votes` | One vote per participant per poll. |
| `activity_feedback` | Post-activity participant feedback. |
| `notifications` | In-app notification inbox. |
| `notification_preferences` | Per-member notification settings. |
| `identity_verifications` | Verification status and opaque provider reference. |
| `reports` | Safety and content reports. |
| `blocked_users` | Directed user blocking relationships. |
| `admin_audit_logs` | Administrative action history written by trusted server code. |
