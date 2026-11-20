import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Check, Compass } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ErrorState, LoadingState } from "@/components/layout/page-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authQueryKeys, useAuth } from "@/features/auth/auth-provider";
import type { Enums, Tables } from "@/integrations/supabase/types";
import { requireSupabase } from "@/lib/backend";

import { Chips, Choice } from "./choices";
import {
  interestCatalog,
  onboardingPreferences,
  opportunityCategories,
  saveInterests,
  savePreferences,
  saveUsername,
  selectedInterests,
  usernamePattern,
} from "./data";

const cities = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Peshawar", "Quetta"];
const budgetOptions = { free_only: "Free only", low: "Low cost", any: "Any budget" } as const;
const comfortOptions = { quiet: "Quiet", small_group: "Small group", social: "Social" } as const;
const steps = [
  { title: "What should we call you?", hint: "Your username is the only name shown publicly." },
  { title: "What are you interested in?", hint: "Choose as many as you like." },
  {
    title: "What opportunities are you looking for?",
    hint: "Pick the categories you’d like to see.",
  },
  { title: "Which city are you in?", hint: "We’ll use your city to find nearby opportunities." },
  {
    title: "Would you like online opportunities?",
    hint: "Online opportunities can appear alongside local ones.",
  },
  { title: "What’s your budget?", hint: "Choose what works for you." },
  {
    title: "What social setting feels right?",
    hint: "This is optional. You can skip it and still discover opportunities.",
  },
] as const;

export function OnboardingWizard() {
  const { user, profile, profileError, isProfileLoading, refresh } = useAuth();
  const preferences = useQuery({ ...onboardingPreferences(user?.id ?? ""), enabled: !!user });
  const interests = useQuery(interestCatalog);
  const categories = useQuery(opportunityCategories);
  const selections = useQuery({ ...selectedInterests(user?.id ?? ""), enabled: !!user });

  if (
    preferences.isPending ||
    interests.isPending ||
    categories.isPending ||
    selections.isPending ||
    isProfileLoading
  ) {
    return <LoadingState label="Getting your setup ready…" />;
  }
  if (
    preferences.isError ||
    interests.isError ||
    categories.isError ||
    selections.isError ||
    profileError ||
    !profile ||
    !user
  ) {
    return (
      <ErrorState
        message="We couldn’t load your setup."
        onRetry={() => {
          void Promise.all([
            preferences.refetch(),
            interests.refetch(),
            categories.refetch(),
            selections.refetch(),
            refresh(),
          ]);
        }}
      />
    );
  }
  return (
    <Wizard
      key={user.id}
      profile={profile}
      preferences={preferences.data}
      interests={interests.data}
      categories={categories.data}
      selections={selections.data}
    />
  );
}

