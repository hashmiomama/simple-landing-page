import { createFileRoute } from "@tanstack/react-router";
import { OpportunityDetail } from "@/features/opportunities/detail";

export const Route = createFileRoute("/opportunities_/$id")({ component: DetailPage });

function DetailPage() {
  const { id } = Route.useParams();
  return <OpportunityDetail key={id} id={id} />;
}
