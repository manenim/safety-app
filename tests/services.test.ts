import { it, expect, vi } from "vitest";
vi.mock("../src/server/repository", () => ({
  readStore: vi.fn(),
  mutateStore: vi.fn(),
  uploadMedia: vi.fn(),
  downloadMedia: vi.fn(),
}));
vi.mock("../src/server/http", () => ({ log: vi.fn() }));
import {
  attachAnalysis,
  retrieveIncidents,
  refreshStore,
  publicView,
} from "../src/server/services";
import { createSeed } from "../src/domain/seed";
import { toIncidentView } from "../src/domain/evidence";
import type { Report, NormalizedReport, Store } from "../src/domain/types";
const now = Date.parse("2026-09-22T10:00:00Z");
const at = new Date(now).toISOString();
const normalized: NormalizedReport = {
  language: "English",
  translatedText: null,
  normalizedText: "I saw vehicles diverted by a fallen tree at Test Junction.",
  incidentType: "road_blockage",
  location: {
    raw: "Test Junction",
    normalizedLabel: "Test Junction",
    latitude: 6.7,
    longitude: 3.9,
  },
  observedAt: at,
  sourcePerspective: "firsthand",
  observations: ["Road blocked"],
  claims: [
    {
      text: "The road is blocked",
      category: "road_blockage",
      polarity: "supports",
      perspective: "firsthand",
    },
  ],
  urgency: "medium",
  extractionNotes: [],
};
function pending(id: string): Report {
  return {
    id,
    incidentId: null,
    rawText: "Road blockage observed",
    normalized: null,
    sourceType: "eyewitness",
    sourceFingerprint: id,
    independenceGroup: id,
    origin: "",
    submittedAt: at,
    observedAt: at,
    inputType: "text",
    mediaPath: null,
    analysisStatus: "pending",
    analysisError: null,
    notes: "",
    locationHint: "Test Junction",
  };
}
function empty(): Store {
  return {
    incidents: [],
    reports: [],
    claims: [],
    relations: [],
    history: [],
    alerts: [],
    verifications: [],
  };
}
it("creates incident and separate claims, then attaches a second independent observation", () => {
  const s = empty();
  s.reports.push(pending("a"));
  const id = attachAnalysis(s, "a", normalized, now);
  expect(s.incidents).toHaveLength(1);
  expect(s.claims).toHaveLength(1);
  expect(s.reports[0].analysisStatus).toBe("complete");
  s.reports.push(pending("b"));
  const second = attachAnalysis(
    s,
    "b",
    {
      ...normalized,
      normalizedText:
        "I am at Test Junction. A large tree prevents passage on the road; drivers take a detour.",
    },
    now,
  );
  expect(second).toBe(id);
  expect(s.incidents[0].status).toBe("corroborated");
  expect(s.history.some((h) => h.newStatus === "corroborated")).toBe(true);
});
it("keeps duplicate retries idempotent", () => {
  const s = empty();
  s.reports.push(pending("a"));
  const id = attachAnalysis(s, "a", normalized, now);
  expect(attachAnalysis(s, "a", normalized, now)).toBe(id);
  expect(s.claims).toHaveLength(1);
});
it("a material independent contradiction changes incident and history", () => {
  const s = empty();
  s.reports.push(pending("a"));
  attachAnalysis(s, "a", normalized, now);
  s.reports.push(pending("b"));
  attachAnalysis(
    s,
    "b",
    {
      ...normalized,
      normalizedText:
        "I just drove freely through Test Junction; both lanes are open and there is no obstruction.",
      claims: [{ ...normalized.claims[0], polarity: "denies" }],
    },
    now,
  );
  expect(s.incidents[0].status).toBe("conflicting");
  expect(s.relations[0].relation).toBe("contradicts");
});
it("retrieves Market evidence but does not invent evidence for another place", () => {
  const s = createSeed(now);
  const views = s.incidents.map((i) => toIncidentView(i, s, now));
  expect(
    retrieveIncidents("Can I use Market Road?", views).some((i) =>
      i.title.includes("Market"),
    ),
  ).toBe(true);
  expect(retrieveIncidents("Is Kaduna safe?", views)).toHaveLength(0);
});
it("records freshness status transitions on read recomputation", () => {
  const s = empty();
  s.reports.push(pending("a"));
  attachAnalysis(s, "a", normalized, now);
  refreshStore(s, now + 91 * 60000);
  expect(s.incidents[0].status).toBe("stale");
  expect(s.history.at(-1)?.newStatus).toBe("stale");
});

