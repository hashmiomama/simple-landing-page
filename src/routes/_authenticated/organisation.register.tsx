import { createFileRoute } from "@tanstack/react-router";
import { OrganisationRegistration } from "@/features/opportunities/organisation-registration";

export const Route = createFileRoute("/_authenticated/organisation/register")({
  component: OrganisationRegistration,
});
