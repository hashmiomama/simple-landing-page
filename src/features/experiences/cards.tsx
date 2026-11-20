import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { categoryName, costLabel, socialLabels, type Experience } from "./data";

export function ExperienceCard({
  item,
  match,
  marker,
  children,
}: {
  item: Experience;
  match?: number;
  marker?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-3xl border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap gap-2 text-sm font-medium">
        <span className="rounded-full bg-lavender-soft px-3 py-1 text-primary-strong">
          {categoryName(item.category)}
        </span>
        {item.social_level && (
          <span className="rounded-full bg-accent-soft px-3 py-1 text-success">
            {socialLabels[item.social_level]}
          </span>
        )}
        {marker}
      </div>
      <h3 className="break-words text-lg font-bold">
        <Link className="hover:underline" to="/experiences/$id" params={{ id: item.id }}>
          {item.title}
        </Link>
      </h3>
      <p className="text-sm text-muted-foreground">
        {item.city} · {costLabel(item.cost, item.currency)}
        {item.duration_minutes ? ` · ${item.duration_minutes} min` : ""}
      </p>
      {match !== undefined && (
        <p className="text-sm font-semibold text-primary-strong">{match}% match</p>
      )}
      {children}
    </article>
  );
}
