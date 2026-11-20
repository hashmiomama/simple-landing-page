import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useId } from "react";
import { activityKey, backend } from "./data";

type Stream = "activity_messages" | "polls" | "activity_participants";

export function useActivityUpdates(userId: string, id: string, table: Stream) {
  const client = useQueryClient();
  const channelId = useId();
  useEffect(() => {
    const api = backend();
    const queryKey =
      table === "activity_participants"
        ? activityKey(userId)
        : [...activityKey(userId), "room", id, table];
    const refresh = () => void client.invalidateQueries({ queryKey });
    let interval: ReturnType<typeof setInterval> | undefined;
    const startFallback = () => {
      interval ??= setInterval(refresh, 20_000);
    };
    const stopFallback = () => {
      clearInterval(interval);
      interval = undefined;
    };
    let active = true;

    const channel = api.channel(`activity:${id}:${table}:${channelId}`);
    const filters = { schema: "public", table, filter: `activity_id=eq.${id}` };
    for (const event of ["INSERT", "UPDATE"] as const) {
      channel.on("postgres_changes", { ...filters, event }, refresh);
      if (table === "polls")
        channel.on("postgres_changes", { ...filters, event, table: "poll_votes" }, refresh);
    }
    startFallback();
    channel.subscribe((status) => {
      if (!active) return;
      if (status === "SUBSCRIBED") {
        stopFallback();
        refresh();
      } else startFallback();
    });
    return () => {
      active = false;
      stopFallback();
      void api.removeChannel(channel);
    };
  }, [channelId, client, id, table, userId]);
}
