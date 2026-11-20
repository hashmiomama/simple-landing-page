import { createFileRoute } from "@tanstack/react-router";
import { ExperienceSubmission } from "@/features/experiences/form";

export const Route = createFileRoute("/_authenticated/recommend-experience")({
  component: ExperienceSubmission,
});
