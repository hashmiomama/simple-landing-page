import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
import { requireSupabase } from "@/lib/backend";

import { toFriendlyAuthError } from "../errors";
import { PASSWORD_MIN_LENGTH, resetPasswordSchema, type ResetPasswordValues } from "../schemas";
import { FormAlert } from "./form-alert";
import { PasswordInput } from "./password-input";

export function ResetPasswordForm() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onTouched",
  });

  async function onSubmit({ password }: ResetPasswordValues) {
    setError(null);
    try {
      const { error: updateError } = await requireSupabase().auth.updateUser({ password });
      if (updateError) {
        setError(toFriendlyAuthError(updateError).message);
        return;
      }
      toast.success("Your password has been updated.");
      await navigate({ to: "/dashboard", replace: true });
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
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
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
              <FormLabel>Confirm new password</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </Form>
  );
}
