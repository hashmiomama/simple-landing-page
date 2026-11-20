import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

import { experienceSearchArgs, karachi, mapPoint, pageSize, searchSchema } from "./data";
import LeafletMap from "./leaflet-map";

afterEach(cleanup);

describe("Solo experiences", () => {
  it("passes the URL filters and free-only cost to the search RPC", () => {
    const filters = searchSchema.parse({
      keyword: "gallery",
      city: " Karachi ",
      maxCost: 0,
      category: "art_and_culture",
      interests: ["painting"],
      social: "quiet",
      page: 2,
      view: "map",
    });
    expect(experienceSearchArgs(filters)).toEqual({
      p_keyword: "gallery",
      p_city: "Karachi",
      p_max_cost: 0,
      p_category: "art_and_culture",
      p_interest_slugs: ["painting"],
      p_social_level: "quiet",
      p_limit: pageSize,
      p_offset: pageSize,
    });
  });

  it("keeps browse and detail public, and protects edit and moderation routes", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const ids = (path: string) => router.matchRoutes(path).map((match) => match.routeId);
    expect(ids("/experiences")).toEqual(["__root__", "/experiences"]);
    expect(ids("/experiences/example")).toEqual(["__root__", "/experiences_/$id"]);
    expect(ids("/recommend-experience")).toContain("/_authenticated");
    expect(ids("/my-experience-recommendations/example")).toContain("/_authenticated");
    expect(ids("/admin/experiences")).toContain("/_authenticated/_admin");
  });

  it("renders a Leaflet pin with a bundled icon and rejects invalid coordinates", async () => {
    expect(mapPoint(null, 67)).toBeNull();
    expect(mapPoint(24.8, 400)).toBeNull();
    render(
      <LeafletMap label="Karachi map" pins={[{ title: "Demo gallery", position: karachi }]} />,
    );
    const pin = await screen.findByAltText("Demo gallery");
    expect(pin).toHaveClass("leaflet-marker-icon");
    expect(pin.getAttribute("src")).toMatch(/marker-icon.*\.png|^data:image\/png/);
  });
});
