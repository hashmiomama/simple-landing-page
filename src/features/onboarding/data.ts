import { queryOptions } from "@tanstack/react-query";

import type { Tables, TablesUpdate } from "@/integrations/supabase/types";
import { requireSupabase } from "@/lib/backend";

export const onboardingPreferences = (userId: string) =>
  queryOptions({
    queryKey: ["preferences", userId],
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

export const opportunityCategories = queryOptions({
  queryKey: ["opportunity-categories"],
  queryFn: async () => {
    const { data, error } = await requireSupabase()
      .from("opportunity_categories")
      .select("slug, name")
      .order("name");
    if (error) throw error;
    return data;
  },
  staleTime: 60_000,
});

export const interestCatalog = queryOptions({
  queryKey: ["interest-catalog"],
  queryFn: async () => {
    const { data, error } = await requireSupabase()
      .from("interests")
      .select("slug, name")
      .order("name");
    if (error) throw error;
    return data;
  },
  staleTime: 60_000,
});

export const selectedInterests = (userId: string) =>
  queryOptions({
    queryKey: ["selected-interests", userId],
    queryFn: () => readSelectedInterests(userId),
  });

async function readSelectedInterests(userId: string) {
  const { data, error } = await requireSupabase()
    .from("user_interests")
    .select("interest_slug")
    .eq("user_id", userId);
  if (error) throw error;
  return data.map(({ interest_slug }) => interest_slug);
}

export const usernamePattern = /^[a-z0-9_]{3,20}$/;

export async function saveUsername(userId: string, username: string): Promise<Tables<"profiles">> {
  const { data, error } = await requireSupabase()
    .from("profiles")
    .update({ username })
    .eq("id", userId)
    .select()
    .single();
  if (error?.code === "23505") throw new Error("That username was just taken. Try another.");
  if (error) throw error;
  return data;
}

export async function savePreferences(userId: string, values: TablesUpdate<"user_preferences">) {
  const { data, error } = await requireSupabase()
    .from("user_preferences")
    .update(values)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveInterests(userId: string, selected: string[]) {
  const client = requireSupabase();
  const current = await readSelectedInterests(userId);
  const add = selected.filter((slug) => !current.includes(slug));
  const remove = current.filter((slug) => !selected.includes(slug));

  if (add.length) {
    const { error } = await client.from("user_interests").upsert(
      add.map((interest_slug) => ({ user_id: userId, interest_slug })),
      { onConflict: "user_id,interest_slug", ignoreDuplicates: true },
    );
    if (error) throw error;
  }
  if (remove.length) {
    const { error } = await client
      .from("user_interests")
      .delete()
      .eq("user_id", userId)
      .in("interest_slug", remove);
    if (error) throw error;
  }
}
