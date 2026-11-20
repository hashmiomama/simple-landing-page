import { createFileRoute } from "@tanstack/react-router";

import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: pageMeta("Onboarding", "Set up your account preferences.", { noindex: true }),
  }),
  component: OnboardingWizard,
});
