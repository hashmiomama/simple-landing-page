import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CircleCheck } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { EmptyState, ErrorState } from "@/components/layout/page-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/auth-provider";
import { errorText, interestCatalog, safeWebUrl } from "@/features/opportunities/data";
import {
  CardsLoading,
  Chips,
  Field,
  FormSection,
  Page,
  selectClass,
} from "@/features/opportunities/ui";
import { requireSupabase } from "@/lib/backend";

import {
  categories,
  categorySchema,
  mapPoint,
  ownExperience,
  socialLabels,
  socialSchema,
  type Experience,
} from "./data";
import { ExperienceMap } from "./map";

const required = z.string().trim().min(1, "This field is required.");
const number = (min: number, max: number) =>
  required.transform(Number).pipe(z.number().finite().min(min).max(max));
const url = z
  .string()
  .trim()
  .refine((value) => !value || safeWebUrl(value) !== null, "Enter a valid HTTP or HTTPS URL.");
const formSchema = z.object({
  title: required,
  description: required,
  category: categorySchema,
  city: required,
  location: required,
  latitude: number(-90, 90),
  longitude: number(-180, 180),
  cost: number(0, 9999999999.99),
  duration: required.transform(Number).pipe(z.number().int().min(1).max(2147483647)),
  social: socialSchema,
  safety: required,
  accessibility: required,
  hours: z.string().trim(),
  cover: url,
  source: url,
  tags: z.array(z.string()).min(1, "Choose at least one interest tag."),
});

export function ExperienceSubmission({ id }: { id?: string }) {
  const { user } = useAuth();
  const valid = !!id && z.string().uuid().safeParse(id).success;
  const existing = useQuery({
    ...ownExperience(user?.id ?? "", id ?? ""),
    enabled: !!user && valid,
  });
  const catalog = useQuery(interestCatalog);
  const title = id ? "Edit experience" : "Recommend an experience";
  if (!user) return null;
  if (catalog.isPending || (valid && existing.isPending))
    return (
      <Page title={title}>
        <CardsLoading label="Loading experience form" />
      </Page>
    );
  if (catalog.isError || existing.isError)
    return (
      <Page title={title}>
        <ErrorState
          message="Couldn’t load the experience form."
          onRetry={() => {
            void catalog.refetch();
            if (valid) void existing.refetch();
          }}
        />
      </Page>
    );
  if (id && !existing.data)
    return (
      <Page title={title} intro="This experience is unavailable or can no longer be edited.">
        <Button variant="soft" asChild>
          <Link to="/my-experience-recommendations">My experience recommendations</Link>
        </Button>
      </Page>
    );
  return (
    <ExperienceForm
      key={id ?? user.id}
      title={title}
      userId={user.id}
      item={existing.data ?? null}
      startingTags={
        existing.data?.solo_experience_tags.map(({ interest_slug }) => interest_slug) ?? []
      }
      catalog={catalog.data ?? []}
    />
  );
}

