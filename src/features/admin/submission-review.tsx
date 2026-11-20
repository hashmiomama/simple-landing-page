import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/layout/page-states";
import {
  categoryCatalog,
  displayDate,
  errorText,
  safeWebUrl,
  statusLabels,
} from "@/features/opportunities/data";
import { CardsLoading, Page } from "@/features/opportunities/ui";

import {
  adminSubmission,
  decideSubmission,
  decisions,
  generateReport,
  readable,
  reportSchema,
  showTime,
  type Decision,
  type VerificationReport,
} from "./data";
import { DecisionPanel } from "./ui";

export function SubmissionReview({ id }: { id: string }) {
  const client = useQueryClient();
  const validId = z.string().uuid().safeParse(id).success;
  const key = ["admin", "submission", id];
  const query = useQuery({ queryKey: key, queryFn: () => adminSubmission(id), enabled: validId });
  const categories = useQuery(categoryCatalog);
  const report = useMutation({
    mutationFn: () => generateReport(id),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
  const review = useMutation({
    mutationFn: ({ decision, note }: { decision: Decision; note: string }) =>
      decideSubmission(id, decision, note),
    onSuccess: async () => {
      const affected = [
        "admin",
        "opportunity-search",
        "opportunity-detail",
        "opportunity-status",
        "own-submissions",
        "own-submission",
        "review-notes",
        "recommendations",
        "dashboard-summary",
        "saved-listings",
      ];
      await client.invalidateQueries({
        predicate: (entry) => affected.some((prefix) => entry.queryKey[0] === prefix),
      });
    },
  });
  const item = query.data;
  const latest = item?.reviews
    .map((entry) => reportSchema.safeParse(entry.report))
    .find((entry) => entry.success);
  const shownReport = report.data ?? (latest?.success ? latest.data : undefined);
  const listing = item?.listing;
  const source = listing?.source_url && safeWebUrl(listing.source_url);
  const cover = listing?.cover_url && safeWebUrl(listing.cover_url);
  return (
    <Page
      title={listing?.title || "Submission review"}
      actions={
        <Button variant="outline" asChild>
          <Link to="/admin/opportunities">Back to queue</Link>
        </Button>
      }
    >
      {validId && query.isPending ? (
        <CardsLoading label="Loading submission" />
      ) : query.isError ? (
        <ErrorState message="Couldn’t load this submission." onRetry={() => void query.refetch()} />
      ) : !item || !listing ? (
        <p className="rounded-2xl border bg-card p-5">This submission is unavailable.</p>
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-2">
          <section
            aria-label="Listing and history"
            className="min-w-0 space-y-4 rounded-2xl border bg-card p-4 sm:p-5"
          >
            <h2 className="text-xl font-bold">Listing details</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {[
                [
                  "Category",
                  categories.data?.find((c) => c.slug === listing.category_slug)?.name ??
                    listing.category_slug,
                ],
                ["Organisation", listing.organisation_name],
                ["Submitted by", item.submitter ?? "Not listed"],
                ["Status", statusLabels[listing.status]],
                ["Last verified", displayDate(listing.last_verified_at)],
                ["Deadline", displayDate(listing.deadline)],
                ["Event start", displayDate(listing.starts_at)],
                ["Event end", displayDate(listing.ends_at)],
                [
                  "Location",
                  [listing.location, listing.city, listing.country].filter(Boolean).join(" · "),
                ],
                ["Mode", listing.format],
                ["Cost or funding", listing.cost_or_funding],
                ["Interest tags", item.tags.map((tag) => tag.name).join(", ")],
                ["Created", showTime(listing.created_at)],
                ["Updated", showTime(listing.updated_at)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="font-semibold">{label}</dt>
                  <dd className="break-words text-muted-foreground">{value || "Not provided"}</dd>
                </div>
              ))}
            </dl>
            <div>
              <h3 className="font-semibold">Official source</h3>
              {source ? (
                <a
                  className="break-all text-link"
                  href={source}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {listing.source_url}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <p className="break-all text-sm text-muted-foreground">
                  {listing.source_url || "Not provided"}
                </p>
              )}
            </div>
            {cover && (
              <img
                src={cover}
                alt="Submitted cover"
                className="max-h-48 rounded-xl border object-contain"
              />
            )}
            <div>
              <h3 className="font-semibold">Description</h3>
              <p className="whitespace-pre-wrap break-words">
                {listing.description || "Not provided"}
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Eligibility</h3>
              <p className="whitespace-pre-wrap break-words">
                {listing.eligibility || "Not provided"}
              </p>
            </div>
            <div className="border-t pt-3">
              <h3 className="font-bold">Previous reviews</h3>
              {!item.reviews.length ? (
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {item.reviews.map((entry) => (
                    <li key={entry.id} className="rounded-xl bg-muted px-3 py-2 text-sm">
                      <p className="capitalize">
                        <strong>
                          {entry.decision ? readable(entry.decision) : "Verification report"}
                        </strong>{" "}
                        · {entry.reviewer_username ?? "Unknown reviewer"} ·{" "}
                        {showTime(entry.created_at)}
                      </p>
                      {entry.note && (
                        <p className="whitespace-pre-wrap break-words">{entry.note}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
          <div className="min-w-0 space-y-4">
            <section
              aria-labelledby="report-heading"
              className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5"
            >
              <h2 id="report-heading" className="text-xl font-bold">
                Verification report
              </h2>
              <p className="rounded-xl bg-lavender-soft p-3 text-sm">
                This report assists the reviewer. The final decision belongs to a human moderator.
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={report.isPending}
                onClick={() => report.mutate()}
              >
                {report.isPending
                  ? "Generating…"
                  : shownReport
                    ? "Regenerate report"
                    : "Generate report"}
              </Button>
              {report.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {errorText(report.error, "Couldn’t generate the report.")}
                </p>
              )}
              {shownReport ? (
                <ReportContent data={shownReport} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No report has been generated for this submission.
                </p>
              )}
            </section>
            {listing.status !== "archived" && (
              <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5">
                <h2 className="text-xl font-bold">Decision</h2>
                <DecisionPanel
                  choices={decisions}
                  requiredNote={(decision) => decision !== "approve"}
                  pending={review.isPending}
                  error={
                    review.isError ? errorText(review.error, "Couldn’t save the decision.") : null
                  }
                  onDecide={(decision, note) => review.mutateAsync({ decision, note })}
                />
                {review.isSuccess && (
                  <p role="status" className="text-sm font-semibold text-success">
                    Decision saved. Status: {statusLabels[review.data.status]}.
                  </p>
                )}
              </section>
            )}
          </div>
        </div>
      )}
    </Page>
  );
}

const checkStyles = {
  passed: "bg-accent-soft text-success",
  failed: "bg-destructive-soft text-destructive",
  "needs manual verification": "bg-lavender-soft text-primary-strong",
};
const checkLabels: Record<string, string> = {
  source_url_https: "Source URL uses HTTPS",
  source_url_well_formed: "Source URL is well formed",
  end_after_start: "End date follows start date",
};

function ReportContent({ data }: { data: VerificationReport }) {
  return (
    <div className="space-y-4 text-sm">
      <p className="text-muted-foreground">Generated {showTime(data.generated_at)}</p>
      <ul aria-label="Verification checks" className="divide-y rounded-xl border px-3">
        {Object.entries(data.checks).map(([name, state]) => (
          <li key={name} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="first-letter:uppercase">{checkLabels[name] ?? readable(name)}</span>
            <span
              className={`rounded-full px-2 py-0.5 font-semibold capitalize ${checkStyles[state]}`}
            >
              {state}
            </span>
          </li>
        ))}
      </ul>
      <div>
        <h3 className="font-bold">Missing required fields</h3>
        <p>{data.missing_required_fields.map(readable).join(", ") || "None flagged"}</p>
      </div>
      <div>
        <h3 className="font-bold">Possible duplicates</h3>
        {data.duplicate_indicators.length ? (
          <ul className="list-inside list-disc">
            {data.duplicate_indicators.map((item) => (
              <li key={item.id}>
                <Link className="text-link" to="/admin/opportunities/$id" params={{ id: item.id }}>
                  {item.title}
                </Link>
                {" · "}
                {[
                  item.matching_title && "matching title",
                  item.matching_source_url && "matching source URL",
                ]
                  .filter(Boolean)
                  .join(", ")}
              </li>
            ))}
          </ul>
        ) : (
          <p>None flagged</p>
        )}
      </div>
      <div>
        <h3 className="font-bold">Scam indicators</h3>
        <ul className="list-inside list-disc">
          <li>
            Payment wording: {data.scam_indicators.payment_wording ? "Flagged" : "Not flagged"}
          </li>
          <li>
            Urgency wording: {data.scam_indicators.urgency_wording ? "Flagged" : "Not flagged"}
          </li>
          <li>
            Free email domain:{" "}
            {data.scam_indicators.free_email_domain === null
              ? "Needs manual verification"
              : data.scam_indicators.free_email_domain
                ? "Flagged"
                : "Not flagged"}
            {data.scam_indicators.organisation_email_domain &&
              ` (${data.scam_indicators.organisation_email_domain})`}
          </li>
        </ul>
      </div>
      <details>
        <summary className="cursor-pointer font-semibold">Extracted fields</summary>
        <pre className="mt-2 whitespace-pre-wrap break-all rounded-lg bg-muted p-3 text-xs">
          {JSON.stringify(data.extracted_fields, null, 2)}
        </pre>
      </details>
      <div className="rounded-xl border bg-background p-3">
        <h3 className="font-bold">Recommended action: {decisions[data.recommended_action]}</h3>
        <p>{data.reason}</p>
      </div>
    </div>
  );
}
