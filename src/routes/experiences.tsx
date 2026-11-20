import { createFileRoute } from "@tanstack/react-router";
import { ExperienceBrowse } from "@/features/experiences/browse";
import { searchSchema } from "@/features/experiences/data";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/experiences")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({ meta: pageMeta("Experiences", "Things to try on your own, at your own pace.") }),
  component: ExperiencesPage,
});

function ExperiencesPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return <ExperienceBrowse search={search} update={(next) => void navigate({ search: next })} />;
}
