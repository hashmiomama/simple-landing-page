import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bookmark, CalendarDays, Compass, Search } from "lucide-react";
import { toast } from "sonner";

import { EmptyState, ErrorState } from "@/components/layout/page-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { DashboardExperiences } from "@/features/experiences/dashboard-experiences";
import { opportunityCategories } from "@/features/onboarding/data";
import { ProfileCompletionCard } from "@/features/profile/profile-completion-card";

import {
  dashboardSummary,
  formatDeadline,
  recommendations,
  savedOpportunities,
  setOpportunitySaved,
} from "./data";
import { RecommendationCard } from "./recommendation-card";

export function Dashboard() {
  const { user, profile, isProfileLoading, profileError, refresh } = useAuth();
  if (!user) return null;
  return (
    <DashboardContent
      key={user.id}
      userId={user.id}
      username={profile?.username}
      profileLoading={isProfileLoading}
      profileError={!!profileError}
      refreshProfile={refresh}
    />
  );
}

function DashboardContent({
  userId,
  username,
  profileLoading,
  profileError,
  refreshProfile,
}: {
  userId: string;
  username: string | undefined;
  profileLoading: boolean;
  profileError: boolean;
  refreshProfile: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const summary = useQuery(dashboardSummary(userId));
  const recommended = useQuery(recommendations(userId));
  const bookmarks = useQuery(savedOpportunities(userId));
  const categories = useQuery(opportunityCategories);
  const savedKey = savedOpportunities(userId).queryKey;
  const toggleSaved = useMutation({
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) =>
      setOpportunitySaved(userId, id, saved),
    onMutate: async ({ id, saved }) => {
      await queryClient.cancelQueries({ queryKey: savedKey });
      const previous = queryClient.getQueryData(savedKey);
      queryClient.setQueryData(savedKey, (current) =>
        saved
          ? [...new Set([...(current ?? []), id])]
          : (current ?? []).filter((value) => value !== id),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(savedKey, context.previous);
      toast.error("We couldn’t update your saved opportunities. Try again.");
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: savedKey }),
        queryClient.invalidateQueries({ queryKey: dashboardSummary(userId).queryKey }),
      ]),
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-5 py-8 sm:px-8 sm:py-12">
      <section
        aria-label="Welcome"
        className="rounded-4xl border bg-card bg-wash p-6 shadow-soft sm:p-10"
      >
        {profileLoading ? (
          <div role="status">
            <span className="sr-only">Loading your profile</span>
            <Skeleton className="h-10 w-56 max-w-full" />
          </div>
        ) : (
          <h1 className="break-words text-3xl font-bold sm:text-4xl">
            {username ? `Welcome, ${username}` : "Welcome to your home"}
          </h1>
        )}
        {profileError && (
          <p className="mt-2 text-sm text-muted-foreground">
            Your username couldn’t load.{" "}
            <button type="button" className="text-link" onClick={() => void refreshProfile()}>
              Try again
            </button>
          </p>
        )}
        <form
          role="search"
          className="mt-6 flex max-w-xl gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void navigate({ to: "/opportunities" });
          }}
        >
          <label htmlFor="dashboard-search" className="sr-only">
            Search opportunities
          </label>
          <Input
            id="dashboard-search"
            type="search"
            placeholder="Search opportunities"
            className="min-w-0 bg-card"
          />
          <Button type="submit" className="bg-primary-strong" aria-label="Browse opportunities">
            <Search aria-hidden />
            <span className="hidden sm:inline">Browse</span>
          </Button>
        </form>
      </section>

      <ProfileCompletionCard userId={userId} />

      {summary.isPending ? (
        <div role="status" className="space-y-5">
          <span className="sr-only">Loading saved opportunities and deadlines</span>
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-28 rounded-3xl" />
            <Skeleton className="h-28 rounded-3xl" />
          </div>
          <Skeleton className="h-32 rounded-3xl" />
        </div>
      ) : summary.isError ? (
        <ErrorState
          message="We couldn’t load your saved opportunities and deadlines."
          onRetry={() => void summary.refetch()}
        />
      ) : (
        <>
          <section aria-label="Your activity at a glance" className="grid gap-4 sm:grid-cols-2">
            <StatCard
              title="Saved opportunities"
              value={summary.data.savedCount}
              icon={Bookmark}
              tone="bg-lavender-soft text-primary-strong"
            />
            <StatCard
              title="Deadlines in the next 14 days"
              value={summary.data.dueSoon}
              icon={CalendarDays}
              tone="bg-accent-soft text-success"
            />
          </section>
          <section aria-labelledby="upcoming-heading">
            <h2 id="upcoming-heading" className="mb-4 text-2xl font-bold">
              Upcoming deadlines
            </h2>
            {summary.data.deadlines.length ? (
              <ul className="divide-y rounded-3xl border bg-card px-5 shadow-soft">
                {summary.data.deadlines.map(({ opportunity_id, title, deadline }) => (
                  <li
                    key={opportunity_id}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-4"
                  >
                    <span className="font-medium">{title}</span>
                    <time dateTime={deadline} className="text-sm text-muted-foreground">
                      {formatDeadline(deadline)}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={CalendarDays}
                title="No upcoming saved deadlines"
                description="Save an opportunity with a deadline to see it here."
              />
            )}
          </section>
        </>
      )}

      <section aria-labelledby="recommendations-heading">
        <h2 id="recommendations-heading" className="mb-4 text-2xl font-bold">
          Recommended for you
        </h2>
        {recommended.isPending ? (
          <div role="status" className="grid gap-4 sm:grid-cols-2">
            <span className="sr-only">Loading recommendations</span>
            <Skeleton className="h-64 rounded-3xl" />
            <Skeleton className="h-64 rounded-3xl" />
          </div>
        ) : recommended.isError ? (
          <ErrorState
            message="We couldn’t load your recommendations."
            onRetry={() => void recommended.refetch()}
          />
        ) : recommended.data.length ? (
          <>
            {bookmarks.isError && (
              <p role="alert" className="mb-4 text-sm text-destructive">
                Saved status couldn’t load.{" "}
                <button
                  type="button"
                  className="text-link"
                  onClick={() => void bookmarks.refetch()}
                >
                  Try again
                </button>
              </p>
            )}
            <ul className="grid gap-4 sm:grid-cols-2">
              {recommended.data.map((opportunity) => {
                const saved = bookmarks.data?.includes(opportunity.id) ?? false;
                const category =
                  categories.data?.find(({ slug }) => slug === opportunity.category_slug)?.name ??
                  opportunity.category_slug.replaceAll("-", " ");
                return (
                  <li key={opportunity.id}>
                    <RecommendationCard
                      opportunity={opportunity}
                      category={category}
                      saved={saved}
                      disabled={bookmarks.isPending || bookmarks.isError || toggleSaved.isPending}
                      onToggle={() => toggleSaved.mutate({ id: opportunity.id, saved: !saved })}
                    />
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <EmptyState
            icon={Compass}
            title="No recommendations yet"
            description="Try picking more interests or updating your preferences."
            action={
              <Button variant="soft" asChild>
                <Link to="/profile" hash="preferences">
                  Edit preferences
                </Link>
              </Button>
            }
          />
        )}
      </section>

      <DashboardExperiences userId={userId} />
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number;
  icon: typeof Bookmark;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-3xl border bg-card p-5 shadow-soft">
      <div className={`grid size-11 shrink-0 place-items-center rounded-xl ${tone}`}>
        <Icon className="size-5" aria-hidden />
      </div>
      <dl>
        <dt className="text-sm font-medium text-muted-foreground">{title}</dt>
        <dd className="font-display text-3xl font-bold tabular-nums">{value}</dd>
      </dl>
    </div>
  );
}
