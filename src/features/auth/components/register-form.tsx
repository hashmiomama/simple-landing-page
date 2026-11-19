import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { requireSupabase } from "@/lib/backend";

import { toFriendlyAuthError } from "../errors";
import { PASSWORD_MIN_LENGTH, registerSchema, type RegisterValues } from "../schemas";
import { FormAlert } from "./form-alert";
import { PasswordInput } from "./password-input";

export function RegisterForm() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
    mode: "onTouched",
  });

  async function onSubmit({ email, password }: RegisterValues) {
    setError(null);
    try {
      const { data, error: signUpError } = await requireSupabase().auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/login` },
      });
      if (signUpError) {
        setError(toFriendlyAuthError(signUpError).message);
        return;
      }
      // With email confirmation on, an existing address comes back with no identities.
      if (data.user && data.user.identities?.length === 0) {
        setError("An account with this email already exists. Try signing in or resetting your password.");
        return;
      }
      if (!data.session) {
        await navigate({ to: "/verify-email", search: { email } });
      }
      // With a session, the auth listener signs the user in and the page redirects.
    } catch (err) {
      setError(toFriendlyAuthError(err).message);
    }
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
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" {...field} />
              </FormControl>
              <FormDescription>
                At least {PASSWORD_MIN_LENGTH} characters, with a letter and a number.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Creating your account…" : "Create account"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          We only ask for what we need. Your real name and details stay private.
        </p>
      </form>
    </Form>
  );
}
