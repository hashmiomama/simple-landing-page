import { createFileRoute } from "@tanstack/react-router";
import { SubmissionForm } from "@/features/opportunities/submission-form";

export const Route = createFileRoute("/_authenticated/submit-opportunity")({
  component: SubmissionForm,
});
