import { createFileRoute, Outlet } from "@tanstack/react-router";

import { RequireAuth } from "@/features/auth/guards";
import { OnboardingGate } from "@/features/onboarding/onboarding-gate";

// Every route inside src/routes/_authenticated/ needs a signed-in user.
export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <RequireAuth>
      <OnboardingGate>
        <Outlet />
      </OnboardingGate>
    </RequireAuth>
  );
}
