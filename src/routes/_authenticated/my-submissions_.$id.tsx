import { createFileRoute } from "@tanstack/react-router";
import { EditSubmission } from "@/features/opportunities/submissions";

export const Route = createFileRoute("/_authenticated/my-submissions_/$id")({
  component: EditPage,
});
function EditPage() {
  const { id } = Route.useParams();
  return <EditSubmission key={id} id={id} />;
}
