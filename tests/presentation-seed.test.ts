import { expect, it } from "vitest";
import { createPresentationSeed } from "../src/domain/presentation-seed";
import { toIncidentView } from "../src/domain/evidence";
import { replaceSeededData } from "../src/domain/place-seed";
import { createSeed } from "../src/domain/seed";

it("builds one coherent route scenario with independent obstruction evidence and a repeated unverified rumour", () => {
  const now = Date.now();
  const place = {
    id: "google-airport-road",
    label: "Airport Road, Lugbe, Nigeria",
    location: {
      raw: "Airport Road, Lugbe",
      normalizedLabel: "Airport Road, Lugbe",
      latitude: 8.9721464,
      longitude: 7.3624802,
    },
  };
  const seed = createPresentationSeed(place, now);
  const replaced = replaceSeededData(createSeed(now), seed);
  expect(replaced.incidents).toHaveLength(1);
  expect(replaced.reports).toHaveLength(7);
  const view = toIncidentView(seed.incidents[0], seed, now);
  expect(view.status).toBe("corroborated");
  expect(view.claims.find((c) => c.category === "road_blockage")).toMatchObject(
    { status: "corroborated", supportingSources: 3 },
  );
  expect(
    view.claims.find((c) => c.category === "armed_activity"),
  ).toMatchObject({
    status: "unverified",
    supportingSources: 1,
    denyingSources: 1,
  });
  expect(
    seed.reports.every(
      (r) =>
        r.locationPlaceId === place.id &&
        r.normalized?.location.latitude === place.location.latitude,
    ),
  ).toBe(true);
  expect(JSON.stringify(seed)).not.toContain("Market Junction");
  expect(seed.history[1].createdAt).toBe(
    new Date(now - 12 * 60000).toISOString(),
  );
});
