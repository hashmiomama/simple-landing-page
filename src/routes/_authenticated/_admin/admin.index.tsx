import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/features/admin/pages";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/_admin/admin/")({
  head: () => ({
    meta: pageMeta("Administration", "Review submissions, handle reports and manage accounts.", {
      noindex: true,
    }),
  }),
  component: AdminDashboard,
});
