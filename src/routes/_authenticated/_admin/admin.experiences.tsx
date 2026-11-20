import { createFileRoute } from "@tanstack/react-router";
import { AdminExperiences } from "@/features/experiences/admin-experiences";

export const Route = createFileRoute("/_authenticated/_admin/admin/experiences")({
  component: AdminExperiences,
});
