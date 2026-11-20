import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useBlocker } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { recommendations } from "@/features/dashboard/data";

export type SectionAccess = {
  userId: string;
  locked: boolean;
  onEditing: (editing: boolean) => void;
};

export function useSectionEditor<T>(
  access: SectionAccess,
  persist: (values: T, initial: T) => Promise<void>,
) {
  const { userId, onEditing } = access;
  const [edit, setEdit] = useState<{ initial: T; draft: T } | null>(null);
  const queryClient = useQueryClient();
  const dirty = !!edit && JSON.stringify(edit.draft) !== JSON.stringify(edit.initial);
  const mutation = useMutation({
    mutationFn: async ({ draft, initial }: { draft: T; initial: T }) => {
      await persist(draft, initial);
      await queryClient.invalidateQueries({ queryKey: recommendations(userId).queryKey });
    },
    onSuccess: () => {
      setEdit(null);
      onEditing(false);
    },
  });

  useBlocker({
    disabled: !dirty && !mutation.isPending,
    enableBeforeUnload: dirty || mutation.isPending,
    shouldBlockFn: ({ current, next }) =>
      current.pathname !== next.pathname &&
      (mutation.isPending ||
        (dirty && !window.confirm("Leave this section and discard unsaved changes?"))),
  });

  return {
    editing: edit !== null,
    draft: edit?.draft ?? null,
    setDraft: (draft: T) => setEdit((state) => (state ? { ...state, draft } : state)),
    dirty,
    pending: mutation.isPending,
    error: mutation.isError ? mutation.error : null,
    saved: mutation.isSuccess,
    start: (value: T) => {
      mutation.reset();
      setEdit({ initial: value, draft: value });
      onEditing(true);
    },
    cancel: () => {
      if (dirty && !window.confirm("Discard your unsaved changes to this section?")) return;
      mutation.reset();
      setEdit(null);
      onEditing(false);
    },
    save: () => {
      if (edit && dirty && !mutation.isPending) mutation.mutate(edit);
    },
  };
}

export function ProfileSection({
  id,
  title,
  description,
  action,
  children,
}: {
  id: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-24 rounded-3xl border bg-card p-5 shadow-soft sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={`${id}-heading`} className="text-xl font-bold">
            {title}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
      <div className="mt-5 border-t pt-5">{children}</div>
    </section>
  );
}

export function SectionFields({
  children,
  pending,
  canSave,
  error,
  onSave,
  onCancel,
}: {
  children: ReactNode;
  pending: boolean;
  canSave: boolean;
  error: Error | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave && !pending) onSave();
      }}
    >
      <fieldset disabled={pending} className="space-y-4">
        {children}
      </fieldset>
      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
        >
          {error instanceof Error ? error.message : "We couldn’t save this section. Try again."}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="submit" className="bg-primary-strong" disabled={!canSave || pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function SectionStatus({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  if (loading)
    return (
      <div role="status" className="space-y-3">
        <span className="sr-only">Loading section</span>
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-5 w-64 max-w-full" />
      </div>
    );
  if (error)
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-destructive">
        We couldn’t load this section.{" "}
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  return null;
}

export function ProfileValue({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap break-words">{value || "Not set"}</dd>
    </div>
  );
}
