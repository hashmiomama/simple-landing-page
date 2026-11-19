import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/applications")({
  head: () => ({ meta: pageMeta("My applications", "Track where you've applied and what's next.", { noindex: true }) }),
  component: MyApplicationsPage,
});

function MyApplicationsPage() {
  return (
    <PlaceholderPage
      icon={ClipboardList}
      title="My applications"
      description="Track where you've applied and what's next."
      phase="Phase 5"
    />
  );
}
