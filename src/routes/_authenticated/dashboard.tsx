import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Dashboard } from "@/features/dashboard/dashboard";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: pageMeta("Home", "Your personalised home for opportunities and plans.", {
      noindex: true,
    }),
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  return (
    <div
      className="contents"
      onSubmitCapture={(event) => {
        if (!(event.target instanceof HTMLFormElement)) return;
        const input = event.target.elements.namedItem("dashboard-search");
        if (!(input instanceof HTMLInputElement)) return;

        // Use the existing dashboard search field and handle its navigation at the route.
        event.preventDefault();
        event.stopPropagation();
        const keyword = input.value.trim();
        void navigate({ to: "/opportunities", search: { keyword: keyword || undefined } });
      }}
    >
      <Dashboard />
    </div>
  );
}
