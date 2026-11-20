import { createFileRoute } from "@tanstack/react-router";
import { NotificationSettings } from "@/features/notifications/settings";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/settings_/notifications")({
  head: () => ({
    meta: pageMeta("Notification settings", "Set your notification preferences.", {
      noindex: true,
    }),
  }),
  component: NotificationSettings,
});
