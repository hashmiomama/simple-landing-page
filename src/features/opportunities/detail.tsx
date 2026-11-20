import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { Compass, Flag, Link2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { EmptyState, ErrorState } from "@/components/layout/page-states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/auth-provider";
import { ApplyLink, TrackButton } from "@/features/planning/apply";
import { ReminderAction } from "@/features/planning/reminder-actions";
import { requireSupabase } from "@/lib/backend";

import {
  categoryCatalog,
  detailListing,
  displayDate,
  isTag,
  locationLabel,
  safeWebUrl,
  statusLabels,
} from "./data";
import { SaveButton } from "./save-button";
import { CardsLoading, Field, Page } from "./ui";

export function OpportunityDetail({ id }: { id: string }) {
  const router = useRouter();
  const { status, user } = useAuth();
  const validId = z.string().uuid().safeParse(id).success;
  const detail = useQuery({
    ...detailListing(id, user?.id),
    enabled: validId && status !== "loading",
  });
  const availability = useQuery({
    queryKey: ["opportunity-status", id],
    enabled: validId && detail.isSuccess && !detail.data,
    queryFn: async ({ signal }) => {
      const { data, error } = await requireSupabase()
        .rpc("get_opportunity_status", { p_id: id })
        .abortSignal(signal);
      if (error) throw error;
      return data;
    },
  });
  const categories = useQuery(categoryCatalog);
  const submitterId = detail.data?.submitted_by;
  const submitter = useQuery({
    queryKey: ["public-profile-name", submitterId],
    enabled: !!submitterId,
    queryFn: async () => {
      if (!submitterId) return null;
      const { data, error } = await requireSupabase()
        .from("profiles")
        .select("username")
        .eq("id", submitterId)
        .maybeSingle();
      if (error) throw error;
      return data?.username ?? null;
    },
  });

  if (detail.isPending && validId)
    return (
      <Page title="Opportunity">
        <CardsLoading label="Loading opportunity" />
      </Page>
    );
  if (detail.isError)
    return (
      <Page title="Opportunity">
        <ErrorState
          message="We couldn’t load this opportunity."
          onRetry={() => void detail.refetch()}
        />
      </Page>
    );
  if (!detail.data) {
    if (validId && availability.isPending) {
      return (
        <Page title="Opportunity">
          <CardsLoading label="Checking opportunity status" />
        </Page>
      );
    }
    if (availability.isError || availability.data === "available") {
      return (
        <Page title="Opportunity">
          <ErrorState
            message="Couldn’t load the opportunity status."
            onRetry={() => {
              void detail.refetch();
              void availability.refetch();
            }}
          />
        </Page>
      );
    }
    return (
      <Page title="Opportunity">
        <EmptyState
          icon={Compass}
          title={
            availability.data === "expired"
              ? "This opportunity has expired"
              : "This opportunity is unavailable"
          }
          description="You can find other open listings in Opportunities."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild className="bg-primary-strong">
                <Link to="/opportunities">Browse opportunities</Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (router.history.canGoBack()) router.history.back();
                  else void router.navigate({ to: "/opportunities" });
                }}
              >
                Go back
              </Button>
              {availability.data === "expired" && (
                <>
                  <TrackButton id={id} />
                  <ReminderAction title="Opportunity reminder" opportunity={id} />
                </>
              )}
            </div>
          }
        />
        {availability.data === "expired" && (
          <div className="mt-4">
            <ApplyLink id={id} expired />
          </div>
        )}
      </Page>
    );
  }
  const item = detail.data;
  const category =
    categories.data?.find(({ slug }) => slug === item.category_slug)?.name ??
    item.category_slug.replaceAll("-", " ");
  const tags = Array.isArray(item.tags) ? item.tags.filter(isTag) : [];
  const source = item.source_url && safeWebUrl(item.source_url);
  const cover = item.cover_url && safeWebUrl(item.cover_url);
  return (
    <Page title={item.title} intro={`${category} · ${item.organisation_name}`}>
      <article className="max-w-4xl space-y-6">
        {cover && (
          <img
            src={cover}
            alt=""
            className="max-h-96 w-full rounded-3xl border object-contain bg-card"
          />
        )}
        <ApplyLink id={item.id} source={source || null} primary />
        <div className="flex flex-wrap items-start gap-2">
          <SaveButton id={item.id} title={item.title} saved={item.saved} />
          <TrackButton id={item.id} />
          <ReminderAction title={`Deadline: ${item.title}`} opportunity={item.id} />
          <ShareButton />
          {user && <ReportButton id={item.id} />}
        </div>
        <section
          aria-labelledby="listing-verification"
          className="rounded-2xl border bg-accent-soft p-4"
        >
          <h2 id="listing-verification" className="font-bold">
            Listing verification
          </h2>
          <p className="mt-1 text-sm">
            {statusLabels[item.status]} ·{" "}
            {item.last_verified_at
              ? `Last verified ${displayDate(item.last_verified_at)}`
              : "No verification date recorded"}
          </p>
        </section>
        <section
          aria-label="Listing details"
          className="space-y-5 rounded-3xl border bg-card p-5 shadow-soft sm:p-7"
        >
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              ["Category", category],
              ["Organisation", item.organisation_name],
              [
                "Location and mode",
                [locationLabel(item), item.country].filter(Boolean).join(" · "),
              ],
              ["Cost or funding", item.cost_or_funding],
              ["Application deadline", displayDate(item.deadline)],
              ["Event start", displayDate(item.starts_at)],
              ["Event end", displayDate(item.ends_at)],
              [
                "Submitted by",
                submitter.isPending && submitterId ? "Loading…" : (submitter.data ?? "Not listed"),
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
                <dd className="mt-1 break-words">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="border-t pt-4">
            <h2 className="text-xl font-bold">About this opportunity</h2>
            <p className="mt-2 whitespace-pre-wrap break-words">{item.description}</p>
          </div>
          <div>
            <h2 className="text-xl font-bold">Eligibility</h2>
            <p className="mt-2 whitespace-pre-wrap break-words">{item.eligibility}</p>
          </div>
          <div>
            <h2 className="text-xl font-bold">Interest tags</h2>
            {tags.length ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <li
                    key={tag.slug}
                    className="rounded-full bg-lavender-soft px-3 py-1 text-sm text-primary-strong"
                  >
                    {tag.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-muted-foreground">None listed</p>
            )}
          </div>
          {source && (
            <div>
              <h2 className="text-xl font-bold">Official source</h2>
              <a
                className="mt-2 inline-block break-all text-link"
                href={source}
                target="_blank"
                rel="noopener noreferrer"
              >
                {source}
              </a>
            </div>
          )}
        </section>
      </article>
    </Page>
  );
}

