import type { ReactNode } from "react";

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
    <div className="flex flex-wrap gap-2.5">
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
            className="min-h-11 rounded-full border border-input bg-card px-4 text-sm font-medium hover:bg-lavender-soft aria-pressed:border-primary aria-pressed:bg-lavender aria-pressed:text-primary-strong"
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}

export function Choice({
  name,
  checked,
  onChange,
  children,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-input bg-card px-4 py-2 has-[:checked]:border-primary has-[:checked]:bg-lavender-soft">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="size-4 accent-primary-strong"
      />
      {children}
    </label>
  );
}
