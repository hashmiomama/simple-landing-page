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

After the normal local migration and seed replay, run this command with `psql` installed. The seed uses stable IDs for the 16 published opportunity fixtures, three opportunity queue fixtures, three approved organisations, ten approved solo experiences, and two experience queue fixtures. Replaying it preserves moderation decisions on the queue fixtures. The fixture owners have fictional email addresses and no password or sign-in identity.

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

## Phase 3 opportunity discovery and organisations

See the [Phase 3 migration](migrations/20261120000300_opportunity_discovery.sql). Every spec listing field already existed. The migration adds a weighted, generated `search_document` and a GIN index. Publication requires `approved` with neither deadline nor event end already reached. A missing date imposes no expiry. Recommendations, dashboard deadlines, search, detail, and public row policies use the same rule. Guests can read the opportunity category catalog.

### Submissions and organisation requests

- Call `submit_opportunity` to create a pending community or official listing and all its tags atomically. Listing status, submitter, and verification date are assigned by the database. Required text must be non-blank. Category and tags must exist, URLs must be absolute HTTP(S), the deadline cannot be in the past, and the event end cannot precede its start.
- Submitters can read their own pending and rejected listings and their tags, and update listing content on those rows. Submitter, organisation linkage, verification fields, status, and tags are controlled by the backend. Admins can read the queue. Phase 4 will handle listing approval.
- Insert an organisation request into `organisations` with `name`, `organisation_type`, `website_url`, `official_email`, `representative_name`, `representative_title`, `representative_email`, and `evidence_notes`. `description` is optional. The signed-in requester becomes the owner and role recipient. Each owner can submit one request, read its status, and edit it while pending. Admins may read all requests and use the review RPC to approve or reject a pending request. Duplicate legacy requests for the same owner must be resolved before applying the unique constraint.
- For an official submission pass `p_organisation_id`. The caller must own the approved organisation and hold the `organisation` role. The listing uses the approved organisation name and still starts pending. Owners can update their own official listing content and deadlines. Editing an approved official listing returns it to pending and clears its listing verification date. Organisation approval stays independent.

### Phase 3 RPCs

| RPC | Parameters | Returns |
| --- | --- | --- |
| `submit_opportunity` | Required `p_title`, `p_category_slug`, `p_organisation_name`, `p_description`, `p_source_url`, `p_eligibility`, `p_location`, `p_mode` (event format), `p_cost_or_funding`, `p_interest_slugs` (text array). Optional `p_deadline`, `p_starts_at`, `p_ends_at` (timestamp with time zone), `p_city`, `p_country`, `p_cover_url`, `p_organisation_id` (UUID). The approved organisation supplies the name for official submissions. | One row with `opportunity_id`, `status`. Signed-in members. |
| `review_organisation` | `org_id` (UUID), `decision` (`approved` or `rejected`), optional `note`. | One row with `organisation_id`, `status`. Admin only. Approval grants the organisation role and both decisions write an audit entry. |
| `search_opportunities` | Optional `p_keyword`, `p_category_slugs`, `p_interest_slugs`, `p_city`, `p_mode`, `p_deadline_before`, `p_start_after`, `p_free_only`, `p_funded_only`, `p_verified_only`, `p_sort`, `p_limit`, `p_offset`. | Public listing fields plus `total_count` on each returned row. Guests and signed-in users. |
| `get_opportunity` | `p_id` (UUID). | Zero or one row with the public listing fields, `tags` (array of objects with `slug` and `name`), and `saved` (boolean for the caller). Guests and signed-in users. |
| `list_saved_opportunities` | None. | `opportunity_id`, `title`, `deadline`, `saved_at`, `is_expired`. Returns the caller's approved saved listings, including expired ones. Signed-in users. |

Both public listing RPCs return these columns: `id`, `organisation_id`, `submitted_by`, `category_slug`, `title`, `organisation_name`, `description`, `source_url`, `deadline`, `starts_at`, `ends_at`, `eligibility`, `location`, `city`, `country`, `format`, `cost_or_funding`, `cover_url`, `status`, `last_verified_at`, `created_at`, `updated_at`.

Search uses English full-text ranking. A non-empty category or interest array matches any selected slug. City matches case-insensitively and mode matches the listing's exact format. Date filters are inclusive. `p_free_only` recognizes `Free`, `Fully funded`, and zero PKR. `p_funded_only` recognizes `Funded`, `Fully funded`, and `Partially funded`. `p_verified_only` requires a listing verification timestamp. Sort options are `relevance` (default), `newest`, `nearest_deadline`, and `upcoming_date`. The page size defaults to 20 and is clamped to 1–100. Offset defaults to zero. An empty page has no row carrying `total_count`.

