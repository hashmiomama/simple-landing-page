import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/opportunities/ui";
import { showDateTime } from "@/features/planning/data";
import { activityKey, backend, checked, result } from "./data";
import { useActivityUpdates } from "./realtime";
import { Panel } from "./ui";

export function Discussion({
  userId,
  id,
  readOnly,
}: {
  userId: string;
  id: string;
  readOnly: boolean;
}) {
  const client = useQueryClient();
  const key = [...activityKey(userId), "room", id, "activity_messages"];
  const [body, setBody] = useState("");
  const list = useRef<HTMLUListElement>(null);
  useActivityUpdates(userId, id, "activity_messages");

  const messages = useQuery({
    queryKey: key,
    queryFn: async () => {
      const api = backend();
      const rows = result(
        await api
          .from("activity_messages")
          .select("id, user_id, body, created_at, deleted_at")
          .eq("activity_id", id)
          .order("created_at", { ascending: false })
          .order("id")
          .limit(100),
      );
      const authors = [...new Set(rows.map((row) => row.user_id))];
      const users = authors.length
        ? result(await api.from("profiles").select("id, username").in("id", authors))
        : [];
      const usernames = new Map(users.map((user) => [user.id, user.username]));
      return rows
        .reverse()
        .map((row) => ({ ...row, username: usernames.get(row.user_id) ?? "Member" }));
    },
  });
  const post = useMutation({
    mutationFn: async () =>
      checked(
        await backend().rpc("post_activity_message", { p_activity_id: id, p_body: body.trim() }),
      ),
    onSuccess: async () => {
      setBody("");
      await client.invalidateQueries({ queryKey: key });
    },
  });
  const remove = useMutation({
    mutationFn: async (messageId: string) =>
      checked(await backend().rpc("delete_activity_message", { p_id: messageId })),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
  const last = messages.data?.at(-1)?.id;
  useEffect(() => {
    if (list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [last]);

  return (
    <Panel title="Discussion">
      {messages.isPending ? (
        <p role="status">Loading discussion…</p>
      ) : messages.isError ? (
        <p role="alert">
          The discussion couldn’t load.{" "}
          <button className="text-link" onClick={() => void messages.refetch()}>
            Try again
          </button>
        </p>
      ) : messages.data.length ? (
        <ul
          ref={list}
          tabIndex={0}
          aria-label="Latest 100 discussion messages"
          className="max-h-96 space-y-2 overflow-y-auto rounded-xl focus-visible:outline-2 focus-visible:outline-ring"
        >
          {messages.data.map((message) => (
            <li key={message.id} className="rounded-xl bg-muted p-3">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p className="text-sm font-semibold">{message.username}</p>
                <time className="text-xs text-muted-foreground" dateTime={message.created_at}>
                  {showDateTime(message.created_at)}
                </time>
              </div>
              <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere]">{message.body}</p>
              {message.user_id === userId && !message.deleted_at && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={remove.isPending}
                  onClick={() => {
                    if (window.confirm("Delete this message?")) remove.mutate(message.id);
                  }}
                >
                  Delete message
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No messages yet. Start the discussion when you’re ready.</p>
      )}
      {(post.error || remove.error) && (
        <p role="alert" className="text-destructive">
          {post.error?.message ?? remove.error?.message}
        </p>
      )}
      {!readOnly && (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (body.trim() && !post.isPending) post.mutate();
          }}
        >
          <Field label="Message">
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={2000}
              disabled={post.isPending}
            />
          </Field>
          <p className="text-xs text-muted-foreground">{body.length} / 2000 characters</p>
          <Button type="submit" disabled={!body.trim() || post.isPending}>
            {post.isPending ? "Sending…" : "Send message"}
          </Button>
        </form>
      )}
    </Panel>
  );
}
