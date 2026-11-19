import { createFileRoute } from "@tanstack/react-router";
import { UsersRound } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({ meta: pageMeta("Community", "Shared hobbies and small group activities you can plan together.", { noindex: true }) }),
  component: CommunityPage,
});

function CommunityPage() {
  return (
    <PlaceholderPage
      icon={UsersRound}
      title="Community"
      description="Shared hobbies and small group activities you can plan together."
      phase="Phase 7"
    />
  );
}
