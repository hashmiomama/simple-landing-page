import { createFileRoute } from "@tanstack/react-router";
import { ExperienceDetails } from "@/features/experiences/detail";

export const Route = createFileRoute("/experiences_/$id")({ component: ExperiencePage });
function ExperiencePage() {
  const { id } = Route.useParams();
  return <ExperienceDetails key={id} id={id} />;
}
