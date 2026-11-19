import { createFileRoute } from "@tanstack/react-router";
import { Shield } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_admin/admin")({
  head: () => ({ meta: pageMeta("Administration", "Review submissions, handle reports and manage accounts.", { noindex: true }) }),
  component: AdministrationPage,
});

function AdministrationPage() {
  return (
    <PlaceholderPage
      icon={Shield}
      title="Administration"
      description="Review submissions, handle reports and manage accounts."
      phase="Phase 10"
    />
  );
}
