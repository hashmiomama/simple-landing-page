import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const fieldClass = "grid min-w-0 grid-cols-1 gap-1.5 text-sm font-medium";
export const selectClass =
  "min-h-11 w-full min-w-0 rounded-xl border border-input bg-card px-3 text-sm";

export function Page({
  title,
  intro,
  actions,
  children,
}: {
  title: string;
  intro?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-14 pt-8 sm:px-8 sm:pt-12">
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          {intro && <p className="mt-2 max-w-xl text-muted-foreground">{intro}</p>}
        </div>
        {actions}
      </header>
      {children}
    </div>
  );
}

export function CardsLoading({ label }: { label: string }) {
  return (
    <div role="status" className="grid gap-4 sm:grid-cols-2">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-52 rounded-3xl" />
      <Skeleton className="h-52 rounded-3xl" />
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={fieldClass}>
      {label}
      {children}
    </label>
  );
}

export function Chips({
  options,
  selected,
  onChange,
}: {
  options: { slug: string; name: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(({ slug, name }) => {
        const active = selected.includes(slug);
        return (
          <button
            type="button"
            key={slug}
            aria-pressed={active}
            onClick={() =>
              onChange(active ? selected.filter((value) => value !== slug) : [...selected, slug])
            }
            className="min-h-10 rounded-full border border-input px-3 text-sm hover:bg-lavender-soft aria-pressed:border-primary aria-pressed:bg-lavender aria-pressed:text-primary-strong"
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}

export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-4 rounded-2xl border bg-card p-5 sm:p-6">
      <legend className="px-2 font-display text-lg font-bold">{title}</legend>
      {children}
    </fieldset>
  );
}
