import { keepPreviousData, queryOptions } from "@tanstack/react-query";

import type { Database } from "@/integrations/supabase/types";
import { requireSupabase } from "@/lib/backend";

type Functions = Database["public"]["Functions"];
type Row<Name extends keyof Functions> = Functions[Name]["Returns"] extends (infer Item)[]
  ? Item
  : never;

// PostgREST's generated RPC types omit the nullability of these returned columns.
export type PointsSummary = Omit<
  Row<"get_my_points">,
  "next_level_name" | "points_to_next_level"
> & {
  next_level_name: string | null;
  points_to_next_level: number | null;
};

type HistoryRow = Omit<Row<"list_my_point_history">, "source_title"> & {
  source_title: string | null;
};

type Contributor = Omit<Row<"get_points_leaderboard">, "avatar_url"> & {
  avatar_url: string | null;
};

export const HISTORY_PAGE_SIZE = 10;

export const myPoints = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["points", userId, "summary"],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<PointsSummary> => {
      const { data, error } = await requireSupabase().rpc("get_my_points");
      if (error) throw error;
      if (!data?.[0]) throw new Error("No points summary was returned.");
      return data[0];
    },
  });

export const pointHistory = (userId: string, page: number) =>
  queryOptions({
    queryKey: ["points", userId, "history", page],
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<HistoryRow[]> => {
      const { data, error } = await requireSupabase().rpc("list_my_point_history", {
        p_limit: HISTORY_PAGE_SIZE,
        p_offset: page * HISTORY_PAGE_SIZE,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

export const pointsLeaderboard = (userId: string) =>
  queryOptions({
    queryKey: ["points", userId, "leaderboard"],
    queryFn: async (): Promise<Contributor[]> => {
      const { data, error } = await requireSupabase().rpc("get_points_leaderboard", {
        p_limit: 10,
      });
      if (error) throw error;
      return data ?? [];
    },
  });
