import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { calendar, showDateTime } from "@/features/planning/data";
import { myActivities } from "./data";

export function DashboardActivities({ userId }: { userId: string }) {
  const [from] = useState(() => new Date().toISOString());
  const upcoming = useQuery(calendar(userId, from, "9999-12-31T00:00:00Z"));
  const pending = useQuery(myActivities(userId, "pending"));
  if (!upcoming.isSuccess || !pending.isSuccess) return null;
  const next = upcoming.data.find((event) => event.event_type === "activity");
  return (
    <section
      aria-labelledby="your-activities"
      className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border bg-card px-5 py-4 shadow-soft"
    >
      <div className="min-w-0 space-y-1">
        <h2 id="your-activities" className="font-semibold">
          Your activities
        </h2>
        {next ? (
          <p className="text-sm [overflow-wrap:anywhere]">
            <Link className="text-link" to="/community/$id" params={{ id: next.id }}>
              {next.title}
            </Link>{" "}
            · <time dateTime={next.event_at}>{showDateTime(next.event_at)}</time>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No upcoming confirmed activity.</p>
        )}
        <p className="text-sm text-muted-foreground">
          {pending.data.length} {pending.data.length === 1 ? "request" : "requests"} pending
        </p>
      </div>
      <Button asChild size="sm" variant="outline">
        <Link to="/community/mine">My activities</Link>
      </Button>
    </section>
  );
}