function Wizard({
  profile,
  preferences,
  interests,
  categories,
  selections,
}: {
  profile: Tables<"profiles">;
  preferences: Tables<"user_preferences">;
  interests: { slug: string; name: string }[];
  categories: { slug: string; name: string }[];
  selections: string[];
}) {
  const userId = profile.id;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const heading = useRef<HTMLHeadingElement>(null);
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState(profile.username);
  const [debouncedName, setDebouncedName] = useState(username);
  const [interestSlugs, setInterestSlugs] = useState(selections);
  const [categorySlugs, setCategorySlugs] = useState(
    preferences.opportunity_category_slugs.filter((slug) =>
      categories.some((category) => category.slug === slug),
    ),
  );
  const [city, setCity] = useState(preferences.city ?? "");
  const [cityChoice, setCityChoice] = useState(cities.includes(city) ? city : city ? "Other" : "");
  const [online, setOnline] = useState(preferences.wants_online);
  const [budget, setBudget] = useState(preferences.budget_preference);
  const [comfort, setComfort] = useState<Exclude<Enums<"social_comfort">, "flexible"> | null>(
    preferences.social_comfort === "flexible" ? null : preferences.social_comfort,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedName(username), 300);
    return () => window.clearTimeout(timer);
  }, [username]);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  const validName = usernamePattern.test(username);
  const sameName = username === profile.username;
  const checking = step === 0 && validName && !sameName;
  const availability = useQuery({
    queryKey: ["username-availability", debouncedName],
    queryFn: async ({ signal }) => {
      const { data, error } = await requireSupabase()
        .rpc("is_username_available", { p_username: debouncedName })
        .abortSignal(signal);
      if (error) throw error;
      return data;
    },
    enabled: checking && debouncedName === username,
    retry: false,
  });
  const nameAvailable =
    validName &&
    (sameName ||
      (debouncedName === username && availability.data === true && !availability.isError));
  const last = step === steps.length - 1;
  const currentStep = steps[step]!;
  const canAdvance = step === 0 ? nameAvailable : step !== 3 || (!!cityChoice && !!city.trim());

  const save = useMutation({
    mutationFn: async (skipComfort: boolean) => {
      const storePreferences = async (values: Parameters<typeof savePreferences>[1]) => {
        const updated = await savePreferences(userId, values);
        queryClient.setQueryData(onboardingPreferences(userId).queryKey, updated);
      };

      switch (step) {
        case 0:
          if (!sameName) {
            const updated = await saveUsername(userId, username);
            queryClient.setQueryData(authQueryKeys.profile(userId), updated);
          }
          break;
        case 1:
          await saveInterests(userId, interestSlugs);
          queryClient.setQueryData(selectedInterests(userId).queryKey, interestSlugs);
          break;
        case 2:
          await storePreferences({ opportunity_category_slugs: categorySlugs });
          break;
        case 3:
          await storePreferences({ city: city.trim() });
          break;
        case 4:
          await storePreferences({ wants_online: online });
          break;
        case 5:
          await storePreferences({ budget_preference: budget });
          break;
        case 6:
          await queryClient.invalidateQueries({
            queryKey: ["recommendations", userId],
            refetchType: "none",
          });
          await storePreferences({
            social_comfort: skipComfort ? null : comfort,
            onboarding_completed: true,
          });
          break;
      }
    },
    onSuccess: async () => {
      if (last) await navigate({ to: "/dashboard", replace: true });
      else setStep((value) => value + 1);
    },
  });

  const status = !validName
    ? "Use 3–20 lowercase letters, numbers or underscores."
    : sameName
      ? "This is your current username."
      : debouncedName !== username || availability.isFetching || availability.isPending
        ? "Checking availability…"
        : availability.isError
          ? "We couldn’t check availability."
          : availability.data
            ? "Username available."
            : "That username is taken.";

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-9 sm:px-8 sm:py-14">
      <div className="rounded-4xl border bg-card p-6 shadow-soft sm:p-9">
        <div className="mb-7">
          <div className="mb-3 flex items-center justify-between gap-3 text-sm font-semibold text-primary-strong">
            <span className="flex items-center gap-2">
              <Compass className="size-4" aria-hidden />{" "}
              Set up your account
            </span>
            <span id="setup-progress">
              Step {step + 1} of {steps.length}
            </span>
          </div>
          <progress
            aria-labelledby="setup-progress"
            max={steps.length}
            value={step + 1}
            className="block h-2 w-full overflow-hidden rounded-full bg-lavender-soft [&::-webkit-progress-bar]:bg-lavender-soft [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary"
          />
        </div>
        <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold sm:text-3xl">
          {currentStep.title}
        </h1>
        <p className="mt-2 text-muted-foreground">{currentStep.hint}</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (canAdvance && !save.isPending && (!last || comfort)) save.mutate(false);
          }}
        >
          <fieldset disabled={save.isPending} className="mt-6 space-y-3">
            <legend className="sr-only">{currentStep.title}</legend>
            {step === 0 && (
              <>
                <label htmlFor="setup-username" className="text-sm font-medium">
                  Username
                </label>
                <Input
                  id="setup-username"
                  value={username}
                  maxLength={20}
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-describedby="username-status"
                  onChange={(event) => {
                    save.reset();
                    setUsername(event.target.value);
                  }}
                />
                <p
                  id="username-status"
                  role="status"
                  className="flex items-center gap-1.5 text-sm text-muted-foreground"
                >
                  {nameAvailable && <Check className="size-4 text-success" aria-hidden />}
                  {status}
                </p>
                {checking && availability.isError && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void availability.refetch()}
                  >
                    Check again
                  </Button>
                )}
              </>
            )}
            {step === 1 &&
              (interests.length ? (
                <Chips options={interests} selected={interestSlugs} onChange={setInterestSlugs} />
              ) : (
                <p className="text-muted-foreground">
                  No interests are available yet. You can add them later.
                </p>
              ))}
            {step === 2 &&
              (categories.length ? (
                <Chips options={categories} selected={categorySlugs} onChange={setCategorySlugs} />
              ) : (
                <p className="text-muted-foreground">
                  No categories are available yet. You can choose them later.
                </p>
              ))}
            {step === 3 && (
              <>
                <label htmlFor="setup-city" className="text-sm font-medium">
                  City
                </label>
                <select
                  id="setup-city"
                  value={cityChoice}
                  className="block min-h-11 w-full rounded-xl border border-input bg-background px-3"
                  onChange={(event) => {
                    setCityChoice(event.target.value);
                    setCity(event.target.value === "Other" ? "" : event.target.value);
                  }}
                >
                  <option value="" disabled>
                    Choose your city
                  </option>
                  {[...cities, "Other"].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {cityChoice === "Other" && (
                  <>
                    <label htmlFor="setup-other-city" className="text-sm font-medium">
                      Enter your city
                    </label>
                    <Input
                      id="setup-other-city"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                    />
                  </>
                )}
              </>
            )}
            {step === 4 && (
              <>
                <Choice name="online" checked={online} onChange={() => setOnline(true)}>
                  Yes, include online opportunities
                </Choice>
                <Choice name="online" checked={!online} onChange={() => setOnline(false)}>
                  No, focus on in-person opportunities
                </Choice>
              </>
            )}
            {step === 5 &&
              (Object.keys(budgetOptions) as (keyof typeof budgetOptions)[]).map((value) => (
                <Choice
                  key={value}
                  name="budget"
                  checked={budget === value}
                  onChange={() => setBudget(value)}
                >
                  {budgetOptions[value]}
                </Choice>
              ))}
            {step === 6 &&
              (Object.keys(comfortOptions) as (keyof typeof comfortOptions)[]).map((value) => (
                <Choice
                  key={value}
                  name="comfort"
                  checked={comfort === value}
                  onChange={() => setComfort(value)}
                >
                  {comfortOptions[value]}
                </Choice>
              ))}
          </fieldset>
          {save.isError && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-destructive-soft px-4 py-3 text-sm text-destructive"
            >
              {save.error instanceof Error
                ? save.error.message
                : "We couldn’t save this step. Please try again."}
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
            <Button
              type="button"
              variant="outline"
              disabled={step === 0 || save.isPending}
              onClick={() => {
                save.reset();
                setStep((value) => value - 1);
              }}
            >
              Back
            </Button>
            <div className="flex flex-wrap gap-2">
              {last && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={save.isPending}
                  onClick={() => save.mutate(true)}
                >
                  Skip
                </Button>
              )}
              <Button
                type="submit"
                className="bg-primary-strong"
                disabled={!canAdvance || save.isPending || (last && !comfort)}
              >
                {save.isPending ? "Saving…" : last ? "Finish" : "Next"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
