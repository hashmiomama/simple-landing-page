import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Dashboard } from "@/features/dashboard/dashboard";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";
import { ProfilePage } from "@/features/profile/profile-page";

const fixtures = vi.hoisted(() => ({
  profile: { id: "demo-user", username: "member_1", avatar_url: null, bio: "A demo bio" },
  preferences: {
    budget_preference: "any",
    city: null,
    onboarding_completed: false,
    opportunity_category_slugs: [],
    social_comfort: null,
    wants_online: true,
  },
  navigate: vi.fn(),
  rpc: vi.fn(),
  saveUsername: vi.fn(),
  saveInterests: vi.fn(),
  savePreferences: vi.fn(),
  setOpportunitySaved: vi.fn(),
  savePrivateProfile: vi.fn(),
  savePublicProfile: vi.fn(),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => fixtures.navigate,
  useBlocker: vi.fn(),
  Link: ({ children }: { children: ReactNode }) => <a href="/profile">{children}</a>,
}));
vi.mock("@/features/auth/auth-provider", () => ({
  useAuth: () => ({
    user: { id: fixtures.profile.id },
    profile: fixtures.profile,
    isProfileLoading: false,
    profileError: null,
    refresh: vi.fn(),
  }),
  authQueryKeys: { profile: (id: string) => ["auth", "profile", id] },
}));
vi.mock("@/lib/backend", () => ({ requireSupabase: () => ({ rpc: fixtures.rpc }) }));
vi.mock("@/features/profile/data", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/profile/data")>()),
  savePrivateProfile: fixtures.savePrivateProfile,
  savePublicProfile: fixtures.savePublicProfile,
}));
vi.mock("@/features/onboarding/data", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/onboarding/data")>()),
  saveInterests: fixtures.saveInterests,
  savePreferences: fixtures.savePreferences,
  saveUsername: fixtures.saveUsername,
}));
vi.mock("@/features/dashboard/data", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/dashboard/data")>()),
  setOpportunitySaved: fixtures.setOpportunitySaved,
  savedOpportunities: (userId: string) => ({
    queryKey: ["saved-opportunities", userId],
    queryFn: async () => [],
  }),
  dashboardSummary: (userId: string) => ({
    queryKey: ["dashboard-summary", userId],
    queryFn: async () => ({ savedCount: 0, dueSoon: 0, deadlines: [] }),
  }),
}));

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

const { id } = fixtures.profile;

function makeClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(["preferences", id], fixtures.preferences);
  client.setQueryData(["selected-interests", id], []);
  client.setQueryData(["interest-catalog"], [{ slug: "coding", name: "Coding" }]);
  client.setQueryData(["opportunity-categories"], [{ slug: "hackathons", name: "Hackathons" }]);
  client.setQueryData(["private-profile", id], {
    legal_name: "Demo Name",
    date_of_birth: null,
    gender: null,
  });
  return client;
}

