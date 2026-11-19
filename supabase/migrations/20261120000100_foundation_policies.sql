create function public.has_role(user_id uuid, role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce($1 = (select auth.uid()), false) and exists (
    select 1 from public.user_roles as assigned
    where assigned.user_id = $1 and assigned.role = $2
  );
$$;

revoke all on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

grant select, insert, update, delete on table
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
  public.blocked_users
to service_role;
grant select, insert on public.admin_audit_logs to service_role;

grant select on public.profiles to anon, authenticated;
create policy public_read on public.profiles
for select to anon, authenticated
using (true);
grant update (username, avatar_url, bio) on public.profiles to authenticated;
create policy owner_update on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

grant select on public.profile_private to authenticated;
create policy owner_or_admin_read on public.profile_private
for select to authenticated
using (user_id = (select auth.uid()) or (select public.has_role((select auth.uid()), 'admin')));
grant update (legal_name, date_of_birth, gender) on public.profile_private to authenticated;
create policy owner_update on public.profile_private
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

grant select on public.user_roles to authenticated;
create policy owner_or_admin_read on public.user_roles
for select to authenticated
using (user_id = (select auth.uid()) or (select public.has_role((select auth.uid()), 'admin')));
grant insert (user_id, role), delete on public.user_roles to authenticated;
create policy admin_assign on public.user_roles
for insert to authenticated
with check ((select public.has_role((select auth.uid()), 'admin')));
create policy admin_revoke on public.user_roles
for delete to authenticated
using ((select public.has_role((select auth.uid()), 'admin')));

-- TODO policies in Phase 3
grant select, insert, update, delete on public.opportunity_categories to authenticated;
create policy admin_access on public.opportunity_categories
for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin')))
with check ((select public.has_role((select auth.uid()), 'admin')));

grant select on public.user_preferences to authenticated;
create policy owner_read on public.user_preferences
for select to authenticated
using (user_id = (select auth.uid()));
grant update (city, country, social_comfort, personality_type, max_budget, currency, opportunity_category_slugs) on public.user_preferences to authenticated;
create policy owner_update on public.user_preferences
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

grant select on public.interests to anon, authenticated;
create policy public_read on public.interests
for select to anon, authenticated
using (true);
grant insert, update, delete on public.interests to authenticated;
create policy admin_manage on public.interests
for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin')))
with check ((select public.has_role((select auth.uid()), 'admin')));

grant select on public.user_interests to anon, authenticated;
create policy public_read on public.user_interests
for select to anon, authenticated
using (true);
grant insert (user_id, interest_slug), delete on public.user_interests to authenticated;
create policy owner_insert on public.user_interests
for insert to authenticated
with check (user_id = (select auth.uid()));
create policy owner_delete on public.user_interests
for delete to authenticated
using (user_id = (select auth.uid()));

-- TODO policies in Phase 3
grant select, insert, update, delete on public.organisations to authenticated;
create policy admin_access on public.organisations
for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin')))
with check ((select public.has_role((select auth.uid()), 'admin')));

-- TODO policies in Phase 3
grant select, insert, update, delete on public.opportunities to authenticated;
create policy admin_access on public.opportunities
for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin')))
with check ((select public.has_role((select auth.uid()), 'admin')));

-- TODO policies in Phase 3
grant select, insert, update, delete on public.opportunity_tags to authenticated;
create policy admin_access on public.opportunity_tags
for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin')))
with check ((select public.has_role((select auth.uid()), 'admin')));

-- TODO policies in Phase 4
grant select, insert, update, delete on public.verification_reviews to authenticated;
create policy admin_access on public.verification_reviews
for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin')))
with check ((select public.has_role((select auth.uid()), 'admin')));

-- TODO policies in Phase 3
grant select, insert, update, delete on public.saved_opportunities to authenticated;
create policy admin_access on public.saved_opportunities
for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin')))
with check ((select public.has_role((select auth.uid()), 'admin')));

-- TODO policies in Phase 5
grant select, insert, update, delete on public.applications to authenticated;
create policy admin_access on public.applications
for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin')))
with check ((select public.has_role((select auth.uid()), 'admin')));

-- TODO policies in Phase 5
grant select, insert, update, delete on public.reminders to authenticated;
create policy admin_access on public.reminders
for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin')))
with check ((select public.has_role((select auth.uid()), 'admin')));

-- TODO policies in Phase 6
grant select, insert, update, delete on public.solo_experiences to authenticated;
create policy admin_access on public.solo_experiences
for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin')))
with check ((select public.has_role((select auth.uid()), 'admin')));

-- TODO policies in Phase 7
grant select, insert, update, delete on public.activities to authenticated;
create policy admin_access on public.activities
for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin')))
with check ((select public.has_role((select auth.uid()), 'admin')));

-- TODO policies in Phase 7
grant select, insert, update, delete on public.activity_participants to authenticated;
create policy admin_access on public.activity_participants
for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin')))
with check ((select public.has_role((select auth.uid()), 'admin')));

-- TODO policies in Phase 7
grant select, insert, update, delete on public.activity_messages to authenticated;
create policy admin_access on public.activity_messages
for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin')))
with check ((select public.has_role((select auth.uid()), 'admin')));

-- TODO policies in Phase 7
grant select, insert, update, delete on public.polls to authenticated;
create policy admin_access on public.polls
for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin')))
with check ((select public.has_role((select auth.uid()), 'admin')));

-- TODO policies in Phase 7
grant select, insert, update, delete on public.poll_options to authenticated;
create policy admin_access on public.poll_options
for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin')))
with check ((select public.has_role((select auth.uid()), 'admin')));

-- TODO policies in Phase 7
grant select, insert, update, delete on public.poll_votes to authenticated;
create policy admin_access on public.poll_votes
for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin')))
with check ((select public.has_role((select auth.uid()), 'admin')));

-- TODO policies in Phase 7
grant select, insert, update, delete on public.activity_feedback to authenticated;
create policy admin_access on public.activity_feedback
for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin')))
with check ((select public.has_role((select auth.uid()), 'admin')));

grant select on public.notifications to authenticated;
create policy owner_read on public.notifications
for select to authenticated
using (user_id = (select auth.uid()));
grant update (read_at) on public.notifications to authenticated;
create policy owner_update on public.notifications
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

grant select on public.notification_preferences to authenticated;
create policy owner_read on public.notification_preferences
for select to authenticated
using (user_id = (select auth.uid()));
grant update (in_app_enabled, email_enabled, deadline_reminders, activity_updates, opportunity_updates) on public.notification_preferences to authenticated;
create policy owner_update on public.notification_preferences
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- TODO policies in Phase 8
grant select, insert, update, delete on public.identity_verifications to authenticated;
create policy admin_access on public.identity_verifications
for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin')))
with check ((select public.has_role((select auth.uid()), 'admin')));

-- TODO policies in Phase 8
grant select, insert, update, delete on public.reports to authenticated;
create policy admin_access on public.reports
for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin')))
with check ((select public.has_role((select auth.uid()), 'admin')));

-- TODO policies in Phase 8
grant select, insert, update, delete on public.blocked_users to authenticated;
create policy admin_access on public.blocked_users
for all to authenticated
using ((select public.has_role((select auth.uid()), 'admin')))
with check ((select public.has_role((select auth.uid()), 'admin')));

grant select on public.admin_audit_logs to authenticated;
create policy admin_read on public.admin_audit_logs
for select to authenticated
using ((select public.has_role((select auth.uid()), 'admin')));