function ExperienceForm({
  title,
  userId,
  item,
  startingTags,
  catalog,
}: {
  title: string;
  userId: string;
  item: Experience | null;
  startingTags: string[];
  catalog: { slug: string; name: string }[];
}) {
  const client = useQueryClient();
  const [tags, setTags] = useState(startingTags);
  const [latitude, setLatitude] = useState(item?.latitude?.toString() ?? "");
  const [longitude, setLongitude] = useState(item?.longitude?.toString() ?? "");
  const [showMap, setShowMap] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const point = latitude && longitude ? mapPoint(Number(latitude), Number(longitude)) : null;
  const save = useMutation({
    mutationFn: async (value: z.output<typeof formSchema>) => {
      const backend = requireSupabase();
      if (!item) {
        const { error } = await backend.rpc("recommend_experience", {
          p_title: value.title,
          p_description: value.description,
          p_category: value.category,
          p_city: value.city,
          p_location: value.location,
          p_latitude: value.latitude,
          p_longitude: value.longitude,
          p_cost: value.cost,
          p_duration_minutes: value.duration,
          p_social_level: value.social,
          p_safety_considerations: value.safety,
          p_accessibility_information: value.accessibility,
          p_interest_slugs: value.tags,
          ...(value.hours ? { p_opening_hours: value.hours } : {}),
          ...(value.cover ? { p_cover_url: value.cover } : {}),
          ...(value.source ? { p_source_url: value.source } : {}),
        });
        if (error) throw error;
        return;
      }
      const { error } = await backend
        .from("solo_experiences")
        .update({
          title: value.title,
          description: value.description,
          category: value.category,
          city: value.city,
          location: value.location,
          latitude: value.latitude,
          longitude: value.longitude,
          cost: value.cost,
          duration_minutes: value.duration,
          social_level: value.social,
          safety_considerations: value.safety,
          accessibility_information: value.accessibility,
          opening_hours: value.hours || null,
          cover_url: value.cover || null,
          source_url: value.source || null,
        })
        .eq("id", item.id)
        .eq("submitted_by", userId)
        .select("id")
        .single();
      if (error) throw error;
      if (
        value.tags.length !== startingTags.length ||
        value.tags.some((tag) => !startingTags.includes(tag))
      ) {
        const { error: tagError } = await backend.rpc("set_experience_tags", {
          p_id: item.id,
          p_interest_slugs: value.tags,
        });
        if (tagError)
          throw new Error(`Details were saved. Tags could not be saved. ${tagError.message}`);
      }
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["experiences"] });
      void client.invalidateQueries({ queryKey: ["admin"] });
    },
  });
  if (save.isSuccess)
    return (
      <Page title={item ? "Changes saved" : "Experience recommended"}>
        <EmptyState
          icon={CircleCheck}
          title={item ? "Your experience was updated" : "Thanks for sharing an experience"}
          description={
            item?.status === "needs_info"
              ? "Your changes are saved in the needs-information queue."
              : item?.status === "rejected"
                ? "Your changes are saved. The experience is still marked as rejected."
                : "A moderator will review the recommendation before it appears in Experiences."
          }
          action={
            <Button asChild className="bg-primary-strong">
              <Link to="/my-experience-recommendations">My experience recommendations</Link>
            </Button>
          }
        />
      </Page>
    );

  const message = (name: string) =>
    errors[name]?.[0] && <span className="text-destructive">{errors[name]?.[0]}</span>;
  const box = (name: string, label: string, value?: string | number | null, type = "text") => (
    <Field label={label}>
      <Input
        name={name}
        type={type}
        defaultValue={value ?? ""}
        aria-invalid={!!errors[name]}
        step={type === "number" ? "any" : undefined}
      />
      {message(name)}
    </Field>
  );
  const text = (name: string, label: string, value?: string | null) => (
    <Field label={label}>
      <Textarea name={name} defaultValue={value ?? ""} aria-invalid={!!errors[name]} />
      {message(name)}
    </Field>
  );
  return (
    <Page
      title={title}
      intro="Share something people can comfortably try on their own."
      actions={
        <Button asChild variant="outline">
          <Link to="/my-experience-recommendations">My experience recommendations</Link>
        </Button>
      }
    >
      <form
        className="max-w-3xl"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (save.isPending) return;
          const parsed = formSchema.safeParse({
            ...Object.fromEntries(new FormData(event.currentTarget)),
            tags,
          });
          if (!parsed.success) {
            setErrors(parsed.error.flatten().fieldErrors);
            return;
          }
          setErrors({});
          save.mutate(parsed.data);
        }}
      >
        <fieldset disabled={save.isPending} className="space-y-5">
          <FormSection title="Experience details">
            {box("title", "Title", item?.title)}
            {text("description", "Description", item?.description)}
            <Field label="Category">
              <select
                className={selectClass}
                name="category"
                defaultValue={item?.category ?? ""}
                aria-invalid={!!errors["category"]}
              >
                <option value="">Choose a category</option>
                {categories.map(({ slug, name }) => (
                  <option key={slug} value={slug}>
                    {name}
                  </option>
                ))}
              </select>
              {message("category")}
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              {box("cost", "Approximate cost (PKR, 0 for free)", item?.cost, "number")}
              {box("duration", "Suggested duration (minutes)", item?.duration_minutes, "number")}
            </div>
            {box("hours", "Opening hours (optional)", item?.opening_hours)}
            <Field label="Social interaction">
              <select
                className={selectClass}
                name="social"
                defaultValue={item?.social_level ?? ""}
                aria-invalid={!!errors["social"]}
              >
                <option value="">Choose a level</option>
                {socialSchema.options.map((value) => (
                  <option key={value} value={value}>
                    {socialLabels[value]}
                  </option>
                ))}
              </select>
              {message("social")}
            </Field>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Interest tags</legend>
              {catalog.length ? (
                <Chips options={catalog} selected={tags} onChange={setTags} />
              ) : (
                <p>No interest tags are available.</p>
              )}
              {message("tags")}
            </fieldset>
          </FormSection>
          <FormSection title="Location">
            <div className="grid gap-3 sm:grid-cols-2">
              {box("city", "City", item?.city)}
              {box("location", "Location name", item?.location)}
            </div>
            <p className="text-sm text-muted-foreground">
              Enter the coordinates directly or select a point on the map.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Latitude">
                <Input
                  name="latitude"
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  aria-invalid={!!errors["latitude"]}
                />
                {message("latitude")}
              </Field>
              <Field label="Longitude">
                <Input
                  name="longitude"
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  aria-invalid={!!errors["longitude"]}
                />
                {message("longitude")}
              </Field>
            </div>
            <Button
              type="button"
              variant="outline"
              aria-expanded={showMap}
              onClick={() => setShowMap(!showMap)}
            >
              {showMap ? "Hide map" : "Pick a location on the map"}
            </Button>
            {showMap && (
              <ExperienceMap
                label="Pick an experience location"
                pins={point ? [{ position: point, title: "Selected location" }] : []}
                onPick={(lat, lng) => {
                  if (!save.isPending) {
                    setLatitude(String(lat));
                    setLongitude(String(lng));
                  }
                }}
              />
            )}
          </FormSection>
          <FormSection title="Safety and accessibility">
            {text("safety", "Safety considerations", item?.safety_considerations)}
            {text("accessibility", "Accessibility information", item?.accessibility_information)}
            {box("cover", "Cover image URL (optional)", item?.cover_url, "url")}
            {box("source", "Source URL (optional)", item?.source_url, "url")}
          </FormSection>
          {!!Object.keys(errors).length && (
            <p role="alert" className="text-destructive">
              Check the highlighted fields.
            </p>
          )}
          {save.isError && (
            <p role="alert" className="text-destructive">
              {errorText(save.error, "Couldn’t save this experience.")}
            </p>
          )}
          <Button type="submit" className="bg-primary-strong">
            {save.isPending ? "Saving…" : item ? "Save changes" : "Submit for review"}
          </Button>
        </fieldset>
      </form>
    </Page>
  );
}
