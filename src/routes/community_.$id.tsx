import { createFileRoute } from "@tanstack/react-router";
import { CommunityAccess } from "@/features/activities/access";
import { ActivityPage } from "@/features/activities/activity-page";

export const Route = createFileRoute("/community_/$id")({
  head: () => ({ meta: [{ title: "Community activity" }, { name: "robots", content: "noindex" }] }),
  component: ActivityRoute,
});

function ActivityRoute() {
  const { id } = Route.useParams();
  return (
    <CommunityAccess>
      {(userId) => <ActivityPage key={userId + id} userId={userId} id={id} />}
    </CommunityAccess>
  );
}
