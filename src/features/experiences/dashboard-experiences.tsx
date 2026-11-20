import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Leaf } from "lucide-react";

import { EmptyState, ErrorState } from "@/components/layout/page-states";
import { Button } from "@/components/ui/button";
import { CardsLoading } from "@/features/opportunities/ui";

import { ExperienceCard } from "./cards";
import { experienceRecommendations } from "./data";

export function DashboardExperiences({ userId }: { userId: string }) {
  const query = useQuery(experienceRecommendations(userId));
  return (
    <section aria-labelledby="experiences-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="experiences-heading" className="text-2xl font-bold">
          Experiences you might enjoy
        </h2>
        <Button asChild variant="outline" size="sm">
          <Link to="/experiences">See all experiences</Link>
        </Button>
      </div>
      {query.isPending ? (
        <CardsLoading label="Loading recommended experiences" />
      ) : query.isError ? (
        <ErrorState
          message="Couldn’t load recommended experiences."
          onRetry={() => void query.refetch()}
        />
      ) : !query.data.length ? (
        <EmptyState
          icon={Leaf}
          title="No experiences to recommend yet"
          description="You can browse all experiences or update your preferences."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {query.data.map((item) => (
            <li key={item.id}>
              <ExperienceCard item={item} match={item.total_score}>
                <details className="rounded-xl bg-background px-3 py-2 text-sm">
                  <summary className="cursor-pointer font-semibold text-primary-strong">
                    Why this match
                  </summary>
                  <dl className="mt-2 space-y-1">
                    {(
                      [
                        ["Social comfort", item.social_comfort_score, 30],
                        ["Interests", item.interest_score, 30],
                        ["Budget", item.budget_score, 15],
                        ["Location", item.location_score, 15],
                        ["Category", item.category_score, 10],
                      ] as const
                    ).map(([name, score, max]) => (
                      <div key={name} className="flex justify-between gap-2">
                        <dt>{name}</dt>
                        <dd>
                          {score} / {max}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </details>
              </ExperienceCard>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
