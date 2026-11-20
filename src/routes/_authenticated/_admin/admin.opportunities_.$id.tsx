import { createFileRoute } from "@tanstack/react-router";
import { SubmissionReview } from "@/features/admin/submission-review";

export const Route = createFileRoute("/_authenticated/_admin/admin/opportunities_/$id")({
  component: ReviewPage,
});

function ReviewPage() {
  const { id } = Route.useParams();
  return <SubmissionReview key={id} id={id} />;
}
