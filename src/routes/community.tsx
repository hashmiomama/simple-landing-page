import { createFileRoute } from "@tanstack/react-router";
import { CommunityAccess } from "@/features/activities/access";
import { BrowseActivities } from "@/features/activities/browse";
import { searchSchema } from "@/features/activities/data";

export const Route = createFileRoute("/community")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Community" }, { name: "robots", content: "noindex" }] }),
  component: Community,
});

function Community() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <CommunityAccess>
      {(userId) => (
        <BrowseActivities
          key={userId}
          userId={userId}
          search={search}
          update={(next) => void navigate({ search: next })}
        />
      )}
    </CommunityAccess>
  );
}
