import { Link } from "@tanstack/react-router";
import { ClipboardCheck, FileText, LayoutDashboard, Building2 } from "lucide-react";
import type { ReactNode } from "react";

export const modules = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/opportunities", label: "Opportunity verification", icon: ClipboardCheck },
  { to: "/admin/organisations", label: "Organisation verification", icon: Building2 },
  { to: "/admin/audit-log", label: "Audit log", icon: FileText },
] as const;
const upcoming = [
  "Identity verification status",
  "Activity moderation",
  "Reports and complaints",
  "User management",
  "Platform analytics",
];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-3 px-4 py-5 md:grid-cols-[15rem_minmax(0,1fr)] sm:px-6">
      <aside className="self-start rounded-3xl border bg-sidebar p-3 md:p-4">
        <h2 className="mb-2 px-2 text-sm font-bold text-primary-strong">Administration</h2>
        <nav aria-label="Admin modules" className="grid grid-cols-2 gap-1 md:grid-cols-1">
          {modules.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/admin" }}
              activeProps={{ className: "bg-lavender text-primary-strong" }}
              className="flex min-h-11 items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium hover:bg-lavender-soft"
            >
              <Icon className="size-4 shrink-0" aria-hidden /> {label}
            </Link>
          ))}
        </nav>
        <details className="mt-3 border-t px-2 pt-3 text-sm text-muted-foreground" open>
          <summary className="cursor-pointer font-semibold">Coming soon</summary>
          <ul className="mt-2 space-y-2">
            {upcoming.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </details>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
