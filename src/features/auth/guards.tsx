import { useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";

import { ErrorState, LoadingState } from "@/components/layout/page-states";

import { useAuth } from "./auth-provider";
import { ForbiddenView } from "./components/forbidden-view";
import { safeRedirectPath } from "./redirect";
import type { AppRole } from "./roles";

/**
 * UI guards only. The database's row-level security is what actually protects data;
 * these guards keep people out of screens they can't use.
 */

/** Shows children only to signed-in users; sends everyone else to the login page. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Remember the page the user asked for once, so the redirect can't feed on itself.
  const requestedHref = useRef(location.href);
  const redirected = useRef(false);

  useEffect(() => {
    if (status === "signed_out" && !redirected.current) {
      redirected.current = true;
      void navigate({ to: "/login", search: { redirect: requestedHref.current }, replace: true });
    }
    if (status === "signed_in") redirected.current = false;
  }, [status, navigate]);

  if (status !== "signed_in") return <LoadingState label="Checking your session…" />;
  return <>{children}</>;
}

/** Shows children only to users holding the given role; others see a friendly 403. */
export function RequireRole({ role, children }: { role: AppRole; children: ReactNode }) {
  return (
    <RequireAuth>
      <RoleGate role={role}>{children}</RoleGate>
    </RequireAuth>
  );
}

function RoleGate({ role, children }: { role: AppRole; children: ReactNode }) {
  const { hasRole, isRolesLoading, rolesError, refresh } = useAuth();
  if (isRolesLoading) return <LoadingState label="Checking your access…" />;
  if (rolesError) {
    return (
      <ErrorState
        title="We couldn't check your access"
        message="Your permissions didn't load. Check your connection and try again."
        onRetry={() => void refresh()}
      />
    );
  }
  if (!hasRole(role)) return <ForbiddenView />;
  return <>{children}</>;
}

/** For login/register pages: signed-in users are sent on to where they were going. */
export function RedirectIfAuthenticated({
  redirectTo,
  children,
}: {
  redirectTo?: string | undefined;
  children: ReactNode;
}) {
  const { status } = useAuth();
  const router = useRouter();
  const target = safeRedirectPath(redirectTo);

  useEffect(() => {
    if (status === "signed_in") void router.navigate({ href: target, replace: true });
  }, [status, router, target]);

  if (status === "loading") return <LoadingState label="Checking your session…" />;
  if (status === "signed_in") return <LoadingState label="You're signed in. Taking you there…" />;
  return <>{children}</>;
}
