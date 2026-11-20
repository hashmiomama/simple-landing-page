import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { ErrorState } from "@/components/layout/page-states";
import { categoryCatalog, displayDate, errorText, safeWebUrl } from "@/features/opportunities/data";
import { CardsLoading, Page } from "@/features/opportunities/ui";
import { toast } from "sonner";

import {
  adminAudit,
  adminOrganisations,
  adminQueue,
  adminStats,
  decideOrganisation,
  queueStatuses,
  readable,
  showTime,
} from "./data";
import { modules } from "./layout";
import { DecisionPanel, Pagination, StatusFilters } from "./ui";

export function AdminDashboard() {
  const query = useQuery({ queryKey: ["admin", "stats"], queryFn: adminStats });
  const stats = [
    ["registered_users", "Registered users"],
    ["published_opportunities", "Published opportunities"],
    ["pending_submissions", "Pending submissions"],
    ["pending_experiences", "Pending experiences"],
    ["pending_organisations", "Pending organisations"],
    ["open_reports", "Open reports"],
  ] as const;
  return (
    <Page title="Admin dashboard">
      {query.isPending ? (
        <CardsLoading label="Loading administrator statistics" />
      ) : query.isError ? (
        <ErrorState message="Couldn’t load the dashboard." onRetry={() => void query.refetch()} />
      ) : (
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map(([key, label]) => (
            <div key={key} className="rounded-2xl border bg-card p-4 shadow-soft">
              <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
              <dd className="mt-1 font-display text-3xl font-bold tabular-nums">
                {query.data[key].toLocaleString()}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <nav aria-label="Quick links" className="mt-6 flex flex-wrap gap-3">
        {modules.slice(1).map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className="rounded-full border bg-lavender-soft px-4 py-2 text-sm font-semibold text-primary-strong hover:bg-lavender"
          >
            {label}
          </Link>
        ))}
      </nav>
    </Page>
  );
}

export function OpportunityQueue() {
  const [status, setStatus] = useState<(typeof queueStatuses)[number]>("pending");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["admin", "queue", status, page],
    queryFn: () => adminQueue(status, page),
  });
  const categories = useQuery(categoryCatalog);
  return (
    <Page title="Opportunity verification">
      <StatusFilters
        statuses={queueStatuses}
        value={status}
        change={(value) => {
          setStatus(value);
          setPage(1);
        }}
      />
      {query.isPending ? (
        <CardsLoading label="Loading submissions" />
      ) : query.isError ? (
        <ErrorState
          message="Couldn’t load the submission queue."
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          {query.data.length === 0 ? (
            <p className="rounded-2xl border bg-card p-5">No submissions on this page.</p>
          ) : (
            <ul className="space-y-3">
              {query.data.map((item) => (
                <li key={item.id} className="rounded-2xl border bg-card p-4 shadow-soft">
                  <Link
                    className="break-words text-link"
                    to="/admin/opportunities/$id"
                    params={{ id: item.id }}
                  >
                    {item.title || "Untitled submission"}
                  </Link>
                  <p className="mt-1 [overflow-wrap:anywhere] text-sm">
                    {categories.data?.find((c) => c.slug === item.category_slug)?.name ??
                      item.category_slug}{" "}
                    · {item.organisation_name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Submitted by {item.submitter_username ?? "Not listed"} ·{" "}
                    {showTime(item.created_at)} · Deadline {displayDate(item.deadline)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={page} count={query.data[0]?.total_count ?? 0} change={setPage} />
        </>
      )}
    </Page>
  );
}

const orgStatuses = ["pending", "approved", "rejected"] as const;
const orgChoices = { approved: "Approve", rejected: "Reject" } as const;
export function OrganisationQueue() {
  const [status, setStatus] = useState<(typeof orgStatuses)[number]>("pending");
  const query = useQuery({
    queryKey: ["admin", "organisations", status],
    queryFn: () => adminOrganisations(status),
  });
  return (
    <Page title="Organisation verification">
      <StatusFilters statuses={orgStatuses} value={status} change={setStatus} />
      {query.isPending ? (
        <CardsLoading label="Loading organisation requests" />
      ) : query.isError ? (
        <ErrorState
          message="Couldn’t load organisation requests."
          onRetry={() => void query.refetch()}
        />
      ) : !query.data.length ? (
        <p className="rounded-2xl border bg-card p-5">No organisation requests with this status.</p>
      ) : (
        <ul className="space-y-4">
          {query.data.map((org) => (
            <li key={org.id}>
              <OrganisationCard org={org} />
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

function OrganisationCard({
  org,
}: {
  org: Awaited<ReturnType<typeof adminOrganisations>>[number];
}) {
  const client = useQueryClient();
  const review = useMutation({
    mutationFn: ({ decision, note }: { decision: keyof typeof orgChoices; note: string }) =>
      decideOrganisation(org.id, decision, note),
    onSuccess: async () => {
      toast.success("Organisation decision saved.");
      await Promise.all([
        client.invalidateQueries({ queryKey: ["admin"] }),
        client.invalidateQueries({ queryKey: ["own-organisation", org.owner_id] }),
      ]);
    },
  });
  const url = org.website_url && safeWebUrl(org.website_url);
  return (
    <article className="space-y-3 rounded-2xl border bg-card p-5 shadow-soft">
      <h2 className="break-words text-xl font-bold">{org.name}</h2>
      <p className="[overflow-wrap:anywhere] text-sm">
        {org.organisation_type ?? "Type not provided"} ·{" "}
        {org.official_email ?? "Email not provided"}
      </p>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="break-all text-link">
          {url} <span className="sr-only">(opens in a new tab)</span>
        </a>
      )}
      <div className="text-sm">
        <h3 className="font-semibold">Representative</h3>
        <p className="break-words">
          {[org.representative_name, org.representative_title, org.representative_email]
            .filter(Boolean)
            .join(" · ") || "Not provided"}
        </p>
      </div>
      <div className="text-sm">
        <h3 className="font-semibold">Evidence notes</h3>
        <p className="whitespace-pre-wrap break-words">{org.evidence_notes || "Not provided"}</p>
      </div>
      {org.status === "pending" && (
        <DecisionPanel
          choices={orgChoices}
          requiredNote={(decision) => decision === "rejected"}
          pending={review.isPending}
          error={
            review.isError
              ? errorText(review.error, "Couldn’t save the organisation decision.")
              : null
          }
          onDecide={(decision, note) => review.mutateAsync({ decision, note })}
          label={`Review ${org.name}`}
        />
      )}
    </article>
  );
}

export function AuditLog() {
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ["admin", "audit", page], queryFn: () => adminAudit(page) });
  return (
    <Page title="Audit log">
      {query.isPending ? (
        <CardsLoading label="Loading audit history" />
      ) : query.isError ? (
        <ErrorState message="Couldn’t load the audit log." onRetry={() => void query.refetch()} />
      ) : (
        <>
          {!query.data.length ? (
            <p className="rounded-2xl border bg-card p-5">No audit entries on this page.</p>
          ) : (
            <ul className="space-y-3">
              {query.data.map((item) => (
                <li key={item.id} className="rounded-2xl border bg-card p-4">
                  <h2 className="font-bold capitalize">{readable(item.action)}</h2>
                  <p className="my-1 break-words text-sm text-muted-foreground">
                    {showTime(item.created_at)} · {item.actor_username ?? "Unknown actor"} ·{" "}
                    {readable(item.target_table)} / {item.target_id}
                  </p>
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer font-semibold">Details</summary>
                    <pre className="mt-2 whitespace-pre-wrap break-all rounded-lg bg-muted p-3 text-xs">
                      {JSON.stringify(item.details, null, 2)}
                    </pre>
                  </details>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={page} count={query.data[0]?.total_count ?? 0} change={setPage} />
        </>
      )}
    </Page>
  );
}
