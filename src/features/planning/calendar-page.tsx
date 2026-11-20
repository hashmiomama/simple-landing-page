import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ErrorState } from "@/components/layout/page-states";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { CardsLoading, Page } from "@/features/opportunities/ui";
import { useIsMobile } from "@/hooks/use-mobile";

import {
  calendar,
  localDateTime,
  pakistanTime,
  reminders,
  showDateTime,
  type CalendarEvent,
} from "./data";
import { InternalLink } from "./internal-link";
import { ReminderAction, ReminderRow } from "./reminder-actions";

const cultures = {
  saved_deadline: { label: "Saved deadline", tone: "bg-lavender-soft text-primary-strong" },
  application_deadline: { label: "Application deadline", tone: "bg-accent-soft text-success" },
  reminder: { label: "Reminder", tone: "bg-muted text-foreground" },
  interview: { label: "Interview", tone: "bg-primary-strong text-primary-foreground" },
};
const monthFormat = new Intl.DateTimeFormat("en-PK", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const dayFormat = new Intl.DateTimeFormat("en-PK", { dateStyle: "full", timeZone: "UTC" });
const timeFormat = new Intl.DateTimeFormat("en-PK", {
  timeStyle: "short",
  timeZone: "Asia/Karachi",
});
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const eventDay = (at: string) => localDateTime(at).slice(0, 10);
const midnight = (date: Date) => pakistanTime(`${dayKey(date)}T00:00`);

export function CalendarPage() {
  const { user } = useAuth();
  return user ? <CalendarContent userId={user.id} /> : null;
}

function CalendarContent({ userId }: { userId: string }) {
  const today = eventDay(new Date().toISOString());
  const [month, setMonth] = useState(() => new Date(`${today.slice(0, 7)}-01T00:00:00Z`));
  const mobile = useIsMobile();
  const [chosenView, setView] = useState<"month" | "agenda">();
  const view = chosenView ?? (mobile ? "agenda" : "month");
  const next = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));
  const query = useQuery(calendar(userId, midnight(month), midnight(next)));
  const own = useQuery(reminders(userId));
  return (
    <Page
      title="My Calendar"
      intro="Deadlines, reminders and interviews in Pakistan Standard Time."
      actions={<ReminderAction label="Add reminder" />}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label="Previous month"
            onClick={() =>
              setMonth(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() - 1, 1)))
            }
          >
            Previous
          </Button>
          <h2 className="px-1 font-bold" aria-live="polite">
            {monthFormat.format(month)}
          </h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label="Next month"
            onClick={() => setMonth(next)}
          >
            Next
          </Button>
        </div>
        <div role="group" aria-label="Calendar view" className="flex gap-2">
          <Button
            size="sm"
            variant={view === "month" ? "soft" : "outline"}
            aria-pressed={view === "month"}
            onClick={() => setView("month")}
          >
            Month
          </Button>
          <Button
            size="sm"
            variant={view === "agenda" ? "soft" : "outline"}
            aria-pressed={view === "agenda"}
            onClick={() => setView("agenda")}
          >
            Agenda
          </Button>
        </div>
      </div>
      <ul aria-label="Event types" className="mb-4 flex flex-wrap gap-2 text-xs">
        {Object.values(cultures).map(({ label, tone }) => (
          <li key={label} className={`rounded-full px-2 py-1 font-semibold ${tone}`}>
            {label}
          </li>
        ))}
      </ul>
      {query.isPending ? (
        <CardsLoading label="Loading calendar" />
      ) : query.isError ? (
        <ErrorState message="Couldn’t load your calendar." onRetry={() => void query.refetch()} />
      ) : view === "month" ? (
        <>
          <MonthGrid
            month={month}
            days={new Date(next.getTime() - 86_400_000).getUTCDate()}
            events={query.data}
            today={today}
          />
          {!query.data.length && (
            <p className="mt-2 text-sm text-muted-foreground">No events this month.</p>
          )}
        </>
      ) : query.data.length ? (
        <ul className="space-y-2">
          {query.data.map((event) => (
            <li
              key={`${event.event_type}-${event.id}`}
              className={`rounded-xl border bg-card p-3 ${eventDay(event.event_at) === today ? "ring-1 ring-primary" : ""}`}
            >
              <p className="mb-1 text-xs font-semibold text-muted-foreground">
                <time dateTime={event.event_at}>{showDateTime(event.event_at)}</time>
                {eventDay(event.event_at) === today && " · Today"}
              </p>
              <EventLink event={event} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border bg-card p-4 text-muted-foreground">No events this month.</p>
      )}
      <section aria-labelledby="reminders-heading" className="mt-8">
        <h2 id="reminders-heading" className="mb-3 text-xl font-bold">
          My reminders
        </h2>
        {own.isPending ? (
          <CardsLoading label="Loading reminders" />
        ) : own.isError ? (
          <ErrorState message="Couldn’t load your reminders." onRetry={() => void own.refetch()} />
        ) : own.data.length ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {own.data.map((item) => (
              <ReminderRow key={item.id} item={item} userId={userId} />
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border bg-card p-4 text-muted-foreground">No reminders yet.</p>
        )}
      </section>
    </Page>
  );
}

function MonthGrid({
  month,
  days,
  events,
  today,
}: {
  month: Date;
  days: number;
  events: CalendarEvent[];
  today: string;
}) {
  const cells = Array.from(
    { length: Math.ceil((days + month.getUTCDay()) / 7) * 7 },
    (_, index) =>
      new Date(
        Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), index - month.getUTCDay() + 1),
      ),
  );
  return (
    <div
      className="overflow-x-auto rounded-xl border"
      tabIndex={0}
      role="region"
      aria-label="Monthly calendar grid"
    >
      <table className="w-full min-w-160 table-fixed border-collapse bg-card text-sm">
        <thead>
          <tr>
            {weekdays.map((day) => (
              <th key={day} scope="col" className="border-b p-2 text-muted-foreground">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <tr key={row}>
              {cells.slice(row * 7, row * 7 + 7).map((date) => {
                const key = dayKey(date);
                const isToday = key === today;
                return (
                  <td
                    key={key}
                    className={`h-24 border p-2 align-top ${isToday ? "bg-lavender-soft" : ""}`}
                  >
                    {date.getUTCMonth() === month.getUTCMonth() && (
                      <>
                        <time
                          dateTime={key}
                          aria-label={dayFormat.format(date)}
                          aria-current={isToday ? "date" : undefined}
                          className={isToday ? "font-bold text-primary-strong" : "font-medium"}
                        >
                          {date.getUTCDate()}
                          {isToday && <span className="ml-1 text-xs">Today</span>}
                        </time>
                        <ul className="mt-1 space-y-1">
                          {events
                            .filter((event) => eventDay(event.event_at) === key)
                            .map((event) => (
                              <li key={`${event.event_type}-${event.id}`}>
                                <EventLink event={event} />
                              </li>
                            ))}
                        </ul>
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventLink({ event }: { event: CalendarEvent }) {
  const type = cultures[event.event_type as keyof typeof cultures] ?? {
    label: "Event",
    tone: "bg-muted text-foreground",
  };
  return (
    <InternalLink
      href={event.link_path}
      className={`block break-words rounded-lg px-2 py-1 text-xs hover:underline ${type.tone}`}
    >
      <span className="block font-semibold">
        {type.label}
        {event.done ? " · Done" : ""}
      </span>
      {event.title}
      {(event.event_type === "interview" || event.event_type === "reminder") &&
        ` · ${timeFormat.format(new Date(event.event_at))}`}
    </InternalLink>
  );
}
