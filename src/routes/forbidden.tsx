import { createFileRoute } from "@tanstack/react-router";

import { ForbiddenView } from "@/features/auth/components/forbidden-view";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/forbidden")({
  head: () => ({ meta: pageMeta("No access", "You don't have access to this page.", { noindex: true }) }),
  component: ForbiddenView,
});
