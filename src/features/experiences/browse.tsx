import { useQuery } from "@tanstack/react-query";
import { BookOpen, Landmark, Mountain, Palette } from "lucide-react";
import { useMemo, useState } from "react";

import { ErrorState } from "@/components/layout/page-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/features/admin/ui";
import { interestCatalog } from "@/features/opportunities/data";
import { CardsLoading, Chips, Field, Page, selectClass } from "@/features/opportunities/ui";

import { ExperienceCard } from "./cards";
import {
  browseExperiences,
  categories,
  mapPoint,
  pageSize,
  socialLabels,
  socialSchema,
  type ExperienceSearch,
} from "./data";
import { ExperienceMap } from "./map";

const icons = [Landmark, BookOpen, Palette, Mountain];

export function ExperienceBrowse({
  search,
  update,
}: {
  search: ExperienceSearch;
  update: (search: ExperienceSearch) => void;
}) {
  const results = useQuery(browseExperiences(search));
  const page = search.page ?? 1;
  const count = results.data?.[0]?.total_count ?? 0;
  const showingMap = search.view === "map";
  const pins = useMemo(
    () =>
      (results.data ?? []).flatMap((item) => {
        const position = mapPoint(item.latitude, item.longitude);
        return position ? [{ id: item.id, title: item.title, city: item.city, position }] : [];
      }),
    [results.data],
  );
  return (
    <Page title="Experiences" intro="Find something to do on your own, at your own pace.">
      <div
        role="group"
        aria-label="Experience categories"
        className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        {categories.map(({ slug, name }, index) => {
          const Icon = icons[index]!;
          return (
            <button
              key={slug}
              type="button"
              aria-pressed={search.category === slug}
              onClick={() =>
                update({
                  ...search,
                  category: search.category === slug ? undefined : slug,
                  page: undefined,
                })
              }
              className="flex min-h-24 flex-col items-start justify-between gap-2 rounded-2xl border bg-lavender-soft p-3 text-left text-sm font-bold text-primary-strong hover:bg-lavender aria-pressed:border-primary aria-pressed:bg-lavender sm:p-4"
            >
              <Icon className="size-5" aria-hidden /> {name}
            </button>
          );
        })}
      </div>
      <ExperienceFilters
        key={JSON.stringify([
          search.keyword,
          search.city,
          search.maxCost,
          search.social,
          search.interests,
        ])}
        search={search}
        onApply={(filters) => update({ ...search, ...filters, page: undefined })}
        onClear={() => update({ view: search.view })}
      />
      <div className="my-5 flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {results.isSuccess && count > 0
            ? `${count} ${count === 1 ? "experience" : "experiences"}`
            : "Experience results"}
        </p>
        <div role="group" aria-label="Results view" className="flex gap-2">
          <Button
            size="sm"
            variant={showingMap ? "outline" : "soft"}
            aria-pressed={!showingMap}
            onClick={() => update({ ...search, view: undefined })}
          >
            List
          </Button>
          <Button
            size="sm"
            variant={showingMap ? "soft" : "outline"}
            aria-pressed={showingMap}
            onClick={() => update({ ...search, view: "map" })}
          >
            Map
          </Button>
        </div>
      </div>
      {results.isPending ? (
        <CardsLoading label="Loading experiences" />
      ) : results.isError ? (
        <ErrorState message="Couldn’t load experiences." onRetry={() => void results.refetch()} />
      ) : (
        <>
          {!results.data.length ? (
            <div className="space-y-3 rounded-2xl border bg-card p-5">
              <h2 className="font-bold">No experiences found</h2>
              <p className="text-muted-foreground">Try a different search or clear the filters.</p>
              <Button variant="outline" onClick={() => update({ view: search.view })}>
                Clear filters
              </Button>
            </div>
          ) : showingMap ? (
            <>
              <ExperienceMap pins={pins} label="Map of experiences on this page" />
              {!pins.length && (
                <p className="mt-2 text-sm text-muted-foreground">
                  These experiences do not have map coordinates. Switch to List to view them.
                </p>
              )}
            </>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {results.data.map((item) => (
                <li key={item.id}>
                  <ExperienceCard item={item} />
                </li>
              ))}
            </ul>
          )}
          {page > 1 || count > pageSize ? (
            <Pagination
              page={page}
              count={count}
              pageSize={pageSize}
              change={(next) => update({ ...search, page: next })}
            />
          ) : null}
        </>
      )}
    </Page>
  );
}

function ExperienceFilters({
  search,
  onApply,
  onClear,
}: {
  search: ExperienceSearch;
  onApply: (filters: ExperienceSearch) => void;
  onClear: () => void;
}) {
  const catalog = useQuery(interestCatalog);
  const [tags, setTags] = useState(search.interests ?? []);
  const [free, setFree] = useState(search.maxCost === 0);
  return (
    <form
      role="search"
      className="space-y-4 rounded-3xl border bg-card p-4 sm:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const keyword = String(data.get("keyword") ?? "").trim();
        const city = String(data.get("city") ?? "").trim();
        const parsedLevel = socialSchema.safeParse(data.get("social"));
        const cost = String(data.get("maxCost") ?? "");
        onApply({
          keyword: keyword || undefined,
          city: city || undefined,
          social: parsedLevel.data,
          maxCost: free ? 0 : cost ? Number(cost) : undefined,
          interests: tags.length ? tags : undefined,
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Search experiences">
          <Input
            name="keyword"
            type="search"
            defaultValue={search.keyword ?? ""}
            placeholder="Try pottery or a bookshop"
          />
        </Field>
        <Field label="City">
          <Input name="city" defaultValue={search.city ?? ""} placeholder="e.g. Karachi" />
        </Field>
        <Field label="Maximum cost (PKR)">
          <Input
            name="maxCost"
            type="number"
            min="0"
            step="0.01"
            disabled={free}
            defaultValue={search.maxCost === 0 ? "" : (search.maxCost ?? "")}
          />
        </Field>
        <Field label="Social interaction">
          <select className={selectClass} name="social" defaultValue={search.social ?? ""}>
            <option value="">Any level</option>
            {socialSchema.options.map((value) => (
              <option key={value} value={value}>
                {socialLabels[value]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={free} onChange={(e) => setFree(e.target.checked)} /> Free
        only
      </label>
      <details open={tags.length > 0 || undefined}>
        <summary className="cursor-pointer text-sm font-semibold">Filter by interests</summary>
        <div className="mt-2">
          {catalog.isPending ? (
            <p role="status">Loading interests…</p>
          ) : catalog.isError ? (
            <button type="button" className="text-link" onClick={() => void catalog.refetch()}>
              Retry interests
            </button>
          ) : catalog.data.length ? (
            <Chips options={catalog.data} selected={tags} onChange={setTags} />
          ) : (
            <p>No interests available.</p>
          )}
        </div>
      </details>
      <div className="flex gap-2">
        <Button type="submit" className="bg-primary-strong">
          Search
        </Button>
        <Button
          type="reset"
          variant="outline"
          onClick={() => {
            setTags([]);
            setFree(false);
            onClear();
          }}
        >
          Clear filters
        </Button>
      </div>
    </form>
  );
}
