import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/layout/page-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/auth-provider";
import { displayDate, errorText } from "@/features/opportunities/data";
import { CardsLoading, Field, Page, selectClass } from "@/features/opportunities/ui";
import { requireSupabase } from "@/lib/backend";

import { ApplyForListing } from "./apply";
import {
  applications,
  applicationStatuses,
  localDateTime,
  pakistanTime,
  saveApplication,
  type Application,
  type ApplicationStatus,
} from "./data";
import { ReminderAction } from "./reminder-actions";

export function ApplicationsPage() {
  const { user } = useAuth();
  return user ? <ApplicationList userId={user.id} /> : null;
}

function ApplicationList({ userId }: { userId: string }) {
  const [status, setStatus] = useState<ApplicationStatus>("preparing");
  const query = useQuery(applications(userId));
  const items = query.data?.filter((item) => item.status === status) ?? [];
  return (
    <Page
      title="My Applications"
      intro="Keep application details, deadlines and interviews in one place."
    >
      <div
        role="group"
        aria-label="Filter applications by status"
        className="mb-5 flex flex-wrap gap-2"
      >
        {(Object.entries(applicationStatuses) as [ApplicationStatus, string][]).map(
          ([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={value === status ? "soft" : "outline"}
              aria-pressed={value === status}
              onClick={() => setStatus(value)}
            >
              {label}
            </Button>
          ),
        )}
      </div>
      {query.isPending ? (
        <CardsLoading label="Loading applications" />
      ) : query.isError ? (
        <ErrorState
          message="Couldn’t load your applications."
          onRetry={() => void query.refetch()}
        />
      ) : !items.length ? (
        <div className="rounded-2xl border bg-card p-5">
          <p>No {applicationStatuses[status].toLowerCase()} applications yet.</p>
          <Link className="mt-2 inline-block text-link" to="/opportunities">
            Browse opportunities
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {items.map((item) => (
            <li key={item.id}>
              <ApplicationCard key={item.updated_at} item={item} userId={userId} />
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

function ApplicationCard({ item, userId }: { item: Application; userId: string }) {
  const [status, setStatus] = useState<ApplicationStatus>(
    item.status === "interested" ? "preparing" : item.status,
  );
  const [interview, setInterview] = useState(localDateTime(item.interview_at));
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (fields: { notes: string; applied: string; interview: string } | null) => {
      if (fields) {
        await saveApplication({
          id: item.opportunity_id,
          status,
          notes: fields.notes,
          applied: fields.applied,
          interview: fields.interview,
        });
        return;
      }
      const { data, error } = await requireSupabase().rpc("delete_application", { p_id: item.id });
      if (error) throw error;
      if (!data) throw new Error("This application is no longer available.");
    },
    onSuccess: async (_data, fields) => {
      toast.success(fields ? "Application updated." : "Application deleted.");
      await Promise.all([
        client.invalidateQueries({ queryKey: applications(userId).queryKey }),
        client.invalidateQueries({ queryKey: ["calendar", userId] }),
        client.invalidateQueries({ queryKey: ["reminders", userId] }),
      ]);
    },
  });
  const title = item.opportunity_title ?? "Unavailable opportunity";
  return (
    <article className="space-y-4 rounded-3xl border bg-card p-5 shadow-soft">
      <div>
        <h2 className="break-words text-xl font-bold">{title}</h2>
        <p className="mt-1 [overflow-wrap:anywhere] text-sm text-muted-foreground">
          {item.organisation_name ?? "Listing unavailable"}
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          {item.deadline ? (
            <time dateTime={item.deadline}>Deadline {displayDate(item.deadline)}</time>
          ) : (
            "No deadline listed"
          )}
          {item.is_expired && (
            <span className="rounded-full bg-muted px-2.5 py-0.5 font-semibold">Expired</span>
          )}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link to="/opportunities/$id" params={{ id: item.opportunity_id }}>
            View listing
          </Link>
        </Button>
        <ReminderAction title={title} application={item.id} />
      </div>
      <ApplyForListing id={item.opportunity_id} userId={userId} expired={item.is_expired} />
      <form
        className="space-y-3 border-t pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (mutation.isPending) return;
          const values = new FormData(event.currentTarget);
          const applied = String(values.get("applied") ?? "");
          mutation.mutate({
            notes: String(values.get("notes") ?? "").trim(),
            applied:
              applied === localDateTime(item.applied_at).slice(0, 10)
                ? (item.applied_at ?? "")
                : applied
                  ? pakistanTime(`${applied}T00:00`)
                  : "",
            interview:
              interview === localDateTime(item.interview_at)
                ? (item.interview_at ?? "")
                : pakistanTime(interview),
          });
        }}
      >
        <fieldset className="space-y-3" disabled={mutation.isPending}>
          <Field label="Status">
            <select
              className={selectClass}
              value={status}
              onChange={(event) => setStatus(event.target.value as ApplicationStatus)}
            >
              {Object.entries(applicationStatuses).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Applied date">
              <Input
                type="date"
                name="applied"
                defaultValue={localDateTime(item.applied_at).slice(0, 10)}
              />
            </Field>
            {status === "interview" && (
              <Field label="Interview date and time (PKT)">
                <Input
                  type="datetime-local"
                  value={interview}
                  onChange={(event) => setInterview(event.target.value)}
                />
              </Field>
            )}
          </div>
          <Field label="Personal notes">
            <Textarea name="notes" defaultValue={item.notes ?? ""} />
          </Field>
          {mutation.isError && (
            <p role="alert" className="text-destructive">
              {errorText(mutation.error, "Couldn’t update this application.")}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              size="sm"
              className="bg-primary-strong"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Saving…" : "Save changes"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={mutation.isPending}
              onClick={() => {
                if (window.confirm(`Delete the tracker for “${title}”?`)) mutation.mutate(null);
              }}
            >
              Delete
            </Button>
          </div>
        </fieldset>
      </form>
    </article>
  );
}
