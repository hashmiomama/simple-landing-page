import { z } from "zod";

import type { Database, TablesUpdate } from "@/integrations/supabase/types";
import { requireSupabase } from "@/lib/backend";

import { safeWebUrl, type Organisation, type StoredListing } from "./data";

export const maxCoverSize = 5 * 1024 * 1024;
const extensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;
export const coverTypes = Object.keys(extensions).join(",");

const required = z.string().trim().min(1, "This field is required.");
const webUrl = required.refine((value) => {
  const url = safeWebUrl(value);
  return url && /^https?:\/\/[^\s<>\\]+$/i.test(value) && !new URL(url).hostname.includes(":");
}, "Enter an absolute HTTP or HTTPS URL.");
const dateValue = z
  .string()
  .refine(
    (value) => !value || (value.includes("T") && Number.isFinite(Date.parse(`${value}+05:00`))),
    "Enter a valid date and time.",
  );
const submissionSchema = z.object({
  title: required,
  category: required,
  organisationName: required,
  description: required,
  sourceUrl: webUrl,
  eligibility: required,
  location: required,
  mode: z.enum(["online", "physical", "hybrid"], { message: "Choose a mode." }),
  cost: required,
  city: z.string().trim(),
  country: z.string().trim(),
  deadline: dateValue,
  starts: dateValue,
  ends: dateValue,
  tags: z.array(z.string()),
});
export type SubmissionValues = z.infer<typeof submissionSchema>;

export function toTimestamp(value: string) {
  return value ? new Date(`${value}+05:00`).toISOString() : null;
}
export function toLocalInput(value?: string | null) {
  return value
    ? new Date(Date.parse(value) + 5 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 19)
        .replace(/:00$/, "")
    : "";
}

export function validateSubmission(
  form: FormData,
  tags: string[],
  existing?: StoredListing,
  official?: Organisation,
) {
  const schema = submissionSchema.superRefine((data, ctx) => {
    if (!existing && !data.tags.length)
      ctx.addIssue({
        code: "custom",
        path: ["tags"],
        message: "Choose at least one interest tag.",
      });
    if (
      data.deadline &&
      data.deadline !== toLocalInput(existing?.deadline) &&
      Date.parse(`${data.deadline}+05:00`) < Date.now()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["deadline"],
        message: "Choose a deadline in the future.",
      });
    }
    if (
      data.starts &&
      data.ends &&
      Date.parse(`${data.ends}+05:00`) < Date.parse(`${data.starts}+05:00`)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["ends"],
        message: "The end date must be on or after the start date.",
      });
    }
  });
  return schema.safeParse({
    ...Object.fromEntries(form),
    organisationName: official?.name ?? form.get("organisationName"),
    tags,
  });
}

export function coverError(file: File) {
  if (!Object.hasOwn(extensions, file.type)) return "Choose a JPEG, PNG, WebP or GIF image.";
  if (!file.size || file.size > maxCoverSize) return "Choose an image up to 5 MiB.";
  return null;
}

export async function uploadCover(userId: string, file: File) {
  const invalid = coverError(file);
  if (invalid) throw new Error(invalid);
  const bucket = requireSupabase().storage.from("opportunity-covers");
  const extension = extensions[file.type as keyof typeof extensions];
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await bucket.upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return bucket.getPublicUrl(path).data.publicUrl;
}

export async function submitListing(
  values: SubmissionValues,
  cover: string | null,
  organisationId?: string,
) {
  const deadline = toTimestamp(values.deadline);
  const starts = toTimestamp(values.starts);
  const ends = toTimestamp(values.ends);
  const args: Database["public"]["Functions"]["submit_opportunity"]["Args"] = {
    p_title: values.title,
    p_category_slug: values.category,
    p_organisation_name: values.organisationName,
    p_description: values.description,
    p_source_url: values.sourceUrl,
    p_eligibility: values.eligibility,
    p_location: values.location,
    p_mode: values.mode,
    p_cost_or_funding: values.cost,
    p_interest_slugs: values.tags,
    ...(deadline ? { p_deadline: deadline } : {}),
    ...(starts ? { p_starts_at: starts } : {}),
    ...(ends ? { p_ends_at: ends } : {}),
    ...(values.city ? { p_city: values.city } : {}),
    ...(values.country ? { p_country: values.country } : {}),
    ...(cover ? { p_cover_url: cover } : {}),
    ...(organisationId ? { p_organisation_id: organisationId } : {}),
  };
  const { data, error } = await requireSupabase().rpc("submit_opportunity", args).single();
  if (error) throw error;
  return data;
}

export async function updateListing(
  userId: string,
  existing: StoredListing,
  values: SubmissionValues,
  cover: string | null,
) {
  const patch: TablesUpdate<"opportunities"> = {
    title: values.title,
    category_slug: values.category,
    organisation_name: values.organisationName,
    description: values.description,
    source_url: values.sourceUrl,
    eligibility: values.eligibility,
    location: values.location,
    format: values.mode,
    cost_or_funding: values.cost,
    deadline:
      values.deadline === toLocalInput(existing.deadline)
        ? existing.deadline
        : toTimestamp(values.deadline),
    starts_at:
      values.starts === toLocalInput(existing.starts_at)
        ? existing.starts_at
        : toTimestamp(values.starts),
    ends_at:
      values.ends === toLocalInput(existing.ends_at) ? existing.ends_at : toTimestamp(values.ends),
    city: values.city || null,
    country: values.country || null,
    cover_url: cover,
  };
  const { data, error } = await requireSupabase()
    .from("opportunities")
    .update(patch)
    .eq("id", existing.id)
    .eq("submitted_by", userId)
    .select("id, status")
    .single();
  if (error) throw error;
  return data;
}

export const organisationSchema = z.object({
  name: required,
  organisation_type: required,
  website_url: webUrl,
  official_email: z.string().trim().email("Enter a valid email."),
  representative_name: required,
  representative_title: required,
  representative_email: z.string().trim().email("Enter a valid email."),
  evidence_notes: required,
});
