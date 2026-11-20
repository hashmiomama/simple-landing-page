import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { activityKey, backend, checked } from "./data";
import type { Database } from "@/integrations/supabase/types";

type Functions = Database["public"]["Functions"];
export type ActivityCommand =
  | { type: "request"; args: Functions["request_to_join"]["Args"] }
  | { type: "respond"; args: Functions["respond_to_join_request"]["Args"] }
  | { type: "leave"; args: Functions["leave_activity"]["Args"] }
  | { type: "transfer"; args: Functions["transfer_activity_coordinator"]["Args"] }
  | { type: "confirm"; args: Functions["confirm_activity"]["Args"] }
  | { type: "cancel"; args: Functions["cancel_activity"]["Args"] }
  | { type: "complete"; args: Functions["complete_activity"]["Args"] }
  | { type: "moderate"; args: Functions["admin_cancel_activity"]["Args"] };

async function execute(command: ActivityCommand) {
  const api = backend();
  switch (command.type) {
    case "request":
      return checked(await api.rpc("request_to_join", command.args));
    case "respond":
      return checked(await api.rpc("respond_to_join_request", command.args));
    case "leave":
      return checked(await api.rpc("leave_activity", command.args));
    case "transfer":
      return checked(await api.rpc("transfer_activity_coordinator", command.args));
    case "confirm":
      return checked(await api.rpc("confirm_activity", command.args));
    case "cancel":
      return checked(await api.rpc("cancel_activity", command.args));
    case "complete":
      return checked(await api.rpc("complete_activity", command.args));
    case "moderate":
      return checked(await api.rpc("admin_cancel_activity", command.args));
  }
}

export function useActivityAction(userId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: execute,
    onSuccess: async () => {
      toast.success("Activity updated.");
      await Promise.all([
        client.invalidateQueries({ queryKey: activityKey(userId) }),
        client.invalidateQueries({ queryKey: ["calendar", userId] }),
      ]);
    },
  });
}
