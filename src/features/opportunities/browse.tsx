import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Compass,
  MapPin,
  Search as SearchIcon,
  SlidersHorizontal,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { EmptyState, ErrorState } from "@/components/layout/page-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import {
  categoryCatalog,
  displayDate,
  interestCatalog,
  locationLabel,
  searchListings,
  type Listing,
} from "./data";
import { SaveButton } from "./save-button";
import { ApplyLink } from "@/features/planning/apply";
import { modes, pageSize, sorts, type Search } from "./search-state";
import { CardsLoading, Chips, Field, Page, selectClass } from "./ui";

export function Browse({ search, update }: { search: Search; update: (search: Search) => void }) {
  const listings = useQuery(searchListings(search));
  const categories = useQuery(categoryCatalog);
  const interests = useQuery(interestCatalog);
  const page = search.page ?? 1;
  const total = listings.data?.[0]?.total_count ?? 0;
  const pages = Math.ceil(total / pageSize);
  const setFilters = (patch: Partial<Search>) => update({ ...search, ...patch, page: undefined });
  const catalogError = categories.isError || interests.isError;
  const filterProps = {
    search,
    patch: setFilters,
    clear: () => update({}),
    categories: categories.data ?? [],
    interests: interests.data ?? [],
    loading: categories.isPending || interests.isPending,
    catalogError,
    retry: () => {
      void categories.refetch();
      void interests.refetch();
    },
  };
  return (
    <Page title="Opportunities" intro="Find internships, scholarships, events and more.">
      <div className="mb-6 grid min-w-0 gap-3 rounded-3xl border bg-lavender-soft p-4 sm:flex sm:items-end sm:p-5">
        <Sheet>
          <KeywordForm
            key={search.keyword ?? ""}
            keyword={search.keyword ?? ""}
            onSearch={(keyword) => setFilters({ keyword: keyword || undefined })}
            filters={
              <SheetTrigger asChild>
                <Button type="button" variant="outline" className="h-11 lg:hidden">
                  <SlidersHorizontal aria-hidden /> Filters
                </Button>
              </SheetTrigger>
            }
          />
          <Field label="Sort by">
            <select
              value={search.sort ?? "relevance"}
              className={selectClass}
              onChange={(e) => setFilters({ sort: e.target.value as Search["sort"] })}
            >
              {Object.entries(sorts).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <SheetContent
            side="right"
            className="flex w-[min(100%,25rem)] flex-col overflow-y-auto bg-background p-5"
          >
            <SheetHeader className="pr-7">
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Choose what appears in your results.</SheetDescription>
            </SheetHeader>
            <Filters {...filterProps} />
            <SheetClose asChild>
              <Button className="bg-primary-strong">View results</Button>
            </SheetClose>
          </SheetContent>
        </Sheet>
      </div>
      <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside
          aria-label="Search filters"
          className="hidden self-start rounded-3xl border bg-card p-5 lg:block"
        >
          <Filters {...filterProps} />
        </aside>
        <section aria-label="Opportunity results">
          {listings.isPending ? (
            <CardsLoading label="Loading opportunities" />
          ) : listings.isError ? (
            <ErrorState
              message="We couldn’t load the opportunities."
              onRetry={() => void listings.refetch()}
            />
          ) : listings.data.length === 0 ? (
            <EmptyState
              icon={Compass}
              title="No opportunities found"
              description="Try a different keyword or clear the filters to see more."
              action={
                <div className="flex flex-wrap gap-2">
                  {page > 1 && (
                    <Button
                      variant="outline"
                      onClick={() => update({ ...search, page: undefined })}
                    >
                      First page
                    </Button>
                  )}
                  <Button variant="soft" onClick={() => update({})}>
                    Clear filters
                  </Button>
                </div>
              }
            />
          ) : (
            <>
              <p aria-live="polite" className="mb-3 text-sm text-muted-foreground">
                {total} {total === 1 ? "opportunity" : "opportunities"}
              </p>
              <ul className="grid gap-4 sm:grid-cols-2">
                {listings.data.map((item) => (
                  <li key={item.id}>
                    <ListingCard
                      item={item}
                      category={
                        categories.data?.find(({ slug }) => slug === item.category_slug)?.name ??
                        item.category_slug.replaceAll("-", " ")
                      }
                    />
                  </li>
                ))}
              </ul>
              {pages > 1 && (
                <nav
                  aria-label="Opportunity pages"
                  className="mt-6 flex flex-wrap items-center justify-between gap-2"
                >
                  <Button
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => update({ ...search, page: page - 1 })}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {pages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={page >= pages}
                    onClick={() => update({ ...search, page: page + 1 })}
                  >
                    Next
                  </Button>
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </Page>
  );
}

export function KeywordForm({
  keyword = "",
  onSearch,
  filters,
}: {
  keyword?: string;
  onSearch: (value: string) => void;
  filters?: ReactNode;
}) {
  const [value, setValue] = useState(keyword);
  return (
    <form
      role="search"
      className="grid min-w-0 gap-3 sm:flex sm:flex-1 sm:flex-wrap sm:items-end sm:gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(value.trim());
      }}
    >
      <div className="min-w-0 sm:min-w-40 sm:flex-1">
        <Field label="Search opportunities">
          <Input
            type="search"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Try scholarships"
            className="h-11 bg-card"
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <Button className="h-11 bg-primary-strong sm:h-9" type="submit">
          <SearchIcon aria-hidden /> Search
        </Button>
        {filters}
      </div>
    </form>
  );
}

function Filters({
  search,
  patch,
  clear,
  categories,
  interests,
  loading,
  catalogError,
  retry,
}: {
  search: Search;
  patch: (value: Partial<Search>) => void;
  clear: () => void;
  categories: { slug: string; name: string }[];
  interests: { slug: string; name: string }[];
  loading: boolean;
  catalogError: boolean;
  retry: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold">Refine results</h2>
        <Button variant="ghost" size="sm" onClick={clear}>
          Clear filters
        </Button>
      </div>
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading categories and interests…
        </p>
      ) : catalogError ? (
        <p role="alert" className="text-sm">
          Some filter options couldn’t load.{" "}
          <button type="button" className="text-link" onClick={retry}>
            Try again
          </button>
        </p>
      ) : (
        <>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Categories</legend>
            <Chips
              options={categories}
              selected={search.categories ?? []}
              onChange={(values) => patch({ categories: values.length ? values : undefined })}
            />
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Interests</legend>
            <Chips
              options={interests}
              selected={search.interests ?? []}
              onChange={(values) => patch({ interests: values.length ? values : undefined })}
            />
          </fieldset>
        </>
      )}
      <CityFilter
        key={search.city ?? ""}
        city={search.city ?? ""}
        save={(city) => patch({ city: city || undefined })}
      />
      <Field label="Mode">
        <select
          className={selectClass}
          value={search.mode ?? ""}
          onChange={(e) => patch({ mode: (e.target.value || undefined) as Search["mode"] })}
        >
          <option value="">Any mode</option>
          {Object.entries(modes).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Deadline before">
        <Input
          type="date"
          value={search.deadline ?? ""}
          onChange={(e) => patch({ deadline: e.target.value || undefined })}
        />
      </Field>
      {(
        [
          ["free", "Free only"],
          ["funded", "Funded only"],
          ["verified", "Verified only"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="flex min-h-8 items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="size-4 accent-primary-strong"
            checked={!!search[key]}
            onChange={(e) => patch({ [key]: e.target.checked || undefined })}
          />
          {label}
        </label>
      ))}
    </div>
  );
}

function CityFilter({ city, save }: { city: string; save: (city: string) => void }) {
  const [value, setValue] = useState(city);
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        save(value.trim());
      }}
    >
      <div className="min-w-0 flex-1">
        <Field label="City">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. Lahore"
          />
        </Field>
      </div>
      <Button type="submit" variant="outline" size="sm">
        Apply
      </Button>
    </form>
  );
}

