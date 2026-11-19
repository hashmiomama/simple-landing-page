import { createFileRoute } from "@tanstack/react-router";
import { Mountain } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/experiences")({
  head: () => ({ meta: pageMeta("Experiences", "Things to try on your own, at your own pace.", { noindex: true }) }),
  component: ExperiencesPage,
});

function ExperiencesPage() {
  return (
    <PlaceholderPage
      icon={Mountain}
      title="Experiences"
      description="Things to try on your own, at your own pace."
      phase="Phase 6"
    />
  );
}
