import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: pageMeta("My calendar", "Your deadlines, reminders and plans in one view.", { noindex: true }) }),
  component: MyCalendarPage,
});

function MyCalendarPage() {
  return (
    <PlaceholderPage
      icon={CalendarDays}
      title="My calendar"
      description="Your deadlines, reminders and plans in one view."
      phase="Phase 5"
    />
  );
}
