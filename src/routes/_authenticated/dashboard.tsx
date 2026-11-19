import { createFileRoute } from "@tanstack/react-router";
import { House } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: pageMeta("Home", "Your personalised home for opportunities and plans.", { noindex: true }),
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <PlaceholderPage
      icon={House}
      title="Your home"
      description="Your personalised picks, deadlines and plans will live here."
      phase="Phase 2"
    />
  );
}
