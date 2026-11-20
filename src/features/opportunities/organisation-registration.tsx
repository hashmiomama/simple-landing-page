import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { ErrorState } from "@/components/layout/page-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/auth-provider";
import { requireSupabase } from "@/lib/backend";

import { errorText, ownOrganisation, statusLabels, type Organisation } from "./data";
import { organisationSchema } from "./submission-data";
import { CardsLoading, Field, FormSection, Page } from "./ui";
import type { z } from "zod";

export function OrganisationRegistration() {
  const { user } = useAuth();
  return user ? <RegistrationContent key={user.id} userId={user.id} /> : null;
}

function RegistrationContent({ userId }: { userId: string }) {
  const query = useQuery(ownOrganisation(userId));
  const [editing, setEditing] = useState(false);
  return (
    <Page
      title="Organisation registration"
      intro="Register your organisation to submit official opportunities."
    >
      {query.isPending ? (
        <CardsLoading label="Loading organisation registration" />
      ) : query.isError ? (
        <ErrorState message="We couldn’t load your request." onRetry={() => void query.refetch()} />
      ) : query.data && !editing ? (
        <section
          aria-label="Request status"
          className="max-w-2xl space-y-3 rounded-3xl border bg-card p-6 shadow-soft"
        >
          <p className="text-sm font-semibold text-primary-strong">
            Request status · {statusLabels[query.data.status]}
          </p>
          <h2 className="text-xl font-bold">{query.data.name}</h2>
          <p className="text-muted-foreground">
            {query.data.status === "approved"
              ? "You can now submit official opportunities for review."
              : query.data.status === "rejected"
                ? "Your registration request was rejected."
                : "Your request is waiting for an administrator to review it."}
          </p>
          {query.data.status === "pending" && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              Edit request
            </Button>
          )}
          {query.data.status === "approved" && (
            <div className="flex flex-wrap gap-2">
              <Button asChild className="bg-primary-strong">
                <Link to="/submit-opportunity">Submit an opportunity</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/organisation/listings">My organisation listings</Link>
              </Button>
            </div>
          )}
        </section>
      ) : (
        <RegistrationForm existing={query.data} userId={userId} onDone={() => setEditing(false)} />
      )}
    </Page>
  );
}

const fields = [
  ["name", "Official name", "text"],
  ["organisation_type", "Organisation type", "text"],
  ["website_url", "Official website", "url"],
  ["official_email", "Official email", "email"],
  ["representative_name", "Representative name", "text"],
  ["representative_title", "Representative role or title", "text"],
  ["representative_email", "Representative email", "email"],
] as const;

function RegistrationForm({
  existing,
  userId,
  onDone,
}: {
  existing: Organisation | null;
  userId: string;
  onDone: () => void;
}) {
  const client = useQueryClient();
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof organisationSchema>) => {
      const table = requireSupabase().from("organisations");
      const write = existing
        ? table.update(values).eq("id", existing.id).eq("owner_id", userId)
        : table.insert(values);
      const { data, error } = await write.select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      client.setQueryData(ownOrganisation(userId).queryKey, data);
      onDone();
    },
  });
  return (
    <form
      noValidate
      className="max-w-2xl"
      onSubmit={(event) => {
        event.preventDefault();
        if (mutation.isPending) return;
        const parsed = organisationSchema.safeParse(
          Object.fromEntries(new FormData(event.currentTarget)),
        );
        if (!parsed.success) {
          setErrors(parsed.error.flatten().fieldErrors);
          return;
        }
        setErrors({});
        mutation.mutate(parsed.data);
      }}
    >
      <fieldset disabled={mutation.isPending}>
        <FormSection title="Organisation and representative details">
          {fields.map(([name, label, type]) => (
            <Field key={name} label={label}>
              <Input
                type={type}
                name={name}
                defaultValue={existing?.[name] ?? ""}
                aria-invalid={!!errors[name]}
              />
              {errors[name]?.[0] && <span className="text-destructive">{errors[name][0]}</span>}
            </Field>
          ))}
          <Field label="Evidence notes">
            <Textarea
              name="evidence_notes"
              defaultValue={existing?.evidence_notes ?? ""}
              aria-invalid={!!errors["evidence_notes"]}
            />
            {errors["evidence_notes"]?.[0] && (
              <span className="text-destructive">{errors["evidence_notes"][0]}</span>
            )}
          </Field>
        </FormSection>
        {!!Object.keys(errors).length && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            Check the highlighted fields and try again.
          </p>
        )}
        {mutation.isError && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {errorText(mutation.error, "We couldn’t save your request.")}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button className="bg-primary-strong" type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? "Saving…"
              : existing
                ? "Save request"
                : "Send registration request"}
          </Button>
          {existing && (
            <Button type="button" variant="outline" onClick={onDone}>
              Cancel
            </Button>
          )}
        </div>
      </fieldset>
    </form>
  );
}
