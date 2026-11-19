import { createFileRoute, Link } from "@tanstack/react-router";

import { AuthLayout } from "@/features/auth/components/auth-layout";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { RedirectIfAuthenticated } from "@/features/auth/guards";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: pageMeta("Forgot password", "Get a link to reset your password.", { noindex: true }) }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  return (
    <RedirectIfAuthenticated>
      <AuthLayout
        title="Forgot your password?"
        description="Enter the email you signed up with and we'll send you a link to set a new one."
        footer={
          <>
            Remembered it?{" "}
            <Link to="/login" className="text-link">
              Back to sign in
            </Link>
          </>
        }
      >
        <ForgotPasswordForm />
      </AuthLayout>
    </RedirectIfAuthenticated>
  );
}
