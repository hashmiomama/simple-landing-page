# Supabase backend

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
| `profiles` | Public. `id`, `username`, `avatar_url`, `bio`, `is_identity_verified`, `created_at`, `updated_at`. | Owners update `username`, `avatar_url`, `bio`. Usernames use 3–20 lowercase letters, digits or underscores. Signup assigns a unique pseudonym. |
| `profile_private` | Owner and admins. `user_id`, `legal_name`, `date_of_birth`, `gender`, `created_at`, `updated_at`. | Owners update `legal_name`, `date_of_birth`, `gender`. All three can be filled in during onboarding. |
| `user_roles` | Owner and admins. `user_id`, `role`, `created_at`. | Admins insert `user_id` and `role`, or delete an assignment. |
| `user_preferences` | Owner. `user_id`, `city`, `country`, `social_comfort`, `personality_type`, `max_budget`, `currency`, `opportunity_category_slugs`, `onboarding_completed`, `wants_online`, `budget_preference`, `created_at`, `updated_at`. | Owners update the preference fields. Category selections use catalog slugs. |
| `interests` | Public. `slug`, `name`, `created_at`, `updated_at`. | Admins manage the catalog. |
| `user_interests` | Public. `user_id`, `interest_slug`, `created_at`. | Owners insert `user_id` and `interest_slug`, or delete a selection. |
| `notification_preferences` | Owner. `user_id`, `in_app_enabled`, `email_enabled`, `deadline_reminders`, `activity_updates`, `opportunity_updates`, `created_at`, `updated_at`. | Owners update the five settings. |
| `notifications` | Recipient. `id`, `user_id`, `kind`, `title`, `body`, `read_at`, `created_at`, `updated_at`. | Recipients update `read_at`. Trusted server code creates notifications. |
| `admin_audit_logs` | Admins. `id`, `actor_id`, `action`, `target_table`, `target_id`, `details`, `created_at`. | Trusted server code appends entries. |

Identity verification records hold status and an opaque provider reference. Public profiles expose the badge, which is synchronized from verification status. Account email remains in Supabase Auth.

## Phase 2 onboarding and dashboard

The [Phase 2 migration](migrations/20261120000200_onboarding_and_dashboard.sql) adds three owner-writable preference fields.

| Column | Values and default |
| --- | --- |
| `onboarding_completed` | Boolean, defaults to `false`. |
| `wants_online` | Boolean, defaults to `true`. Affects the location score for online and hybrid opportunities. |
| `budget_preference` | `free_only`, `low`, or `any`. Defaults to `any`. |

Continue using `city` for free-text location, `opportunity_category_slugs` for category selections, and `user_interests` for interest selections. Social comfort accepts `quiet`, `small_group`, `social`, or `null`. The migration maps legacy `solo` to `quiet`, `large_group` to `social`, and `flexible` to `null`. Personality stays optional. Existing usernames longer than 20 characters receive new unique pseudonyms.

Any signed-in user can read `opportunity_categories`. Guests and signed-in users can read `opportunities` and `opportunity_tags` for approved listings with a future or absent deadline. Users can select, insert, and delete their own `saved_opportunities` rows. Use `user_id` and `opportunity_id` on insert.

### Optional local demo data

After the normal local migration and seed replay, run this command with `psql` installed. The 12 fictional listings use stable IDs, and replaying the file refreshes their deadlines.

```powershell
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/demo_seed.sql
```

### RPCs

| Function | Access | Return |
| --- | --- | --- |
| `is_username_available(p_username text)` | Public | Boolean. Checks exact format and current availability. The unique constraint resolves concurrent claims. |
| `get_recommended_opportunities(p_limit int default 10)` | Signed in | Rows with all 22 `opportunities` columns and `total_score`, `interest_score`, `category_score`, `location_score`, `social_comfort_score`, `budget_score`, and `recency_score`. Limit is clamped to 0–100. |
| `get_dashboard_summary()` | Signed in | One row with `saved_count`, `saved_due_in_14_days_count`, and `upcoming_deadlines`. Each deadline entry contains `opportunity_id`, `title`, and `deadline`. |

The recommendation function scores any interest overlap up to 35 points, category match up to 20, preferred city or wanted online availability up to 15, social fit up to 15, budget fit up to 10, and listings created in the last 30 days up to 5. Category determines the estimated social setting. Missing social comfort contributes 7.5 points. Ties use the nearest deadline first, with undated listings last.

For budget scoring, `Free` and `Fully funded` count as zero cost. The prototype also recognizes amounts in the form `PKR 1200`. The `low` tier uses a PKR maximum from the existing budget fields when available and defaults to PKR 2,500. Unknown cost earns points only with `any`.

For eligibility, use `Open to all`, `Residents of <city>`, or `Ages <N>+` as the full eligibility field. City and age rules require the relevant profile data. Other eligibility text keeps the listing publicly browsable and excludes it from recommendations. The dashboard counts all of the caller's bookmarks and includes only approved future deadlines in the two deadline fields.

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
