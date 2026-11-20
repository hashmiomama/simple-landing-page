import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/features/auth/auth-provider";

import { HISTORY_PAGE_SIZE, myPoints, pointHistory, pointsLeaderboard } from "./data";

const panel = "rounded-3xl border bg-card p-5 shadow-soft sm:p-6";
const levelMinimums: Record<string, number> = {
  Newcomer: 0,
  Explorer: 20,
  Contributor: 50,
  Trailblazer: 100,
};
const reasonLabels: Record<string, string> = {
  opportunity_approved: "Opportunity approved",
  experience_approved: "Experience approved",
  correction: "Points correction",
  revoked: "Points removed",
};
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

function QueryError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="space-y-2" role="alert">
      <p>{message}</p>
      <Button variant="outline" size="sm" onClick={retry}>
        Try again
      </Button>
    </div>
  );
}

export function PointsPage() {
  const { user, profile } = useAuth();
  return user ? (
    <PointsContent key={user.id} userId={user.id} username={profile?.username} />
  ) : null;
}

function PointsContent({ userId, username }: { userId: string; username: string | undefined }) {
  const [page, setPage] = useState(0);
  const summary = useQuery(myPoints(userId));
  const history = useQuery(pointHistory(userId, page));
  const leaderboard = useQuery(pointsLeaderboard(userId));
  const points = summary.data;
  const levelMinimum = points ? (levelMinimums[points.level_name] ?? 0) : 0;
  const earned = points ? Math.max(0, points.total_points - levelMinimum) : 0;
  const historyRows = history.data ?? [];
  const totalPages = Math.ceil((historyRows[0]?.total_count ?? 0) / HISTORY_PAGE_SIZE);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-5 py-9 sm:px-8 sm:py-12">
      <h1 className="text-3xl font-bold sm:text-4xl">My points</h1>
      <div className="grid gap-5 md:grid-cols-2">
        <section className={panel} aria-labelledby="points-summary">
          <h2 id="points-summary" className="mb-3 text-xl font-bold">
            Your contribution points
          </h2>
          {summary.isPending ? (
            <p role="status">Loading your points…</p>
          ) : summary.isError ? (
            <QueryError
              message="We couldn’t load your points."
              retry={() => void summary.refetch()}
            />
          ) : (
            points && (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-3xl font-bold tabular-nums">{points.total_points} points</p>
                  <Badge variant="secondary">{points.level_name}</Badge>
                </div>
                {points.next_level_name !== null && points.points_to_next_level !== null ? (
                  <div className="mt-4 space-y-2">
                    <p id="points-progress-label" className="text-sm">
                      {points.points_to_next_level} more points to {points.next_level_name}
                    </p>
                    <Progress
                      aria-labelledby="points-progress-label"
                      value={(100 * earned) / Math.max(1, earned + points.points_to_next_level)}
                    />
                  </div>
                ) : (
                  <p className="mt-4">You have reached the top level</p>
                )}
                <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t pt-4 text-sm">
                  <div>
                    <dt>Approved opportunities</dt>
                    <dd className="font-semibold tabular-nums">{points.approved_opportunities}</dd>
                  </div>
                  <div>
                    <dt>Approved experiences</dt>
                    <dd className="font-semibold tabular-nums">{points.approved_experiences}</dd>
                  </div>
                </dl>
              </>
            )
          )}
        </section>
        <section className={panel} aria-labelledby="points-explained">
          <h2 id="points-explained" className="mb-3 text-xl font-bold">
            How points work
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              You earn points once an admin approves your opportunity or experience. Submitting
              alone earns zero points.
            </li>
            <li>Each listing can earn points once.</li>
            <li>If a listing is later rejected, its points are removed.</li>
          </ul>
        </section>
      </div>

      <section className={panel} aria-labelledby="points-history">
        <h2 id="points-history" className="mb-3 text-xl font-bold">
          Points history
        </h2>
        {history.isPending ? (
          <p role="status">Loading points history…</p>
        ) : history.isError ? (
          <QueryError
            message="We couldn’t load your points history."
            retry={() => void history.refetch()}
          />
        ) : historyRows.length ? (
          <ul className="divide-y" aria-busy={history.isPlaceholderData}>
            {historyRows.map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{reasonLabels[entry.reason] ?? "Points adjustment"}</p>
                  <p className="break-words text-sm">
                    {entry.source_title ?? "Listing no longer available"}
                  </p>
                  <time className="text-sm text-muted-foreground" dateTime={entry.created_at}>
                    {dateFormat.format(new Date(entry.created_at))}
                  </time>
                </div>
                <span className="shrink-0 font-semibold tabular-nums">
                  {entry.points > 0 ? "+" : ""}
                  {entry.points}
                </span>
              </li>
            ))}
          </ul>
        ) : page === 0 ? (
          <p>
            <Link className="text-link" to="/submit-opportunity">
              Submit an opportunity
            </Link>{" "}
            to start earning points
          </p>
        ) : (
          <p>There are no entries on this page.</p>
        )}
        {(page > 0 || totalPages > 1) && (
          <nav aria-label="Points history pages" className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span aria-live="polite" className="text-sm">
              Page {page + 1}
              {totalPages > 0 ? ` of ${totalPages}` : ""}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={history.isPlaceholderData || page + 1 >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </nav>
        )}
      </section>

      <section className={panel} aria-labelledby="points-leaderboard">
        <h2 id="points-leaderboard" className="text-xl font-bold">
          Top contributors
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Contributors are identified by their public username.
        </p>
        {leaderboard.isPending ? (
          <p role="status">Loading top contributors…</p>
        ) : leaderboard.isError ? (
          <QueryError
            message="We couldn’t load top contributors."
            retry={() => void leaderboard.refetch()}
          />
        ) : leaderboard.data.length ? (
          <ol className="space-y-1" role="list">
            {leaderboard.data.map((entry, index) => {
              const isYou = entry.username === username;
              return (
                <li
                  key={entry.username}
                  className={`flex items-center gap-2 rounded-xl p-2 sm:gap-3 ${isYou ? "bg-lavender-soft" : ""}`}
                >
                  <span className="w-7 shrink-0 text-sm tabular-nums">
                    <span className="sr-only">Rank </span>
                    {index + 1}
                  </span>
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage src={entry.avatar_url ?? undefined} alt="" />
                    <AvatarFallback aria-hidden>
                      {entry.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-medium">
                      {entry.username}
                      {isYou && <span className="text-sm"> (you)</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">{entry.level_name}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {entry.total_points} points
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <p>No one has earned points yet.</p>
        )}
      </section>
    </div>
  );
}
