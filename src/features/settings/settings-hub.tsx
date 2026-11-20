import { Link, type LinkProps } from "@tanstack/react-router";
import {
  Award,
  Bell,
  Bookmark,
  Building2,
  CalendarDays,
  ClipboardList,
  Fingerprint,
  HandHelping,
  Mountain,
  Send,
  Shield,
  SlidersHorizontal,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/auth-provider";

type Entry = {
  icon: LucideIcon;
  title: string;
  description: string;
  to?: LinkProps["to"];
  hash?: string;
};

const profile: Entry[] = [
  {
    icon: UserRound,
    title: "My profile",
    description: "Edit your public profile and private details.",
    to: "/profile",
  },
  {
    icon: SlidersHorizontal,
    title: "Preferences",
    description: "Choose what you’d like to discover.",
    to: "/profile",
    hash: "preferences",
  },
];
const notifications: Entry[] = [
  {
    icon: Bell,
    title: "Notification settings",
    description: "Choose which updates you receive and how often.",
    to: "/settings/notifications",
  },
];
const activity: Entry[] = [
  {
    icon: Award,
    title: "My points",
    description: "See your level and contribution history.",
    to: "/profile/points",
  },
  {
    icon: ClipboardList,
    title: "My applications",
    description: "Track application progress and interview dates.",
    to: "/applications",
  },
  {
    icon: CalendarDays,
    title: "My calendar",
    description: "See upcoming deadlines and manage reminders.",
    to: "/calendar",
  },
  {
    icon: Send,
    title: "My submissions",
    description: "Check the status of opportunities you submitted.",
    to: "/my-submissions",
  },
  {
    icon: Mountain,
    title: "My experience recommendations",
    description: "Check the status of experiences you recommended.",
    to: "/my-experience-recommendations",
  },
  {
    icon: Bookmark,
    title: "Saved",
    description: "Return to opportunities you bookmarked.",
    to: "/saved",
  },
];
const upcoming: Entry[] = [
  { icon: Shield, title: "Privacy and safety", description: "Manage privacy and safety controls." },
  { icon: Fingerprint, title: "Identity verification", description: "Verify your identity." },
  { icon: HandHelping, title: "Help and support", description: "Find answers and get help." },
];

export function SettingsHub() {
  const { hasRole, isRolesLoading, rolesError } = useAuth();
  const organisation: Entry = hasRole("organisation")
    ? {
        icon: Building2,
        title: "My organisation listings",
        description: "Manage listings for your approved organisation.",
        to: "/organisation/listings",
      }
    : {
        icon: Building2,
        title: "Register an organisation",
        description: "Start or check your organisation registration request.",
        to: "/organisation/register",
      };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-7 px-5 py-9 sm:px-8 sm:py-12">
      <h1 className="text-3xl font-bold sm:text-4xl">Settings</h1>
      <SettingsSection id="profile" title="Profile" entries={profile} />
      <SettingsSection id="notifications" title="Notifications" entries={notifications} />
      <SettingsSection id="activity" title="Activity" entries={activity} />
      {isRolesLoading || rolesError ? (
        <section aria-labelledby="settings-organisation">
          <h2 id="settings-organisation" className="mb-3 text-xl font-bold">
            Organisation
          </h2>
          {isRolesLoading ? (
            <p role="status">Checking your organisation access…</p>
          ) : (
            <p role="alert">
              We couldn’t check your organisation access. Reload the page to try again.
            </p>
          )}
        </section>
      ) : (
        <SettingsSection id="organisation" title="Organisation" entries={[organisation]} />
      )}
      <SettingsSection id="account-support" title="Account and support" entries={upcoming} />
    </div>
  );
}

function SettingsSection({ id, title, entries }: { id: string; title: string; entries: Entry[] }) {
  const heading = `settings-${id}`;
  return (
    <section aria-labelledby={heading}>
      <h2 id={heading} className="mb-3 text-xl font-bold">
        {title}
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {entries.map(({ icon: Icon, title, description, to, hash }) => {
          const classes =
            "flex h-full items-start gap-3 rounded-2xl border bg-card p-4 shadow-soft";
          const content = (
            <>
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-lavender-soft text-primary-strong">
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
                {!to && (
                  <Badge className="mt-2" variant="secondary">
                    Coming soon
                  </Badge>
                )}
              </div>
            </>
          );
          return (
            <li key={title}>
              {to ? (
                <Link
                  to={to}
                  {...(hash ? { hash } : {})}
                  className={`${classes} hover:bg-lavender-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`}
                >
                  {content}
                </Link>
              ) : (
                <div className={classes}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
