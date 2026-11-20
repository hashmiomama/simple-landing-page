import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/features/dashboard/dashboard";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: pageMeta("Home", "Your personalised home for opportunities and plans.", { noindex: true }),
  }),
  component: Dashboard,
});
