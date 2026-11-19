export const DEFAULT_SIGNED_IN_PATH = "/dashboard";

/** Only allow same-site paths like "/saved", never "//evil.com" or "https://...". */
export function safeRedirectPath(value: unknown, fallback = DEFAULT_SIGNED_IN_PATH): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  const authPages = ["/login", "/register", "/logout", "/forgot-password"];
  if (authPages.some((page) => value === page || value.startsWith(`${page}?`))) return fallback;
  return value;
}
