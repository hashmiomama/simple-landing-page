import { createFileRoute } from "@tanstack/react-router";
import { ApplicationsPage } from "@/features/planning/applications-page";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/applications")({
  head: () => ({
    meta: pageMeta("My Applications", "Your account activity and plans.", { noindex: true }),
  }),
  component: ApplicationsPage,
});
