import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/features/opportunities/ui";
import { Textarea } from "@/components/ui/textarea";
import { statusLabels } from "@/features/opportunities/data";
import type { Enums } from "@/integrations/supabase/types";

import { pageSize } from "./data";

export function StatusFilters<T extends Enums<"review_status">>({
  statuses,
  value,
  change,
}: {
  statuses: readonly T[];
  value: T;
  change: (value: T) => void;
}) {
  return (
    <div role="group" aria-label="Filter by status" className="mb-5 flex flex-wrap gap-2">
      {statuses.map((status) => (
        <Button
          type="button"
          size="sm"
          key={status}
          aria-pressed={value === status}
          variant={value === status ? "soft" : "outline"}
          onClick={() => change(status)}
        >
          {statusLabels[status]}
        </Button>
      ))}
    </div>
  );
}

export function Pagination({
  page,
  count,
  change,
}: {
  page: number;
  count: number;
  change: (value: number) => void;
}) {
  if (page === 1 && count <= pageSize) return null;
  return (
    <nav aria-label="Pagination" className="mt-5 flex flex-wrap items-center justify-between gap-2">
      <Button variant="outline" disabled={page === 1} onClick={() => change(page - 1)}>
        Previous
      </Button>
      <span className="text-sm">
        Page {page}
        {count ? ` of ${Math.ceil(count / pageSize)}` : ""}
      </span>
      <Button
        variant="outline"
        disabled={page * pageSize >= count}
        onClick={() => change(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}

export function DecisionPanel<T extends string>({
  choices,
  requiredNote,
  pending,
  error,
  onDecide,
  label = "Review decision",
}: {
  choices: Record<T, string>;
  requiredNote: (decision: T) => boolean;
  pending: boolean;
  error: string | null;
  onDecide: (decision: T, note: string) => Promise<unknown>;
  label?: string;
}) {
  const [selected, select] = useState<T | null>(null);
  const [note, setNote] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const needsNote = selected !== null && requiredNote(selected);
  return (
    <section aria-label={label} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(choices) as T[]).map((decision) => (
          <Button
            variant={decision === "approve" || decision === "approved" ? "soft" : "outline"}
            size="sm"
            key={decision}
            disabled={pending}
            onClick={(event) => {
              trigger.current = event.currentTarget;
              setNote("");
              select(decision);
            }}
          >
            {choices[decision]}
          </Button>
        ))}
      </div>
      {error && !selected && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open && !pending) select(null);
        }}
      >
        <DialogContent
          onCloseAutoFocus={(event) => {
            if (trigger.current?.isConnected) {
              event.preventDefault();
              trigger.current.focus();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{selected ? `Confirm: ${choices[selected]}` : label}</DialogTitle>
            <DialogDescription>
              Confirm the decision to save it to the review history.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (selected && !pending && (!needsNote || note.trim())) {
                try {
                  await onDecide(selected, note);
                  select(null);
                } catch {
                  // The mutation supplies the error and leaves the note available to retry.
                }
              }
            }}
          >
            <Field label={needsNote ? "Note for the submitter (required)" : "Note (optional)"}>
              <Textarea
                required={needsNote}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            {pending && (
              <p role="status" className="text-sm text-muted-foreground">
                Saving decision…
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                className="bg-primary-strong"
                disabled={pending || (needsNote && !note.trim())}
              >
                {pending ? "Saving…" : "Confirm decision"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => select(null)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