### Saves, reports, and cover images

- Add a bookmark with `saved_opportunities(user_id, opportunity_id)` for an active public listing. Users can read and remove their own bookmarks, even after a listing expires. Use `list_saved_opportunities()` for saved listing titles and deadlines.
- Insert an opportunity report with `reports(opportunity_id, reason, details)`. `details` is optional. The database assigns the reporter and open status. Reporters can read their own reports and admins can read all. Phase 8 will handle moderation.
- Upload through the Storage API to `opportunity-covers/{user_id}/{unique_filename}`. The bucket accepts JPEG, PNG, WebP, and GIF up to 5 MiB. Use the public asset URL for `cover_url`. Owners can delete their own files through Storage and can replace a cover by uploading under a new name.

## Phase 4 prototype verification

Review the [Phase 4 migration](migrations/20261120000400_admin_verification.sql). It reuses `opportunities.status` and `last_verified_at` for listing verification and adds `needs_info`. Organisation verification is independent. `verification_reviews` now stores optional `decision` and `note` columns. Generated reports are snapshots in `report`, with a null decision.

An administrator can review pending, approved, rejected, or needs-info listings. Approval checks required fields, tags, source URL syntax, and expiry, then stamps the verification date. Rejection and requests for information require a submitter-facing note. Both clear the current verification date. Every decision appends a verification review and an audit entry in the same transaction.

Owners can read and edit their own needs-info listings and use the notes RPC to read their decision notes. Save listing content and tags before calling `resubmit_opportunity`, which validates the current listing and moves it back to pending. Notes are preserved. Internal reports and reviewer identities are available through the admin detail RPC. As in Phase 3, editing official listing content requires ownership of an approved organisation and the organisation role.

### Phase 4 RPCs

| RPC | Parameters | Returns |
| --- | --- | --- |
| `admin_list_submissions` | `p_status` text, default `pending`. Accepts `pending`, `approved`, `rejected`, `needs_info`, or null for all four. `p_limit` defaults to 20 and `p_offset` to 0. | Rows with `id`, `title`, `category_slug`, `status`, `submitted_by`, `submitter_username`, `organisation_name`, `deadline`, `created_at`, `last_verified_at`, `total_count`. Newest first. |
| `admin_get_submission` | `p_id` UUID. | Zero or one row with `listing` (all listing fields except the search index), `tags` (array of objects with `slug` and `name`), `submitter_username`, and `reviews` (up to 10 newest entries with `id`, `reviewer_id`, `reviewer_kind`, `reviewer_username`, `status`, `decision`, `note`, `report`, `created_at`). |
| `admin_review_opportunity` | `p_id` UUID, `p_decision` (`approve`, `reject`, or `request_info`), `p_note` text (required for rejection and requests for information). | One row with `opportunity_id`, `status`, `last_verified_at`, `review_id`. |
| `admin_verification_report` | `p_id` UUID. | A stored JSON object with `method`, `generated_at`, `extracted_fields`, `missing_required_fields`, `checks`, `duplicate_indicators`, `scam_indicators`, `recommended_action`, and `reason`. |
| `admin_list_organisations` | `p_status` text, default `pending`. Pass null for all statuses. | Organisation rows with `id`, `owner_id`, `name`, `description`, `website_url`, `status`, `created_at`, `updated_at`, `organisation_type`, `official_email`, `representative_name`, `representative_title`, `representative_email`, `evidence_notes`. |
| `admin_dashboard_stats` | None. | One row with `registered_users`, `published_opportunities`, `pending_submissions`, `pending_organisations`, `open_reports`. |
| `admin_list_audit_logs` | `p_limit` defaults to 20 and `p_offset` to 0. | Newest-first rows with `id`, `actor_id`, `actor_username`, `action`, `target_table`, `target_id`, `details`, `created_at`, `total_count`. |
| `list_opportunity_review_notes` | `p_id` UUID. | For the listing's submitter, rows with `decision`, `note`, `created_at`. |
| `resubmit_opportunity` | `p_id` UUID. | For the listing's submitter, one row with `opportunity_id` and `status` (`pending`). |
| `get_opportunity_status` | `p_id` UUID. | Public scalar `available`, `expired`, or `unavailable`. A published listing expires when its deadline or end date passes. Missing and unpublished listings both return `unavailable`. |
| `set_opportunity_tags` | `p_id` UUID and nonempty `p_interest_slugs` text array. | One row with `opportunity_id`, `interest_slugs`. Admins can replace tags on any listing. Submitters can replace their own tags while pending, rejected, or needing information. Existing tags survive invalid requests. |