function ListingCard({ item, category }: { item: Listing; category: string }) {
  return (
    <article className="flex h-full min-w-0 flex-col rounded-3xl border bg-card p-5 shadow-soft [overflow-wrap:anywhere]">
      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-lavender-soft px-3 py-1 text-primary-strong">
          {category}
        </span>
        <span
          className={`rounded-full px-3 py-1 ${item.last_verified_at ? "bg-accent-soft text-success" : "bg-muted text-muted-foreground"}`}
        >
          {item.last_verified_at ? "Verified" : "Verification date unavailable"}
        </span>
      </div>
      <h2 className="mt-3 break-words text-xl font-bold">
        <Link className="hover:underline" to="/opportunities/$id" params={{ id: item.id }}>
          {item.title}
        </Link>
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{item.organisation_name}</p>
      <div className="my-4 space-y-2 text-sm">
        <p className="flex gap-2">
          <MapPin className="size-4 shrink-0 text-primary-strong" aria-hidden />
          {locationLabel(item)}
        </p>
        <p className="flex gap-2">
          <CalendarDays className="size-4 shrink-0 text-primary-strong" aria-hidden />
          {item.deadline ? (
            <time dateTime={item.deadline}>Due {displayDate(item.deadline)}</time>
          ) : (
            "No deadline listed"
          )}
        </p>
        <p>{item.cost_or_funding}</p>
      </div>
      <div className="mt-auto">
        <SaveButton id={item.id} title={item.title} />
        <div className="mt-2">
          <ApplyLink id={item.id} source={item.source_url} />
        </div>
      </div>
    </article>
  );
}
