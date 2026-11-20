import { createFileRoute } from "@tanstack/react-router";
import { OrganisationQueue } from "@/features/admin/pages";

export const Route = createFileRoute("/_authenticated/_admin/admin/organisations")({
  component: OrganisationQueue,
});
