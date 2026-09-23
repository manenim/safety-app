import { createSeed } from "./seed";
import type { Location, Store } from "./types";

export type DemoPlace = { id: string; label: string; location: Location };
const aliases = [
  "Airport Road, Lugbe",
  "Galadimawa Market",
  "Lugbe Market access road",
  "Area 1, Abuja",
  "Jabi Lake",
  "Wuse Market",
];
const original = [
  "Market Junction",
  "Central Bridge",
  "School Road",
  "Waterfront Road",
  "Industrial Estate",
  "North Estate",
];

/** Fictional evidence at real provider-resolved places; never claims live observations. */
export function createPlaceSeed(places: DemoPlace[], now = Date.now()): Store {
  if (
    places.length !== 6 ||
    places.some(
      (p) =>
        !p.id || p.location.latitude == null || p.location.longitude == null,
    )
  )
    throw new Error(
      "Six resolved Google Places are required before replacing seed data.",
    );
  let serialized = JSON.stringify(createSeed(now));
  original.forEach((name, index) => {
    serialized = serialized.replaceAll(name, aliases[index]);
  });
  serialized = serialized
    .replaceAll(", Lagos", "")
    .replaceAll("warehouse", "roadside kiosk")
    .replaceAll("bridge", "market access road");
  const seed: Store = JSON.parse(serialized);
  seed.incidents.forEach((incident, index) => {
    incident.location = { ...places[index].location };
    incident.isDemo = true;
    incident.title = [
      "Lane obstruction on Airport Road, Lugbe",
      "Reports of delays near Galadimawa Market",
      "Lugbe Market access road reopening reported",
      "Conflicting access reports around Area 1",
      "Earlier smoke reports near Jabi Lake",
      "Unverified power outage near Wuse Market",
    ][index];
    for (const report of seed.reports.filter(
      (r) => r.incidentId === incident.id,
    )) {
      report.locationHint = places[index].label;
      report.locationPlaceId = places[index].id;
      report.notes =
        "Fictional demo report at a real Google Place. Not an actual incident.";
      if (report.normalized)
        report.normalized.location = { ...places[index].location };
    }
  });
  return seed;
}

/** Remove the old fixtures and their dependent records, preserving all submitted reports. */
export function replaceSeededData(current: Store, seed: Store): Store {
  const old = createSeed(0);
  const incidentIds = new Set([
    ...old.incidents.map((i) => i.id),
    ...seed.incidents.map((i) => i.id),
    ...current.incidents
      .filter((i) => i.isDemo && /^00000001-0000-4000-8000-\d{12}$/.test(i.id))
      .map((i) => i.id),
  ]);
  const reportIds = new Set([
    ...old.reports.map((r) => r.id),
    ...seed.reports.map((r) => r.id),
    ...current.reports
      .filter(
        (r) =>
          r.incidentId &&
          incidentIds.has(r.incidentId) &&
          r.sourceFingerprint.startsWith("seed-"),
      )
      .map((r) => r.id),
  ]);
  if (
    current.reports.some(
      (r) =>
        !reportIds.has(r.id) && r.incidentId && incidentIds.has(r.incidentId),
    )
  )
    throw new Error(
      "A submitted report is linked to an old demo incident. Seed replacement stopped to preserve its evidence.",
    );
  const claimIds = new Set(
    current.claims
      .filter((c) => reportIds.has(c.reportId) || incidentIds.has(c.incidentId))
      .map((c) => c.id),
  );
  return {
    incidents: [
      ...current.incidents.filter((i) => !incidentIds.has(i.id)),
      ...seed.incidents,
    ],
    reports: [
      ...current.reports.filter((r) => !reportIds.has(r.id)),
      ...seed.reports,
    ],
    claims: [
      ...current.claims.filter((c) => !claimIds.has(c.id)),
      ...seed.claims,
    ],
    relations: [
      ...current.relations.filter(
        (r) => !claimIds.has(r.claimAId) && !claimIds.has(r.claimBId),
      ),
      ...seed.relations,
    ],
    history: [
      ...current.history.filter((h) => !incidentIds.has(h.incidentId)),
      ...seed.history,
    ],
    alerts: [
      ...current.alerts.filter((a) => !incidentIds.has(a.incidentId)),
      ...seed.alerts,
    ],
    verifications: [
      ...current.verifications.filter((v) => !incidentIds.has(v.incidentId)),
      ...seed.verifications,
    ],
  };
}
