import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { ErrorState } from "@/components/layout/page-states";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { statusLabels } from "@/features/opportunities/data";
import { CardsLoading, Page } from "@/features/opportunities/ui";

import { categoryName, ownExperiences } from "./data";

export function MyExperiences() {
  const { user } = useAuth();
  const query = useQuery({ ...ownExperiences(user?.id ?? ""), enabled: !!user });
  if (!user) return null;
  return (
    <Page
      title="My experience recommendations"
      actions={
        <Button asChild className="bg-primary-strong">
          <Link to="/recommend-experience">Recommend an experience</Link>
        </Button>
      }
    >
      {query.isPending ? (
        <CardsLoading label="Loading your recommendations" />
      ) : query.isError ? (
        <ErrorState
          message="Couldn’t load your recommendations."
          onRetry={() => void query.refetch()}
        />
      ) : !query.data.length ? (
        <p className="rounded-2xl border bg-card p-5">You haven’t recommended an experience yet.</p>
      ) : (
        <ul className="space-y-3">
          {query.data.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4"
            >
              <div>
                <h2 className="font-bold">{item.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {categoryName(item.category)} · {item.city}
                </p>
                <p className="mt-1 text-sm font-semibold text-primary-strong">
                  {statusLabels[item.status]}
                </p>
              </div>
              {item.status === "approved" ? (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/experiences/$id" params={{ id: item.id }}>
                    View experience
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    to="/my-experience-recommendations/$id"
                    params={{ id: item.id }}
                    aria-label={`Edit ${item.title}`}
                  >
                    Edit
                  </Link>
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