The `admin_*` RPCs check the caller's admin role. Paginated admin RPCs cap page size at 100. Empty pages carry no `total_count` row. Continue using `review_organisation(org_id, decision, note)` to decide organisation requests. Approval and rejection already append entries to `admin_audit_logs`.

Rule-based reports inspect only stored data. Check values are `passed`, `failed`, or `needs manual verification`. Missing optional dates, unavailable organisation email data, source-page agreement, and organiser identity require manual verification. Duplicate detection compares case-insensitive trimmed titles or exact trimmed source URLs. Payment and urgency wording and free email domains are signals for human review. The report never fetches a source page or makes a decision automatically.

## Phase 6 solo experiences

Review the [Phase 6 migration](migrations/20261120000600_solo_experiences.sql). The existing `location` column is the location name. New content uses one of four category slugs: `art_and_culture`, `slow_experiences`, `learn_something_new`, or `outdoor_exploration`. The migration normalizes matching legacy labels. Older rows with unknown categories or incomplete content retain their data and need correction before a new approval.

Members create pending experiences through `recommend_experience`, which saves the listing and interest tags atomically. Required content includes title, description, city, location name, category, valid coordinates, non-negative cost in PKR, positive duration in minutes, interaction level, safety and accessibility information, and at least one valid interest tag. Zero cost means free. Opening hours, cover URL, and source URL are optional. The supported interaction levels are `quiet`, `small_group`, and `social`.

Guests can read approved experiences and their tags. Submitters can read and update the content of their own pending, rejected, and needs-info experiences. Use `set_experience_tags` to replace their tag selections. Owners cannot write status or submitter fields. Users can edit a needs-info entry in place and administrators can continue review from that queue. Rejection and requests for information require a note, which is stored in the admin audit log.

### Phase 6 RPCs

| RPC | Parameters | Returns |
| --- | --- | --- |
| `recommend_experience` | Required `p_title`, `p_description`, `p_category`, `p_city`, `p_location`, `p_latitude`, `p_longitude`, `p_cost`, `p_duration_minutes`, `p_social_level`, `p_safety_considerations`, `p_accessibility_information`, `p_interest_slugs`. Optional `p_opening_hours`, `p_cover_url`, `p_source_url`. | `experience_id`, `status` (`pending`). Signed-in members. |
| `search_experiences` | Optional `p_keyword`, `p_category`, `p_city`, `p_max_cost`, `p_social_level`, `p_interest_slugs`, `p_limit`, `p_offset`. | Approved experience fields plus `total_count` on each result. Public. |
| `get_experience` | `p_id` UUID. | Zero or one approved row with the experience fields and `tags` (array of `slug` and `name` objects). Public. |
| `get_recommended_experiences` | Optional `p_limit`, default 10. | Experience fields plus `total_score`, `social_comfort_score`, `interest_score`, `budget_score`, `location_score`, `category_score`. Signed-in users. |
| `set_experience_tags` | `p_id` UUID and nonempty `p_interest_slugs` text array. | `experience_id`, `interest_slugs`. Submitter only, while pending, rejected, or needs-info. |
| `admin_list_experiences` | Optional `p_status` (defaults to `pending`, null for all active review statuses), `p_limit`, `p_offset`. | Experience fields plus `submitter_username`, `tags`, and `total_count`. Admin only. |
| `admin_review_experience` | `p_id` UUID, `p_decision` (`approve`, `reject`, `request_info`), `p_note` (required for the last two). | `experience_id`, `status`. Admin only. Each decision writes a `review_experience` audit entry. |
| `admin_dashboard_stats` | None. | `registered_users`, `published_opportunities`, `pending_submissions`, `pending_organisations`, `open_reports`, and `pending_experiences`. Admin only. |

Experience fields are `id`, `submitted_by`, `title`, `description`, `category`, `city`, `location`, `source_url`, `cost`, `currency`, `duration_minutes`, `status`, `created_at`, `updated_at`, `latitude`, `longitude`, `opening_hours`, `social_level`, `safety_considerations`, `accessibility_information`, and `cover_url`.

