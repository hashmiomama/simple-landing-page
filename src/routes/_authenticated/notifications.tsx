import { createFileRoute } from "@tanstack/react-router";
import { Bell } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: pageMeta("Notifications", "Updates about deadlines, activities and your account.", { noindex: true }) }),
  component: NotificationsPage,
});

function NotificationsPage() {
  return (
    <PlaceholderPage
      icon={Bell}
      title="Notifications"
      description="Updates about deadlines, activities and your account."
      phase="Phase 9"
    />
  );
}
