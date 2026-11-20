import { queryOptions } from "@tanstack/react-query";

import type { Database, Json, Tables } from "@/integrations/supabase/types";
import { requireSupabase } from "@/lib/backend";

import { modes, searchArgs, type Search } from "./search-state";

type Functions = Database["public"]["Functions"];
export type Listing = Functions["search_opportunities"]["Returns"][number];
export type Detail = Functions["get_opportunity"]["Returns"][number];
export type StoredListing = Omit<Tables<"opportunities">, "search_document">;
export type Organisation = Tables<"organisations">;

const dateFormat = new Intl.DateTimeFormat("en-PK", {
  dateStyle: "medium",
  timeZone: "Asia/Karachi",
});
export function displayDate(date?: string | null) {
  return date ? dateFormat.format(new Date(date)) : "Not specified";
}
export function locationLabel(listing: Pick<Listing, "format" | "location">) {
  return listing.format === "online" ? "Online" : `${listing.location} · ${modes[listing.format]}`;
}
export const statusLabels = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  archived: "Archived",
} as const;

export function errorText(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string")
    return error.message;
  return fallback;
}

export const categoryCatalog = queryOptions({
  queryKey: ["opportunity-categories"],
  queryFn: async () => {
    const { data, error } = await requireSupabase()
      .from("opportunity_categories")
      .select("slug, name")
      .order("name");
    if (error) throw error;
    return data;
  },
  staleTime: 300_000,
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
  staleTime: 300_000,
});
export const searchListings = (search: Search) =>
  queryOptions({
    queryKey: ["opportunity-search", search],
    queryFn: async ({ signal }) => {
      const { data, error } = await requireSupabase()
        .rpc("search_opportunities", searchArgs(search))
        .abortSignal(signal);
      if (error) throw error;
      return data;
    },
  });
export const detailListing = (id: string, userId?: string) =>
  queryOptions({
    queryKey: ["opportunity-detail", id, userId ?? "guest"],
    queryFn: async ({ signal }) => {
      const { data, error } = await requireSupabase()
        .rpc("get_opportunity", { p_id: id })
        .abortSignal(signal)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
export const bookmarkIds = (userId: string) =>
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
export const savedListings = (userId: string) =>
  queryOptions({
    queryKey: ["saved-listings", userId],
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc("list_saved_opportunities");
      if (error) throw error;
      return data;
    },
  });
export async function setSaved(userId: string, id: string, saved: boolean) {
  const table = requireSupabase().from("saved_opportunities");
  const result = saved
    ? await table.upsert(
        { user_id: userId, opportunity_id: id },
        { ignoreDuplicates: true, onConflict: "user_id,opportunity_id" },
      )
    : await table.delete().eq("user_id", userId).eq("opportunity_id", id);
  if (result.error) throw result.error;
}
export const ownOrganisation = (userId: string) =>
  queryOptions({
    queryKey: ["own-organisation", userId],
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from("organisations")
        .select("*")
        .eq("owner_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

const listingFields =
  "id, organisation_id, submitted_by, category_slug, title, organisation_name, description, source_url, deadline, starts_at, ends_at, eligibility, location, city, country, format, cost_or_funding, cover_url, status, last_verified_at, created_at, updated_at";
export const ownSubmissions = (userId: string, organisationId?: string) =>
  queryOptions({
    queryKey: ["own-submissions", userId, organisationId ?? null],
    queryFn: async () => {
      let query = requireSupabase()
        .from("opportunities")
        .select(listingFields)
        .eq("submitted_by", userId)
        .in("status", ["pending", "approved", "rejected"]);
      if (organisationId) query = query.eq("organisation_id", organisationId);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
export const ownSubmission = (userId: string, id: string) =>
  queryOptions({
    queryKey: ["own-submission", userId, id],
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from("opportunities")
        .select(`${listingFields}, opportunity_tags(interest_slug)`)
        .eq("id", id)
        .eq("submitted_by", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
export function isTag(value: Json): value is { slug: string; name: string } {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof value["slug"] === "string" &&
    typeof value["name"] === "string"
  );
}

export function safeWebUrl(value: string) {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