Search matches a case-insensitive literal keyword in the title, description, location, or city. City matches case-insensitively. A nonempty interest list matches any selected slug, and `p_max_cost` is inclusive in PKR. Search and admin list are newest first with stable ID tie-breaking. Page size defaults to 20 and is clamped to 1–100. Offset defaults to zero. Empty pages have no `total_count` row.

Recommendations use 30 points each for social fit and interest overlap, 15 each for budget and city, and 10 for category. Missing social comfort or a missing legacy interaction level is neutral at 15 points. The owner-writable `user_preferences.experience_category_slugs` enum array records category preferences and defaults to empty. Budget reuses the Phase 2 preference, including the PKR 2,500 fallback for the low tier. An approved experience does not expire automatically because the model has no expiry field.

## Phase 5 tracker, calendar, and notifications

The [Phase 5 migration](migrations/20261120000700_application_tracker_notifications.sql) runs after the already-issued Phase 6 migration. It reuses the existing tables and owner relationships. Application statuses are `preparing`, `applied`, `shortlisted`, `interview`, `accepted`, `rejected`, and `withdrawn`. Existing `interested` rows become `preparing` and `submitted` becomes `applied`. Each user has one tracker per opportunity. Approved expired opportunities can be tracked. If moderation later hides an opportunity, the user's tracker and notes stay editable and listing metadata comes back as null.

Reminders can link to one approved opportunity or one of the caller's applications. `done` defaults to false. Calendar dates use an inclusive start and exclusive end (`p_from <= event_at < p_to`). A saved and tracked deadline appears as two calendar event types. The notification job sends one alert for the shared deadline. Interviews appear only while the application is in `interview`. The calendar includes done reminders and labels them with `done`.

### Phase 5 RPCs

All of these RPCs require an authenticated session and scope their results to the caller.

| RPC | Parameters | Returns |
| --- | --- | --- |
| `upsert_application` | `p_opportunity_id`, `p_status`, optional `p_notes`, `p_applied_at`, `p_interview_at` | One tracker row. Omitted optional values clear those fields. |
| `list_my_applications` | Optional `p_status`, null for all | Tracker rows plus `opportunity_title`, `organisation_name`, `deadline`, `is_expired`. Those four fields can be null when the listing has been taken down. |
| `delete_application` | `p_id` | Boolean indicating whether a row was deleted. |
| `create_reminder` | `p_title`, `p_remind_at`, optional `p_note`, `p_opportunity_id`, `p_application_id` | Reminder row. |
| `update_reminder` | `p_id`, `p_title`, `p_remind_at`, optional `p_note`, `p_opportunity_id`, `p_application_id`, `p_done` | Updated reminder row, or zero rows. Omitted note and links clear them. Omitted `p_done` preserves the current flag. |
| `delete_reminder` | `p_id` | Boolean indicating whether a row was deleted. |
| `list_my_reminders` | None | Reminder rows ordered by `remind_at`. |
| `get_my_calendar` | `p_from`, `p_to` | `event_type`, `id`, `title`, `event_at`, `link_path`, `done`. Types are `saved_deadline`, `application_deadline`, `reminder`, `interview`. |
| `list_my_notifications` | Optional `p_limit` (20, max 100), `p_offset` (0), `p_unread_only` (false) | One row with `notifications` (JSON array), `total_count` and `unread_count` for the whole inbox, even on an empty page. |
| `mark_notification_read` | `p_id` | Zero or one row with `id`, `read_at`. Repeated calls preserve the original read time. |
| `mark_all_notifications_read` | None | Number of previously unread notifications marked read. |
| `get_my_notification_preferences` | None | Twelve rows with `category`, `channel`, `frequency`. |
| `set_my_notification_preferences` | `p_category`, `p_channel`, `p_frequency` | One updated `category`, `channel`, `frequency` row. |

Tracker row columns are `id`, `user_id`, `opportunity_id`, `status`, `notes`, `applied_at`, `interview_at`, `created_at`, `updated_at`. Reminder row columns are `id`, `user_id`, `application_id`, `title`, `remind_at`, `sent_at`, `created_at`, `updated_at`, `note`, `opportunity_id`, `done`. Notification array entries contain `id`, `type`, `title`, `body`, `link_path`, `read_at`, `created_at`. The notification table reuses `kind` for the type.

