import { createFileRoute } from "@tanstack/react-router";
import { Compass } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/opportunities")({
  head: () => ({ meta: pageMeta("Opportunities", "Internships, scholarships, hackathons and more — verified and in one place.") }),
  component: OpportunitiesPage,
});

function OpportunitiesPage() {
  return (
    <PlaceholderPage
      icon={Compass}
      title="Opportunities"
      description="Internships, scholarships, hackathons and more — verified and in one place."
      phase="Phase 3"
    />
  );
}
