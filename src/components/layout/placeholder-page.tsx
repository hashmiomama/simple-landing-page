import { Sparkles, type LucideIcon } from "lucide-react";

import { EmptyState } from "./page-states";

/** Stand-in for screens that are built in a later phase. */
export function PlaceholderPage({
  title,
  description,
  phase,
  icon = Sparkles,
}: {
  title: string;
  description: string;
  phase: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <p className="mb-2 text-sm font-medium text-primary-strong">{phase}</p>
      <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{description}</p>
      <div className="mt-10">
        <EmptyState
          icon={icon}
          title="Coming soon"
          description="This space is on its way. We're building it in a later phase."
        />
      </div>
    </div>
  );
}
