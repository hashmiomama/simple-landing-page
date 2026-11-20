import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import type { Enums } from "@/integrations/supabase/types";
import { requireSupabase } from "@/lib/backend";

const noticeSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  link_path: z.string().nullable(),
  read_at: z.string().nullable(),
  created_at: z.string(),
});
export type Notice = z.infer<typeof noticeSchema>;

export const inbox = (userId: string, limit: number, offset: number, unreadOnly = false) =>
  queryOptions({
    queryKey: ["notifications", userId, limit, offset, unreadOnly],
    queryFn: async ({ signal }) => {
      const { data, error } = await requireSupabase()
        .rpc("list_my_notifications", {
          p_limit: limit,
          p_offset: offset,
          p_unread_only: unreadOnly,
        })
        .abortSignal(signal)
        .single();
      if (error) throw error;
      return { ...data, notifications: z.array(noticeSchema).parse(data.notifications) };
    },
  });

export function useMarkRead(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | null) => {
      const backend = requireSupabase();
      const { error } = id
        ? await backend.rpc("mark_notification_read", { p_id: id })
        : await backend.rpc("mark_all_notifications_read");
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["notifications", userId] }),
    onError: () => toast.error("Couldn’t update your notifications. Try again."),
  });
}

export const notificationCategories = {
  new_opportunities: "New opportunity alerts",
  deadline_reminders: "Deadline reminders",
  verification_updates: "Verification updates",
  activity_updates: "Activity updates",
  group_messages: "Group messages",
  account: "Account",
} as const satisfies Record<Enums<"notification_category">, string>;

export const frequencies = {
  instant: "Instant",
  daily: "Daily",
  off: "Off",
} as const satisfies Record<Enums<"notification_frequency">, string>;

export const notificationPreferences = (userId: string) =>
  queryOptions({
    queryKey: ["notification-preferences", userId],
    queryFn: async ({ signal }) => {
      const { data, error } = await requireSupabase()
        .rpc("get_my_notification_preferences")
        .abortSignal(signal);
      if (error) throw error;
      return data;
    },
  });