Categories are `new_opportunities`, `deadline_reminders`, `verification_updates`, `activity_updates`, `group_messages`, and `account`. Channels are `in_app` and `email`. Frequencies are `instant`, `daily`, and `off`. New accounts default to in-app instant and email daily across all categories. Existing opt-outs, including the former email-off setting, are preserved. Email and daily digest delivery are outside this migration. In-app creation skips categories set to off and writes immediately for either enabled frequency.

Trusted code can call `create_notification(p_user_id, p_type, p_title, p_body, p_link)`, returning a notification UUID or null for a skipped notification. Supported types are `opportunity_alert`, `deadline_approaching`, `custom_reminder`, `verification_update`, `activity_update`, `group_message`, and `account`. Review status changes for opportunities, organisations, and solo experiences produce `verification_update` notifications.

### Hourly deadline job

The migration attempts to enable `pg_cron` and register the job. If the server lacks the extension or reports a scheduling warning, enable **pg_cron** under **Integrations → Cron** in the intended Supabase project. Then run the following as `postgres` in that project's SQL editor. This sets or replaces the named hourly job.

```sql
select cron.schedule('application-deadline-notifications', '0 * * * *', 'select public.generate_deadline_notifications();');
```

For SQL-only extension setup, run `create extension if not exists pg_cron with schema pg_catalog;` and `grant usage on schema cron to postgres;` as the extension owner first if needed. Check the **Cron** integration for the job and its run history.

To run without Cron, a trusted caller can execute `select public.generate_deadline_notifications();`. It returns the number of notifications created. It covers future public deadlines within 72 hours and due, unfinished custom reminders. The unique keys include the deadline or reminder time so repeats are deduplicated and a rescheduled time can produce a new alert. To try this locally, save or track the **[Demo] Paper Lantern Portfolio Clinic** fixture with your own test account. The fixture itself adds no user-scoped data.

## Contribution points

The [contribution points migration](migrations/20261120000800_contribution_points.sql) awards 10 points by default for each opportunity or solo experience approved through the existing admin review RPCs. Admins can update the award amounts in `point_rules`. Official organisation listings earn the same amount, and admins earn zero for approving their own listings.

A rejection reverses any previous award for that listing once, using the original amount. Reapproval leaves the original award and reversal in place. Requests for more information leave the balance unchanged. The migration backfills eligible listings already approved at migration time and skips notifications for those awards. New awards and reversals send a `points` notification through the account preference category and link to `/profile/points`.

Members can read their own ledger rows. Ledger writes are internal. Levels start at Newcomer (0), Explorer (20), Contributor (50), Trailblazer (100), and Pathfinder (200). Displayed balances have a minimum of zero.

| Signed-in RPC | Return columns or value |
| --- | --- |
| `get_my_points()` | `total_points`, `level_name`, `next_level_name`, `points_to_next_level`, `approved_opportunities`, `approved_experiences`. Both next-level fields are null at Pathfinder. Counts reflect the caller's currently approved listings. |
| `list_my_point_history(p_limit integer default 20, p_offset integer default 0)` | `id`, `reason`, `points`, `source_table`, `source_id`, `source_title`, `created_at`, `total_count`. Newest first. The title is null when the listing is outside the caller's read access. The count appears on each returned row. |
| `get_points_leaderboard(p_limit integer default 10)` | `username`, `avatar_url`, `total_points`, `level_name`. Includes balances of at least one point, highest first. |
| `level_for_points(p_total bigint)` | Level name as text. |

To apply pending migrations to an existing local stack while preserving its data, run `supabase start` followed by `supabase migration up`.

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
| `solo_experience_tags` | Links solo experiences to the shared interest catalog. |
| `activities` | Proposed and scheduled group activities. |
| `activity_participants` | Memberships and join decisions. |
| `activity_messages` | Planning-room messages. |
| `polls` | Planning-room polls. |
| `poll_options` | Options belonging to each poll. |
| `poll_votes` | One vote per participant per poll. |
| `activity_feedback` | Post-activity participant feedback. |
| `notifications` | In-app notification inbox. |
| `notification_preferences` | Per-member notification settings. |
| `point_transactions` | Private contribution ledger with awards, reversals and corrections. |
| `point_rules` | Point amounts for approved contributions. |
| `identity_verifications` | Verification status and opaque provider reference. |
| `reports` | Safety and content reports. |
| `blocked_users` | Directed user blocking relationships. |
| `admin_audit_logs` | Administrative action history written by trusted server code. |