it("removes contact details from all public evidence explanations and history", () => {
  const s = empty();
  s.reports.push(pending("a"));
  attachAnalysis(
    s,
    "a",
    {
      ...normalized,
      claims: [
        {
          ...normalized.claims[0],
          text: "Road blocked, call witness@example.com or +234 801 234 5678",
        },
      ],
    },
    now,
  );
  s.history[0].reason = ["Contact witness@example.com"];
  const serialized = JSON.stringify(publicView(s.incidents[0], s));
  expect(serialized).not.toContain("witness@example.com");
  expect(serialized).not.toContain("+234 801 234 5678");
  expect(serialized).not.toContain("sourceFingerprint");
});

it("never corroborates live reports with fictional seed evidence", () => {
  const s = createSeed(now);
  const demo = s.incidents[0];
  s.reports.push(pending("live"));
  const id = attachAnalysis(
    s,
    "live",
    { ...normalized, location: demo.location },
    now,
    false,
  );
  expect(id).not.toBe(demo.id);
  expect(s.incidents.find((i) => i.id === id)?.isDemo).toBe(false);
  expect(s.incidents.find((i) => i.id === id)?.status).toBe("unverified");
});

it("a failed concurrent retry cannot downgrade a successfully completed report", async () => {
  const repository = await import("../src/server/repository");
  const ai = await import("../src/lib/ai");
  const { retryReport } = await import("../src/server/services");
  const initial = empty();
  initial.reports.push(pending("concurrent"));
  const committed = structuredClone(initial);
  committed.reports[0].analysisStatus = "complete";
  committed.reports[0].incidentId = "already-committed";
  vi.mocked(repository.readStore)
    .mockResolvedValueOnce(initial)
    .mockResolvedValue(committed);
  vi.mocked(repository.mutateStore).mockImplementation(async (fn) =>
    fn(committed),
  );
  const extraction = vi
    .spyOn(ai, "analyzeReport")
    .mockRejectedValueOnce(new Error("provider unavailable"));
  await retryReport("concurrent", "concurrent");
  expect(committed.reports[0].analysisStatus).toBe("complete");
  expect(committed.reports[0].incidentId).toBe("already-committed");
  extraction.mockRestore();
});

it("persists the selected report place and uses its coordinates for route proximity", async () => {
  const repository = await import("../src/server/repository");
  const ai = await import("../src/lib/ai");
  const maps = await import("../src/lib/maps");
  const { ingest, routeCheck } = await import("../src/server/services");
  const s = empty();
  vi.stubEnv("SIGNALCHECK_DEMO_MODE", "true");
  vi.mocked(repository.readStore).mockReset().mockResolvedValue(s);
  vi.mocked(repository.mutateStore).mockImplementation(async (fn) => fn(s));
  const selected = {
    raw: "Lugbe, Abuja, Nigeria",
    normalizedLabel: "Lugbe, Abuja, Nigeria",
    latitude: 8.98,
    longitude: 7.37,
  };
  const extraction = vi.spyOn(ai, "analyzeReport").mockResolvedValue({
    ...structuredClone(normalized),
    observedAt: new Date().toISOString(),
    location: {
      raw: "An ambiguous junction",
      normalizedLabel: null,
      latitude: null,
      longitude: null,
    },
  });
  const geocoding = vi.spyOn(maps, "geocode").mockResolvedValue(selected);
  const routing = vi.spyOn(maps, "directions").mockResolvedValue({
    geometry: [
      [7.36, 8.98],
      [7.38, 8.98],
    ],
    origin: "Lugbe",
    destination: "Abuja",
    distanceMeters: 2000,
    durationSeconds: 600,
    alternatives: [],
  });
  try {
    const result = await ingest(
      {
        text: "I saw a fallen tree blocking the road.",
        locationHint: selected.raw,
        locationPlaceId: "ChIJLugbe",
        sourceType: "eyewitness",
        observedAt: null,
        notes: "",
        origin: "",
        inputType: "text",
      },
      "reporter",
    );
    expect(s.reports[0]).toMatchObject({ locationPlaceId: "ChIJLugbe" });
    expect(geocoding).toHaveBeenCalledWith(selected.raw, "ChIJLugbe");
    expect(result.report.normalized?.location).toEqual(selected);
    expect(result.incident?.location).toEqual(selected);
    const route = await routeCheck("Lugbe", "Abuja");
    expect(route.incidents).toHaveLength(1);
    expect(route.incidents[0].incident.id).toBe(result.incident?.id);
    expect(route.incidents[0].distanceMeters).toBeLessThan(10);
  } finally {
    extraction.mockRestore();
    geocoding.mockRestore();
    routing.mockRestore();
    vi.unstubAllEnvs();
  }
});

