import { createFileRoute } from "@tanstack/react-router";
import { CalendarPage } from "@/features/planning/calendar-page";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: pageMeta("My Calendar", "Your account activity and plans.", { noindex: true }),
  }),
  component: CalendarPage,
});
