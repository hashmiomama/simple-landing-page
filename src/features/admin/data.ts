import { requireSupabase } from "@/lib/backend";
import { z } from "zod";

export const pageSize = 20;
export const queueStatuses = ["pending", "needs_info", "approved", "rejected"] as const;
export const decisions = {
  approve: "Approve",
  reject: "Reject",
  request_info: "Request more information",
} as const;
export type Decision = keyof typeof decisions;

const listingSchema = z.object({
  title: z.string(),
  category_slug: z.string(),
  organisation_name: z.string(),
  description: z.string(),
  source_url: z.string(),
  eligibility: z.string(),
  location: z.string(),
  format: z.string(),
  cost_or_funding: z.string(),
  deadline: z.string().nullable(),
  starts_at: z.string().nullable(),
  ends_at: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  cover_url: z.string().nullable(),
  status: z.enum(["pending", "needs_info", "approved", "rejected", "archived"]),
  last_verified_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
const tagSchema = z.object({ slug: z.string(), name: z.string() });
const reviewSchema = z.object({
  id: z.string(),
  reviewer_username: z.string().nullable(),
  status: z.string(),
  decision: z.string().nullable(),
  note: z.string().nullable(),
  report: z.unknown(),
  created_at: z.string(),
});
export const reportSchema = z.object({
  generated_at: z.string(),
  checks: z.record(z.enum(["passed", "failed", "needs manual verification"])),
  extracted_fields: z.record(z.unknown()),
  missing_required_fields: z.array(z.string()),
  duplicate_indicators: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      matching_title: z.boolean(),
      matching_source_url: z.boolean(),
    }),
  ),
  scam_indicators: z.object({
    payment_wording: z.boolean(),
    urgency_wording: z.boolean(),
    free_email_domain: z.boolean().nullable(),
    organisation_email_domain: z.string().nullable(),
  }),
  recommended_action: z.enum(["approve", "reject", "request_info"]),
  reason: z.string(),
});
export type VerificationReport = z.infer<typeof reportSchema>;

export async function adminStats() {
  const { data, error } = await requireSupabase().rpc("admin_dashboard_stats").single();
  if (error) throw error;
  return data;
}

export async function adminQueue(status: (typeof queueStatuses)[number], page: number) {
  const { data, error } = await requireSupabase().rpc("admin_list_submissions", {
    p_status: status,
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  });
  if (error) throw error;
  return data;
}

export async function adminSubmission(id: string) {
  const { data, error } = await requireSupabase()
    .rpc("admin_get_submission", { p_id: id })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    listing: listingSchema.parse(data.listing),
    tags: z.array(tagSchema).parse(data.tags),
    reviews: z.array(reviewSchema).parse(data.reviews),
    submitter: data.submitter_username,
  };
}

export async function generateReport(id: string) {
  const { data, error } = await requireSupabase().rpc("admin_verification_report", { p_id: id });
  if (error) throw error;
  return reportSchema.parse(data);
}

export async function decideSubmission(id: string, decision: Decision, note: string) {
  const { data, error } = await requireSupabase()
    .rpc("admin_review_opportunity", {
      p_id: id,
      p_decision: decision,
      ...(note.trim() ? { p_note: note.trim() } : {}),
    })
    .single();
  if (error) throw error;
  return data;
}

export async function adminOrganisations(status: string) {
  const { data, error } = await requireSupabase().rpc("admin_list_organisations", {
    p_status: status,
  });
  if (error) throw error;
  return data;
}

export async function decideOrganisation(
  id: string,
  decision: "approved" | "rejected",
  note: string,
) {
  const { error } = await requireSupabase().rpc("review_organisation", {
    org_id: id,
    decision,
    ...(note.trim() ? { note: note.trim() } : {}),
  });
  if (error) throw error;
}

export async function adminAudit(page: number) {
  const { data, error } = await requireSupabase().rpc("admin_list_audit_logs", {
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  });
  if (error) throw error;
  return data;
}

const dateTime = new Intl.DateTimeFormat("en-PK", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Karachi",
});
export function showTime(value: string) {
  return dateTime.format(new Date(value));
}
export function readable(value: string) {
  return value.replaceAll("_", " ");
}
