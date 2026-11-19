import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ErrorState, LoadingState } from "@/components/layout/page-states";
import { useAuth } from "@/features/auth/auth-provider";
import { toFriendlyAuthError } from "@/features/auth/errors";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/logout")({
  head: () => ({ meta: pageMeta("Signing out", "Signing you out of your account.", { noindex: true }) }),
  component: LogoutPage,
});

function LogoutPage() {
  const { status, signOut } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const run = useCallback(async () => {
    setError(null);
    try {
      await signOut();
      toast.success("You've been signed out.");
      await navigate({ to: "/login", replace: true });
    } catch (err) {
      started.current = false;
      setError(toFriendlyAuthError(err).message);
    }
  }, [signOut, navigate]);

  useEffect(() => {
    if (status === "loading" || started.current) return;
    if (status === "signed_out") {
      void navigate({ to: "/login", replace: true });
      return;
    }
    started.current = true;
    void run();
  }, [status, run, navigate]);

  if (error) {
    return <ErrorState title="We couldn't sign you out" message={error} onRetry={() => void run()} />;
  }
  return <LoadingState label="Signing you out…" />;
}
