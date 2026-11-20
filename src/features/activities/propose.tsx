import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { interestCatalog } from "@/features/opportunities/data";
import { coverError, uploadCover } from "@/features/opportunities/submission-data";
import { Field, Page, selectClass } from "@/features/opportunities/ui";
import { pakistanTime } from "@/features/planning/data";
import { activityKey, backend, label, levels, participation, result, social } from "./data";

const proposal = z
  .object({
    title: z.string().trim().min(1).max(160),
    hobby: z.string().min(1),
    description: z.string().trim().min(1).max(5000),
    city: z.string().trim().min(1).max(120),
    venue: z.string().trim().max(200),
    min: z.coerce.number().int().min(1).max(12),
    max: z.coerce.number().int().min(1).max(12),
    budget: z.coerce.number().finite().min(0),
    social: z.enum(social),
    participation: z.enum(participation),
    level: z.enum(levels),
    dates: z
      .array(
        z
          .string()
          .refine(
            (value) => Date.parse(value) > Date.now(),
            "Choose a future proposed date and time.",
          ),
      )
      .min(1)
      .max(12),
  })
  .refine((values) => values.min <= values.max, {
    message: "Minimum group size must be at most the maximum.",
  });

export function ProposeActivity({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const catalog = useQuery(interestCatalog);
  const [dates, setDates] = useState([0]);
  const nextDate = useRef(1);
  const [validation, setValidation] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const submit = useMutation({
    mutationFn: async ({
      values,
      file,
    }: {
      values: z.infer<typeof proposal>;
      file: File | null;
    }) => {
      let cover: string | undefined;
      if (file) {
        setUploading(true);
        try {
          cover = await uploadCover(userId, file);
        } finally {
          setUploading(false);
        }
      }
      return result(
        await backend().rpc("create_activity", {
          p_title: values.title,
          p_interest_slug: values.hobby,
          p_description: values.description,
          p_city: values.city,
          p_min_participants: values.min,
          p_max_participants: values.max,
          p_estimated_budget: values.budget,
          p_social_level: values.social,
          p_participation: values.participation,
          p_experience_level: values.level,
          p_proposed_dates: values.dates,
          ...(values.venue ? { p_suggested_venue: values.venue } : {}),
          ...(cover ? { p_cover_url: cover } : {}),
        }),
      );
    },
    onSuccess: async (id) => {
      void client.invalidateQueries({ queryKey: activityKey(userId) });
      await navigate({ to: "/community/$id", params: { id } });
    },
  });

  return (
    <Page
      title="Propose an activity"
      intro="Start with a shared hobby and a few ideas for when to meet."
    >
      <form
        className="max-w-3xl space-y-4 rounded-3xl border bg-card p-4 shadow-soft sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          setValidation(null);
          submit.reset();
          const form = new FormData(event.currentTarget);
          const parsed = proposal.safeParse({
            ...Object.fromEntries(form),
            dates: form.getAll("date").map((value) => pakistanTime(String(value))),
          });
          const file = form.get("cover");
          const image = file instanceof File && file.size ? file : null;
          if (!parsed.success)
            return setValidation(parsed.error.issues[0]?.message ?? "Check your activity details.");
          if (image) {
            const error = coverError(image);
            if (error) return setValidation(error);
          }
          submit.mutate({ values: parsed.data, file: image });
        }}
      >
        <fieldset disabled={submit.isPending} className="min-w-0 space-y-4">
          <Field label="Title">
            <Input name="title" required maxLength={160} />
          </Field>
          <Field label="Hobby category">
            <select name="hobby" className={selectClass} defaultValue="" required>
              <option value="">Choose a hobby</option>
              {catalog.data?.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          {catalog.isPending && <p role="status">Loading hobbies…</p>}
          {catalog.isError && (
            <p role="alert">
              Hobbies couldn’t load.{" "}
              <button type="button" className="text-link" onClick={() => void catalog.refetch()}>
                Retry
              </button>
            </p>
          )}
          <Field label="Description">
            <Textarea name="description" required maxLength={5000} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="City">
              <Input name="city" required maxLength={120} />
            </Field>
            <Field label="Suggested venue (optional)">
              <Input name="venue" maxLength={200} />
            </Field>
            <Field label="Minimum group size">
              <Input type="number" name="min" min="1" max="12" defaultValue="2" required />
            </Field>
            <Field label="Maximum group size">
              <Input type="number" name="max" min="1" max="12" defaultValue="6" required />
            </Field>
            <Field label="Budget per person (PKR)">
              <Input type="number" name="budget" min="0" step="0.01" defaultValue="0" required />
            </Field>
            <Select name="social" title="Social level" values={social} />
            <Select name="participation" title="Participation" values={participation} />
            <Select name="level" title="Experience level" values={levels} initial="any" />
          </div>
          <p className="text-sm text-muted-foreground">
            Women-only activities are limited to eligible members. Your private profile details are
            kept private.
          </p>
          <fieldset className="min-w-0 space-y-2">
            <legend className="font-semibold">Proposed dates (Pakistan time)</legend>
            {dates.map((date, index) => (
              <div
                key={date}
                className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
              >
                <Field label={`Date and time option ${index + 1}`}>
                  <Input name="date" type="datetime-local" required />
                </Field>
                {dates.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setDates(dates.filter((value) => value !== date))}
                  >
                    Remove option {index + 1}
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={dates.length === 12}
              onClick={() => {
                const date = nextDate.current++;
                setDates([...dates, date]);
              }}
            >
              Add another date
            </Button>
          </fieldset>
          <Field label="Cover image (optional, up to 5 MiB)">
            <Input type="file" name="cover" accept="image/jpeg,image/png,image/webp,image/gif" />
          </Field>
          <p className="rounded-xl bg-accent-soft p-3 text-sm">
            For a first meetup, choose a public venue that everyone can access comfortably.
          </p>
          <Button type="submit" disabled={!catalog.isSuccess}>
            {uploading ? "Uploading image…" : submit.isPending ? "Creating…" : "Propose activity"}
          </Button>
        </fieldset>
        {(validation || submit.error) && (
          <p role="alert" className="text-sm text-destructive">
            {validation ?? submit.error?.message}
          </p>
        )}
      </form>
    </Page>
  );
}

function Select({
  name,
  title,
  values,
  initial,
}: {
  name: string;
  title: string;
  values: readonly string[];
  initial?: string;
}) {
  return (
    <Field label={title}>
      <select name={name} className={selectClass} defaultValue={initial ?? values[0]}>
        {values.map((value) => (
          <option key={value} value={value}>
            {label(value)}
          </option>
        ))}
      </select>
    </Field>
  );
}
