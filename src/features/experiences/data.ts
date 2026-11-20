import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import type { Database, Enums, Tables } from "@/integrations/supabase/types";
import { requireSupabase } from "@/lib/backend";

export const categories = [
  { slug: "art_and_culture", name: "Explore art and culture" },
  { slug: "slow_experiences", name: "Slow experiences" },
  { slug: "learn_something_new", name: "Learn something new" },
  { slug: "outdoor_exploration", name: "Outdoor exploration" },
] as const satisfies readonly { slug: Enums<"experience_category">; name: string }[];
export const categorySchema = z.enum([
  "art_and_culture",
  "slow_experiences",
  "learn_something_new",
  "outdoor_exploration",
]);
export const socialSchema = z.enum(["quiet", "small_group", "social"]);
export const socialLabels = {
  quiet: "Quiet",
  small_group: "Small group",
  social: "Social",
  flexible: "Not specified",
};
export type Experience = Tables<"solo_experiences">;
type Functions = Database["public"]["Functions"];
export type AdminExperience = Functions["admin_list_experiences"]["Returns"][number];
export const pageSize = 12;

export const searchSchema = z.object({
  keyword: z.string().trim().optional().catch(undefined),
  category: categorySchema.optional().catch(undefined),
  city: z.string().trim().optional().catch(undefined),
  maxCost: z.number().finite().nonnegative().optional().catch(undefined),
  social: socialSchema.optional().catch(undefined),
  interests: z.array(z.string()).optional().catch(undefined),
  page: z.number().int().min(1).max(100000).optional().catch(undefined),
  view: z.literal("map").optional().catch(undefined),
});
export type ExperienceSearch = z.infer<typeof searchSchema>;

export function experienceSearchArgs(
  search: ExperienceSearch,
): Functions["search_experiences"]["Args"] {
  return {
    ...(search.keyword ? { p_keyword: search.keyword } : {}),
    ...(search.category ? { p_category: search.category } : {}),
    ...(search.city ? { p_city: search.city } : {}),
    ...(search.maxCost !== undefined ? { p_max_cost: search.maxCost } : {}),
    ...(search.social ? { p_social_level: search.social } : {}),
    ...(search.interests?.length ? { p_interest_slugs: search.interests } : {}),
    p_limit: pageSize,
    p_offset: ((search.page ?? 1) - 1) * pageSize,
  };
}

export function browseExperiences(search: ExperienceSearch) {
  const args = experienceSearchArgs(search);
  return queryOptions({
    queryKey: ["experiences", "search", args],
    queryFn: async ({ signal }) => {
      const { data, error } = await requireSupabase()
        .rpc("search_experiences", args)
        .abortSignal(signal);
      if (error) throw error;
      return data;
    },
  });
}

export const experienceDetail = (id: string) =>
  queryOptions({
    queryKey: ["experiences", "detail", id],
    queryFn: async ({ signal }) => {
      const { data, error } = await requireSupabase()
        .rpc("get_experience", { p_id: id })
        .abortSignal(signal)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const experienceRecommendations = (userId: string) =>
  queryOptions({
    queryKey: ["experiences", "recommended", userId],
    queryFn: async ({ signal }) => {
      const { data, error } = await requireSupabase()
        .rpc("get_recommended_experiences", { p_limit: 4 })
        .abortSignal(signal);
      if (error) throw error;
      return data;
    },
  });

export const ownExperiences = (userId: string) =>
  queryOptions({
    queryKey: ["experiences", "own", userId],
    queryFn: async ({ signal }) => {
      const { data, error } = await requireSupabase()
        .from("solo_experiences")
        .select("id, title, category, city, status")
        .eq("submitted_by", userId)
        .in("status", ["pending", "approved", "rejected", "needs_info"])
        .order("created_at", { ascending: false })
        .abortSignal(signal);
      if (error) throw error;
      return data;
    },
  });

export const ownExperience = (userId: string, id: string) =>
  queryOptions({
    queryKey: ["experiences", "own-detail", userId, id],
    queryFn: async ({ signal }) => {
      const { data, error } = await requireSupabase()
        .from("solo_experiences")
        .select("*, solo_experience_tags(interest_slug)")
        .eq("id", id)
        .eq("submitted_by", userId)
        .in("status", ["pending", "rejected", "needs_info"])
        .abortSignal(signal)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export function categoryName(value: string) {
  return categories.find(({ slug }) => slug === value)?.name ?? value.replaceAll("_", " ");
}
export function costLabel(cost: number | null, currency?: string | null) {
  if (cost === null) return "Cost not listed";
  return cost === 0 ? "Free" : `${currency ?? "PKR"} ${cost.toLocaleString("en-PK")}`;
}

export const karachi: [number, number] = [24.8607, 67.0011];
export function mapPoint(
  latitude: number | null,
  longitude: number | null,
): [number, number] | null {
  return typeof latitude === "number" &&
    typeof longitude === "number" &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
    ? [latitude, longitude]
    : null;
}
