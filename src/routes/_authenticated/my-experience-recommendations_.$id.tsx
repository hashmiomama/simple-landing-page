import { createFileRoute } from "@tanstack/react-router";
import { ExperienceSubmission } from "@/features/experiences/form";

export const Route = createFileRoute("/_authenticated/my-experience-recommendations_/$id")({
  component: EditExperience,
});
function EditExperience() {
  const { id } = Route.useParams();
  return <ExperienceSubmission key={id} id={id} />;
}
