import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { z } from "zod";

import { EmptyState, ErrorState } from "@/components/layout/page-states";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";

import { displayDate, ownOrganisation, ownSubmission, ownSubmissions, statusLabels } from "./data";
import { SubmissionForm } from "./submission-form";
import { ReviewNotes } from "./review-notes";
import { CardsLoading, Page } from "./ui";

export function Submissions({ official = false }: { official?: boolean }) {
  const { user, hasRole, isRolesLoading, rolesError, refresh } = useAuth();
  const org = useQuery({ ...ownOrganisation(user?.id ?? ""), enabled: !!user && official });
  if (!user) return null;
  if (official) {
    if (org.isPending || isRolesLoading)
      return (
        <Page title="My organisation listings">
          <CardsLoading label="Loading your organisation" />
        </Page>
      );
    if (org.isError || rolesError)
      return (
        <Page title="My organisation listings">
          <ErrorState
            message="We couldn’t load your organisation access."
            onRetry={() => {
              void org.refetch();
              void refresh();
            }}
          />
        </Page>
      );
    if (org.data?.status !== "approved" || !hasRole("organisation"))
      return (
        <Page title="My organisation listings">
          <EmptyState
            icon={ClipboardList}
            title="An approved organisation is required"
            description="Your official listings will appear here once your organisation is approved."
            action={
              <Button asChild variant="soft">
                <Link to="/organisation/register">View organisation registration</Link>
              </Button>
            }
          />
        </Page>
      );
  }
  return <SubmissionList userId={user.id} organisationId={official ? org.data?.id : undefined} />;
}

function SubmissionList({
  userId,
  organisationId,
}: {
  userId: string;
  organisationId: string | undefined;
}) {
  const query = useQuery(ownSubmissions(userId, organisationId));
  return (
    <Page
      title={organisationId ? "My organisation listings" : "My submissions"}
      intro={
        organisationId
          ? "Edits to approved official listings send them back to review."
          : "Track opportunities you’ve submitted for review."
      }
      actions={
        <Button className="bg-primary-strong" asChild>
          <Link to="/submit-opportunity">Submit an opportunity</Link>
        </Button>
      }
    >
      {query.isPending ? (
        <CardsLoading label="Loading your listings" />
      ) : query.isError ? (
        <ErrorState
          message="We couldn’t load your listings."
          onRetry={() => void query.refetch()}
        />
      ) : !query.data.length ? (
        <EmptyState
          icon={ClipboardList}
          title="No listings yet"
          description="Your submissions will appear here."
        />
      ) : (
        <ul className="space-y-3">
          {query.data.map((listing) => {
            const editable =
              listing.status === "pending" ||
              listing.status === "rejected" ||
              listing.status === "needs_info" ||
              (!!organisationId && listing.status === "approved");
            return (
              <li
                key={listing.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-soft sm:p-5"
              >
                <div className="min-w-0">
                  <h2 className="break-words font-bold">{listing.title}</h2>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-semibold ${listing.status === "approved" ? "bg-accent-soft text-success" : "bg-lavender-soft text-primary-strong"}`}
                    >
                      {statusLabels[listing.status]}
                    </span>
                    {listing.deadline && (
                      <time dateTime={listing.deadline}>Due {displayDate(listing.deadline)}</time>
                    )}
                  </p>
                  {(listing.status === "needs_info" || listing.status === "rejected") && (
                    <ReviewNotes id={listing.id} userId={userId} />
                  )}
                </div>
                {editable && (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      to="/my-submissions/$id"
                      params={{ id: listing.id }}
                      aria-label={`Edit ${listing.title}`}
                    >
                      {listing.status === "needs_info" ? "Edit and resubmit" : "Edit"}
                    </Link>
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}

export function EditSubmission({ id }: { id: string }) {
  const { user, hasRole, isRolesLoading, rolesError, refresh } = useAuth();
  const validId = z.string().uuid().safeParse(id).success;
  const query = useQuery({ ...ownSubmission(user?.id ?? "", id), enabled: !!user && validId });
  const org = useQuery({
    ...ownOrganisation(user?.id ?? ""),
    enabled: !!user && !!query.data?.organisation_id,
  });
  const linked = !!query.data?.organisation_id;
  if (validId && (query.isPending || (linked && (org.isPending || isRolesLoading))))
    return (
      <Page title="Edit opportunity">
        <CardsLoading label="Loading your submission" />
      </Page>
    );
  if (query.isError || (linked && (org.isError || rolesError)))
    return (
      <Page title="Edit opportunity">
        <ErrorState
          message="We couldn’t load your submission."
          onRetry={() => {
            void query.refetch();
            if (linked) {
              void org.refetch();
              void refresh();
            }
          }}
        />
      </Page>
    );
  const listing = query.data;
  const canEdit =
    listing &&
    (linked
      ? listing.organisation_id === org.data?.id &&
        org.data?.status === "approved" &&
        hasRole("organisation") &&
        listing.status !== "archived"
      : listing.status === "pending" ||
        listing.status === "rejected" ||
        listing.status === "needs_info");
  if (!listing || !canEdit)
    return (
      <Page title="Edit opportunity">
        <EmptyState
          icon={ClipboardList}
          title="This listing can’t be edited"
          description="You can edit eligible listings that you submitted."
          action={
            <Button asChild variant="soft">
              <Link to="/my-submissions">My submissions</Link>
            </Button>
          }
        />
      </Page>
    );
  return (
    <SubmissionForm
      existing={listing}
      tags={listing.opportunity_tags.map(({ interest_slug }) => interest_slug)}
    />
  );
}
