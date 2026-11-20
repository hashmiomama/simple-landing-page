import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Field, selectClass } from "@/features/opportunities/ui";
import { pakistanTime, showDateTime } from "@/features/planning/data";
import type { Tables } from "@/integrations/supabase/types";
import { activityKey, backend, checked, result } from "./data";
import { useActivityUpdates } from "./realtime";
import { Panel } from "./ui";

const kinds: Record<string, string> = {
  date_time: "Date and time",
  venue: "Venue",
  other: "Other",
};
const pollKey = (userId: string, id: string) => [...activityKey(userId), "room", id, "polls"];

export function Polls({
  userId,
  id,
  coordinator,
  readOnly,
}: {
  userId: string;
  id: string;
  coordinator: boolean;
  readOnly: boolean;
}) {
  useActivityUpdates(userId, id, "polls");
  const polls = useQuery({
    queryKey: [...pollKey(userId, id), "list"],
    queryFn: async () =>
      result(
        await backend()
          .from("polls")
          .select("*")
          .eq("activity_id", id)
          .order("created_at", { ascending: false }),
      ),
  });
  return (
    <div className="space-y-4">
      {!readOnly && <CreatePoll userId={userId} id={id} />}
      {polls.isPending ? (
        <p role="status">Loading polls…</p>
      ) : polls.isError ? (
        <p role="alert">
          Polls couldn’t load.{" "}
          <button className="text-link" onClick={() => void polls.refetch()}>
            Try again
          </button>
        </p>
      ) : polls.data.length ? (
        polls.data.map((poll) => (
          <Poll key={poll.id} {...{ poll, userId, id, coordinator, readOnly }} />
        ))
      ) : (
        <p className="rounded-xl border bg-card p-4">No polls yet.</p>
      )}
    </div>
  );
}

function CreatePoll({ userId, id }: { userId: string; id: string }) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const create = useMutation({
    mutationFn: async (form: FormData) => {
      const question = String(form.get("question") ?? "").trim();
      const options = String(form.get("options") ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const time = String(form.get("closes") ?? "");
      if (
        !question ||
        options.length < 2 ||
        options.length > 10 ||
        options.some((option) => option.length > 160) ||
        new Set(options.map((option) => option.toLowerCase())).size !== options.length
      ) {
        throw new Error(
          "Enter a question and 2 to 10 distinct options of up to 160 characters each.",
        );
      }
      checked(
        await backend().rpc("create_poll", {
          p_activity_id: id,
          p_question: question,
          p_kind: String(form.get("kind")),
          p_options: options,
          ...(time ? { p_closes_at: pakistanTime(time) } : {}),
        }),
      );
    },
    onSuccess: async () => {
      setOpen(false);
      await client.invalidateQueries({ queryKey: pollKey(userId, id) });
    },
  });
  if (!open)
    return (
      <Button
        onClick={() => {
          create.reset();
          setOpen(true);
        }}
      >
        Create a poll
      </Button>
    );
  return (
    <Panel title="Create a poll">
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!create.isPending) create.mutate(new FormData(event.currentTarget));
        }}
      >
        <Field label="Question">
          <Input name="question" required maxLength={300} />
        </Field>
        <Field label="Poll kind">
          <select name="kind" className={selectClass}>
            {Object.entries(kinds).map(([value, name]) => (
              <option key={value} value={value}>
                {name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Options (one per line)">
          <Textarea name="options" required maxLength={1610} />
        </Field>
        <Field label="Closing time (optional, Pakistan time)">
          <Input name="closes" type="datetime-local" />
        </Field>
        {create.error && (
          <p role="alert" className="text-destructive">
            {create.error.message}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create poll"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={create.isPending}
            onClick={() => setOpen(false)}
          >
            Discard
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function Poll({
  poll,
  userId,
  id,
  coordinator,
  readOnly,
}: {
  poll: Tables<"polls">;
  userId: string;
  id: string;
  coordinator: boolean;
  readOnly: boolean;
}) {
  const client = useQueryClient();
  const [now, setNow] = useState(Date.now);
  const closes = poll.closes_at ? Date.parse(poll.closes_at) : null;
  const closed = readOnly || (closes !== null && closes <= now);
  useEffect(() => {
    if (closes === null || closed) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [closed, closes]);
  const results = useQuery({
    queryKey: [...pollKey(userId, id), poll.id],
    queryFn: async () => result(await backend().rpc("get_poll_results", { p_poll_id: poll.id })),
  });
  const change = useMutation({
    mutationFn: async (option: string | null) => {
      if (option === null) checked(await backend().rpc("close_poll", { p_poll_id: poll.id }));
      else checked(await backend().rpc("cast_vote", { p_poll_id: poll.id, p_option_id: option }));
    },
    onSuccess: () => client.invalidateQueries({ queryKey: pollKey(userId, id) }),
  });
  const total = results.data?.reduce((sum, option) => sum + option.vote_count, 0) ?? 0;
  return (
    <Panel title={poll.question}>
      <p className="text-sm text-muted-foreground">
        {kinds[poll.kind] ?? "Poll"} ·{" "}
        {closed ? "Closed" : poll.closes_at ? `Closes ${showDateTime(poll.closes_at)}` : "Open"}
      </p>
      {results.isPending ? (
        <p role="status">Loading results…</p>
      ) : results.isError ? (
        <p role="alert">
          Results couldn’t load.{" "}
          <button className="text-link" onClick={() => void results.refetch()}>
            Try again
          </button>
        </p>
      ) : (
        <fieldset disabled={closed || change.isPending} className="min-w-0 space-y-3">
          <legend className="sr-only">Vote for an option</legend>
          {results.data.map((option) => {
            const percent = total ? Math.round((option.vote_count / total) * 100) : 0;
            return (
              <div key={option.option_id} className="rounded-xl border p-3">
                <label className="flex min-h-8 items-start gap-2 [overflow-wrap:anywhere]">
                  <input
                    className="mt-1 shrink-0 accent-primary-strong"
                    type="radio"
                    name={poll.id}
                    checked={option.caller_voted}
                    onChange={() => change.mutate(option.option_id)}
                  />
                  <span>
                    {option.label}
                    {option.caller_voted && " (your vote)"}
                  </span>
                </label>
                <p className="mb-1 text-sm text-muted-foreground">
                  {option.vote_count} {option.vote_count === 1 ? "vote" : "votes"} · {percent}%
                </p>
                <Progress value={percent} aria-label={`Votes for ${option.label}`} />
              </div>
            );
          })}
        </fieldset>
      )}
      {change.error && (
        <p role="alert" className="text-destructive">
          {change.error.message}
        </p>
      )}
      {coordinator && !closed && (
        <Button
          variant="outline"
          disabled={change.isPending}
          onClick={() => {
            if (window.confirm("Close this poll? Members will no longer be able to vote."))
              change.mutate(null);
          }}
        >
          Close poll
        </Button>
      )}
    </Panel>
  );
}
