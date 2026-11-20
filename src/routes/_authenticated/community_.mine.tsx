import { createFileRoute } from "@tanstack/react-router";
import { MyActivities } from "@/features/activities/browse";
import { useAuth } from "@/features/auth/auth-provider";

export const Route = createFileRoute("/_authenticated/community_/mine")({
  component: Mine,
});

function Mine() {
  const { user } = useAuth();
  return user ? <MyActivities key={user.id} userId={user.id} /> : null;
}
