import { createFileRoute } from "@tanstack/react-router";
import { OpportunityQueue } from "@/features/admin/pages";

export const Route = createFileRoute("/_authenticated/_admin/admin/opportunities")({
  component: OpportunityQueue,
});
