import { useQuery } from "@tanstack/react-query";
import { BookOpen, Landmark, Mountain, Palette } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ErrorState } from "@/components/layout/page-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/features/admin/ui";
import { interestCatalog } from "@/features/opportunities/data";
import { CardsLoading, Chips, Field, Page, selectClass } from "@/features/opportunities/ui";
import { useIsMobile } from "@/hooks/use-mobile";

import { ExperienceCard } from "./cards";
import {
  browseExperiences,
  categories,
  mapCategoryColor,
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
  const mobile = useIsMobile();
  const [hovered, setHovered] = useState<string>();
  const [focused, setFocused] = useState<string>();
  const [selected, setSelected] = useState<string>();
  const [resetView, setResetView] = useState(0);
  const [scrollTarget, setScrollTarget] = useState<string>();
  const pins = useMemo(
    () =>
      (results.data ?? []).flatMap((item, index) => {
        const position = mapPoint(item.latitude, item.longitude);
        return position
          ? [
              {
                id: item.id,
                title: item.title,
                city: item.city,
                position,
                number: index + 1,
                category: item.category,
              },
            ]
          : [];
      }),
    [results.data],
  );
  useEffect(() => {
    if (!scrollTarget || (mobile && showingMap)) return;
    const frame = requestAnimationFrame(() => {
      const card = document.getElementById(`experience-result-${scrollTarget}`);
      card?.focus({ preventScroll: true });
      card?.scrollIntoView({
        block: "nearest",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
      setScrollTarget(undefined);
    });
    return () => cancelAnimationFrame(frame);
  }, [mobile, showingMap, scrollTarget]);
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
        <div role="group" aria-label="Results view" className="flex gap-2 md:hidden">
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
          ) : (
            <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <ul
                className={`gap-3 md:grid-cols-1 ${showingMap ? "hidden md:grid" : "grid sm:grid-cols-2"}`}
              >
                {results.data.map((item, index) => (
                  <li
                    key={item.id}
                    id={`experience-result-${item.id}`}
                    tabIndex={-1}
                    onPointerEnter={() => setHovered(item.id)}
                    onPointerLeave={() => setHovered(undefined)}
                    onFocus={() => setFocused(item.id)}
                    onBlur={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(undefined);
                    }}
                    className={`relative scroll-mt-36 rounded-3xl ${selected === item.id ? "ring-2 ring-primary-strong" : ""}`}
                  >
                    <ExperienceCard
                      item={item}
                      marker={
                        mapPoint(item.latitude, item.longitude) ? (
                          <span
                            className={`ml-auto grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${mapCategoryColor(item.category)}`}
                          >
                            <span className="sr-only">Map marker </span>
                            {index + 1}
                          </span>
                        ) : null
                      }
                    />
                  </li>
                ))}
              </ul>
              <section
                className={`min-w-0 rounded-3xl border bg-card p-3 md:sticky md:top-28 md:block ${showingMap ? "" : "hidden"}`}
                aria-label="Experience results map"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-bold">Explore the map</h2>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setResetView((value) => value + 1);
                      setSelected(undefined);
                    }}
                  >
                    Reset view
                  </Button>
                </div>
                <p className="mb-2 text-sm text-muted-foreground">
                  Select a numbered pin to find its card. On desktop, hover or focus a card to
                  highlight its pin.
                </p>
                {(!mobile || showingMap) && (
                  <ExperienceMap
                    pins={pins}
                    label="Map of experiences on this page"
                    activeId={hovered ?? focused ?? selected}
                    resetView={resetView}
                    onPinSelect={(id) => {
                      setSelected(id);
                      setScrollTarget(id);
                      if (mobile && showingMap) update({ ...search, view: undefined });
                    }}
                  />
                )}
                <ul
                  aria-label="Map categories"
                  className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-xs"
                >
                  {categories.map(({ slug, name }) => (
                    <li key={slug} className="flex items-center gap-1.5">
                      <span
                        className={`size-3 rounded-full border ${mapCategoryColor(slug)}`}
                        aria-hidden
                      />
                      {name}
                    </li>
                  ))}
                </ul>
                {!pins.length && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    These experiences do not have map coordinates.
                  </p>
                )}
              </section>
            </div>
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
