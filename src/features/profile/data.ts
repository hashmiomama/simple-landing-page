import { queryOptions } from "@tanstack/react-query";

import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { requireSupabase } from "@/lib/backend";

export const privateProfile = (userId: string) =>
  queryOptions({
    queryKey: ["private-profile", userId],
    queryFn: async ({ signal }) => {
      const { data, error } = await requireSupabase()
        .from("profile_private")
        .select("legal_name, date_of_birth, gender")
        .eq("user_id", userId)
        .abortSignal(signal)
        .single();
      if (error) throw error;
      return data;
    },
  });

export type PrivateDetails = Pick<
  Tables<"profile_private">,
  "legal_name" | "date_of_birth" | "gender"
>;

export async function savePrivateProfile(userId: string, values: PrivateDetails) {
  const { data, error } = await requireSupabase()
    .from("profile_private")
    .update(values)
    .eq("user_id", userId)
    .select("legal_name, date_of_birth, gender")
    .single();
  if (error) throw error;
  return data;
}

export async function savePublicProfile(userId: string, values: TablesUpdate<"profiles">) {
  const { data, error } = await requireSupabase()
    .from("profiles")
    .update(values)
    .eq("id", userId)
    .select()
    .single();
  if (error?.code === "23505") throw new Error("That username was just taken. Try another.");
  if (error) throw error;
  return data;
}

export function optionalText(value: string) {
  return value.trim() || null;
}
