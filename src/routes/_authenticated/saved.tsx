import { createFileRoute } from "@tanstack/react-router";
import { SavedOpportunities } from "@/features/opportunities/saved";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/saved")({
  head: () => ({
    meta: pageMeta("Saved", "Opportunities and experiences you've bookmarked.", { noindex: true }),
  }),
  component: SavedOpportunities,
});
