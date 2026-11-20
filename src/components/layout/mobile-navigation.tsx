import { Link } from "@tanstack/react-router";
import { Bookmark, CalendarDays, Compass, House, Mountain } from "lucide-react";

import { useAuth } from "@/features/auth/auth-provider";

const tabs = [
  { to: "/dashboard", label: "Home", icon: House },
  { to: "/opportunities", label: "Opportunities", icon: Compass },
  { to: "/experiences", label: "Experiences", icon: Mountain },
  { to: "/saved", label: "Saved", icon: Bookmark },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
] as const;

export function MobileNavigation() {
  const { status } = useAuth();
  if (status !== "signed_in") return null;

  return (
    <div className="h-[calc(3.5rem+env(safe-area-inset-bottom))] shrink-0 sm:hidden">
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background pb-[env(safe-area-inset-bottom)]"
      >
        {tabs.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            aria-label={label === "Calendar" ? "My calendar" : undefined}
            className="flex h-14 min-w-0 flex-col items-center justify-center gap-1 px-0.5 text-[0.625rem] font-medium text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            activeProps={{ className: "bg-lavender-soft text-primary-strong" }}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