describe("Phase 2 frontend", () => {
  it("checks a new profile username and clears the bio without opening onboarding", async () => {
    const client = makeClient();
    fixtures.rpc.mockReturnValue({ abortSignal: async () => ({ data: true, error: null }) });
    fixtures.savePublicProfile.mockResolvedValue({
      ...fixtures.profile,
      username: "new_name",
      bio: null,
    });
    render(
      <QueryClientProvider client={client}>
        <ProfilePage />
      </QueryClientProvider>,
    );
    const section = within(screen.getByRole("region", { name: "Public profile" }));

    fireEvent.click(section.getByRole("button", { name: "Edit" }));
    fireEvent.change(section.getByLabelText("Username"), { target: { value: "new_name" } });
    expect(section.getByRole("button", { name: "Save" })).toBeDisabled();
    await section.findByText("Username available.");
    fireEvent.change(section.getByLabelText("Bio"), { target: { value: "  " } });
    fireEvent.click(section.getByRole("button", { name: "Save" }));

    expect(await section.findByText("Public profile saved.")).toBeInTheDocument();
    expect(fixtures.rpc).toHaveBeenCalledWith("is_username_available", { p_username: "new_name" });
    expect(fixtures.savePublicProfile).toHaveBeenCalledWith(id, {
      username: "new_name",
      bio: null,
      avatar_url: null,
    });
    expect(fixtures.navigate).not.toHaveBeenCalled();
  });

  it("clears preference fields and selections without changing onboarding completion", async () => {
    const client = makeClient();
    const completed = {
      ...fixtures.preferences,
      onboarding_completed: true,
      city: "Lahore",
      social_comfort: "quiet",
      opportunity_category_slugs: ["hackathons"],
    };
    client.setQueryData(["preferences", id], completed);
    client.setQueryData(["selected-interests", id], ["coding"]);
    fixtures.savePreferences.mockImplementation(async (_userId, patch) => ({
      ...completed,
      ...patch,
    }));
    render(
      <QueryClientProvider client={client}>
        <ProfilePage />
      </QueryClientProvider>,
    );
    const section = within(screen.getByRole("region", { name: "Preferences" }));
    fireEvent.click(section.getByRole("button", { name: "Edit" }));
    fireEvent.click(section.getByRole("button", { name: "Coding" }));
    fireEvent.click(section.getByRole("button", { name: "Hackathons" }));
    fireEvent.change(section.getByLabelText("City"), { target: { value: "" } });
    fireEvent.change(section.getByLabelText("Social comfort"), { target: { value: "" } });
    fireEvent.click(section.getByRole("button", { name: "Save" }));

    expect(await section.findByText("Preferences saved.")).toBeInTheDocument();
    expect(fixtures.saveInterests).toHaveBeenCalledWith(id, []);
    expect(fixtures.savePreferences).toHaveBeenCalledWith(id, {
      city: null,
      social_comfort: null,
      opportunity_category_slugs: [],
    });
    expect(client.getQueryData(["preferences", id])).toMatchObject({ onboarding_completed: true });
  });

  it("guards an unsaved section and saves cleared private fields independently", async () => {
    const client = makeClient();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fixtures.savePrivateProfile.mockResolvedValue({
      legal_name: null,
      date_of_birth: null,
      gender: null,
    });
    render(
      <QueryClientProvider client={client}>
        <ProfilePage />
      </QueryClientProvider>,
    );

    const section = within(screen.getByRole("region", { name: "Private details" }));
    fireEvent.click(section.getByRole("button", { name: "Edit" }));
    fireEvent.change(section.getByLabelText("Legal name"), { target: { value: "" } });
    fireEvent.click(section.getByRole("button", { name: "Cancel" }));
    expect(confirm).toHaveBeenCalled();
    expect(section.getByLabelText("Legal name")).toHaveValue("");
    expect(
      within(screen.getByRole("region", { name: "Public profile" })).getByRole("button", {
        name: "Edit",
      }),
    ).toBeDisabled();
    fireEvent.click(section.getByRole("button", { name: "Save" }));

    expect(await section.findByText("Private details saved.")).toBeInTheDocument();
    expect(fixtures.savePrivateProfile).toHaveBeenCalledWith(id, {
      legal_name: null,
      date_of_birth: null,
      gender: null,
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["recommendations", id] });
    expect(fixtures.savePreferences).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
  it("checks the username live, saves each step, and completes with social comfort skipped", async () => {
    fixtures.rpc.mockReturnValue({ abortSignal: async () => ({ data: true, error: null }) });
    fixtures.saveUsername.mockResolvedValue({ ...fixtures.profile, username: "new_member" });
    fixtures.savePreferences.mockImplementation(async (_userId, patch) => ({
      ...fixtures.preferences,
      ...patch,
    }));
    const client = makeClient();
    render(
      <QueryClientProvider client={client}>
        <OnboardingWizard />
      </QueryClientProvider>,
    );
    const next = () => fireEvent.click(screen.getByRole("button", { name: "Next" }));

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "new_member" } });
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await screen.findByText("Username available.");
    expect(fixtures.rpc).toHaveBeenCalledWith("is_username_available", {
      p_username: "new_member",
    });
    next();

    fireEvent.click(await screen.findByRole("button", { name: "Coding" }));
    next();
    fireEvent.click(await screen.findByRole("button", { name: "Hackathons" }));
    next();
    await screen.findByRole("heading", { name: "Which city are you in?" });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("button", { name: "Hackathons" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    next();
    fireEvent.change(await screen.findByLabelText("City"), { target: { value: "Other" } });
    fireEvent.change(screen.getByLabelText("Enter your city"), { target: { value: "Multan" } });
    next();
    fireEvent.click(
      await screen.findByRole("radio", { name: "No, focus on in-person opportunities" }),
    );
    next();
    fireEvent.click(await screen.findByRole("radio", { name: "Free only" }));
    next();
    fireEvent.click(await screen.findByRole("button", { name: "Skip" }));

    await waitFor(() =>
      expect(fixtures.navigate).toHaveBeenCalledWith({ to: "/dashboard", replace: true }),
    );
    expect(fixtures.saveUsername).toHaveBeenCalledWith(id, "new_member");
    expect(fixtures.saveInterests).toHaveBeenCalledWith(id, ["coding"]);
    expect(fixtures.savePreferences).toHaveBeenCalledWith(id, {
      opportunity_category_slugs: ["hackathons"],
    });
    expect(fixtures.savePreferences).toHaveBeenCalledWith(id, { city: "Multan" });
    expect(fixtures.savePreferences).toHaveBeenCalledWith(id, { wants_online: false });
    expect(fixtures.savePreferences).toHaveBeenCalledWith(id, { budget_preference: "free_only" });
    expect(fixtures.savePreferences).toHaveBeenLastCalledWith(id, {
      social_comfort: null,
      onboarding_completed: true,
    });
  });

  it("displays backend scores and rolls back a failed optimistic save", async () => {
    const client = makeClient();
    client.setQueryData(["dashboard-summary", id], { savedCount: 0, dueSoon: 0, deadlines: [] });
    client.setQueryData(["saved-opportunities", id], []);
    const listing = {
      id: "workshop",
      title: "Demo Hackathon",
      category_slug: "hackathons",
      organisation_name: "Demo group",
      format: "online",
      cost_or_funding: "Free",
      total_score: 72.5,
      interest_score: 35,
      category_score: 20,
      location_score: 0,
      social_comfort_score: 7.5,
      budget_score: 10,
      recency_score: 0,
    };
    client.setQueryData(["recommendations", id], [listing]);
    let rejectSave: (error: Error) => void = () => {};
    fixtures.setOpportunitySaved.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectSave = reject;
      }),
    );
    render(
      <QueryClientProvider client={client}>
        <Dashboard />
      </QueryClientProvider>,
    );

    expect(screen.getByText("72.5% match")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Complete your profile for better recommendations" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(
      screen.queryByRole("heading", { name: "Complete your profile for better recommendations" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Why this match"));
    expect(screen.getByText("7.5 / 15")).toBeVisible();
    const save = screen.getByRole("button", { name: "Save Demo Hackathon" });
    fireEvent.click(save);
    await waitFor(() => expect(save).toHaveAttribute("aria-pressed", "true"));
    expect(fixtures.setOpportunitySaved).toHaveBeenCalledWith(id, listing.id, true);

    rejectSave(new Error("Offline"));
    await waitFor(() => expect(save).toHaveAttribute("aria-pressed", "false"));

    client.setQueryData(
      ["recommendations", id],
      [{ ...listing, total_score: 52.5, category_score: 0 }],
    );
    expect(await screen.findByText("52.5% match")).toBeInTheDocument();
  });
});
