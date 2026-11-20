import { queryOptions } from "@tanstack/react-query";

import type { Database, Json } from "@/integrations/supabase/types";
import { requireSupabase } from "@/lib/backend";

export type Recommendation =
  Database["public"]["Functions"]["get_recommended_opportunities"]["Returns"][number];
type Deadline = { opportunity_id: string; title: string; deadline: string };

function isDeadline(value: Json): value is Deadline {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof value["opportunity_id"] === "string" &&
    typeof value["title"] === "string" &&
    typeof value["deadline"] === "string"
  );
}

export const dashboardSummary = (userId: string) =>
  queryOptions({
    queryKey: ["dashboard-summary", userId],
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc("get_dashboard_summary").single();
      if (error) throw error;
      return {
        savedCount: data.saved_count,
        dueSoon: data.saved_due_in_14_days_count,
        deadlines: Array.isArray(data.upcoming_deadlines)
          ? data.upcoming_deadlines.filter(isDeadline)
          : [],
      };
    },
  });

export const recommendations = (userId: string) =>
  queryOptions({
    queryKey: ["recommendations", userId],
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc("get_recommended_opportunities", {
        p_limit: 10,
      });
      if (error) throw error;
      return data;
    },
  });

export const savedOpportunities = (userId: string) =>
  queryOptions({
    queryKey: ["saved-opportunities", userId],
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from("saved_opportunities")
        .select("opportunity_id")
        .eq("user_id", userId);
      if (error) throw error;
      return data.map(({ opportunity_id }) => opportunity_id);
    },
  });

export async function setOpportunitySaved(userId: string, id: string, saved: boolean) {
  const table = requireSupabase().from("saved_opportunities");
  const result = saved
    ? await table.upsert(
        { user_id: userId, opportunity_id: id },
        { onConflict: "user_id,opportunity_id", ignoreDuplicates: true },
      )
    : await table.delete().eq("user_id", userId).eq("opportunity_id", id);
  if (result.error) throw result.error;
}

const deadlineFormat = new Intl.DateTimeFormat("en-PK", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Karachi",
});

export function formatDeadline(value: string) {
  return deadlineFormat.format(new Date(value));
}
