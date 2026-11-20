import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CircleCheck, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { EmptyState, ErrorState } from "@/components/layout/page-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/auth-provider";
import { requireSupabase } from "@/lib/backend";

import {
  categoryCatalog,
  errorText,
  interestCatalog,
  ownOrganisation,
  type Organisation,
  type StoredListing,
} from "./data";
import { modes } from "./search-state";
import { ReviewNotes } from "./review-notes";
import {
  coverError,
  coverTypes,
  submitListing,
  toLocalInput,
  updateListing,
  uploadCover,
  validateSubmission,
  type SubmissionValues,
} from "./submission-data";
import { CardsLoading, Chips, Field, FormSection, Page, selectClass } from "./ui";

export function SubmissionForm({
  existing,
  tags = [],
}: {
  existing?: StoredListing;
  tags?: string[];
}) {
  const { user, hasRole } = useAuth();
  const organisation = useQuery({ ...ownOrganisation(user?.id ?? ""), enabled: !!user });
  const categories = useQuery(categoryCatalog);
  const interests = useQuery(interestCatalog);
  if (!user) return null;
  const pending = organisation.isPending || categories.isPending || interests.isPending;
  if (pending)
    return (
      <Page title={existing ? "Edit opportunity" : "Submit an opportunity"}>
        <CardsLoading label="Loading submission form" />
      </Page>
    );
  if (organisation.isError || categories.isError || interests.isError) {
    return (
      <Page title="Opportunity submission">
        <ErrorState
          message="We couldn’t load the submission form."
          onRetry={() => {
            void organisation.refetch();
            void categories.refetch();
            void interests.refetch();
          }}
        />
      </Page>
    );
  }
  const official =
    organisation.data?.status === "approved" && hasRole("organisation") ? organisation.data : null;
  return (
    <SubmissionFields
      key={existing?.id ?? "new"}
      userId={user.id}
      existing={existing}
      initialTags={tags}
      official={official}
      categories={categories.data}
      interests={interests.data}
    />
  );
}

