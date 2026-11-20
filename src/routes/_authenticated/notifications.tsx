import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPage } from "@/features/notifications/inbox";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: pageMeta("Notifications", "Your account activity and plans.", { noindex: true }),
  }),
  component: NotificationsPage,
});