function ShareButton() {
  const [fallback, setFallback] = useState("");
  return (
    <Dialog
      open={!!fallback}
      onOpenChange={(open) => {
        if (!open) setFallback("");
      }}
    >
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          const url = window.location.href;
          try {
            await navigator.clipboard.writeText(url);
            toast.success("Link copied.");
          } catch {
            setFallback(url);
          }
        }}
      >
        <Link2 aria-hidden /> Share
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share opportunity</DialogTitle>
          <DialogDescription>Copy this link to share the opportunity.</DialogDescription>
        </DialogHeader>
        <Field label="Opportunity link">
          <Input readOnly value={fallback} onFocus={(e) => e.target.select()} />
        </Field>
      </DialogContent>
    </Dialog>
  );
}

function ReportButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const report = useMutation({
    mutationFn: async () => {
      const { error } = await requireSupabase()
        .from("reports")
        .insert({ opportunity_id: id, reason: reason.trim(), details: details.trim() || null });
      if (error) throw error;
    },
    onSuccess: () => {
      setOpen(false);
      setReason("");
      setDetails("");
      toast.success("Report sent. Thank you for flagging this.");
    },
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!report.isPending) {
          setOpen(next);
          if (next) report.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Flag aria-hidden /> Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this opportunity</DialogTitle>
          <DialogDescription>Tell us what needs a closer look.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (reason.trim() && !report.isPending) report.mutate();
          }}
        >
          <Field label="Reason">
            <Input
              required
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <Field label="Details (optional)">
            <Textarea
              value={details}
              maxLength={2000}
              onChange={(e) => setDetails(e.target.value)}
            />
          </Field>
          {report.isError && (
            <p role="alert" className="text-sm text-destructive">
              We couldn’t send the report. Try again.
            </p>
          )}
          <Button className="bg-primary-strong" disabled={!reason.trim() || report.isPending}>
            {report.isPending ? "Sending…" : "Send report"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
