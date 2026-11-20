import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";

import { Constants } from "@/integrations/supabase/types";
import { requireSupabase } from "@/lib/backend";

export const backend = requireSupabase;
export const statuses = Constants.public.Enums.activity_status;
export const statusLabels = {
  proposed: "Proposed",
  gathering_interest: "Gathering interest",
  planning: "Planning",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};
export const social = ["quiet", "small_group", "social"] as const;
export const participation = ["open", "women_only"] as const;
export const levels = ["beginner", "intermediate", "any"] as const;
export const pageSize = 12;
export const label = (value: string) => value.replaceAll("_", " ");
export const activityKey = (userId: string) => ["activities", userId] as const;
const status = z.enum(statuses);
const summary = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  interest_slug: z.string(),
  city: z.string().nullable(),
  min_participants: z.number(),
  max_participants: z.number().nullable(),
  estimated_budget: z.number(),
  social_level: z.enum(social),
  participation: z.enum(participation),
  experience_level: z.enum(levels),
  format: z.enum(Constants.public.Enums.event_format),
  status,
  cover_url: z.string().nullable(),
  created_at: z.string(),
  coordinator_username: z.string(),
  participant_count: z.number(),
});
export type Activity = z.infer<typeof summary>;
export const searchSchema = z.object({
  keyword: z.string().trim().optional().catch(undefined),
  category: z.string().optional().catch(undefined),
  city: z.string().trim().optional().catch(undefined),
  social: z.enum(social).optional().catch(undefined),
  participation: z.enum(participation).optional().catch(undefined),
  experience: z.enum(levels).optional().catch(undefined),
  budget: z.number().finite().nonnegative().optional().catch(undefined),
  status: status.optional().catch(undefined),
  page: z.number().int().min(1).max(100000).optional().catch(undefined),
});
export type ActivitySearch = z.infer<typeof searchSchema>;

export function result<T>({
  data,
  error,
}: {
  data: T | null;
  error: { message: string } | null;
}): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("No data was returned.");
  return data;
}

export function checked({ error }: { error: { message: string } | null }) {
  if (error) throw new Error(error.message);
}

export const searchActivities = (userId: string, search: ActivitySearch) =>
  queryOptions({
    queryKey: [...activityKey(userId), "browse", search],
    queryFn: async () =>
      result(
        await backend().rpc("search_activities", {
          ...(search.keyword ? { p_keyword: search.keyword } : {}),
          ...(search.category ? { p_category: search.category } : {}),
          ...(search.city ? { p_city: search.city } : {}),
          ...(search.social ? { p_social_level: search.social } : {}),
          ...(search.participation ? { p_participation: search.participation } : {}),
          ...(search.experience ? { p_experience_level: search.experience } : {}),
          ...(search.budget === undefined ? {} : { p_max_budget: search.budget }),
          ...(search.status ? { p_status: search.status } : {}),
          p_limit: pageSize,
          p_offset: ((search.page ?? 1) - 1) * pageSize,
        }),
      ).map((row) => ({ ...row, activity: summary.parse(row.activity) })),
  });

export const activityDetail = (userId: string, id: string) =>
  queryOptions({
    queryKey: [...activityKey(userId), "detail", id],
    queryFn: async () => {
      const row = result(await backend().rpc("get_activity", { p_id: id }))[0];
      if (!row) return null;
      return {
        activity: summary.parse(row.activity),
        relationship: row.relationship,
        eligibility: row.eligibility_message ?? null,
        proposedDates: row.proposed_dates ?? [],
        startsAt: row.starts_at ?? null,
        venue: row.venue ?? null,
        address: row.venue_address ?? null,
        publicVenue: row.public_venue_confirmed ?? false,
        cancellationReason: row.cancellation_reason ?? null,
      };
    },
  });
export type ActivityDetail = {
  activity: Activity;
  relationship: string;
  eligibility: string | null;
  proposedDates: string[];
  startsAt: string | null;
  venue: string | null;
  address: string | null;
  publicVenue: boolean;
  cancellationReason: string | null;
};

export const myActivities = (userId: string, role: string) =>
  queryOptions({
    queryKey: [...activityKey(userId), "mine", role],
    queryFn: async () =>
      result(await backend().rpc("list_my_activities", { p_role: role })).map((row) =>
        summary.parse(row.activity),
      ),
  });

export const adminActivities = (userId: string, status: Activity["status"], page: number) =>
  queryOptions({
    queryKey: [...activityKey(userId), "admin", status, page],
    queryFn: async () =>
      result(
        await backend().rpc("admin_list_activities", {
          p_status: status,
          p_limit: pageSize,
          p_offset: (page - 1) * pageSize,
        }),
      ).map((row) => ({ ...row, activity: summary.parse(row.activity) })),
  });