it("updates an unlocated incident when a matching report supplies coordinates", () => {
  const s = empty();
  s.reports.push(pending("unlocated"));
  const id = attachAnalysis(
    s,
    "unlocated",
    {
      ...normalized,
      location: { ...normalized.location, latitude: null, longitude: null },
    },
    now,
  );
  s.reports.push(pending("located"));
  expect(attachAnalysis(s, "located", normalized, now)).toBe(id);
  expect(s.incidents[0].location).toEqual(normalized.location);
});

it("retains a selected place through an analysis retry and leaves failed geocoding unlocated", async () => {
  const repository = await import("../src/server/repository");
  const ai = await import("../src/lib/ai");
  const maps = await import("../src/lib/maps");
  const { retryReport } = await import("../src/server/services");
  const s = empty();
  s.reports.push({
    ...pending("retry"),
    analysisStatus: "failed",
    locationHint: "Selected landmark, London, UK",
    locationPlaceId: "ChIJLondon",
  });
  vi.stubEnv("SIGNALCHECK_DEMO_MODE", "true");
  vi.mocked(repository.readStore).mockReset().mockResolvedValue(s);
  vi.mocked(repository.mutateStore).mockImplementation(async (fn) => fn(s));
  const extraction = vi
    .spyOn(ai, "analyzeReport")
    .mockResolvedValue(structuredClone(normalized));
  const geocoding = vi.spyOn(maps, "geocode").mockResolvedValue(null);
  try {
    const result = await retryReport("retry", "retry");
    expect(geocoding).toHaveBeenCalledWith(
      "Selected landmark, London, UK",
      "ChIJLondon",
    );
    expect(result.report.normalized?.location).toEqual({
      raw: "Selected landmark, London, UK",
      normalizedLabel: "Selected landmark, London, UK",
      latitude: null,
      longitude: null,
    });
  } finally {
    extraction.mockRestore();
    geocoding.mockRestore();
    vi.unstubAllEnvs();
  }
});

it("includes seeded route evidence by default even outside simulated mode", async () => {
  const repository = await import("../src/server/repository");
  const maps = await import("../src/lib/maps");
  const env = await import("../src/lib/env");
  const { routeCheck } = await import("../src/server/services");
  const s = createSeed();
  vi.mocked(repository.readStore).mockReset().mockResolvedValue(s);
  vi.mocked(repository.mutateStore).mockImplementation(async (fn) => fn(s));
  const config = vi.spyOn(env, "getEnv").mockReturnValue({
    demoMode: false,
    model: "test",
    transcriptionModel: "test",
  });
  const routing = vi.spyOn(maps, "directions").mockResolvedValue({
    geometry: [
      [3.37, 6.5244],
      [3.39, 6.5244],
    ],
    origin: "Start",
    destination: "End",
    distanceMeters: 2000,
    durationSeconds: 600,
    alternatives: [],
  });
  try {
    const demo = await routeCheck("Start", "End");
    expect(demo.incidents.length).toBeGreaterThan(0);
    expect(demo.incidents.every(({ incident }) => incident.isDemo)).toBe(true);
    expect(demo.state).toBe("impacted");
    // Let the same evidence age; proximity must remain visible without claiming
    // that historical reports establish an active incident.
    for (const report of s.reports) {
      report.observedAt = "2020-01-01T00:00:00Z";
      if (report.normalized) report.normalized.observedAt = report.observedAt;
    }
    const older = await routeCheck("Start", "End");
    expect(older.incidents.length).toBeGreaterThan(0);
    expect(
      older.incidents.every(({ incident }) =>
        ["stale", "resolved"].includes(incident.status),
      ),
    ).toBe(true);
    expect(older.state).toBe("no_known_active_signal");
    expect(older.summary).toContain("earlier");
  } finally {
    config.mockRestore();
    routing.mockRestore();
  }
});
