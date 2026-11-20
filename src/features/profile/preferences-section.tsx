import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories as experienceCategories } from "@/features/experiences/data";
import { Chips } from "@/features/onboarding/choices";
import {
  interestCatalog,
  onboardingPreferences,
  opportunityCategories,
  saveInterests,
  savePreferences,
  selectedInterests,
} from "@/features/onboarding/data";
import type { Enums, TablesUpdate } from "@/integrations/supabase/types";

import { optionalText } from "./data";
import {
  ProfileSection,
  ProfileValue,
  SectionFields,
  SectionStatus,
  useSectionEditor,
  type SectionAccess,
} from "./section-editor";

const budgets = { any: "Any budget", free_only: "Free only", low: "Low cost" } as const;
const comfortLabels = { quiet: "Quiet", small_group: "Small group", social: "Social" } as const;
const selectClass =
  "block min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm";

type PreferenceDraft = {
  interests: string[];
  categories: string[];
  experienceCategories: Enums<"experience_category">[];
  city: string;
  wantsOnline: boolean;
  budget: Enums<"budget_preference">;
  comfort: keyof typeof comfortLabels | "";
};

function equalSelections(a: string[], b: string[]) {
  return a.length === b.length && a.every((value) => b.includes(value));
}

export function PreferencesSection(access: SectionAccess) {
  const userId = access.userId;
  const queryClient = useQueryClient();
  const prefsQuery = onboardingPreferences(userId);
  const interestsQuery = selectedInterests(userId);
  const prefs = useQuery(prefsQuery);
  const selected = useQuery(interestsQuery);
  const interests = useQuery(interestCatalog);
  const categories = useQuery(opportunityCategories);
  const editor = useSectionEditor(access, async (draft: PreferenceDraft, initial) => {
    const patch: TablesUpdate<"user_preferences"> = {};
    if (!equalSelections(draft.categories, initial.categories))
      patch.opportunity_category_slugs = draft.categories;
    if (!equalSelections(draft.experienceCategories, initial.experienceCategories))
      patch.experience_category_slugs = draft.experienceCategories;
    if (draft.city !== initial.city) patch.city = optionalText(draft.city);
    if (draft.wantsOnline !== initial.wantsOnline) patch.wants_online = draft.wantsOnline;
    if (draft.budget !== initial.budget) patch.budget_preference = draft.budget;
    if (draft.comfort !== initial.comfort) patch.social_comfort = draft.comfort || null;
    try {
      if (!equalSelections(draft.interests, initial.interests)) {
        await saveInterests(userId, draft.interests);
        queryClient.setQueryData(interestsQuery.queryKey, draft.interests);
      }
      if (Object.keys(patch).length) {
        const saved = await savePreferences(userId, patch);
        queryClient.setQueryData(prefsQuery.queryKey, saved);
      }
    } catch (error) {
      // Interest selections and preferences are separate writes. Reload both if a save is interrupted.
      void queryClient.invalidateQueries({ queryKey: interestsQuery.queryKey });
      void queryClient.invalidateQueries({ queryKey: prefsQuery.queryKey });
      throw error;
    }
  });

  const loading =
    prefs.isPending || selected.isPending || interests.isPending || categories.isPending;
  const error = prefs.isError || selected.isError || interests.isError || categories.isError;
  const current: PreferenceDraft | null =
    prefs.data && selected.data && interests.data && categories.data
      ? {
          interests: selected.data,
          categories: prefs.data.opportunity_category_slugs.filter((slug) =>
            categories.data.some((item) => item.slug === slug),
          ),
          experienceCategories: prefs.data.experience_category_slugs ?? [],
          city: prefs.data.city ?? "",
          wantsOnline: prefs.data.wants_online,
          budget: prefs.data.budget_preference,
          comfort:
            prefs.data.social_comfort === "flexible" ? "" : (prefs.data.social_comfort ?? ""),
        }
      : null;
  const draft = editor.draft;
  const displayNames = (slugs: string[], options: { slug: string; name: string }[]) =>
    slugs.map((slug) => options.find((option) => option.slug === slug)?.name ?? slug).join(", ");

  return (
    <ProfileSection
      id="preferences"
      title="Preferences"
      description="Choose what you’d like to see in your recommendations."
      action={
        !editor.editing &&
        current && (
          <Button
            type="button"
            variant="outline"
            disabled={access.locked}
            onClick={() => editor.start(current)}
          >
            Edit
          </Button>
        )
      }
    >
      {draft ? (
        <SectionFields
          pending={editor.pending}
          canSave={editor.dirty}
          error={editor.error}
          onSave={editor.save}
          onCancel={editor.cancel}
        >
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Interests</legend>
            {interests.data?.length ? (
              <Chips
                options={interests.data}
                selected={draft.interests}
                onChange={(values) => editor.setDraft({ ...draft, interests: values })}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No interests are available yet.</p>
            )}
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Opportunity categories</legend>
            {categories.data?.length ? (
              <Chips
                options={categories.data}
                selected={draft.categories}
                onChange={(values) => editor.setDraft({ ...draft, categories: values })}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No categories are available yet.</p>
            )}
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Experience categories</legend>
            <Chips
              options={[...experienceCategories]}
              selected={draft.experienceCategories}
              onChange={(values) =>
                editor.setDraft({
                  ...draft,
                  experienceCategories: experienceCategories
                    .filter(({ slug }) => values.includes(slug))
                    .map(({ slug }) => slug),
                })
              }
            />
          </fieldset>
          <div>
            <label htmlFor="profile-city" className="mb-1.5 block text-sm font-medium">
              City
            </label>
            <Input
              id="profile-city"
              value={draft.city}
              onChange={(event) => editor.setDraft({ ...draft, city: event.target.value })}
            />
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={draft.wantsOnline}
              className="size-4 accent-primary-strong"
              onChange={(event) => editor.setDraft({ ...draft, wantsOnline: event.target.checked })}
            />
            Include online opportunities
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="profile-budget" className="mb-1.5 block text-sm font-medium">
                Budget
              </label>
              <select
                id="profile-budget"
                className={selectClass}
                value={draft.budget}
                onChange={(event) =>
                  editor.setDraft({
                    ...draft,
                    budget: event.target.value as PreferenceDraft["budget"],
                  })
                }
              >
                {Object.entries(budgets).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="profile-comfort" className="mb-1.5 block text-sm font-medium">
                Social comfort
              </label>
              <select
                id="profile-comfort"
                className={selectClass}
                value={draft.comfort}
                onChange={(event) =>
                  editor.setDraft({
                    ...draft,
                    comfort: event.target.value as PreferenceDraft["comfort"],
                  })
                }
              >
                <option value="">Prefer not to say</option>
                {Object.entries(comfortLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </SectionFields>
      ) : current ? (
        <dl className="grid gap-4 sm:grid-cols-2">
          <ProfileValue
            label="Interests"
            value={displayNames(current.interests, interests.data ?? [])}
          />
          <ProfileValue
            label="Opportunity categories"
            value={displayNames(current.categories, categories.data ?? [])}
          />
          <ProfileValue label="City" value={current.city} />
          <ProfileValue
            label="Experience categories"
            value={displayNames(current.experienceCategories, [...experienceCategories])}
          />
          <ProfileValue
            label="Online opportunities"
            value={current.wantsOnline ? "Included" : "Not preferred"}
          />
          <ProfileValue label="Budget" value={budgets[current.budget]} />
          <ProfileValue
            label="Social comfort"
            value={current.comfort ? comfortLabels[current.comfort] : "Prefer not to say"}
          />
        </dl>
      ) : (
        <SectionStatus
          loading={loading}
          error={error}
          onRetry={() => {
            void Promise.all([
              prefs.refetch(),
              selected.refetch(),
              interests.refetch(),
              categories.refetch(),
            ]);
          }}
        />
      )}
      {editor.saved && (
        <p role="status" className="mt-4 text-sm font-semibold text-success">
          Preferences saved.
        </p>
      )}
    </ProfileSection>
  );
}
