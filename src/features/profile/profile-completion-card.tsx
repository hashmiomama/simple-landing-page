import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { onboardingPreferences, selectedInterests } from "@/features/onboarding/data";

import { privateProfile } from "./data";

export function ProfileCompletionCard({ userId }: { userId: string }) {
  const { profile } = useAuth();
  const key = `profile-completion-dismissed:${userId}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return window.localStorage.getItem(key) === "true";
    } catch {
      return false;
    }
  });
  const details = useQuery({ ...privateProfile(userId), enabled: !dismissed });
  const prefs = useQuery({ ...onboardingPreferences(userId), enabled: !dismissed });
  const interests = useQuery({ ...selectedInterests(userId), enabled: !dismissed });
  const knownMissing =
    (profile && !profile.bio?.trim()) ||
    (details.data &&
      (!details.data.legal_name?.trim() ||
        !details.data.date_of_birth ||
        !details.data.gender?.trim())) ||
    (prefs.data &&
      (!prefs.data.city?.trim() ||
        !prefs.data.opportunity_category_slugs.length ||
        !prefs.data.social_comfort ||
        prefs.data.social_comfort === "flexible")) ||
    (interests.data && !interests.data.length);

  if (dismissed || !knownMissing) return null;
  return (
    <aside
      aria-labelledby="profile-completion-heading"
      className="flex flex-wrap items-start gap-4 rounded-3xl border bg-lavender-soft p-5 sm:p-6"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-card text-primary-strong">
        <Sparkles className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="profile-completion-heading" className="font-bold">
          Complete your profile for better recommendations
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Add as much or as little as you like.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/profile">My profile</Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setDismissed(true);
              try {
                window.localStorage.setItem(key, "true");
              } catch {
                /* The dismissal still applies to this visit. */
              }
            }}
          >
            Dismiss
          </Button>
        </div>
      </div>
    </aside>
  );
}
