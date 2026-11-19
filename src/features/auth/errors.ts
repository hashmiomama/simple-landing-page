import { BackendNotConfiguredError } from "@/lib/backend";

export type FriendlyAuthError = {
  message: string;
  /** Set when the error means the email address still needs confirming. */
  needsEmailConfirmation?: boolean;
};

type MaybeAuthError = { code?: string; status?: number; message?: string; name?: string };

/** Turns Supabase Auth errors into short, human messages. */
export function toFriendlyAuthError(error: unknown): FriendlyAuthError {
  if (error instanceof BackendNotConfiguredError) {
    return {
      message:
        "The app isn't connected to its backend yet, so accounts can't be used right now. Please try again later.",
    };
  }

  const err = (error ?? {}) as MaybeAuthError;
  const code = err.code ?? "";
  const message = (err.message ?? "").toLowerCase();

  if (err.name === "AuthRetryableFetchError" || message.includes("failed to fetch")) {
    return { message: "We couldn't reach the server. Check your connection and try again." };
  }
  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return { message: "That email and password don't match. Check them and try again." };
  }
  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return {
      message: "Please confirm your email address first. Check your inbox for the link.",
      needsEmailConfirmation: true,
    };
  }
  if (code === "user_already_exists" || code === "email_exists" || message.includes("already registered")) {
    return { message: "An account with this email already exists. Try signing in instead." };
  }
  if (code === "weak_password") {
    return { message: "That password is too easy to guess. Try a longer one with letters and numbers." };
  }
  if (code === "same_password") {
    return { message: "Your new password must be different from your current one." };
  }
  if (code === "email_address_invalid") {
    return { message: "That email address can't be used. Try a different one." };
  }
  if (code === "signup_disabled") {
    return { message: "New sign-ups are paused at the moment. Please try again later." };
  }
  if (code === "otp_expired" || message.includes("expired")) {
    return { message: "This link has expired. Request a new one and try again." };
  }
  if (err.status === 429 || code.startsWith("over_") || message.includes("rate limit")) {
    return { message: "Too many attempts. Please wait a minute before trying again." };
  }
  return { message: "Something went wrong. Please try again." };
}
