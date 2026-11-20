import { createFileRoute } from "@tanstack/react-router";
import { ProposeActivity } from "@/features/activities/propose";
import { useAuth } from "@/features/auth/auth-provider";

export const Route = createFileRoute("/_authenticated/community_/new")({
  component: NewActivity,
});

function NewActivity() {
  const { user } = useAuth();
  return user ? <ProposeActivity key={user.id} userId={user.id} /> : null;
}
