import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: pageMeta("Settings", "Your profile, preferences, privacy and notifications.", { noindex: true }) }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <PlaceholderPage
      icon={Settings}
      title="Settings"
      description="Your profile, preferences, privacy and notifications."
      phase="Phase 2"
    />
  );
}
