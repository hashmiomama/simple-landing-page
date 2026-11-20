import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/auth-provider";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { FormAlert } from "@/features/auth/components/form-alert";
import { toFriendlyAuthError } from "@/features/auth/errors";
import { loginRedirectUrl } from "@/features/auth/redirect";
import { emailSchema } from "@/features/auth/schemas";
import { requireSupabase } from "@/lib/backend";
import { pageMeta } from "@/lib/seo";

const RESEND_COOLDOWN_SECONDS = 60;

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search: Record<string, unknown>): { email?: string; redirect?: string } => ({
    ...(typeof search["email"] === "string" ? { email: search["email"] } : {}),
    ...(typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {}),
  }),
  head: () => ({ meta: pageMeta("Confirm your email", "Confirm your email address to finish signing up.", { noindex: true }) }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { email: initialEmail, redirect } = Route.useSearch();
  const { status } = useAuth();

  if (status === "signed_in") {
    return (
      <AuthLayout title="Your email is confirmed" description="You're all set.">
        <Button asChild className="w-full">
          {redirect ? <Link to="/login" search={{ redirect }}>Continue</Link> : <Link to="/dashboard">Continue</Link>}
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Check your inbox"
      description={
        initialEmail ? (
          <>
            We sent a confirmation link to <strong className="text-foreground">{initialEmail}</strong>. Open it to
            finish creating your account.
          </>
        ) : (
          "We sent you a confirmation link. Open it to finish creating your account."
        )
      }
      footer={
        <>
          Already confirmed?{" "}
          <Link to="/login" search={redirect ? { redirect } : {}} className="text-link">
            Sign in
          </Link>
        </>
      }
    >
      <div className="mb-6 flex items-center gap-3 rounded-2xl bg-lavender-soft p-4 text-sm">
        <MailCheck className="h-5 w-5 shrink-0 text-primary-strong" aria-hidden />
        <p>It can take a few minutes to arrive. Check your spam or promotions folder too.</p>
      </div>
      <ResendForm initialEmail={initialEmail ?? ""} redirectTo={redirect} />
    </AuthLayout>
  );
}

function ResendForm({ initialEmail, redirectTo }: { initialEmail: string; redirectTo: string | undefined }) {
  const [email, setEmail] = useState(initialEmail);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSent(false);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Enter a valid email address.");
      return;
    }
    setFieldError(null);
    setSending(true);
    try {
      const { error: resendError } = await requireSupabase().auth.resend({
        type: "signup",
        email: parsed.data,
        options: { emailRedirectTo: loginRedirectUrl(window.location.origin, redirectTo) },
      });
      if (resendError) {
        setError(toFriendlyAuthError(resendError).message);
      } else {
        setSent(true);
        setCooldown(RESEND_COOLDOWN_SECONDS);
      }
    } catch (err) {
      setError(toFriendlyAuthError(err).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error && (
        <FormAlert>
          <p>{error}</p>
        </FormAlert>
      )}
      {sent && (
        <FormAlert tone="success">
          <p>A new confirmation link is on its way.</p>
        </FormAlert>
      )}
      <div className="space-y-2">
        <Label htmlFor="resend-email">Didn't get it? Resend to</Label>
        <Input
          id="resend-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(fieldError)}
          aria-describedby={fieldError ? "resend-email-error" : undefined}
          placeholder="you@example.com"
        />
        {fieldError && (
          <p id="resend-email-error" className="text-sm font-medium text-destructive">
            {fieldError}
          </p>
        )}
      </div>
      <Button type="submit" variant="outline" className="w-full" disabled={sending || cooldown > 0}>
        {sending ? "Sending…" : cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend confirmation email"}
      </Button>
    </form>
  );
}
