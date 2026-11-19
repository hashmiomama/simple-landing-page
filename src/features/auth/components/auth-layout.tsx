import type { ReactNode } from "react";

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex flex-1 items-start justify-center overflow-hidden px-5 py-10 sm:items-center sm:py-16">
      <div className="pointer-events-none absolute inset-0 bg-wash" aria-hidden />
      <div className="animate-rise relative w-full max-w-md">
        <div className="rounded-3xl border bg-card p-7 shadow-soft sm:p-10">
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          {description && <p className="mt-2 text-muted-foreground">{description}</p>}
          <div className="mt-8">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
      </div>
    </div>
  );
}
