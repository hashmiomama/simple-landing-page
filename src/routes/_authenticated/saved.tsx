import { createFileRoute } from "@tanstack/react-router";
import { Bookmark } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/saved")({
  head: () => ({ meta: pageMeta("Saved", "Opportunities and experiences you've bookmarked.", { noindex: true }) }),
  component: SavedPage,
});

function SavedPage() {
  return (
    <PlaceholderPage
      icon={Bookmark}
      title="Saved"
      description="Opportunities and experiences you've bookmarked."
      phase="Phase 3"
    />
  );
}
