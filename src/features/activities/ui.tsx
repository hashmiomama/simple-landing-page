import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { label, statusLabels, type Activity } from "./data";

export function Choices({
  values,
  value,
  change,
  name,
}: {
  values: readonly { value: string; label: string }[];
  value: string;
  change: (value: string) => void;
  name: string;
}) {
  return (
    <div role="group" aria-label={name} className="mb-4 flex flex-wrap gap-2">
      {values.map((option) => (
        <Button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          variant={value === option.value ? "soft" : "outline"}
          onClick={() => change(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 space-y-3 rounded-3xl border bg-card p-4 shadow-soft sm:p-6">
      <h2 className="text-xl font-bold [overflow-wrap:anywhere]">{title}</h2>
      {children}
    </section>
  );
}

export function ActivityFacts({ item, category }: { item: Activity; category?: string }) {
  const spots =
    item.max_participants === null
      ? null
      : Math.max(0, item.max_participants - item.participant_count);
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{statusLabels[item.status]}</Badge>
        <Badge variant="outline" className="capitalize">
          {label(item.social_level)}
        </Badge>
        {item.participation === "women_only" && <Badge variant="outline">Women only</Badge>}
      </div>
      <p className="text-sm [overflow-wrap:anywhere]">
        {category ?? item.interest_slug.replaceAll("-", " ")} · {item.city ?? "City not listed"} ·{" "}
        {item.estimated_budget === 0
          ? "Free"
          : `PKR ${item.estimated_budget.toLocaleString("en-PK")} per person`}
      </p>
      <p className="text-sm text-muted-foreground">
        {item.experience_level === "any"
          ? "Any experience level"
          : `${label(item.experience_level)} level`}{" "}
        ·{" "}
        {spots === null ? "Capacity not listed" : `${spots} ${spots === 1 ? "spot" : "spots"} left`}{" "}
        · By <span className="[overflow-wrap:anywhere]">{item.coordinator_username}</span>
      </p>
    </>
  );
}

export function ActivityCards({
  items,
  categories = [],
}: {
  items: Activity[];
  categories?: { slug: string; name: string }[];
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.id} className="space-y-3 rounded-3xl border bg-card p-5 shadow-soft">
          <h2 className="text-lg font-bold [overflow-wrap:anywhere]">
            <Link className="text-link" to="/community/$id" params={{ id: item.id }}>
              {item.title}
            </Link>
          </h2>
          <ActivityFacts
            item={item}
            category={
              categories.find((c) => c.slug === item.interest_slug)?.name ??
              item.interest_slug.replaceAll("-", " ")
            }
          />
        </li>
      ))}
    </ul>
  );
}