type Option = { slug: string; name: string };
function SubmissionFields({
  userId,
  existing,
  initialTags,
  official,
  categories,
  interests,
}: {
  userId: string;
  existing: StoredListing | undefined;
  initialTags: string[];
  official: Organisation | null;
  categories: Option[];
  interests: Option[];
}) {
  const client = useQueryClient();
  const [tags, setTags] = useState(initialTags);
  const [asOrganisation, setAsOrganisation] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const upload = useRef<{ file: File; url: string } | null>(null);
  const org = !existing && asOrganisation ? (official ?? undefined) : undefined;

  const resubmitting = existing?.status === "needs_info";
  const save = useMutation({
    mutationFn: async (values: SubmissionValues) => {
      let cover = removeCover ? null : (existing?.cover_url ?? null);
      if (file) {
        if (upload.current?.file !== file) {
          setUploading(true);
          try {
            upload.current = { file, url: await uploadCover(userId, file) };
          } catch (error) {
            throw new Error(errorText(error, "Cover upload failed. Try another image or retry."));
          } finally {
            setUploading(false);
          }
        }
        cover = upload.current.url;
      }
      if (!existing) return submitListing(values, cover, org?.id);
      const updated = await updateListing(userId, existing, values, cover);
      const backend = requireSupabase();
      if (tags.length !== initialTags.length || tags.some((slug) => !initialTags.includes(slug))) {
        const { error } = await backend.rpc("set_opportunity_tags", {
          p_id: existing.id,
          p_interest_slugs: tags,
        });
        if (error)
          throw new Error(`Listing fields were saved. Tags could not be saved. ${error.message}`);
      }
      if (!resubmitting) return updated;
      const { data, error } = await backend
        .rpc("resubmit_opportunity", { p_id: existing.id })
        .single();
      if (error)
        throw new Error(
          `Your changes were saved. The listing could not be resubmitted. ${error.message}`,
        );
      return { ...data, resubmitted: true as const };
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["admin"] });
      void client.invalidateQueries({ queryKey: ["opportunity-status"] });
      void client.invalidateQueries({ queryKey: ["own-submissions", userId] });
      void client.invalidateQueries({ queryKey: ["own-submission", userId] });
      void client.invalidateQueries({ queryKey: ["opportunity-search"] });
      void client.invalidateQueries({ queryKey: ["opportunity-detail"] });
      void client.invalidateQueries({ queryKey: ["saved-listings"] });
      void client.invalidateQueries({ queryKey: ["recommendations"] });
      void client.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  if (save.isSuccess)
    return (
      <Page
        title={
          "resubmitted" in save.data
            ? "Opportunity resubmitted"
            : existing
              ? "Changes saved"
              : "Opportunity submitted"
        }
      >
        <EmptyState
          icon={CircleCheck}
          title={existing ? "Your listing was updated" : "Thanks for sharing an opportunity"}
          description={
            save.data.status === "rejected"
              ? "Your edits are saved. The listing is still marked as rejected."
              : "Listings are reviewed before they appear in the public directory."
          }
          action={
            <Button asChild className="bg-primary-strong">
              <Link to={existing?.organisation_id ? "/organisation/listings" : "/my-submissions"}>
                View your listings
              </Link>
            </Button>
          }
        />
      </Page>
    );

  const errorFor = (name: string) => errors[name]?.[0];
  const message = (name: string) =>
    errorFor(name) && <span className="font-normal text-destructive">{errorFor(name)}</span>;
  const textbox = (name: string, label: string, value?: string | null, type = "text") => (
    <Field label={label}>
      <Input
        name={name}
        type={type}
        defaultValue={value ?? ""}
        aria-invalid={!!errorFor(name)}
        step={type === "datetime-local" ? 1 : undefined}
      />
      {message(name)}
    </Field>
  );
  const multiline = (name: string, label: string, value?: string | null) => (
    <Field label={label}>
      <Textarea name={name} defaultValue={value ?? ""} aria-invalid={!!errorFor(name)} />
      {message(name)}
    </Field>
  );

  return (
    <Page
      title={existing ? "Edit opportunity" : "Submit an opportunity"}
      intro={
        resubmitting
          ? "Update the requested information and send your listing back for review."
          : existing?.organisation_id && existing.status === "approved"
            ? "Saving changes sends this approved listing back to review."
            : "Share an opportunity and its official source so it can be reviewed."
      }
      actions={
        <Button variant="outline" asChild>
          <Link to="/my-submissions">My submissions</Link>
        </Button>
      }
    >
      {existing && (resubmitting || existing.status === "rejected") && (
        <div className="mb-4 max-w-3xl">
          <ReviewNotes id={existing.id} userId={userId} />
        </div>
      )}
      <form
        noValidate
        className="max-w-3xl"
        onSubmit={(event) => {
          event.preventDefault();
          if (save.isPending || fileError) return;
          const result = validateSubmission(new FormData(event.currentTarget), tags, existing, org);
          if (!result.success) {
            setErrors(result.error.flatten().fieldErrors);
            return;
          }
          setErrors({});
          save.mutate(result.data);
        }}
      >
        <fieldset disabled={save.isPending} className="space-y-5">
          <FormSection title="Listing details">
            {!existing && official && (
              <label className="flex min-h-11 items-center gap-2 rounded-xl bg-lavender-soft px-3 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={asOrganisation}
                  className="size-4 accent-primary-strong"
                  onChange={(e) => setAsOrganisation(e.target.checked)}
                />{" "}
                Publish as {official.name}
              </label>
            )}
            {textbox("title", "Opportunity title", existing?.title)}
            <Field label="Category">
              <select
                name="category"
                className={selectClass}
                defaultValue={existing?.category_slug ?? ""}
                aria-invalid={!!errorFor("category")}
              >
                <option value="">Choose a category</option>
                {categories.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {option.name}
                  </option>
                ))}
              </select>
              {message("category")}
            </Field>
            <div hidden={!!org}>
              <Field label="Organisation name">
                <Input
                  name="organisationName"
                  defaultValue={existing?.organisation_name ?? ""}
                  readOnly={!!existing?.organisation_id}
                  aria-invalid={!!errorFor("organisationName")}
                />
                {message("organisationName")}
              </Field>
            </div>
            {multiline("description", "Description", existing?.description)}
            {textbox("sourceUrl", "Official source URL", existing?.source_url, "url")}
            {multiline("eligibility", "Eligibility requirements", existing?.eligibility)}
          </FormSection>
          <FormSection title="Location, dates and funding">
            <Field label="Mode">
              <select
                name="mode"
                className={selectClass}
                defaultValue={existing?.format ?? ""}
                aria-invalid={!!errorFor("mode")}
              >
                <option value="">Choose a mode</option>
                {Object.entries(modes).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {message("mode")}
            </Field>
            {textbox("location", "Location or online platform", existing?.location)}
            <div className="grid gap-3 sm:grid-cols-2">
              {textbox("city", "City (optional)", existing?.city)}
              {textbox("country", "Country (optional)", existing?.country)}
            </div>
            <p className="text-sm text-muted-foreground">
              Dates and times use Pakistan Standard Time.
            </p>
            {textbox(
              "deadline",
              "Application deadline (optional)",
              toLocalInput(existing?.deadline),
              "datetime-local",
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {textbox(
                "starts",
                "Event start (optional)",
                toLocalInput(existing?.starts_at),
                "datetime-local",
              )}
              {textbox(
                "ends",
                "Event end (optional)",
                toLocalInput(existing?.ends_at),
                "datetime-local",
              )}
            </div>
            {textbox("cost", "Cost or funding", existing?.cost_or_funding)}
          </FormSection>
          <FormSection title="Interest tags and cover">
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Interest tags</legend>
              {interests.length ? (
                <Chips options={interests} selected={tags} onChange={setTags} />
              ) : (
                <p className="text-sm text-muted-foreground">No interest tags are available.</p>
              )}
              {message("tags")}
            </fieldset>
            <div>
              <Field label="Cover image (optional)">
                <Input
                  type="file"
                  accept={coverTypes}
                  aria-invalid={!!fileError}
                  onChange={(event) => {
                    const selected = event.target.files?.[0] ?? null;
                    setFile(selected);
                    setFileError(selected ? coverError(selected) : null);
                  }}
                />
              </Field>
              <p className="mt-1 text-sm text-muted-foreground">
                JPEG, PNG, WebP or GIF up to 5 MiB.
              </p>
              {existing?.cover_url && (
                <label className="mt-2 flex gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={removeCover}
                    onChange={(event) => setRemoveCover(event.target.checked)}
                  />{" "}
                  Remove existing cover
                </label>
              )}
              {fileError && (
                <p role="alert" className="mt-1 text-sm text-destructive">
                  {fileError}
                </p>
              )}
            </div>
          </FormSection>
          {!!Object.keys(errors).length && (
            <p role="alert" className="text-sm text-destructive">
              Check the highlighted fields and try again.
            </p>
          )}
          {save.isError && (
            <p role="alert" className="text-sm text-destructive">
              {errorText(save.error, "We couldn’t save your listing. Try again.")}
            </p>
          )}
          {uploading && (
            <div role="status" className="space-y-1 text-sm">
              <label htmlFor="cover-progress">Uploading cover image…</label>
              <progress
                id="cover-progress"
                className="block w-full max-w-sm accent-primary-strong"
              />
            </div>
          )}
          <Button
            type="submit"
            className="bg-primary-strong"
            disabled={save.isPending || !!fileError}
          >
            <Upload aria-hidden />{" "}
            {save.isPending
              ? uploading
                ? "Uploading…"
                : "Saving…"
              : resubmitting
                ? "Save and resubmit"
                : existing
                  ? "Save changes"
                  : "Submit for review"}
          </Button>
        </fieldset>
      </form>
    </Page>
  );
}
