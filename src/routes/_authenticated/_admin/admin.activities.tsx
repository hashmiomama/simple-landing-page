import { createFileRoute } from "@tanstack/react-router";
import { ActivityModeration } from "@/features/activities/admin";

export const Route = createFileRoute("/_authenticated/_admin/admin/activities")({
  component: ActivityModeration,
});
