import "server-only";
import { randomUUID } from "node:crypto";
import type {
  Claim,
  Incident,
  IncidentView,
  NormalizedReport,
  Report,
  ReportInput,
  Store,
} from "@/domain/types";
import {
  buildRelations,
  computeEvidence,
  evidenceConfig,
  independenceGroup,
  matchIncident,
  toIncidentView,
} from "@/domain/evidence";
import { distanceToRoute } from "@/domain/geo";
import {
  analyzeReport,
  generateAnswer,
  generateAlert,
  generateBrief,
} from "@/lib/ai";
import { directions, geocode } from "@/lib/maps";
import { getEnv } from "@/lib/env";
import {
  readStore,
  mutateStore,
  uploadMedia,
  downloadMedia,
} from "./repository";
import { HttpError } from "./auth";
import { log } from "./http";
export function refreshStore(store: Store, now = Date.now()) {
  for (const incident of store.incidents) {
    const result = computeEvidence(
      incident,
      store.reports.filter(
        (r) => r.incidentId === incident.id && r.analysisStatus === "complete",
      ),
      store.claims.filter((c) => c.incidentId === incident.id),
      now,
    );
    if (result.status !== incident.status) {
      const at = new Date(now).toISOString();
      store.history.push({
        id: randomUUID(),
        incidentId: incident.id,
        previousStatus: incident.status,
        newStatus: result.status,
        reason: result.explanation,
        createdAt: at,
      });
      incident.status = result.status;
      incident.statusUpdatedAt = at;
      if (result.status === "corroborated") incident.lastCorroboratedAt = at;
      log("evidence_status_changed", {
        incidentId: incident.id,
        status: result.status,
      });
    }
  }
  return store;
}
const redact = (s: string) =>
  s
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[contact removed]")
    .replace(/(?:\+?\d[\d ()-]{7,}\d)/g, "[contact removed]");
