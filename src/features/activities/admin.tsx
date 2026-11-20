import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ErrorState } from "@/components/layout/page-states";
import { DecisionPanel, Pagination } from "@/features/admin/ui";
import { useAuth } from "@/features/auth/auth-provider";
import { CardsLoading, Page } from "@/features/opportunities/ui";
import { useActivityAction } from "./actions";
import { adminActivities, pageSize, type Activity } from "./data";
import { activityStatusChoices } from "./browse";
import { ActivityFacts, Choices } from "./ui";

export function ActivityModeration() {
  const { user } = useAuth();
  return user ? <Moderation key={user.id} userId={user.id} /> : null;
}

function Moderation({ userId }: { userId: string }) {
  const [status, setStatus] = useState<Activity["status"]>("proposed");
  const [page, setPage] = useState(1);
  const query = useQuery(adminActivities(userId, status, page));
  return (
    <Page title="Activity moderation">
      <Choices
        name="Activity status"
        values={activityStatusChoices}
        value={status}
        change={(value) => {
          setStatus(value as Activity["status"]);
          setPage(1);
        }}
      />
      {query.isPending ? (
        <CardsLoading label="Loading activities for moderation" />
      ) : query.isError ? (
        <ErrorState
          message="Couldn’t load the activity queue."
          onRetry={() => void query.refetch()}
        />
      ) : query.data.length ? (
        <ul className="space-y-4">
          {query.data.map(({ activity }) => (
            <li key={activity.id}>
              <ModerationCard userId={userId} item={activity} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border bg-card p-4">No activities on this page.</p>
      )}
      {query.isSuccess && (
        <Pagination
          page={page}
          pageSize={pageSize}
          count={query.data[0]?.total_count ?? 0}
          change={setPage}
        />
      )}
    </Page>
  );
}

function ModerationCard({ userId, item }: { userId: string; item: Activity }) {
  const action = useActivityAction(userId);
  return (
    <article className="space-y-3 rounded-2xl border bg-card p-4 shadow-soft">
      <h2 className="text-lg font-bold [overflow-wrap:anywhere]">
        {item.status === "cancelled" ? (
          item.title
        ) : (
          <Link className="text-link" to="/community/$id" params={{ id: item.id }}>
            {item.title}
          </Link>
        )}
      </h2>
      <ActivityFacts item={item} />
      <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{item.description}</p>
      {item.status !== "cancelled" && item.status !== "completed" && (
        <DecisionPanel
          choices={{ cancel: "Cancel activity" }}
          requiredNote={() => true}
          pending={action.isPending}
          error={action.error?.message ?? null}
          onDecide={(_, note) =>
            action.mutateAsync({ type: "moderate", args: { p_id: item.id, p_note: note } })
          }
          label={`Review ${item.title}`}
        />
      )}
    </article>
  );
}
