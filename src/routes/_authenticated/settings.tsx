import { createFileRoute } from "@tanstack/react-router";
import { SettingsHub } from "@/features/settings/settings-hub";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: pageMeta("Settings", "Your profile, preferences, privacy and notifications.", {
      noindex: true,
    }),
  }),
  component: SettingsHub,
});
