import { queryOptions } from "@tanstack/react-query";

import type { Database, Tables } from "@/integrations/supabase/types";
import { requireSupabase } from "@/lib/backend";

type Functions = Database["public"]["Functions"];
export type Application = Functions["list_my_applications"]["Returns"][number];
export type ApplicationStatus = Exclude<Application["status"], "interested">;
export type Reminder = Tables<"reminders">;
export type CalendarEvent = Functions["get_my_calendar"]["Returns"][number];

export const applicationStatuses = {
  preparing: "Preparing",
  applied: "Applied",
  shortlisted: "Shortlisted",
  interview: "Interview",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
} as const satisfies Record<ApplicationStatus, string>;

export const applications = (userId: string) =>
  queryOptions({
    queryKey: ["applications", userId],
    queryFn: async ({ signal }) => {
      const { data, error } = await requireSupabase()
        .rpc("list_my_applications")
        .abortSignal(signal);
      if (error) throw error;
      return data;
    },
  });

export async function saveApplication(input: {
  id: string;
  status: ApplicationStatus;
  notes?: string | null;
  applied?: string | null;
  interview?: string | null;
}) {
  const { data, error } = await requireSupabase()
    .rpc("upsert_application", {
      p_opportunity_id: input.id,
      p_status: input.status,
      ...(input.notes ? { p_notes: input.notes } : {}),
      ...(input.applied ? { p_applied_at: input.applied } : {}),
      ...(input.interview ? { p_interview_at: input.interview } : {}),
    })
    .single();
  if (error) throw error;
  return data;
}

export const reminders = (userId: string) =>
  queryOptions({
    queryKey: ["reminders", userId],
    queryFn: async ({ signal }) => {
      const { data, error } = await requireSupabase().rpc("list_my_reminders").abortSignal(signal);
      if (error) throw error;
      return data;
    },
  });

export const calendar = (userId: string, from: string, to: string) =>
  queryOptions({
    queryKey: ["calendar", userId, from, to],
    queryFn: async ({ signal }) => {
      const { data, error } = await requireSupabase()
        .rpc("get_my_calendar", { p_from: from, p_to: to })
        .abortSignal(signal);
      if (error) throw error;
      return data;
    },
  });

export async function writeReminder(input: {
  title: string;
  at: string;
  note?: string;
  application?: string;
  opportunity?: string;
  existing?: Reminder;
  done?: boolean;
}) {
  const backend = requireSupabase();
  const args = {
    p_title: input.title,
    p_remind_at: input.at,
    ...(input.note ? { p_note: input.note } : {}),
    ...(input.application ? { p_application_id: input.application } : {}),
    ...(input.opportunity ? { p_opportunity_id: input.opportunity } : {}),
  };
  const result = input.existing
    ? await backend
        .rpc("update_reminder", {
          ...args,
          p_id: input.existing.id,
          ...(input.done === undefined ? {} : { p_done: input.done }),
        })
        .single()
    : await backend.rpc("create_reminder", args).single();
  if (result.error) throw result.error;
  return result.data;
}

const dateTime = new Intl.DateTimeFormat("en-PK", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Karachi",
});
export function showDateTime(value: string) {
  return dateTime.format(new Date(value));
}
export function localDateTime(value?: string | null): string {
  return value ? new Date(Date.parse(value) + 18_000_000).toISOString().slice(0, 16) : "";
}
export function pakistanTime(value: string) {
  return value ? new Date(`${value}+05:00`).toISOString() : "";
}
export function safePath(path: string | null | undefined) {
  return path && /^\/(?!\/)/.test(path) && !/[\\\x00-\x1f\x7f]/.test(path) ? path : null;
}

export function upcomingDeadlines(
  saved: { opportunity_id: string; title: string; deadline: string }[],
  tracked: Application[],
  now = Date.now(),
) {
  const all = new Map(saved.map((item) => [item.opportunity_id, item]));
  for (const item of tracked) {
    if (
      !item.is_expired &&
      item.opportunity_title &&
      item.deadline &&
      Date.parse(item.deadline) > now
    ) {
      all.set(item.opportunity_id, {
        opportunity_id: item.opportunity_id,
        title: item.opportunity_title,
        deadline: item.deadline,
      });
    }
  }
  return Array.from(all.values())
    .sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline))
    .slice(0, 5);
}
