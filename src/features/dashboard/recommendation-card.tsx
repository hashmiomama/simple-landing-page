import { Bookmark, CalendarDays, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ApplyLink } from "@/features/planning/apply";

import { formatDeadline, type Recommendation } from "./data";

export function RecommendationCard({
  opportunity,
  category,
  saved,
  disabled,
  onToggle,
}: {
  opportunity: Recommendation;
  category: string;
  saved: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const location =
    opportunity.format === "online"
      ? "Online"
      : opportunity.format === "hybrid"
        ? `${opportunity.location} · Online`
        : opportunity.location;
  const factors = [
    ["Interests", opportunity.interest_score, 35],
    ["Category", opportunity.category_score, 20],
    ["Location or online", opportunity.location_score, 15],
    ["Social comfort", opportunity.social_comfort_score, 15],
    ["Budget", opportunity.budget_score, 10],
    ["Recency", opportunity.recency_score, 5],
  ] as const;

  return (
    <article className="flex h-full min-w-0 flex-col rounded-3xl border bg-card p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="rounded-full bg-lavender-soft px-3 py-1 text-sm font-medium text-primary-strong">
          {category}
        </span>
        <span className="rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-success">
          {opportunity.total_score}% match
        </span>
      </div>
      <h3 className="mt-4 break-words text-xl font-bold">{opportunity.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{opportunity.organisation_name}</p>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex gap-2">
          <dt className="sr-only">Location</dt>
          <MapPin className="size-4 shrink-0 text-primary-strong" aria-hidden />
          <dd>{location}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="sr-only">Deadline</dt>
          <CalendarDays className="size-4 shrink-0 text-primary-strong" aria-hidden />
          <dd>
            {opportunity.deadline ? (
              <time dateTime={opportunity.deadline}>
                Due {formatDeadline(opportunity.deadline)}
              </time>
            ) : (
              "No deadline listed"
            )}
          </dd>
        </div>
        <div>
          <dt className="inline font-medium">Cost or funding </dt>
          <dd className="inline text-muted-foreground">{opportunity.cost_or_funding}</dd>
        </div>
      </dl>
      <details className="mt-4 rounded-xl bg-background px-3 py-2.5 text-sm">
        <summary className="cursor-pointer rounded-sm font-semibold text-primary-strong">
          Why this match
        </summary>
        <dl className="mt-3 space-y-2">
          {factors.map(([label, score, max]) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-2 text-muted-foreground"
            >
              <dt>{label}</dt>
              <dd className="shrink-0 font-medium tabular-nums text-foreground">
                {score} / {max}
              </dd>
            </div>
          ))}
        </dl>
      </details>
      <div className="mt-auto pt-4">
        <Button
          type="button"
          variant={saved ? "soft" : "outline"}
          disabled={disabled}
          aria-pressed={saved}
          aria-label={`Save ${opportunity.title}`}
          onClick={onToggle}
        >
          <Bookmark className={saved ? "fill-current" : undefined} aria-hidden />
          {saved ? "Saved" : "Save"}
        </Button>
        <div className="mt-2">
          <ApplyLink id={opportunity.id} source={opportunity.source_url} />
        </div>
      </div>
    </article>
  );
}
