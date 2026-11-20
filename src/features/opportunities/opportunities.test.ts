import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

import { pageSize, searchArgs, searchSchema } from "./search-state";
import { coverError, maxCoverSize, validateSubmission } from "./submission-data";

describe("Phase 3 opportunities", () => {
  it("maps a shared URL to the search RPC and retains pagination", () => {
    const router = createRouter({
      routeTree,
      history: createMemoryHistory(),
      context: { queryClient: new QueryClient() },
    });
    const page = router.buildLocation({
      to: "/opportunities",
      search: {
        keyword: "student research",
        categories: ["research-opportunities", "scholarships"],
        interests: ["reading"],
        mode: "hybrid",
        city: " Karachi ",
        deadline: "2030-09-01",
        free: true,
        page: 2,
        sort: "nearest_deadline",
      },
    });
    const query = searchArgs(
      searchSchema.parse(router.options.parseSearch?.(page.searchStr) ?? page.search),
    );

    expect(query).toMatchObject({
      p_keyword: "student research",
      p_category_slugs: ["research-opportunities", "scholarships"],
      p_interest_slugs: ["reading"],
      p_mode: "hybrid",
      p_city: "Karachi",
      p_deadline_before: "2030-09-01T23:59:59.999+05:00",
      p_free_only: true,
      p_sort: "nearest_deadline",
      p_offset: pageSize,
    });
  });

  it("keeps browse and detail public and the account pages behind the auth route", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    for (const path of ["/opportunities", "/opportunities/demo"]) {
      const matched = router.matchRoutes(path).map((route) => route.routeId);
      expect(matched).not.toContain("/_authenticated");
      expect(matched).toHaveLength(2);
    }
    for (const path of [
      "/submit-opportunity",
      "/my-submissions",
      "/my-submissions/demo",
      "/saved",
      "/organisation/register",
      "/organisation/listings",
    ]) {
      expect(router.matchRoutes(path).map((route) => route.routeId)).toContain("/_authenticated");
    }
  });

  it("requires official source information and interest tags for a new submission", () => {
    const form = new FormData();
    for (const [key, value] of Object.entries({
      title: " Demo listing ",
      category: "scholarships",
      organisationName: "Demo organiser",
      description: "A fictional listing",
      sourceUrl: "https://example.invalid/official",
      eligibility: "Open to all",
      location: "Karachi",
      mode: "hybrid",
      cost: "Free",
      city: "",
      country: "",
      deadline: "",
      starts: "",
      ends: "",
    }))
      form.set(key, value);
    expect(validateSubmission(form, ["reading"])).toMatchObject({
      success: true,
      data: { title: "Demo listing" },
    });
    expect(validateSubmission(form, []).error?.flatten().fieldErrors.tags).toBeDefined();
    form.set("sourceUrl", "javascript:alert(1)");
    form.set("deadline", "2000-01-01T12:00");
    const errors = validateSubmission(form, ["reading"]).error?.flatten().fieldErrors;
    expect(errors?.sourceUrl).toBeDefined();
    expect(errors?.deadline).toBeDefined();
  });

  it("accepts only supported non-empty cover images up to 5 MiB", () => {
    expect(coverError(new File(["cover"], "cover.png", { type: "image/png" }))).toBeNull();
    expect(coverError(new File(["cover"], "cover.svg", { type: "image/svg+xml" }))).toMatch(/JPEG/);
    expect(
      coverError(new File([new Uint8Array(maxCoverSize + 1)], "cover.png", { type: "image/png" })),
    ).toMatch(/5 MiB/);
  });
});
