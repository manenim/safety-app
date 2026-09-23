import { createSeed } from "./seed";
import type { DemoPlace } from "./place-seed";
import type { Store } from "./types";

/** One prepared scenario for the Amara walkthrough, using a resolved Google Place. */
export function createPresentationSeed(
  place: DemoPlace,
  now = Date.now(),
): Store {
  if (
    !place.id ||
    place.location.latitude == null ||
    place.location.longitude == null
  )
    throw new Error(
      "A resolved Google Place is required for the presentation scenario.",
    );
  const source = createSeed(now);
  const incident = source.incidents[0];
  const reports = source.reports.filter(
    (report) => report.incidentId === incident.id,
  );
  const claims = source.claims.filter(
    (claim) => claim.incidentId === incident.id,
  );
  const claimIds = new Set(claims.map((claim) => claim.id));
  const texts = [
    "A neighbour shared a WhatsApp message saying armed people were on Airport Road, Lugbe. I did not see this myself.",
    "I was driving along Airport Road in Lugbe and saw an obstruction. Vehicles ahead of me were turning back.",
    "From beside my shop on Airport Road, Lugbe, I can see the road obstructed. Drivers are turning around before reaching it.",
    "Forwarded from the same neighbourhood WhatsApp message: armed people are on Airport Road, Lugbe.",
    "I can see this stretch of Airport Road in Lugbe. I have not seen any armed people here.",
    "I reached the obstruction on Airport Road, Lugbe, and had to turn back. Other vehicles behind me were also turning around.",
    "I observed police directing vehicles on Airport Road in Lugbe. I cannot confirm the claim in the forwarded message.",
  ];
  incident.title = "Road obstruction on Airport Road, Lugbe";
  incident.location = { ...place.location };
  incident.summary =
    "Three independent firsthand reports support a road obstruction and vehicles turning back. The armed-activity claim comes from one repeated rumour source and is disputed; it remains unverified.";
  incident.severity = "medium";
  reports.forEach((report, index) => {
    report.rawText = texts[index];
    report.locationHint = place.label;
    report.locationPlaceId = place.id;
    if (report.normalized) {
      report.normalized.normalizedText = texts[index];
      report.normalized.observations =
        report.normalized.sourcePerspective === "firsthand"
          ? [texts[index]]
          : [];
      report.normalized.location = { ...place.location };
      report.normalized.urgency = "medium";
      report.normalized.claims.forEach((claim) => {
        claim.text = claim.text.replace(
          "Market Junction, Lagos",
          "Airport Road, Lugbe",
        );
      });
    }
  });
  claims.forEach((claim) => {
    claim.canonicalText = claim.canonicalText.replace(
      "Market Junction, Lagos",
      "Airport Road, Lugbe",
    );
  });
  const corroboratedAt = new Date(now - 12 * 60_000).toISOString();
  incident.lastCorroboratedAt = corroboratedAt;
  incident.statusUpdatedAt = corroboratedAt;
  const history = source.history.filter(
    (entry) => entry.incidentId === incident.id,
  );
  history[0].reason = [
    "Initial secondhand report received; independent firsthand evidence is needed.",
  ];
  history[1].createdAt = corroboratedAt;
  history[1].reason = [
    "Two independent firsthand observations support the road obstruction. The separate armed-activity claim remains unverified.",
  ];
  return {
    incidents: [incident],
    reports,
    claims,
    history,
    relations: source.relations.filter(
      (relation) =>
        claimIds.has(relation.claimAId) && claimIds.has(relation.claimBId),
    ),
    alerts: [],
    verifications: [],
  };
}