export function publicView(i: Incident, s: Store): IncidentView {
  const view = toIncidentView(i, s);
  return {
    ...view,
    title: redact(view.title),
    location: {
      ...view.location,
      raw: view.location.raw ? redact(view.location.raw) : null,
      normalizedLabel: view.location.normalizedLabel
        ? redact(view.location.normalizedLabel)
        : null,
    },
    summary: redact(view.summary),
    explanation: view.explanation.map(redact),
    verificationRecommendation: redact(view.verificationRecommendation),
    timeline: view.timeline.map((h) => ({
      ...h,
      reason: h.reason.map((reason) =>
        redact(
          reason.replace(
            "First demonstration report received.",
            "First report received.",
          ),
        ),
      ),
    })),
    reports: view.reports.map((r) => ({ ...r, summary: redact(r.summary) })),
    claims: view.claims.map((c) => ({ ...c, text: redact(c.text) })),
  };
}
export async function listIncidents() {
  const store = await mutateStore((s) => refreshStore(s));
  return store.incidents
    .map((i) => publicView(i, store))
    .sort((a, b) => b.lastReportedAt.localeCompare(a.lastReportedAt));
}
export async function getIncident(id: string) {
  const all = await listIncidents();
  const i = all.find((i) => i.id === id);
  if (!i) throw new HttpError("Incident not found.", 404);
  return i;
}
export async function dashboard(coordinator: boolean) {
  const incidents = await listIncidents();
  const store = await readStore();
  return {
    incidents,
    metrics: {
      active: incidents.filter((i) => !["resolved", "stale"].includes(i.status))
        .length,
      corroborated: incidents.filter((i) => i.status === "corroborated").length,
      emerging: incidents.filter((i) => i.status === "emerging").length,
      conflicting: incidents.filter((i) => i.status === "conflicting").length,
      stale: incidents.filter((i) => i.status === "stale").length,
      highSeverity: incidents.filter(
        (i) =>
          ["high", "critical"].includes(i.severity) &&
          !["resolved", "stale"].includes(i.status),
      ).length,
      reportsLastHour: store.reports.filter(
        (r) => Date.parse(r.submittedAt) >= Date.now() - 3600000,
      ).length,
    },
    demoMode: getEnv().demoMode,
    coordinator,
  };
}
function summaryFor(incident: Incident, store: Store) {
  const v = toIncidentView(incident, store);
  const core = v.claims.find(
    (c) =>
      c.category ===
      (incident.incidentType === "violence"
        ? "armed_activity"
        : incident.incidentType),
  );
  if (v.status === "resolved")
    return "Later independent firsthand reports indicate the earlier incident has ended. Conditions may change; review the update times.";
  if (v.status === "stale")
    return "Earlier reports described this incident, but there is no fresh evidence of current conditions.";
  if (core?.status === "corroborated")
    return `Independent firsthand reports support ${core.text.charAt(0).toLowerCase() + core.text.slice(1)}. Other claims are assessed separately; see the evidence below.`;
  if (v.status === "conflicting")
    return "Recent independent observations disagree about the core incident. Current conditions need further verification.";
  return `Community reports describe possible ${incident.incidentType.replaceAll("_", " ")} near ${incident.location.normalizedLabel || incident.location.raw || "an unspecified location"}. Independent firsthand confirmation is needed.`;
}
export function attachAnalysis(
  store: Store,
  reportId: string,
  normalized: NormalizedReport,
  now = Date.now(),
  demoMode = false,
) {
  const report = store.reports.find((r) => r.id === reportId);
  if (!report) throw new HttpError("Report not found.", 404);
  if (report.analysisStatus === "complete") return report.incidentId!;
  const at = new Date(now).toISOString();
  report.normalized = normalized;
  report.observedAt = normalized.observedAt || report.observedAt;
  // Reject future model timestamps instead of allowing fresh evidence inflation.
  if (
    Date.parse(report.observedAt) > now + 300000 ||
    !Number.isFinite(Date.parse(report.observedAt))
  )
    report.observedAt = report.submittedAt;
  report.independenceGroup = independenceGroup(
    normalized.normalizedText,
    report.sourceFingerprint,
    normalized.sourcePerspective,
    report.origin,
    store.reports.filter(
      (r) =>
        r.id !== report.id &&
        r.analysisStatus === "complete" &&
        Math.abs(Date.parse(r.observedAt) - Date.parse(report.observedAt)) <=
          6 * 3600000,
    ),
  );
  let incident = matchIncident(
    normalized,
    store.incidents.filter((i) => Boolean(i.isDemo) === demoMode),
    now,
  );
  if (!incident) {
    incident = {
      isDemo: demoMode,
      id: randomUUID(),
      title: `${normalized.incidentType.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase())} near ${normalized.location.normalizedLabel || normalized.location.raw || "an unspecified location"}`,
      incidentType: normalized.incidentType,
      status: "unverified",
      severity: normalized.urgency,
      summary: "Report received; corroboration is being assessed.",
      location: normalized.location,
      firstReportedAt: report.observedAt,
      lastReportedAt: report.observedAt,
      lastCorroboratedAt: null,
      statusUpdatedAt: at,
      resolvedAt: null,
      createdAt: at,
      updatedAt: at,
    };
    store.incidents.push(incident);
    store.history.push({
      id: randomUUID(),
      incidentId: incident.id,
      previousStatus: null,
      newStatus: "unverified",
      reason: ["First report received."],
      createdAt: at,
    });
  }
  // A later located report can make an existing unlocated incident usable for route checks.
  if (
    (incident.location.latitude == null ||
      incident.location.longitude == null) &&
    normalized.location.latitude != null &&
    normalized.location.longitude != null
  ) {
    incident.location = normalized.location;
  }
  report.incidentId = incident.id;
  report.analysisStatus = "complete";
  report.analysisError = null;
  const claims: Claim[] = normalized.claims.map((c) => ({
    id: randomUUID(),
    incidentId: incident!.id,
    reportId: report.id,
    canonicalText: c.text,
    category: c.category,
    stance:
      c.polarity === "supports"
        ? "support"
        : c.polarity === "denies"
          ? "deny"
          : "uncertain",
    firsthandness: c.perspective,
    createdAt: at,
  }));
  store.claims.push(...claims);
  incident.lastReportedAt = new Date(
    Math.max(
      Date.parse(incident.lastReportedAt),
      Date.parse(report.observedAt),
    ),
  ).toISOString();
  incident.firstReportedAt = new Date(
    Math.min(
      Date.parse(incident.firstReportedAt),
      Date.parse(report.observedAt),
    ),
  ).toISOString();
  incident.updatedAt = at;
  const severity = ["low", "medium", "high", "critical"];
  if (
    severity.indexOf(normalized.urgency) > severity.indexOf(incident.severity)
  )
    incident.severity = normalized.urgency;
  const relatedClaims = store.claims.filter(
    (c) => c.incidentId === incident!.id,
  );
  const ids = new Set(relatedClaims.map((c) => c.id));
  store.relations = store.relations.filter((r) => !ids.has(r.claimAId));
  store.relations.push(...buildRelations(relatedClaims, store.reports));
  refreshStore(store, now);
  incident.summary = summaryFor(incident, store);
  return incident.id;
}
export async function ingest(
  input: ReportInput,
  fingerprint: string,
  file?: File,
) {
  const id = randomUUID(),
    now = new Date().toISOString();
  log("report_ingestion_started", { reportId: id, inputType: input.inputType });
  const report: Report = {
    id,
    incidentId: null,
    rawText: input.text,
    normalized: null,
    sourceType: input.sourceType,
    sourceFingerprint: fingerprint,
    independenceGroup: fingerprint,
    origin: input.origin,
    submittedAt: now,
    observedAt: input.observedAt || now,
    inputType: input.inputType,
    mediaPath: null,
    analysisStatus: "pending",
    analysisError: null,
    notes: input.notes,
    locationHint: input.locationHint,
    locationPlaceId: input.locationPlaceId,
    explicitObservedAt: input.observedAt,
  };
  await mutateStore((s) => {
    s.reports.push(report);
  });
  try {
    if (file) {
      const path = await uploadMedia(file);
      await mutateStore((s) => {
        s.reports.find((r) => r.id === id)!.mediaPath = path;
      });
    }
    return await retryReport(id, fingerprint);
  } catch {
    await mutateStore((s) => {
      const r = s.reports.find((r) => r.id === id)!;
      if (r.analysisStatus === "complete") return;
      r.analysisStatus = "failed";
      r.analysisError =
        "Analysis or upload could not finish. Text has been saved. Retry analysis, or resubmit the media with a manual description.";
    });
    return { report: await ownedReport(id, fingerprint), incident: null };
  }
}
export async function ownedReport(id: string, fingerprint: string) {
  const r = (await readStore()).reports.find(
    (r) => r.id === id && r.sourceFingerprint === fingerprint,
  );
  if (!r) throw new HttpError("Report not found.", 404);
  return {
    id: r.id,
    analysisStatus: r.analysisStatus,
    normalized: r.normalized,
    analysisError: r.analysisError,
    incidentId: r.incidentId,
  };
}
export async function retryReport(id: string, fingerprint: string) {
  const store = await readStore();
  const r = store.reports.find(
    (r) => r.id === id && r.sourceFingerprint === fingerprint,
  );
  if (!r) throw new HttpError("Report not found.", 404);
  if (r.analysisStatus === "complete")
    return {
      report: await ownedReport(id, fingerprint),
      incident: r.incidentId ? await getIncident(r.incidentId) : null,
    };
  try {
    const media = r.mediaPath ? await downloadMedia(r.mediaPath) : undefined;
    if (r.inputType !== "text" && !media && r.rawText.trim().length < 10)
      throw new HttpError(
        "Media is unavailable. Resubmit the file or provide a manual description.",
      );
    const normalized = await analyzeReport(
      {
        text: r.rawText,
        locationHint: r.locationHint,
        sourceType: r.sourceType,
        observedAt: r.explicitObservedAt || null,
        notes: r.notes,
        origin: r.origin,
        inputType: r.inputType,
      },
      media,
    );
    if (r.locationPlaceId) {
      // The reporter selected this exact place. Never substitute an AI-guessed location.
      normalized.location = (await geocode(
        r.locationHint,
        r.locationPlaceId,
      ).catch(() => null)) || {
        raw: r.locationHint,
        normalizedLabel: r.locationHint,
        latitude: null,
        longitude: null,
      };
    } else if (
      normalized.location.latitude == null &&
      normalized.location.raw
    ) {
      const location = await geocode(normalized.location.raw).catch(() => null);
      if (location)
        normalized.location = { ...location, raw: normalized.location.raw };
    }
    const incidentId = await mutateStore((s) =>
      attachAnalysis(s, id, normalized, Date.now(), getEnv().demoMode),
    );
    log("report_ingestion_completed", { reportId: id, incidentId });
    return {
      report: await ownedReport(id, fingerprint),
      incident: await getIncident(incidentId),
    };
  } catch {
    await mutateStore((s) => {
      const report = s.reports.find((x) => x.id === id)!;
      if (report.analysisStatus === "complete") return;
      report.analysisStatus = "failed";
      report.analysisError =
        "AI analysis is unavailable. Your report is saved; retry shortly. If media cannot be read, submit a manual description.";
    });
    return { report: await ownedReport(id, fingerprint), incident: null };
  }
}
export function retrieveIncidents(
  question: string,
  incidents: IncidentView[],
  incidentId?: string,
) {
  if (incidentId) return incidents.filter((i) => i.id === incidentId);
  const terms = question.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const stop = new Set([
    "is",
    "a",
    "the",
    "safe",
    "can",
    "i",
    "use",
    "what",
    "are",
    "there",
    "any",
    "near",
    "right",
    "now",
    "about",
    "at",
    "in",
    "on",
    "to",
    "of",
    "and",
    "has",
    "happened",
    "current",
    "currently",
    "road",
  ]);
  const tokens = terms.filter((t) => t.length > 2 && !stop.has(t));
  const broad =
    /what changed|last \d+|which roads|situation|all incidents|overview|emerging|corroborated|conflicting/.test(
      question.toLowerCase(),
    );
  if (broad) return incidents.slice(0, 15);
  return incidents
    .map((i) => ({
      i,
      score: tokens.reduce(
        (sum, t) =>
          sum +
          (`${i.title} ${i.location.raw} ${i.location.normalizedLabel} ${i.claims.map((c) => c.text).join(" ")}`
            .toLowerCase()
            .includes(t)
            ? 1
            : 0),
        0,
      ),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((x) => x.i);
}
export async function answer(question: string, incidentId?: string) {
  return generateAnswer(
    question,
    retrieveIncidents(question, await listIncidents(), incidentId),
  );
}
export async function routeCheck(
  origin: string,
  destination: string,
  places: {
    originPlaceId?: string;
    destinationPlaceId?: string;
  } = {},
) {
  const route = await directions(origin, destination, places);
  const incidents = await listIncidents();
  const isActive = (incident: IncidentView) =>
    !["resolved", "stale"].includes(incident.status);
  const active = incidents.filter(isActive);
  const affected = incidents
    .filter((i) => i.location.latitude != null && i.location.longitude != null)
    .map((incident) => ({
      incident,
      distanceMeters: Math.round(
        distanceToRoute(
          [incident.location.longitude!, incident.location.latitude!],
          route.geometry,
        ),
      ),
    }))
    .filter((i) => i.distanceMeters <= evidenceConfig.routeBufferMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
  const unlocatedCount = active.filter(
    (i) => i.location.latitude == null || i.location.longitude == null,
  ).length;
  const current = affected.filter(({ incident }) => isActive(incident));
  const historicalCount = affected.length - current.length;
  const state = current.some((i) => i.incident.status === "corroborated")
    ? "impacted"
    : current.some((i) => i.incident.status === "conflicting")
      ? "caution"
      : current.length || unlocatedCount
        ? "uncertain"
        : "no_known_active_signal";
  log("route_checked", { affected: affected.length });
  return {
    ...route,
    state,
    summary:
      (current.length
        ? `${current.length} active incident(s) lie within ${evidenceConfig.routeBufferMeters} m of this route. Consider alternatives and review current evidence. No route is guaranteed safe.`
        : `No known active geolocated signal was found within ${evidenceConfig.routeBufferMeters} m. This does not guarantee safety.${unlocatedCount ? " Some incidents have no coordinates and could not be checked." : ""}`) +
      (historicalCount
        ? ` ${historicalCount} earlier or resolved incident(s) are also shown for context; they do not establish current conditions.`
        : ""),
    incidents: affected,
    unlocatedCount,
  };
}
export async function alertFor(
  incidentId: string,
  options: {
    format: string;
    language: string;
    audience: string;
    length: string;
  },
) {
  const incident = await getIncident(incidentId);
  const content = await generateAlert(incident, options);
  const alert = {
    id: randomUUID(),
    incidentId,
    format: options.format,
    language: options.language,
    content,
    createdAt: new Date().toISOString(),
  };
  await mutateStore((s) => {
    s.alerts.push(alert);
  });
  log("alert_generated", { incidentId, format: options.format });
  return alert;
}
export async function brief(
  windowMinutes: number,
  incidentId?: string,
  changesOnly = false,
) {
  const incidents = await listIncidents();
  const start = Date.now() - windowMinutes * 60000;
  const store = await readStore();
  const changes = store.history.filter(
    (h) =>
      Date.parse(h.createdAt) >= start &&
      (!incidentId || h.incidentId === incidentId),
  );
  const relevant = incidents.filter(
    (i) =>
      (!incidentId || i.id === incidentId) &&
      (Date.parse(i.updatedAt) >= start ||
        changes.some((h) => h.incidentId === i.id)),
  );
  return {
    content: await generateBrief(
      relevant,
      windowMinutes,
      changesOnly ? changes : undefined,
    ),
    changes,
  };
}
export async function requestVerification(id: string) {
  const incident = await getIncident(id);
  const request = {
    id: randomUUID(),
    incidentId: id,
    content: incident.verificationRecommendation,
    createdAt: new Date().toISOString(),
  };
  await mutateStore((s) => {
    s.verifications.push(request);
  });
  return request;
}
