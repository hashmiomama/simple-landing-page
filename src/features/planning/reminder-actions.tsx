import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/auth-provider";
import { errorText } from "@/features/opportunities/data";
import { Field } from "@/features/opportunities/ui";
import { requireSupabase } from "@/lib/backend";
import { toast } from "sonner";

import { localDateTime, pakistanTime, showDateTime, writeReminder, type Reminder } from "./data";

export function ReminderAction({
  title = "",
  opportunity,
  application,
  existing,
  label = "Remind me",
}: {
  title?: string;
  opportunity?: string;
  application?: string;
  existing?: Reminder;
  label?: string;
}) {
  const { user } = useAuth();
  return user ? (
    <ReminderDialog
      userId={user.id}
      title={title}
      opportunity={opportunity}
      application={application}
      existing={existing}
      label={label}
    />
  ) : null;
}

function ReminderDialog({
  userId,
  title,
  opportunity,
  application,
  existing,
  label,
}: {
  userId: string;
  title: string;
  opportunity: string | undefined;
  application: string | undefined;
  existing: Reminder | undefined;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (fields: { title: string; at: string; note: string }) =>
      writeReminder({
        ...fields,
        ...(existing ? { existing } : {}),
        ...(application || existing?.application_id
          ? { application: (application || existing?.application_id)! }
          : {}),
        ...(opportunity || existing?.opportunity_id
          ? { opportunity: (opportunity || existing?.opportunity_id)! }
          : {}),
      }),
    onSuccess: () => {
      setOpen(false);
      toast.success(existing ? "Reminder updated." : "Reminder added.");
      void client.invalidateQueries({ queryKey: ["reminders", userId] });
      void client.invalidateQueries({ queryKey: ["calendar", userId] });
    },
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!mutation.isPending) {
          setOpen(next);
          if (next) mutation.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Edit reminder" : "Add a reminder"}</DialogTitle>
          <DialogDescription>Dates and times are in Pakistan Standard Time.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const values = new FormData(event.currentTarget);
            const name = String(values.get("title") ?? "").trim();
            const at = String(values.get("at") ?? "");
            if (name && at && !mutation.isPending)
              mutation.mutate({
                title: name,
                at:
                  existing && at === localDateTime(existing.remind_at)
                    ? existing.remind_at
                    : pakistanTime(at),
                note: String(values.get("note") ?? "").trim(),
              });
          }}
        >
          <Field label="Title">
            <Input name="title" defaultValue={existing?.title ?? title} required maxLength={180} />
          </Field>
          <Field label="Date and time">
            <Input
              name="at"
              type="datetime-local"
              defaultValue={localDateTime(existing?.remind_at)}
              required
            />
          </Field>
          <Field label="Note (optional)">
            <Textarea name="note" defaultValue={existing?.note ?? ""} />
          </Field>
          {mutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              {errorText(mutation.error, "Couldn’t save the reminder.")}
            </p>
          )}
          <Button type="submit" className="bg-primary-strong" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save reminder"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ReminderRow({ item, userId }: { item: Reminder; userId: string }) {
  const client = useQueryClient();
  const change = useMutation({
    mutationFn: async (action: "toggle" | "delete") => {
      if (action === "delete") {
        const { data, error } = await requireSupabase().rpc("delete_reminder", { p_id: item.id });
        if (error) throw error;
        if (!data) throw new Error("This reminder is no longer available.");
      } else {
        await writeReminder({
          existing: item,
          title: item.title,
          at: item.remind_at,
          done: !item.done,
          ...(item.note ? { note: item.note } : {}),
          ...(item.application_id ? { application: item.application_id } : {}),
          ...(item.opportunity_id ? { opportunity: item.opportunity_id } : {}),
        });
      }
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["reminders", userId] }),
        client.invalidateQueries({ queryKey: ["calendar", userId] }),
      ]);
    },
  });
  return (
    <li className="rounded-2xl border bg-card p-4">
      <label className="flex items-start gap-2 font-semibold">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-primary-strong"
          checked={item.done}
          disabled={change.isPending}
          onChange={() => change.mutate("toggle")}
        />
        <span className="break-words">{item.title}</span>
        <span className="sr-only">done</span>
      </label>
      <time className="mt-1 block text-sm text-muted-foreground" dateTime={item.remind_at}>
        {showDateTime(item.remind_at)}
      </time>
      {item.note && <p className="mt-1 whitespace-pre-wrap break-words text-sm">{item.note}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <ReminderAction existing={item} label="Edit reminder" />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={change.isPending}
          onClick={() => {
            if (window.confirm(`Delete “${item.title}”?`)) change.mutate("delete");
          }}
        >
          Delete
        </Button>
      </div>
      {change.isError && (
        <p role="alert" className="text-destructive">
          {errorText(change.error, "Couldn’t update the reminder.")}
        </p>
      )}
    </li>
  );
}
