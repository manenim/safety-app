import { createHash, randomUUID } from "node:crypto";
import type {
  Claim,
  ClaimRelation,
  ClaimView,
  Incident,
  IncidentView,
  Location,
  Report,
  Status,
  Store,
} from "./types";
import { distanceMeters } from "./geo";
export const evidenceConfig = {
  freshMinutes: 90,
  matchHours: 6,
  matchMeters: 1800,
  updateMinutes: 15,
  routeBufferMeters: 600,
};
const minutes = (a: string, b: number) => (b - Date.parse(a)) / 60000;
const unique = (values: string[]) => new Set(values).size;
const normalized = (s: string) =>
  s
    .toLowerCase()
    .replace(/\b(forwarded|fwd)\b/g, "")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
function similarity(a: string, b: string) {
  const aa = new Set(normalized(a).split(" ")),
    bb = new Set(normalized(b).split(" "));
  return (
    [...aa].filter((x) => bb.has(x)).length / Math.max(aa.size, bb.size, 1)
  );
}
export function independenceGroup(
  text: string,
  fingerprint: string,
  perspective: string,
  origin: string,
  reports: Report[],
) {
  const same = reports.find((r) => r.sourceFingerprint === fingerprint);
  if (same) return same.independenceGroup;
  if (origin.trim()) {
    const old = reports.find(
      (r) => normalized(r.origin) === normalized(origin),
    );
    if (old) return old.independenceGroup;
    return (
      "origin:" +
      createHash("sha256").update(normalized(origin)).digest("hex").slice(0, 24)
    );
  }
  // Copied firsthand wording also cannot independently corroborate without verification.
  const duplicate = reports.find(
    (r) =>
      similarity(r.normalized?.normalizedText || r.rawText, text) >= 0.86 ||
      similarity(r.rawText, text) >= 0.86,
  );
  if (duplicate) return duplicate.independenceGroup;
  return createHash("sha256")
    .update(
      fingerprint +
        ":" +
        (perspective === "forwarded" ? normalized(text) : "source"),
    )
    .digest("hex")
    .slice(0, 32);
}
export function matchIncident(
  input: { incidentType: Incident["incidentType"]; location: Location },
  incidents: Incident[],
  now = Date.now(),
) {
  const label = normalized(
    input.location.normalizedLabel || input.location.raw || "",
  );
  if (!label && input.location.latitude == null) return null;
  const compatible = (a: string, b: string) =>
    a === b ||
    ([
      "road_blockage",
      "protest",
      "suspicious_activity",
      "security_presence",
      "other",
    ].includes(a) &&
      [
        "road_blockage",
        "protest",
        "suspicious_activity",
        "security_presence",
        "other",
      ].includes(b));
  return (
    incidents
      .filter(
        (i) =>
          i.status !== "resolved" &&
          minutes(i.lastReportedAt, now) <= evidenceConfig.matchHours * 60 &&
          compatible(i.incidentType, input.incidentType),
      )
      .map((i) => {
        const hasCoordinates =
          i.location.latitude != null &&
          i.location.longitude != null &&
          input.location.latitude != null &&
          input.location.longitude != null;
        const distance = hasCoordinates
          ? distanceMeters(
              [i.location.longitude!, i.location.latitude!],
              [input.location.longitude!, input.location.latitude!],
            )
          : null;
        if (distance != null && distance > evidenceConfig.matchMeters)
          return { i, score: 0 };
        const other = normalized(
          i.location.normalizedLabel || i.location.raw || "",
        );
        const sameLabel =
          label.length > 4 &&
          other.length > 4 &&
          (label.includes(other) ||
            other.includes(label) ||
            similarity(label, other) > 0.6);
        return {
          i,
          score:
            distance != null
              ? 1 - distance / 5000 + (sameLabel ? 1 : 0)
              : sameLabel
                ? 1
                : 0,
        };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.i || null
  );
}
const coreCategory = (i: Incident) =>
  i.incidentType === "violence" ? "armed_activity" : i.incidentType;
export function computeEvidence(
  incident: Incident,
  reports: Report[],
  claims: Claim[],
  now = Date.now(),
): Pick<
  IncidentView,
  | "status"
  | "reportCount"
  | "independentSourceCount"
  | "supportingReports"
  | "contradictingReports"
  | "firsthandCount"
  | "explanation"
  | "verificationRecommendation"
  | "claims"
> {
  const reportById = new Map(reports.map((r) => [r.id, r]));
  const recent = (c: Claim) => {
    const r = reportById.get(c.reportId);
    return (
      !!r &&
      minutes(r.observedAt, now) <= evidenceConfig.freshMinutes &&
      minutes(r.observedAt, now) >= -5
    );
  };
  const groups = (cs: Claim[]) =>
    unique(
      cs.map(
        (c) => reportById.get(c.reportId)?.independenceGroup || c.reportId,
      ),
    );
  const direct = (cs: Claim[], stance: Claim["stance"]) =>
    cs.filter((c) => c.stance === stance && c.firsthandness === "firsthand");
  const grouped = new Map<string, Claim[]>();
  for (const c of claims) {
    const old = grouped.get(c.category) || [];
    old.push(c);
    grouped.set(c.category, old);
  }
  const views: ClaimView[] = [];
  for (const [category, all] of grouped) {
    const fresh = all.filter(recent),
      support = direct(fresh, "support"),
      deny = direct(fresh, "deny");
    const latestSupport = Math.max(
      ...all
        .filter((c) => c.stance === "support")
        .map((c) =>
          Date.parse(reportById.get(c.reportId)?.observedAt || c.createdAt),
        ),
      0,
    );
    const updates = deny.filter(
      (c) =>
        Date.parse(reportById.get(c.reportId)!.observedAt) - latestSupport >
        evidenceConfig.updateMinutes * 60000,
    );
    const resolved = groups(updates) >= 2 && latestSupport > 0;
    const conflicting =
      groups(support) > 0 &&
      groups(deny) > 0 &&
      support.some((s) =>
        deny.some(
          (d) =>
            reportById.get(s.reportId)?.independenceGroup !==
              reportById.get(d.reportId)?.independenceGroup &&
            Math.abs(
              Date.parse(reportById.get(s.reportId)!.observedAt) -
                Date.parse(reportById.get(d.reportId)!.observedAt),
            ) <=
              evidenceConfig.updateMinutes * 60000,
        ),
      );
    const status: Status = !fresh.length
      ? "stale"
      : resolved
        ? "resolved"
        : conflicting
          ? "conflicting"
          : groups(support) >= 2
            ? "corroborated"
            : groups(fresh.filter((c) => c.stance === "support")) >= 2
              ? "emerging"
              : "unverified";
    views.push({
      id: all[0].id,
      text:
        all.find((c) => c.stance === "support")?.canonicalText ||
        all[0].canonicalText,
      category,
      status,
      supportingSources: groups(fresh.filter((c) => c.stance === "support")),
      denyingSources: groups(fresh.filter((c) => c.stance === "deny")),
      uncertainSources: groups(fresh.filter((c) => c.stance === "uncertain")),
      reports: all.map((c) => ({
        reportId: c.reportId,
        sourceType:
          reportById.get(c.reportId)?.sourceType || "anonymous/unknown",
        stance: c.stance,
        perspective: c.firsthandness,
        observedAt: reportById.get(c.reportId)?.observedAt || c.createdAt,
      })),
    });
  }
  const core = views.find((v) => v.category === coreCategory(incident));
  const freshClaims = claims.filter(recent);
  let status: Status =
    core?.status ||
    (freshClaims.length
      ? groups(freshClaims) >= 2
        ? "emerging"
        : "unverified"
      : "stale");
  // Ancillary claims never corroborate a different core incident type.
  if (
    incident.resolvedAt &&
    Date.parse(incident.resolvedAt) >=
      Math.max(...reports.map((r) => Date.parse(r.observedAt)), 0)
  )
    status = "resolved";
  const independent = unique(reports.map((r) => r.independenceGroup));
  const firsthand = unique(
    freshClaims
      .filter((c) => c.firsthandness === "firsthand")
      .map((c) => c.reportId),
  );
  const coreClaims = claims.filter(
    (c) => c.category === coreCategory(incident) && recent(c),
  );
  const supporting = unique(
    coreClaims.filter((c) => c.stance === "support").map((c) => c.reportId),
  );
  const contradicting = unique(
    coreClaims.filter((c) => c.stance === "deny" && coreClaims.some(s => s.stance === 'support' && reportById.get(s.reportId)?.independenceGroup !== reportById.get(c.reportId)?.independenceGroup && Math.abs(Date.parse(reportById.get(s.reportId)!.observedAt)-Date.parse(reportById.get(c.reportId)!.observedAt)) <= evidenceConfig.updateMinutes*60000)).map((c) => c.reportId),
  );
  const explanation = [
    `${reports.length} reports received from ${independent} apparent independent sources.`,
    `${firsthand} recent reports contain firsthand observations; source labels alone do not establish truth.`,
    core
      ? `Core claim “${core.text}”: ${core.supportingSources} supporting and ${core.denyingSources} denying source groups. Status: ${core.status}.`
      : "Related observations suggest activity, but the core incident claim needs direct evidence.",
    `Only observations within ${evidenceConfig.freshMinutes} minutes count as current evidence.`,
    status === "resolved"
      ? "Later independent firsthand updates indicate resolution; retain the earlier evidence."
      : status === "conflicting"
        ? "Independent firsthand reports disagree within the same time window."
        : status === "stale"
          ? "No fresh evidence for the core incident. This is not a current safety assessment."
          : "Duplicate propagation is grouped; separate claims are assessed separately.",
  ];
  const verificationRecommendation =
    status === "conflicting"
      ? "Request a fresh independent observation to clarify the conflicting core claim."
      : status === "stale"
        ? "Request a fresh observation; the last evidence is no longer current."
        : status === "resolved"
          ? "Continue monitoring for new reports. Resolution does not guarantee safety."
          : status === "corroborated"
            ? "Seek a fresh update on whether the disruption continues, and verify ancillary claims separately."
            : "Need independent firsthand observations of the core incident; do not amplify forwarded claims.";
  return {
    status,
    reportCount: reports.length,
    independentSourceCount: independent,
    supportingReports: supporting,
    contradictingReports: contradicting,
    firsthandCount: firsthand,
    explanation,
    verificationRecommendation,
    claims: views,
  };
}
export function buildRelations(
  claims: Claim[],
  reports: Report[],
): ClaimRelation[] {
  const result: ClaimRelation[] = [];
  const byId = new Map(reports.map((r) => [r.id, r]));
  for (let a = 0; a < claims.length; a++)
    for (let b = a + 1; b < claims.length; b++) {
      const x = claims[a],
        y = claims[b];
      if (
        x.category !== y.category ||
        x.reportId === y.reportId ||
        x.stance === "uncertain" ||
        y.stance === "uncertain"
      )
        continue;
      const timeA = Date.parse(byId.get(x.reportId)?.observedAt || x.createdAt),
        timeB = Date.parse(byId.get(y.reportId)?.observedAt || y.createdAt);
      const relation =
        x.stance === y.stance
          ? "supports"
          : Math.abs(timeA - timeB) > evidenceConfig.updateMinutes * 60000
            ? "updates"
            : "contradicts";
      result.push({
        id: randomUUID(),
        claimAId: x.id,
        claimBId: y.id,
        relation,
        explanation:
          relation === "updates"
            ? "Different observation times may describe a change in conditions."
            : relation === "contradicts"
              ? "Opposing stances on the same claim within 15 minutes."
              : "Reports take the same stance on this claim; independence is assessed separately.",
        createdAt: new Date().toISOString(),
      });
    }
  return result;
}
export function toIncidentView(
  incident: Incident,
  store: Store,
  now = Date.now(),
): IncidentView {
  const reports = store.reports.filter(
    (r) => r.incidentId === incident.id && r.analysisStatus === "complete",
  );
  const claims = store.claims.filter((c) => c.incidentId === incident.id);
  const evidence = computeEvidence(incident, reports, claims, now);
  const seen = new Set<string>();
  return {
    ...incident,
    ...evidence,
    reports: reports.map((r) => {
      const duplicate = seen.has(r.independenceGroup);
      seen.add(r.independenceGroup);
      return {
        id: r.id,
        sourceType: r.sourceType,
        inputType: r.inputType,
        perspective: r.normalized?.sourcePerspective || "unknown",
        observedAt: r.observedAt,
        submittedAt: r.submittedAt,
        summary: r.normalized?.normalizedText || "Community report received.",
        language: r.normalized?.language || "unknown",
        duplicate,
      };
    }),
    timeline: store.history
      .filter((h) => h.incidentId === incident.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    relations: store.relations.filter((r) =>
      claims.some((c) => c.id === r.claimAId),
    ),
  };
}
