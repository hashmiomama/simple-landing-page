import { createFileRoute } from "@tanstack/react-router";
import { MyExperiences } from "@/features/experiences/my-experiences";

export const Route = createFileRoute("/_authenticated/my-experience-recommendations")({
  component: MyExperiences,
});
