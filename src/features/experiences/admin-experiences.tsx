import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/layout/page-states";
import { decisions, queueStatuses, showTime, type Decision } from "@/features/admin/data";
import { DecisionPanel, Pagination, StatusFilters } from "@/features/admin/ui";
import { errorText, isTag, safeWebUrl, statusLabels } from "@/features/opportunities/data";
import { CardsLoading, Page } from "@/features/opportunities/ui";
import { requireSupabase } from "@/lib/backend";

import { categoryName, costLabel, pageSize, socialLabels, type AdminExperience } from "./data";

export function AdminExperiences() {
  const [status, setStatus] = useState<(typeof queueStatuses)[number]>("pending");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["admin", "experiences", status, page],
    queryFn: async ({ signal }) => {
      const { data, error } = await requireSupabase()
        .rpc("admin_list_experiences", {
          p_status: status,
          p_limit: pageSize,
          p_offset: (page - 1) * pageSize,
        })
        .abortSignal(signal);
      if (error) throw error;
      return data;
    },
  });
  return (
    <Page title="Experience verification">
      <StatusFilters
        statuses={queueStatuses}
        value={status}
        change={(value) => {
          setStatus(value);
          setPage(1);
        }}
      />
      {query.isPending ? (
        <CardsLoading label="Loading experience submissions" />
      ) : query.isError ? (
        <ErrorState
          message="Couldn’t load experience submissions."
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          {!query.data.length ? (
            <p className="rounded-2xl border bg-card p-5">No experiences in this queue.</p>
          ) : (
            <ul className="space-y-3">
              {query.data.map((item) => (
                <li key={item.id}>
                  <ReviewExperience item={item} />
                </li>
              ))}
            </ul>
          )}
          <Pagination
            page={page}
            count={query.data[0]?.total_count ?? 0}
            pageSize={pageSize}
            change={setPage}
          />
        </>
      )}
    </Page>
  );
}

function ReviewExperience({ item }: { item: AdminExperience }) {
  const client = useQueryClient();
  const review = useMutation({
    mutationFn: async ({ decision, note }: { decision: Decision; note: string }) => {
      const { error } = await requireSupabase().rpc("admin_review_experience", {
        p_id: item.id,
        p_decision: decision,
        ...(note.trim() ? { p_note: note.trim() } : {}),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Experience decision saved.");
      await Promise.all([
        client.invalidateQueries({ queryKey: ["admin"] }),
        client.invalidateQueries({ queryKey: ["experiences"] }),
      ]);
    },
  });
  const tags = Array.isArray(item.tags) ? item.tags.filter(isTag) : [];
  const url = item.source_url && safeWebUrl(item.source_url);
  const cover = item.cover_url && safeWebUrl(item.cover_url);
  return (
    <details className="rounded-2xl border bg-card p-4 shadow-soft sm:p-5">
      <summary className="cursor-pointer font-bold">{item.title}</summary>
      <div className="mt-3 space-y-3">
        <p className="text-sm text-muted-foreground">
          {statusLabels[item.status]} · {item.submitter_username ?? "Submitter not listed"} ·{" "}
          {showTime(item.created_at)}
        </p>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {(
            [
              ["Category", categoryName(item.category)],
              ["Location", `${item.location} · ${item.city}`],
              [
                "Coordinates",
                item.latitude != null && item.longitude != null
                  ? `${item.latitude}, ${item.longitude}`
                  : null,
              ],
              ["Cost", costLabel(item.cost, item.currency)],
              ["Duration", item.duration_minutes ? `${item.duration_minutes} min` : null],
              ["Opening hours", item.opening_hours],
              ["Social interaction", item.social_level ? socialLabels[item.social_level] : null],
              ["Interest tags", tags.map((tag) => tag.name).join(", ")],
              ["Description", item.description],
              ["Safety considerations", item.safety_considerations],
              ["Accessibility information", item.accessibility_information],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="font-semibold">{label}</dt>
              <dd className="whitespace-pre-wrap break-words">{value || "Not provided"}</dd>
            </div>
          ))}
        </dl>
        {cover && (
          <img
            src={cover}
            alt="Submitted cover"
            className="max-h-48 rounded-xl border object-contain"
          />
        )}
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-link">
            Open source website <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
        <DecisionPanel
          choices={decisions}
          requiredNote={(decision) => decision !== "approve"}
          pending={review.isPending}
          error={review.isError ? errorText(review.error, "Couldn’t save the decision.") : null}
          onDecide={(decision, note) => review.mutateAsync({ decision, note })}
          label={`Review ${item.title}`}
        />
      </div>
    </details>
  );
}
