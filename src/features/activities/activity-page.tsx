import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Shield, UsersRound } from "lucide-react";
import { z } from "zod";
import { EmptyState, ErrorState } from "@/components/layout/page-states";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { safeWebUrl } from "@/features/opportunities/data";
import { CardsLoading, Field, Page } from "@/features/opportunities/ui";
import { showDateTime } from "@/features/planning/data";
import { useActivityAction } from "./actions";
import { ActivityRoster, CoordinatorActions, JoinRequests } from "./coordinator";
import { activityDetail, statusLabels, type ActivityDetail } from "./data";
import { Discussion } from "./discussion";
import { activityFeedback, Feedback } from "./feedback";
import { Polls } from "./polls";
import { useActivityUpdates } from "./realtime";
import { ActivityFacts, Panel } from "./ui";

const uuid = z.string().uuid();
const steps = [
  "proposed",
  "gathering_interest",
  "planning",
  "confirmed",
  "completed",
  "feedback",
] as const;

function Unavailable() {
  return (
    <Page title="Activity unavailable">
      <EmptyState
        icon={UsersRound}
        title="This activity is unavailable"
        description="You can find other activities in Community."
        action={
          <Button asChild>
            <Link to="/community">Browse activities</Link>
          </Button>
        }
      />
    </Page>
  );
}

export function ActivityPage({ userId, id }: { userId: string; id: string }) {
  return uuid.safeParse(id).success ? <ActivityContent userId={userId} id={id} /> : <Unavailable />;
}

function ActivityContent({ userId, id }: { userId: string; id: string }) {
  useActivityUpdates(userId, id, "activity_participants");
  const query = useQuery({ ...activityDetail(userId, id), refetchInterval: 20_000 });
  if (query.isPending)
    return (
      <Page title="Activity">
        <CardsLoading label="Loading activity" />
      </Page>
    );
  if (query.isError)
    return (
      <Page title="Activity">
        <ErrorState message="Couldn’t load the activity." onRetry={() => void query.refetch()} />
      </Page>
    );
  if (!query.data) return <Unavailable />;
  return <ActivityView userId={userId} detail={query.data} />;
}

