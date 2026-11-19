import { createFileRoute, Link } from "@tanstack/react-router";

import { AuthLayout } from "@/features/auth/components/auth-layout";
import { LoginForm } from "@/features/auth/components/login-form";
import { RedirectIfAuthenticated } from "@/features/auth/guards";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => 
    typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {},
  head: () => ({ meta: pageMeta("Sign in", "Sign in to your account.", { noindex: true }) }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  return (
    <RedirectIfAuthenticated redirectTo={redirect}>
      <AuthLayout
        title="Welcome back"
        description="Sign in to pick up where you left off."
        footer={
          <>
            New here?{" "}
            <Link to="/register" className="text-link">
              Create an account
            </Link>
          </>
        }
      >
        <LoginForm />
      </AuthLayout>
    </RedirectIfAuthenticated>
  );
}
