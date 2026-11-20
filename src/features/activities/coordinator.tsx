import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/opportunities/ui";
import { localDateTime, pakistanTime } from "@/features/planning/data";
import { activityKey, backend, result, type ActivityDetail } from "./data";
import { useActivityAction, type ActivityCommand } from "./actions";
import { Panel } from "./ui";

export function ActivityRoster({
  userId,
  id,
  coordinator,
  active,
}: {
  userId: string;
  id: string;
  coordinator: boolean;
  active: boolean;
}) {
  const roster = useQuery({
    queryKey: [...activityKey(userId), "roster", id],
    queryFn: async () =>
      result(await backend().rpc("list_activity_participants", { p_activity_id: id })),
  });
  const transfer = useActivityAction(userId);
  return (
    <Panel title="Participants">
      {roster.isPending ? (
        <p role="status">Loading participants…</p>
      ) : roster.isError ? (
        <p role="alert">
          Couldn’t load participants.{" "}
          <button className="text-link" onClick={() => void roster.refetch()}>
            Retry
          </button>
        </p>
      ) : roster.data.length ? (
        <ul className="divide-y">
          {roster.data.map((member) => (
            <li
              key={member.username}
              className="flex flex-wrap items-center justify-between gap-2 py-2"
            >
              <span className="min-w-0 [overflow-wrap:anywhere]">
                {member.username}
                {member.is_coordinator && " (coordinator)"}
              </span>
              {coordinator && active && !member.is_coordinator && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={transfer.isPending}
                  onClick={() => {
                    if (window.confirm(`Hand coordination over to ${member.username}?`))
                      transfer.mutate({
                        type: "transfer",
                        args: { p_activity_id: id, p_username: member.username },
                      });
                  }}
                >
                  Hand over
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No participants yet.</p>
      )}
      {transfer.error && (
        <p role="alert" className="text-destructive">
          {transfer.error.message}
        </p>
      )}
    </Panel>
  );
}

export function JoinRequests({ userId, id }: { userId: string; id: string }) {
  const requests = useQuery({
    queryKey: [...activityKey(userId), "requests", id],
    queryFn: async () =>
      result(await backend().rpc("list_activity_join_requests", { p_activity_id: id })),
  });
  const respond = useActivityAction(userId);
  return (
    <Panel title="Join requests">
      {requests.isPending ? (
        <p role="status">Loading requests…</p>
      ) : requests.isError ? (
        <p role="alert">
          Couldn’t load requests.{" "}
          <button className="text-link" onClick={() => void requests.refetch()}>
            Retry
          </button>
        </p>
      ) : requests.data.length ? (
        <ul className="divide-y">
          {requests.data.map((person) => (
            <li key={person.user_id} className="space-y-2 py-3">
              <p className="font-semibold [overflow-wrap:anywhere]">{person.username}</p>
              {person.request_message && (
                <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                  {person.request_message}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {(["accept", "decline"] as const).map((decision) => (
                  <Button
                    key={decision}
                    variant={decision === "accept" ? "default" : "outline"}
                    disabled={respond.isPending}
                    className="capitalize"
                    onClick={() =>
                      respond.mutate({
                        type: "respond",
                        args: {
                          p_activity_id: id,
                          p_user_id: person.user_id,
                          p_decision: decision,
                        },
                      })
                    }
                  >
                    {decision}
                  </Button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No pending requests.</p>
      )}
      {respond.error && (
        <p role="alert" className="text-destructive">
          {respond.error.message}
        </p>
      )}
    </Panel>
  );
}

export function CoordinatorActions({ userId, detail }: { userId: string; detail: ActivityDetail }) {
  const { activity, startsAt } = detail;
  const [dialog, setDialog] = useState<"confirm" | "cancel" | "complete" | null>(null);
  const [now, setNow] = useState(Date.now);
  const action = useActivityAction(userId);
  const hasStarted = startsAt !== null && Date.parse(startsAt) <= now;
  useEffect(() => {
    if (!startsAt || hasStarted || activity.status !== "confirmed") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [activity.status, startsAt, hasStarted]);

  const inPerson = activity.format !== "online";
  const needsMore = activity.participant_count < activity.min_participants;
  const canConfirm =
    !needsMore &&
    !hasStarted &&
    (activity.status === "planning" ||
      activity.status === "confirmed" ||
      activity.min_participants === 1);
  const open = (next: NonNullable<typeof dialog>) => {
    action.reset();
    setDialog(next);
  };

  return (
    <Panel title="Coordinator actions">
      {needsMore && (
        <p className="text-sm text-muted-foreground">
          At least {activity.min_participants} accepted participants are needed to confirm.
        </p>
      )}
      {!needsMore && !hasStarted && !canConfirm && (
        <p className="text-sm text-muted-foreground">
          Move into planning before confirming arrangements.
        </p>
      )}
      {activity.status === "confirmed" && !hasStarted && (
        <p className="text-sm text-muted-foreground">
          You can mark the activity complete after its start time.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button disabled={!canConfirm} onClick={() => open("confirm")}>
          {activity.status === "confirmed" ? "Update arrangements" : "Confirm arrangements"}
        </Button>
        <Button variant="outline" onClick={() => open("cancel")}>
          Cancel activity
        </Button>
        {activity.status === "confirmed" && (
          <Button variant="outline" disabled={!hasStarted} onClick={() => open("complete")}>
            Complete activity
          </Button>
        )}
      </div>
      <Dialog
        open={dialog !== null}
        onOpenChange={(value) => {
          if (!value && !action.isPending) setDialog(null);
        }}
      >
        {dialog && (
          <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle>
                {dialog === "confirm"
                  ? "Confirm arrangements"
                  : dialog === "cancel"
                    ? "Cancel activity?"
                    : "Mark activity complete?"}
              </DialogTitle>
              <DialogDescription>
                {dialog === "confirm"
                  ? "Accepted participants will be notified."
                  : dialog === "cancel"
                    ? "This ends planning for the group. Members will be notified."
                    : "Completion opens feedback for accepted participants."}
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (action.isPending) return;
                const form = new FormData(event.currentTarget);
                let command: ActivityCommand;
                if (dialog === "confirm")
                  command = {
                    type: "confirm",
                    args: {
                      p_activity_id: activity.id,
                      p_starts_at: pakistanTime(String(form.get("start"))),
                      p_venue: String(form.get("venue")).trim(),
                      p_venue_address: String(form.get("address") ?? "").trim(),
                      p_public_venue: form.has("public"),
                    },
                  };
                else if (dialog === "cancel")
                  command = {
                    type: "cancel",
                    args: {
                      p_activity_id: activity.id,
                      p_reason: String(form.get("reason")).trim(),
                    },
                  };
                else command = { type: "complete", args: { p_activity_id: activity.id } };
                action.mutate(command, { onSuccess: () => setDialog(null) });
              }}
            >
              {dialog === "confirm" && (
                <>
                  <Field label="Date and time (Pakistan time)">
                    <Input
                      type="datetime-local"
                      name="start"
                      required
                      defaultValue={startsAt ? localDateTime(startsAt) : ""}
                    />
                  </Field>
                  <Field label={inPerson ? "Venue name" : "Meeting location"}>
                    <Input name="venue" required defaultValue={detail.venue ?? ""} />
                  </Field>
                  <Field label={inPerson ? "Venue address" : "Venue address (optional)"}>
                    <Input name="address" required={inPerson} defaultValue={detail.address ?? ""} />
                  </Field>
                  {inPerson && (
                    <label className="flex items-center gap-2">
                      <input
                        name="public"
                        type="checkbox"
                        defaultChecked={detail.publicVenue}
                        required
                      />{" "}
                      This is a public venue
                    </label>
                  )}
                </>
              )}
              {dialog === "cancel" && (
                <Field label="Reason for cancellation">
                  <Textarea name="reason" maxLength={1000} required />
                </Field>
              )}
              {action.error && (
                <p role="alert" className="text-destructive">
                  {action.error.message}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={action.isPending}
                  onClick={() => setDialog(null)}
                >
                  Go back
                </Button>
                <Button
                  type="submit"
                  variant={dialog === "cancel" ? "destructive" : "default"}
                  disabled={action.isPending}
                >
                  {action.isPending
                    ? "Saving…"
                    : dialog === "confirm"
                      ? "Save arrangements"
                      : dialog === "cancel"
                        ? "Confirm cancellation"
                        : "Confirm completion"}
                </Button>
              </div>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </Panel>
  );
}
