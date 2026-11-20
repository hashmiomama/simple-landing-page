import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { detailListing, errorText, safeWebUrl } from "@/features/opportunities/data";

import { applications, saveApplication } from "./data";

export const applyNotice =
  "You will leave Count me in. Applications happen on the organiser’s official website.";

export function ApplyForListing({
  id,
  userId,
  expired,
}: {
  id: string;
  userId: string;
  expired: boolean | null;
}) {
  const detail = useQuery({ ...detailListing(id, userId), enabled: expired === false });
  if (expired) return <ApplyLink id={id} expired />;
  if (expired !== false) return null;
  if (detail.isPending)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Loading official link…
      </p>
    );
  if (detail.isError)
    return (
      <button type="button" className="text-link text-sm" onClick={() => void detail.refetch()}>
        Retry official link
      </button>
    );
  return detail.data ? (
    <ApplyLink id={id} source={detail.data.source_url} />
  ) : (
    <p className="text-sm text-muted-foreground">Official link unavailable.</p>
  );
}

export function ApplyLink({
  id,
  source,
  primary = false,
  expired = false,
}: {
  id: string;
  source?: string | null;
  primary?: boolean;
  expired?: boolean;
}) {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState(false);
  const href = source && safeWebUrl(source);
  return (
    <div className="min-w-0 space-y-2">
      {!expired && href && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            asChild
            className={primary ? "bg-primary-strong" : undefined}
            variant={primary ? "default" : "outline"}
            size={primary ? "default" : "sm"}
          >
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={
                primary
                  ? "Apply on the official website (opens in a new tab)"
                  : "Apply (opens in a new tab)"
              }
              onClick={() => {
                if (user) setPrompt(true);
              }}
            >
              {primary ? "Apply on the official website" : "Apply"} <ExternalLink aria-hidden />
            </a>
          </Button>
          {primary && (
            <span className="min-w-0 break-all text-sm font-medium text-muted-foreground">
              {new URL(href).hostname}
            </span>
          )}
        </div>
      )}
      <p className="text-sm text-muted-foreground">{applyNotice}</p>
      {!expired && prompt && user && (
        <TrackPrompt userId={user.id} id={id} onDismiss={() => setPrompt(false)} />
      )}
    </div>
  );
}

export function TrackButton({ id }: { id: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        Track this
      </Button>
      {open && <TrackPrompt userId={user.id} id={id} onDismiss={() => setOpen(false)} />}
    </div>
  );
}

function TrackPrompt({
  userId,
  id,
  onDismiss,
}: {
  userId: string;
  id: string;
  onDismiss: () => void;
}) {
  const client = useQueryClient();
  const tracked = useQuery(applications(userId));
  const current = tracked.data?.find((item) => item.opportunity_id === id);
  const save = useMutation({
    mutationFn: (status: "preparing" | "applied") =>
      saveApplication({
        id,
        status,
        notes: current?.notes ?? null,
        applied: current?.applied_at ?? (status === "applied" ? new Date().toISOString() : null),
        interview: current?.interview_at ?? null,
      }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: applications(userId).queryKey }),
        client.invalidateQueries({ queryKey: ["calendar", userId] }),
      ]);
    },
  });
  return (
    <section
      aria-label="Track this application"
      className="w-full space-y-2 rounded-xl border bg-lavender-soft p-3 text-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">
          {save.isSuccess ? "Application tracked" : "Track this application?"}
        </p>
        <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
      {save.isSuccess ? (
        <Link className="text-link" to="/applications">
          Open My Applications
        </Link>
      ) : tracked.isError ? (
        <button type="button" className="text-link" onClick={() => void tracked.refetch()}>
          Retry tracker status
        </button>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(["preparing", "applied"] as const).map((status) => (
            <Button
              key={status}
              type="button"
              variant="outline"
              size="sm"
              className="capitalize"
              disabled={tracked.isPending || save.isPending}
              onClick={() => save.mutate(status)}
            >
              {status}
            </Button>
          ))}
        </div>
      )}
      {save.isPending && <p role="status">Saving…</p>}
      {save.isError && (
        <p role="alert" className="text-destructive">
          {errorText(save.error, "Couldn’t track this application.")}
        </p>
      )}
    </section>
  );
}
