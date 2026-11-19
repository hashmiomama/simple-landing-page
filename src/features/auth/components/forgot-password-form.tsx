import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { requireSupabase } from "@/lib/backend";

import { toFriendlyAuthError } from "../errors";
import { forgotPasswordSchema, type ForgotPasswordValues } from "../schemas";
import { FormAlert } from "./form-alert";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
    mode: "onTouched",
  });

  async function onSubmit({ email }: ForgotPasswordValues) {
    setError(null);
    try {
      const { error: resetError } = await requireSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) {
        setError(toFriendlyAuthError(resetError).message);
        return;
      }
      setSentTo(email);
    } catch (err) {
      setError(toFriendlyAuthError(err).message);
    }
  }

  if (sentTo) {
    return (
      <div className="space-y-5">
        <FormAlert tone="success">
          <p>
            If an account exists for <strong>{sentTo}</strong>, a reset link is on its way. It can take a
            few minutes to arrive, so check your spam folder too.
          </p>
        </FormAlert>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={() => setSentTo(null)}>
            Use a different email
          </Button>
          <Button asChild className="flex-1">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
        {error && (
          <FormAlert>
            <p>{error}</p>
          </FormAlert>
        )}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Sending link…" : "Send reset link"}
        </Button>
      </form>
    </Form>
  );
}
