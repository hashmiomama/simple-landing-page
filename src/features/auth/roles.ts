import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

/** Highest-privilege role first. Roles are additive, so a user may hold several. */
export const ROLE_PRIORITY: readonly AppRole[] = ["admin", "organisation", "member"];

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  organisation: "Organisation",
  member: "Member",
};

export function hasRole(roles: readonly AppRole[], role: AppRole): boolean {
  return roles.includes(role);
}

/** The role shown as the user's main role: the highest-privilege one they hold. */
export function primaryRole(roles: readonly AppRole[]): AppRole | null {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? null;
}
