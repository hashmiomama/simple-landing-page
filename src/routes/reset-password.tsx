import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { LoadingState } from "@/components/layout/page-states";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { FormAlert } from "@/features/auth/components/form-alert";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: pageMeta("Reset password", "Choose a new password.", { noindex: true }) }),
  component: ResetPasswordPage,
});

function readLinkError(): string | null {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const code = hash.get("error_code") ?? query.get("error_code");
  const description = hash.get("error_description") ?? query.get("error_description");
  if (!code && !description) return null;
  if (code === "otp_expired") return "This reset link has expired.";
  return description ?? "This reset link isn't valid.";
}

function ResetPasswordPage() {
  const { status } = useAuth();
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    setLinkError(readLinkError());
  }, []);

  if (linkError || status === "signed_out") {
    return (
      <AuthLayout title="This link can't be used" description="Reset links expire after a while and work only once.">
        <div className="space-y-5">
          <FormAlert>
            <p>{linkError ?? "This reset link is invalid or has already been used."}</p>
          </FormAlert>
          <Button asChild className="w-full">
            <Link to="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  if (status === "loading") return <LoadingState label="Checking your reset link…" />;

  return (
    <AuthLayout title="Choose a new password" description="Pick something you haven't used here before.">
      <ResetPasswordForm />
    </AuthLayout>
  );
}
