import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export const modes = { online: "Online", physical: "In person", hybrid: "Hybrid" } as const;
export const sorts = {
  relevance: "Relevance",
  newest: "Newest",
  nearest_deadline: "Nearest deadline",
  upcoming_date: "Upcoming date",
} as const;

const slugs = z.array(z.string().min(1)).optional().catch(undefined);
export const searchSchema = z.object({
  keyword: z.string().trim().optional().catch(undefined),
  categories: slugs,
  interests: slugs,
  city: z.string().trim().optional().catch(undefined),
  mode: z.enum(["online", "physical", "hybrid"]).optional().catch(undefined),
  deadline: z.string().date().optional().catch(undefined),
  free: z.boolean().optional().catch(undefined),
  funded: z.boolean().optional().catch(undefined),
  verified: z.boolean().optional().catch(undefined),
  sort: z
    .enum(["relevance", "newest", "nearest_deadline", "upcoming_date"])
    .optional()
    .catch(undefined),
  page: z.number().int().min(1).max(100000).optional().catch(undefined),
});
export type Search = z.infer<typeof searchSchema>;
export const pageSize = 12;

export function searchArgs(
  search: Search,
): Database["public"]["Functions"]["search_opportunities"]["Args"] {
  return {
    ...(search.keyword ? { p_keyword: search.keyword } : {}),
    ...(search.categories?.length ? { p_category_slugs: search.categories } : {}),
    ...(search.interests?.length ? { p_interest_slugs: search.interests } : {}),
    ...(search.city ? { p_city: search.city } : {}),
    ...(search.mode ? { p_mode: search.mode } : {}),
    ...(search.deadline ? { p_deadline_before: `${search.deadline}T23:59:59.999+05:00` } : {}),
    p_free_only: !!search.free,
    p_funded_only: !!search.funded,
    p_verified_only: !!search.verified,
    p_sort: search.sort ?? "relevance",
    p_limit: pageSize,
    p_offset: ((search.page ?? 1) - 1) * pageSize,
  };
}
