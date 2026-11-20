import { createFileRoute, Link } from "@tanstack/react-router";

import { AuthLayout } from "@/features/auth/components/auth-layout";
import { RegisterForm } from "@/features/auth/components/register-form";
import { RedirectIfAuthenticated } from "@/features/auth/guards";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {},
  head: () => ({
    meta: pageMeta("Create an account", "Join to discover opportunities and experiences at your own pace."),
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { redirect } = Route.useSearch();
  return (
    <RedirectIfAuthenticated redirectTo={redirect}>
      <AuthLayout
        title="Create your account"
        description="It takes a minute. You can set up your interests right after."
        footer={
          <>
            Already have an account?{" "}
            <Link to="/login" search={redirect ? { redirect } : {}} className="text-link">
              Sign in
            </Link>
          </>
        }
      >
        <RegisterForm redirectTo={redirect} />
      </AuthLayout>
    </RedirectIfAuthenticated>
  );
}
