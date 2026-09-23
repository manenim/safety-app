import { expect, it } from "vitest";
import { createJudgingSeed } from "../src/domain/judging-seed";
import { createPresentationSeed } from "../src/domain/presentation-seed";
import { replaceSeededData } from "../src/domain/place-seed";
import { toIncidentView } from "../src/domain/evidence";

const now = Date.parse("2026-09-23T17:00:00Z");
const places = Array.from({ length: 12 }, (_, i) => ({
  id: `google-place-${i}`,
  label: `Place ${i}, Abuja, Nigeria`,
  location: {
    raw: `Place ${i}`,
    normalizedLabel: `Place ${i}`,
    latitude: 9 + i * 0.01,
    longitude: 7.4,
  },
}));

it("creates diverse linked evidence with exact provider locations and preserves the Loom scenario", () => {
  const seed = createJudgingSeed(places, now);
  expect(seed.incidents).toHaveLength(12);
  expect(seed.reports).toHaveLength(45);
  expect(seed.incidents[0]).toEqual(
    createPresentationSeed(places[0], now).incidents[0],
  );
  expect(
    seed.incidents.map((i) => toIncidentView(i, seed, now).status),
  ).toEqual([
    "corroborated",
    "emerging",
    "resolved",
    "conflicting",
    "stale",
    "unverified",
    "corroborated",
    "conflicting",
    "corroborated",
    "emerging",
    "corroborated",
    "resolved",
  ]);
  for (const records of Object.values(seed)) {
    expect(new Set(records.map((r) => r.id)).size).toBe(records.length);
  }
  seed.incidents.forEach((incident, index) => {
    expect(incident.location).toEqual(places[index].location);
    seed.reports
      .filter((r) => r.incidentId === incident.id)
      .forEach((r) => {
        expect(r.locationPlaceId).toBe(places[index].id);
        expect(r.normalized?.location).toEqual(places[index].location);
        expect(Date.parse(r.observedAt)).toBeLessThanOrEqual(now);
      });
  });
  seed.claims.forEach((c) =>
    expect(
      seed.reports.some(
        (r) => r.id === c.reportId && r.incidentId === c.incidentId,
      ),
    ).toBe(true),
  );
  seed.relations.forEach((r) => {
    expect(seed.claims.some((c) => c.id === r.claimAId)).toBe(true);
    expect(seed.claims.some((c) => c.id === r.claimBId)).toBe(true);
  });
  expect(JSON.stringify(seed)).not.toContain("Lagos");
  expect(() => createJudgingSeed(places.slice(1), now)).toThrow();
});

it("can refresh or shrink expanded fixtures without duplicates or changing submitted evidence", () => {
  const seed = createJudgingSeed(places, now);
  const submittedIncident = {
    ...structuredClone(seed.incidents[0]),
    id: "user-incident",
    isDemo: false,
  };
  const submittedReport = {
    ...structuredClone(seed.reports[0]),
    id: "user-report",
    incidentId: submittedIncident.id,
    sourceFingerprint: "real-browser",
  };
  seed.incidents.push(submittedIncident);
  seed.reports.push(submittedReport);
  const refreshed = replaceSeededData(
    seed,
    createJudgingSeed(places, now + 60000),
  );
  expect(refreshed.incidents).toHaveLength(13);
  expect(refreshed.reports).toHaveLength(46);
  expect(refreshed.reports.find((r) => r.id === "user-report")).toEqual(
    submittedReport,
  );
  expect(refreshed.incidents.find((i) => i.id === "user-incident")).toEqual(
    submittedIncident,
  );
  const shrunk = replaceSeededData(
    refreshed,
    createPresentationSeed(places[0], now),
  );
  expect(shrunk.incidents).toHaveLength(2);
  expect(shrunk.reports).toHaveLength(8);
  expect(shrunk.claims).toHaveLength(7);
});

it("refuses to replace expanded fixtures with attached submitted reports", () => {
  const seed = createJudgingSeed(places, now);
  seed.reports.push({
    ...structuredClone(seed.reports.at(-1)!),
    id: "submitted",
    sourceFingerprint: "browser",
  });
  expect(() => replaceSeededData(seed, createJudgingSeed(places, now))).toThrow(
    "preserve",
  );
});
