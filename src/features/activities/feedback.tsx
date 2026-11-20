import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field, selectClass } from "@/features/opportunities/ui";
import { activityKey, backend, result } from "./data";
import { Panel } from "./ui";

const commentsSchema = z.array(z.object({ comment: z.string(), username: z.string().nullable() }));
export const activityFeedback = (userId: string, id: string) =>
  queryOptions({
    queryKey: [...activityKey(userId), "feedback", id],
    queryFn: async () => {
      const item = result(await backend().rpc("get_activity_feedback", { p_activity_id: id }))[0];
      if (!item) return null;
      return {
        count: item.response_count,
        average: item.average_rating ?? null,
        comments: commentsSchema.nullable().parse(item.comments),
      };
    },
  });

export function Feedback({ userId, id }: { userId: string; id: string }) {
  const client = useQueryClient();
  const summary = useQuery(activityFeedback(userId, id));
  const sentKey = [...activityKey(userId), "feedback-sent", id];
  const sent = useQuery({
    queryKey: sentKey,
    queryFn: () => false,
    enabled: false,
    gcTime: Infinity,
  });
  const submit = useMutation({
    mutationFn: async (form: FormData) => {
      const comment = String(form.get("comment") ?? "").trim();
      const { error } = await backend().rpc("submit_activity_feedback", {
        p_activity_id: id,
        p_rating: Number(form.get("rating")),
        ...(comment ? { p_comment: comment } : {}),
        p_share_author: form.has("share"),
        p_report_issue: form.has("report"),
      });
      if (error && error.code !== "23505") throw new Error(error.message);
      return error
        ? "You’ve already sent feedback for this activity."
        : "Thanks for sharing your feedback.";
    },
    onSuccess: async () => {
      client.setQueryData(sentKey, true);
      await client.invalidateQueries({ queryKey: activityFeedback(userId, id).queryKey });
    },
  });

  return (
    <Panel title="Activity feedback">
      {summary.isPending ? (
        <p role="status">Loading feedback…</p>
      ) : summary.isError ? (
        <p role="alert">
          Couldn’t load feedback.{" "}
          <button className="text-link" onClick={() => void summary.refetch()}>
            Retry
          </button>
        </p>
      ) : summary.data?.count ? (
        <>
          <p>
            {summary.data.average?.toLocaleString()} / 5 average from {summary.data.count}{" "}
            {summary.data.count === 1 ? "response" : "responses"}
          </p>
          {summary.data.comments && summary.data.comments.length > 0 && (
            <ul className="space-y-2">
              {summary.data.comments.map((item, index) => (
                <li key={index} className="rounded-xl bg-muted p-3">
                  <p className="text-sm font-semibold">{item.username ?? "Anonymous"}</p>
                  <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{item.comment}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p>No ratings yet.</p>
      )}
      {sent.data ? (
        <p role="status">{submit.data ?? "You’ve already sent feedback for this activity."}</p>
      ) : (
        <form
          className="space-y-3 border-t pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!submit.isPending) submit.mutate(new FormData(event.currentTarget));
          }}
        >
          <Field label="Rating">
            <select name="rating" className={selectClass} required defaultValue="">
              <option value="">Choose a rating</option>
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </Field>
          <Field label="Comment (optional)">
            <Textarea name="comment" maxLength={2000} />
          </Field>
          <label className="flex items-start gap-2">
            <input className="mt-1" type="checkbox" name="share" /> Share my username with the
            coordinator
          </label>
          <label className="flex items-start gap-2">
            <input className="mt-1" type="checkbox" name="report" /> Report an issue
          </label>
          <p className="text-sm text-muted-foreground">
            Checking Report an issue sends a report and your comment to administrators for review.
          </p>
          {submit.error && (
            <p role="alert" className="text-destructive">
              {submit.error.message}
            </p>
          )}
          <Button type="submit" disabled={submit.isPending}>
            {submit.isPending ? "Sending…" : "Send feedback"}
          </Button>
        </form>
      )}
    </Panel>
  );
}
