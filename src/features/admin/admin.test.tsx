import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ComponentPropsWithRef } from "react";

import { SiteHeader } from "@/components/layout/site-header";
import { RequireRole } from "@/features/auth/guards";
import { routeTree } from "@/routeTree.gen";

import { decisions, reportSchema } from "./data";
import { DecisionPanel } from "./ui";

vi.mock("@/features/auth/auth-provider", async (original) => ({
  ...(await original<typeof import("@/features/auth/auth-provider")>()),
  useAuth: () => ({
    status: "signed_in",
    profile: { username: "test_member" },
    role: "member",
    hasRole: () => false,
    isRolesLoading: false,
    rolesError: null,
  }),
}));
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ href: "/admin/opportunities" }),
  Link: ({ to, activeProps: _activeProps, ...props }: ComponentPropsWithRef<"a"> & { to: string; activeProps?: unknown }) =>
    <a href={to} {...props} />,
}));

afterEach(cleanup);

describe("Phase 4 administrator workflow", () => {
  it.each([
    "/admin",
    "/admin/opportunities",
    "/admin/opportunities/test",
    "/admin/organisations",
    "/admin/audit-log",
    "/admin/unknown/page",
  ])("keeps %s behind the admin route", (path) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const matches = router.matchRoutes(path).map((match) => match.routeId);
    expect(matches).toContain("/_authenticated");
    expect(matches).toContain("/_authenticated/_admin");
    if (path === "/admin") expect(matches.at(-1)).toBe("/_authenticated/_admin/admin/");
  });

  it("shows the 403 view and hides admin navigation for a normal member", () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <SiteHeader />
        <RequireRole role="admin">
          <p>Admin content</p>
        </RequireRole>
      </QueryClientProvider>,
    );
    expect(screen.getByText("Error 403")).toBeInTheDocument();
    expect(screen.queryByText("Admin content")).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("button", { name: /profile menu/i }), { key: "Enter" });
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.queryByText("Admin", { exact: true })).not.toBeInTheDocument();
  });

  it("preserves the manual verification state in a report", () => {
    const report = reportSchema.parse({
      generated_at: "2026-11-20T00:00:00Z",
      checks: {
        source_url_https: "passed",
        duplicate_scan: "failed",
        source_page_matches: "needs manual verification",
      },
      extracted_fields: {},
      missing_required_fields: [],
      duplicate_indicators: [],
      scam_indicators: {
        payment_wording: false,
        urgency_wording: false,
        free_email_domain: null,
        organisation_email_domain: null,
      },
      recommended_action: "request_info",
      reason: "Review the source.",
    });
    expect(report.checks["source_page_matches"]).toBe("needs manual verification");
  });

  it("requires a reviewer note and explicit confirmation for a request for information", async () => {
    const decide = vi.fn().mockResolvedValue(undefined);
    render(
      <DecisionPanel
        choices={decisions}
        requiredNote={(decision) => decision !== "approve"}
        pending={false}
        error={null}
        onDecide={decide}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Request more information" }));
    expect(decide).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Confirm decision" })).toBeDisabled();

    fireEvent.change(screen.getByRole("textbox", { name: "Note for the submitter (required)" }), {
      target: { value: "Please add the official source." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm decision" }));
    expect(decide).toHaveBeenCalledWith("request_info", "Please add the official source.");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
