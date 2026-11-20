import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bookmark } from "lucide-react";

import { EmptyState, ErrorState } from "@/components/layout/page-states";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";

import { displayDate, savedListings } from "./data";
import { useSaveAction } from "./save-button";
import { CardsLoading, Page } from "./ui";

export function SavedOpportunities() {
  const { user } = useAuth();
  return user ? <SavedContent userId={user.id} /> : null;
}

function SavedContent({ userId }: { userId: string }) {
  const query = useQuery(savedListings(userId));
  return (
    <Page title="Saved opportunities" intro="Keep track of listings you want to revisit.">
      {query.isPending ? (
        <CardsLoading label="Loading saved opportunities" />
      ) : query.isError ? (
        <ErrorState
          message="We couldn’t load your saved opportunities."
          onRetry={() => void query.refetch()}
        />
      ) : !query.data.length ? (
        <EmptyState
          icon={Bookmark}
          title="Nothing saved yet"
          description="Save an opportunity to find it here later."
          action={
            <Button variant="soft" asChild>
              <Link to="/opportunities">Browse opportunities</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {query.data.map((item) => (
            <li
              key={item.opportunity_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-soft sm:p-5"
            >
              <div className="min-w-0">
                <h2 className="break-words font-bold">
                  {item.is_expired ? (
                    item.title
                  ) : (
                    <Link
                      to="/opportunities/$id"
                      params={{ id: item.opportunity_id }}
                      className="text-link"
                    >
                      {item.title}
                    </Link>
                  )}
                </h2>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {item.deadline ? (
                    <time dateTime={item.deadline}>Due {displayDate(item.deadline)}</time>
                  ) : (
                    "No deadline listed"
                  )}
                  {item.is_expired && (
                    <span className="rounded-full bg-muted px-2.5 py-0.5 font-semibold">
                      Expired
                    </span>
                  )}
                </p>
              </div>
              <Unsave userId={userId} id={item.opportunity_id} title={item.title} />
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}

function Unsave({ userId, id, title }: { userId: string; id: string; title: string }) {
  const save = useSaveAction(userId, id);
  return (
    <Button
      variant="outline"
      size="sm"
      aria-label={`Unsave ${title}`}
      disabled={save.isPending}
      onClick={() => save.mutate(false)}
    >
      {save.isPending ? "Removing…" : "Unsave"}
    </Button>
  );
}