function ActivityView({ userId, detail }: { userId: string; detail: ActivityDetail }) {
  const { activity, relationship } = detail;
  const id = activity.id;
  const coordinator = relationship === "coordinator";
  const joined = coordinator || relationship === "accepted";
  const cancelled = activity.status === "cancelled";
  const completed = activity.status === "completed";
  const readOnly = cancelled || completed;
  const feedback = useQuery({ ...activityFeedback(userId, id), enabled: completed && joined });
  const current = cancelled
    ? -1
    : completed && !!feedback.data?.count
      ? 5
      : steps.findIndex(step => step === activity.status);
  const cover = activity.cover_url ? safeWebUrl(activity.cover_url) : null;

  return (
    <Page
      title={activity.title}
      actions={
        <Button variant="outline" asChild>
          <Link to="/community">Browse activities</Link>
        </Button>
      }
    >
      <div className="space-y-5">
        <Panel title="About this activity">
          {cover && <img src={cover} alt="" className="max-h-72 w-full rounded-2xl object-cover" />}
          <ActivityFacts item={activity} />
          <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{activity.description}</p>
          <ol
            aria-label="Activity progress"
            className="grid grid-cols-2 gap-2 border-t pt-3 sm:grid-cols-3 lg:grid-cols-6"
          >
            {steps.map((step, index) => (
              <li
                key={step}
                aria-current={index === current ? "step" : undefined}
                className={`rounded-xl px-3 py-2 text-sm ${
                  index === current
                    ? "bg-lavender text-primary-strong font-semibold"
                    : index < current
                      ? "bg-accent-soft text-foreground"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                <span aria-hidden>{index + 1}. </span>
                {step === "feedback" ? "Feedback" : statusLabels[step]}
              </li>
            ))}
          </ol>
          {cancelled && (
            <p role="status" className="rounded-xl bg-muted p-3">
              This activity has been cancelled.
              {detail.cancellationReason && <> {detail.cancellationReason}</>}
            </p>
          )}
          {relationship === "declined" && <p role="status">Your request was declined.</p>}
        </Panel>

        {!readOnly && !coordinator && <Membership userId={userId} detail={detail} />}
        {coordinator && !readOnly && (
          <>
            <JoinRequests userId={userId} id={id} />
            <CoordinatorActions userId={userId} detail={detail} />
          </>
        )}
        {activity.status === "confirmed" && (
          <Panel title="Safety information">
            <p className="flex items-start gap-2">
              <Shield className="mt-0.5 size-5 shrink-0 text-primary-strong" aria-hidden />
              For an in-person meetup, meet at the stated public venue. A verified identity is not a
              guarantee of safety.
            </p>
          </Panel>
        )}
        {joined && (
          <>
            <Tabs defaultValue="discussion">
              <TabsList
                aria-label="Planning room"
                className="mb-2 flex h-auto w-fit max-w-full flex-wrap justify-start"
              >
                <TabsTrigger value="discussion">Discussion</TabsTrigger>
                <TabsTrigger value="polls">Polls</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>
              <TabsContent value="discussion">
                <Discussion userId={userId} id={id} readOnly={readOnly} />
              </TabsContent>
              <TabsContent value="polls">
                <Polls userId={userId} id={id} coordinator={coordinator} readOnly={readOnly} />
              </TabsContent>
              <TabsContent value="details" className="space-y-4">
                <Panel title="Arrangements">
                  <dl className="space-y-2 [overflow-wrap:anywhere]">
                    <div>
                      <dt className="font-semibold">Start time</dt>
                      <dd>
                        {detail.startsAt ? showDateTime(detail.startsAt) : "Not confirmed yet"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold">
                        {detail.startsAt ? "Venue" : "Suggested venue"}
                      </dt>
                      <dd>{detail.venue ?? "Not set"}</dd>
                    </div>
                    {detail.address && (
                      <div>
                        <dt className="font-semibold">Venue address</dt>
                        <dd>{detail.address}</dd>
                      </div>
                    )}
                    {detail.publicVenue && (
                      <div>
                        <dt className="font-semibold">Public venue</dt>
                        <dd>Confirmed by the coordinator</dd>
                      </div>
                    )}
                  </dl>
                  {detail.proposedDates.length > 0 && (
                    <>
                      <h3 className="font-semibold">Proposed dates</h3>
                      <ul className="list-disc pl-5">
                        {detail.proposedDates.map((date, index) => (
                          <li key={`${date}-${index}`}>{showDateTime(date)}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </Panel>
                <ActivityRoster
                  userId={userId}
                  id={id}
                  coordinator={coordinator}
                  active={!readOnly}
                />
              </TabsContent>
            </Tabs>
            {completed && <Feedback userId={userId} id={id} />}
          </>
        )}
      </div>
    </Page>
  );
}

function Membership({ userId, detail }: { userId: string; detail: ActivityDetail }) {
  const action = useActivityAction(userId);
  const { activity, relationship, eligibility } = detail;
  const full =
    activity.max_participants !== null && activity.participant_count >= activity.max_participants;
  if (relationship === "declined") return null;
  return (
    <Panel title="Participation">
      {relationship === "pending" || relationship === "accepted" ? (
        <>
          <p>{relationship === "pending" ? "Request pending" : "You’ve joined this activity."}</p>
          <Button
            variant="outline"
            disabled={action.isPending}
            onClick={() => {
              const prompt =
                relationship === "pending" ? "Withdraw your join request?" : "Leave this activity?";
              if (window.confirm(prompt))
                action.mutate({ type: "leave", args: { p_activity_id: activity.id } });
            }}
          >
            {relationship === "pending" ? "Withdraw request" : "Leave activity"}
          </Button>
        </>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (eligibility || full || action.isPending) return;
            const message = String(new FormData(event.currentTarget).get("message") ?? "").trim();
            action.mutate({
              type: "request",
              args: { p_activity_id: activity.id, ...(message ? { p_message: message } : {}) },
            });
          }}
        >
          {(eligibility || full) && (
            <p className="text-sm text-muted-foreground">
              {eligibility ?? "This activity is full."}
            </p>
          )}
          <Field label="Message to the coordinator (optional)">
            <Textarea
              name="message"
              maxLength={1000}
              disabled={!!eligibility || full || action.isPending}
            />
          </Field>
          <Button type="submit" disabled={!!eligibility || full || action.isPending}>
            {action.isPending ? "Sending request…" : "Request to join"}
          </Button>
        </form>
      )}
      {action.error && (
        <p role="alert" className="text-destructive">
          {action.error.message}
        </p>
      )}
    </Panel>
  );
}
