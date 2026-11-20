import { createFileRoute } from "@tanstack/react-router";
import { Submissions } from "@/features/opportunities/submissions";

export const Route = createFileRoute("/_authenticated/organisation/listings")({
  component: OrganisationListings,
});
function OrganisationListings() {
  return <Submissions official />;
}
