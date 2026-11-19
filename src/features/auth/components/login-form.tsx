import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { requireSupabase } from "@/lib/backend";

import { toFriendlyAuthError, type FriendlyAuthError } from "../errors";
import { loginSchema, type LoginValues } from "../schemas";
import { FormAlert } from "./form-alert";
import { PasswordInput } from "./password-input";

export function LoginForm() {
  const [error, setError] = useState<FriendlyAuthError | null>(null);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onTouched",
  });

  async function onSubmit(values: LoginValues) {
    setError(null);
    try {
      const { error: signInError } = await requireSupabase().auth.signInWithPassword(values);
      if (signInError) setError(toFriendlyAuthError(signInError));
      // On success the auth listener updates the session and the page redirects.
    } catch (err) {
      setError(toFriendlyAuthError(err));
    }
  }

  const email = form.watch("email");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
        {error && (
          <FormAlert>
            <p>{error.message}</p>
            {error.needsEmailConfirmation && (
              <Link to="/verify-email" search={email ? { email } : {}} className="text-link">
                Resend the confirmation email
              </Link>
            )}
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
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
                <Link to="/forgot-password" className="text-link text-sm">
                  Forgot password?
                </Link>
              </div>
              <FormControl>
                <PasswordInput autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </Form>
  );
}
