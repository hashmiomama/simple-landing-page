import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { House } from "lucide-react";

import { EmptyState } from "@/components/layout/page-states";
import { KeywordForm } from "@/features/opportunities/browse";
import { Page } from "@/features/opportunities/ui";
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
    <Page title="Your home" intro="Find opportunities and keep track of what interests you.">
      <div className="mb-6 rounded-3xl border bg-lavender-soft p-4">
        <KeywordForm
          onSearch={(keyword) =>
            void navigate({ to: "/opportunities", search: { keyword: keyword || undefined } })
          }
        />
      </div>
      <EmptyState
        icon={House}
        title="Coming soon"
        description="Your personalised picks, deadlines and plans will live here."
      />
    </Page>
  );
}
