import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApplyLink } from "./apply";
import { localDateTime, pakistanTime, safePath, upcomingDeadlines, type Application } from "./data";

vi.mock("@/features/auth/auth-provider", () => ({ useAuth: () => ({ user: { id: "member" } }) }));
afterEach(cleanup);

describe("Phase 5 planning", () => {
  it("opens the official source without blocking navigation and offers to track it", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    client.setQueryData(["applications", "member"], []);
    render(
      <QueryClientProvider client={client}>
        <ApplyLink id="listing" source="https://example.invalid/apply" primary />
      </QueryClientProvider>,
    );
    const apply = screen.getByRole("link", { name: /apply on the official website/i });
    expect(apply).toHaveAttribute("target", "_blank");
    expect(apply).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText("example.invalid")).toBeVisible();
    expect(fireEvent.click(apply)).toBe(true);
    expect(await screen.findByText("Track this application?")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Track this application?")).not.toBeInTheDocument();
  });

  it("shows an expired listing notice without an apply link", () => {
    render(<ApplyLink id="listing" source="https://example.invalid" expired />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText(/Applications happen on the organiser/)).toBeVisible();
  });

  it("uses Pakistan Standard Time and keeps untrusted paths inside the app", () => {
    expect(pakistanTime("2026-11-20T00:30")).toBe("2026-11-19T19:30:00.000Z");
    expect(localDateTime("2026-11-19T19:30:00Z")).toBe("2026-11-20T00:30");
    expect(safePath("/calendar?view=agenda")).toBe("/calendar?view=agenda");
    expect(safePath("//example.invalid")).toBeNull();
    expect(safePath("/\\example.invalid")).toBeNull();
  });

  it("adds tracked upcoming deadlines without repeating saved listings", () => {
    const item = (id: string, deadline: string, is_expired = false): Application => ({
      id,
      deadline,
      is_expired,
      opportunity_id: id,
      opportunity_title: id,
      status: "applied",
      applied_at: "",
      created_at: "",
      interview_at: "",
      notes: "",
      organisation_name: "",
      updated_at: "",
      user_id: "member",
    });
    const date = "2026-11-20T08:00:00Z";
    const saved = [{ opportunity_id: "common", title: "common", deadline: date }];
    const tracked = [
      item("common", date),
      item("near", "2026-11-20T07:00:00Z"),
      item("expired", date, true),
    ];
    expect(
      upcomingDeadlines(saved, tracked, Date.parse("2026-11-20T00:00:00Z")).map(
        (row) => row.opportunity_id,
      ),
    ).toEqual(["near", "common"]);
  });
});
