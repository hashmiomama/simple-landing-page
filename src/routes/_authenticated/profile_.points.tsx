import { createFileRoute } from "@tanstack/react-router";

import { PointsPage } from "@/features/points/points-page";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/profile_/points")({
  head: () => ({
    meta: pageMeta("My points", "See your contribution points and level.", { noindex: true }),
  }),
  component: PointsPage,
});
