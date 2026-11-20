import { createFileRoute } from "@tanstack/react-router";
import { Browse } from "@/features/opportunities/browse";
import { searchSchema } from "@/features/opportunities/search-state";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/opportunities")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: pageMeta(
      "Opportunities",
      "Internships, scholarships, hackathons and more — verified and in one place.",
    ),
  }),
  component: OpportunitiesPage,
});

function OpportunitiesPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <Browse search={search} update={(next) => void navigate({ search: next })} />;
}
