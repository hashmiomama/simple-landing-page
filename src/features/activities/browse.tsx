import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { UsersRound } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/layout/page-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/features/admin/ui";
import { interestCatalog } from "@/features/opportunities/data";
import { CardsLoading, Field, Page, selectClass } from "@/features/opportunities/ui";
import {
  label,
  levels,
  myActivities,
  pageSize,
  participation,
  searchActivities,
  searchSchema,
  social,
  statuses,
  statusLabels,
  type ActivitySearch,
} from "./data";
import { ActivityCards, Choices } from "./ui";
import { useState } from "react";

export function BrowseActivities({
  userId,
  search,
  update,
}: {
  userId: string;
  search: ActivitySearch;
  update: (search: ActivitySearch) => void;
}) {
  const query = useQuery(searchActivities(userId, search));
  const interests = useQuery(interestCatalog);
  const page = search.page ?? 1;
  return (
    <Page
      title="Community"
      intro="Find people who share your interests and plan an activity together."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/community/new">Propose an activity</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/community/mine">My activities</Link>
          </Button>
        </div>
      }
    >
      <form
        key={JSON.stringify(search)}
        className="mb-5 grid gap-3 rounded-3xl border bg-lavender-soft p-4 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          const values = Object.fromEntries(new FormData(event.currentTarget));
          const budget = values["budget"];
          update(
            searchSchema.parse({
              ...values,
              budget: typeof budget === "string" && budget !== "" ? Number(budget) : undefined,
            }),
          );
        }}
      >
        <Field label="Search activities">
          <Input name="keyword" type="search" defaultValue={search.keyword ?? ""} />
        </Field>
        <Field label="Hobby category">
          <select name="category" className={selectClass} defaultValue={search.category ?? ""}>
            <option value="">All hobbies</option>
            {search.category && !interests.data?.some((item) => item.slug === search.category) && (
              <option value={search.category}>{search.category}</option>
            )}
            {interests.data?.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="City">
          <Input name="city" defaultValue={search.city ?? ""} />
        </Field>
        <Filter label="Social level" name="social" values={social} value={search.social} />
        <Filter
          label="Participation"
          name="participation"
          values={participation}
          value={search.participation}
        />
        <Filter
          label="Experience level"
          name="experience"
          values={levels}
          value={search.experience}
        />
        <Field label="Maximum budget (PKR)">
          <Input
            name="budget"
            type="number"
            min="0"
            step="0.01"
            defaultValue={search.budget ?? ""}
          />
        </Field>
        <Filter
          label="Status"
          name="status"
          values={statuses.filter((value) => value !== "cancelled")}
          value={search.status}
        />
        {interests.isPending && <p role="status">Loading hobbies…</p>}
        {interests.isError && (
          <p role="alert">
            Hobbies couldn’t load.{" "}
            <button type="button" className="text-link" onClick={() => void interests.refetch()}>
              Retry
            </button>
          </p>
        )}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit">Search</Button>
          <Button type="reset" variant="outline" onClick={() => update({})}>
            Clear filters
          </Button>
        </div>
      </form>
      {query.isPending ? (
        <CardsLoading label="Loading activities" />
      ) : query.isError ? (
        <ErrorState message="We couldn’t load activities." onRetry={() => void query.refetch()} />
      ) : query.data.length ? (
        <ActivityCards
          items={query.data.map((row) => row.activity)}
          categories={interests.data ?? []}
        />
      ) : (
        <EmptyState
          icon={UsersRound}
          title="No activities found"
          description="Try another search or propose an activity of your own."
        />
      )}
      {query.isSuccess && (
        <Pagination
          page={page}
          pageSize={pageSize}
          count={query.data[0]?.total_count ?? 0}
          change={(next) => update({ ...search, page: next })}
        />
      )}
    </Page>
  );
}

export function Filter({
  label: title,
  name,
  values,
  value,
}: {
  label: string;
  name: string;
  values: readonly string[];
  value?: string | undefined;
}) {
  return (
    <Field label={title}>
      <select name={name} className={selectClass} defaultValue={value ?? ""}>
        <option value="">Any</option>
        {values.map((option) => (
          <option key={option} value={option}>
            {label(option)}
          </option>
        ))}
      </select>
    </Field>
  );
}

const roles = [
  { value: "coordinator", label: "I coordinate" },
  { value: "accepted", label: "I joined" },
  { value: "pending", label: "Requests pending" },
];
export function MyActivities({ userId }: { userId: string }) {
  const [role, setRole] = useState("coordinator");
  const query = useQuery(myActivities(userId, role));
  return (
    <Page
      title="My activities"
      actions={
        <Button variant="outline" asChild>
          <Link to="/community">Browse activities</Link>
        </Button>
      }
    >
      <Choices name="My activity groups" values={roles} value={role} change={setRole} />
      {query.isPending ? (
        <CardsLoading label="Loading your activities" />
      ) : query.isError ? (
        <ErrorState message="Your activities couldn’t load." onRetry={() => void query.refetch()} />
      ) : query.data.length ? (
        <ActivityCards items={query.data} />
      ) : (
        <EmptyState
          icon={UsersRound}
          title="Nothing here yet"
          description="Activities you coordinate, join or request will appear in their group."
        />
      )}
    </Page>
  );
}

export const activityStatusChoices = statuses.map((value) => ({
  value,
  label: statusLabels[value],
}));
