import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { z } from "zod";

import { ErrorState } from "@/components/layout/page-states";
import { Button } from "@/components/ui/button";
import { isTag, safeWebUrl } from "@/features/opportunities/data";
import { CardsLoading, Page } from "@/features/opportunities/ui";

import { categoryName, costLabel, experienceDetail, mapPoint, socialLabels } from "./data";
import { ExperienceMap } from "./map";

export function ExperienceDetails({ id }: { id: string }) {
  const valid = z.string().uuid().safeParse(id).success;
  const query = useQuery({ ...experienceDetail(id), enabled: valid });
  if (valid && query.isPending)
    return (
      <Page title="Experience">
        <CardsLoading label="Loading experience" />
      </Page>
    );
  if (query.isError)
    return (
      <Page title="Experience">
        <ErrorState message="Couldn’t load this experience." onRetry={() => void query.refetch()} />
      </Page>
    );
  const item = query.data;
  if (!item)
    return (
      <Page
        title="This experience is unavailable"
        intro="Explore other things to do at your own pace."
      >
        <Button asChild variant="soft">
          <Link to="/experiences">Browse experiences</Link>
        </Button>
      </Page>
    );
  const point = mapPoint(item.latitude, item.longitude);
  const cover = item.cover_url && safeWebUrl(item.cover_url);
  const tags = Array.isArray(item.tags) ? item.tags.filter(isTag) : [];
  return (
    <Page title={item.title} intro={categoryName(item.category)}>
      <article className="max-w-4xl space-y-4">
        {cover && (
          <img
            src={cover}
            alt=""
            className="max-h-72 w-full rounded-3xl border bg-card object-contain"
          />
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["About this experience", item.description],
              ["Approximate cost", costLabel(item.cost, item.currency)],
              [
                "Suggested duration",
                item.duration_minutes ? `${item.duration_minutes} minutes` : null,
              ],
              ["Opening hours", item.opening_hours],
              ["Social interaction", item.social_level ? socialLabels[item.social_level] : null],
              ["Interest tags", tags.map((tag) => tag.name).join(", ")],
              ["Safety considerations", item.safety_considerations],
              ["Accessibility information", item.accessibility_information],
            ] as const
          ).map(([label, value]) => (
            <section key={label} className="rounded-2xl border bg-card p-4">
              <h2 className="mb-1 font-bold">{label}</h2>
              <p className="whitespace-pre-wrap break-words text-muted-foreground">
                {value || "Not provided"}
              </p>
            </section>
          ))}
        </div>
        <section className="space-y-3 rounded-2xl border bg-card p-4">
          <h2 className="font-bold">Location</h2>
          <p>
            {item.location} · {item.city}
          </p>
          {point && (
            <ExperienceMap
              pins={[{ title: item.title, position: point }]}
              label={`Map of ${item.location}`}
            />
          )}
        </section>
      </article>
    </Page>
  );
}
