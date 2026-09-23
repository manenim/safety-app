import { expect, it } from "vitest";
import { createSeed } from "../src/domain/seed";
import { createPlaceSeed, replaceSeededData } from "../src/domain/place-seed";
const places = Array.from({ length: 6 }, (_, i) => ({
  id: `google-place-${i}`,
  label: `Place ${i}, Abuja, Nigeria`,
  location: {
    raw: `Place ${i}`,
    normalizedLabel: `Place ${i}`,
    latitude: 9 + i * 0.01,
    longitude: 7.4,
  },
}));
it("seeds only fictional reports with the corresponding Google place IDs and coordinates", () => {
  const seed = createPlaceSeed(places);
  expect(seed.reports).toHaveLength(26);
  seed.incidents.forEach((incident, index) => {
    expect(incident.isDemo).toBe(true);
    expect(incident.location).toEqual(places[index].location);
    seed.reports
      .filter((r) => r.incidentId === incident.id)
      .forEach((r) => {
        expect(r.locationPlaceId).toBe(places[index].id);
        expect(r.normalized?.location).toEqual(places[index].location);
        expect(r.notes).toContain("Fictional");
      });
  });
  expect(() => createPlaceSeed(places.slice(1))).toThrow();
});
it("replaces old fixtures and their generated records without altering submitted evidence", () => {
  const current = createSeed();
  const userIncident = {
    ...structuredClone(current.incidents[0]),
    id: "user-incident",
    isDemo: false,
  };
  const userReport = {
    ...structuredClone(current.reports[0]),
    id: "user-report",
    incidentId: userIncident.id,
    sourceFingerprint: "real-browser",
  };
  current.incidents.push(userIncident);
  current.reports.push(userReport);
  current.alerts.push({
    id: "old-demo-alert",
    incidentId: current.incidents[0].id,
    format: "sms",
    language: "en",
    content: "old",
    createdAt: new Date().toISOString(),
  });
  const replaced = replaceSeededData(current, createPlaceSeed(places));
  expect(replaced.incidents).toHaveLength(7);
  expect(replaced.reports).toHaveLength(27);
  expect(replaced.reports.find((r) => r.id === "user-report")).toEqual(
    userReport,
  );
  expect(replaced.incidents.find((i) => i.id === "user-incident")).toEqual(
    userIncident,
  );
  expect(replaced.alerts).toHaveLength(0);
  expect(current.alerts).toHaveLength(1);
});
it("refuses replacement if a submitted report is attached to old demo evidence", () => {
  const current = createSeed();
  current.reports.push({
    ...current.reports[0],
    id: "submitted",
    sourceFingerprint: "browser",
  });
  expect(() => replaceSeededData(current, createPlaceSeed(places))).toThrow(
    "preserve",
  );
});
