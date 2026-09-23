import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  IncidentView,
  NormalizedReport,
  ReportInput,
} from "../src/domain/types";
const mocks = vi.hoisted(() => ({
  parse: vi.fn(),
  transcribe: vi.fn(),
  env: {
    demoMode: true,
    openaiKey: "test-key",
    model: "test-model",
    transcriptionModel: "test-transcriber",
    googleMapsApiKey: undefined as string | undefined,
  },
}));
vi.mock("../src/lib/env", () => ({ getEnv: () => mocks.env }));
vi.mock("openai", () => ({
  default: class {
    chat = { completions: { parse: mocks.parse } };
    audio = { transcriptions: { create: mocks.transcribe } };
  },
  toFile: vi.fn(async () => ({})),
}));
import {
  analyzeReport,
  generateAlert,
  generateAnswer,
  generateBrief,
} from "../src/lib/ai";
import { directions, geocode } from "../src/lib/maps";
const input: ReportInput = {
  text: "Abeg everybody dey turn back for Market Junction near the filling station. I just pass there now and police dey around. I hear say some people see gunmen but I no see anybody with gun.",
  locationHint: "Market Junction",
  sourceType: "eyewitness",
  observedAt: null,
  notes: "",
  origin: "",
  inputType: "text",
};
const incident: IncidentView = {
  id: "incident-1",
  title: "Market Junction disruption",
  incidentType: "road_blockage",
  status: "corroborated",
  severity: "high",
  summary: "Traffic disruption reported; armed activity is unverified.",
  location: {
    raw: "Market Junction",
    normalizedLabel: "Market Junction",
    latitude: null,
    longitude: null,
  },
  firstReportedAt: new Date().toISOString(),
  lastReportedAt: new Date().toISOString(),
  lastCorroboratedAt: null,
  statusUpdatedAt: new Date().toISOString(),
  resolvedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  reportCount: 3,
  independentSourceCount: 2,
  supportingReports: 2,
  contradictingReports: 0,
  firsthandCount: 2,
  explanation: ["Two independent firsthand traffic reports"],
  verificationRecommendation: "Seek fresh firsthand observations.",
  claims: [
    {
      id: "claim-1",
      text: "Traffic is disrupted",
      category: "road_blockage",
      status: "corroborated",
      supportingSources: 2,
      denyingSources: 0,
      uncertainSources: 0,
      reports: [],
    },
    {
      id: "claim-2",
      text: "Armed persons are present",
      category: "armed_activity",
      status: "unverified",
      supportingSources: 1,
      denyingSources: 0,
      uncertainSources: 1,
      reports: [],
    },
  ],
  reports: [],
  timeline: [],
  relations: [],
};
beforeEach(() => {
  mocks.env.demoMode = true;
  mocks.env.googleMapsApiKey = undefined;
  mocks.parse.mockReset();
  mocks.transcribe.mockReset();
});
afterEach(() => vi.unstubAllGlobals());
describe("explicit demo extraction", () => {
  it("keeps firsthand traffic and police separate from secondhand armed activity", async () => {
    const result = await analyzeReport(input);
    expect(result.claims).toContainEqual(
      expect.objectContaining({
        category: "road_blockage",
        perspective: "firsthand",
        polarity: "supports",
      }),
    );
    expect(result.claims).toContainEqual(
      expect.objectContaining({
        category: "security_presence",
        perspective: "firsthand",
      }),
    );
    expect(result.claims).toContainEqual(
      expect.objectContaining({
        category: "armed_activity",
        perspective: "secondhand",
        polarity: "supports",
      }),
    );
    expect(result.claims).not.toContainEqual(
      expect.objectContaining({
        category: "armed_activity",
        perspective: "firsthand",
        polarity: "supports",
      }),
    );
    expect(result.claims).toContainEqual(
      expect.objectContaining({
        category: "armed_activity",
        polarity: "uncertain",
      }),
    );
    expect(result.extractionNotes.join(" ")).toMatch(/Keyword-based extraction/);
    expect(result.location.latitude).toBeNull();
    expect(mocks.parse).not.toHaveBeenCalled();
  });
  it("keeps denial as a stance on an affirmative proposition", async () => {
    const result = await analyzeReport({
      ...input,
      text: "There are no gunmen. The road is open.",
    });
    expect(result.claims).toContainEqual(
      expect.objectContaining({
        text: "Armed persons are present",
        polarity: "denies",
      }),
    );
    expect(result.claims).toContainEqual(
      expect.objectContaining({
        category: "road_blockage",
        polarity: "denies",
      }),
    );
  });
  it("does not pretend to transcribe media in demo mode", async () => {
    await expect(
      analyzeReport(
        { ...input, text: "", inputType: "audio" },
        { data: new Uint8Array([1]), type: "audio/webm" },
      ),
    ).rejects.toThrow("Media analysis is unavailable");
  });
  it("labels unsupported demo translations and preserves claim status nuance", async () => {
    const alert = await generateAlert(incident, {
      format: "radio",
      audience: "residents",
      language: "Hausa",
      length: "short",
    });
    expect(alert).toContain("Translation to Hausa is currently unavailable");
    expect(alert).toContain("Armed persons are present: unverified");
    expect(alert).toContain("Traffic is disrupted: corroborated");
  });
  it("preserves an empty evidence retrieval from the service", async () => {
    const answer = await generateAnswer("What is happening in Ibadan?", []);
    expect(answer.citations).toEqual([]);
    expect(answer.answer).toContain("no matching evidence");
  });
  it("trusts bounded incident-scoped evidence even when the question omits a place", async () => {
    const answer = await generateAnswer("Why is this unverified?", [incident]);
    expect(answer.citations[0].incidentId).toBe(incident.id);
    const broad = await generateAnswer("What changed in the last 30 minutes?", [
      incident,
    ]);
    expect(broad.citations[0].incidentId).toBe(incident.id);
  });
  it("includes recorded status changes in a demo brief", async () => {
    const text = await generateBrief([incident], 60, [
      {
        id: "change",
        incidentId: incident.id,
        previousStatus: "emerging",
        newStatus: "corroborated",
        reason: ["Independent observations"],
        createdAt: new Date().toISOString(),
      },
    ]);
    expect(text).toContain("emerging → corroborated");
    expect(text).toContain("Independent observations");
  });
});
describe("live service boundaries with mocked model", () => {
  beforeEach(() => {
    mocks.env.demoMode = false;
  });
  it("rejects malformed extraction and sanitizes upstream failures", async () => {
    mocks.parse.mockRejectedValue(new Error("sensitive-provider-response"));
    await expect(analyzeReport(input)).rejects.toThrow(
      "AI analysis is temporarily unavailable",
    );
    mocks.parse.mockResolvedValue({
      choices: [{ message: { parsed: { claims: "invalid" } } }],
    });
    await expect(analyzeReport(input)).rejects.toThrow(
      "AI analysis is temporarily unavailable",
    );
  });
  it("forces model coordinates to null and preserves reporter time", async () => {
    mocks.env.demoMode = true;
    const parsed = await analyzeReport(input);
    mocks.env.demoMode = false;
    parsed.location.latitude = 6.4;
    parsed.location.longitude = 3.4;
    mocks.parse.mockResolvedValue({ choices: [{ message: { parsed } }] });
    const result = await analyzeReport({
      ...input,
      observedAt: "2026-09-22T12:00:00Z",
    });
    expect(result.location.latitude).toBeNull();
    expect(result.observedAt).toBe("2026-09-22T12:00:00Z");
    const prompt = mocks.parse.mock.calls[0][0].messages[0].content;
    expect(prompt).toContain("PER CLAIM");
    expect(prompt).toContain("secondhand");
  });
  it("rejects invented citation IDs and returns an explicit evidence fallback", async () => {
    mocks.parse.mockResolvedValue({
      choices: [
        {
          message: {
            parsed: {
              answer: "Invented model answer",
              incidentIds: ["not-in-evidence"],
            },
          },
        },
      ],
    });
    const answer = await generateAnswer("Market Junction", [incident]);
    expect(answer.mode).toBe("evidence-fallback");
    expect(answer.answer).not.toContain("Invented model answer");
    expect(answer.citations[0].incidentId).toBe(incident.id);
  });
  it("returns only validated citations for a live answer", async () => {
    mocks.parse.mockResolvedValue({
      choices: [
        {
          message: {
            parsed: {
              answer:
                "Traffic disruption is corroborated; armed activity remains unverified.",
              incidentIds: [incident.id],
            },
          },
        },
      ],
    });
    const answer = await generateAnswer("Market Junction", [incident]);
    expect(answer.mode).toBe("ai");
    expect(answer.citations).toHaveLength(1);
  });
  it.each([
    "audio/webm",
    "audio/m4a",
    "audio/x-m4a",
    "audio/mp3",
    "video/webm",
  ])(
    "uses transcription for %s and keeps the text description in extraction context",
    async (mime) => {
      mocks.env.demoMode = true;
      const parsed: NormalizedReport = await analyzeReport(input);
      mocks.env.demoMode = false;
      mocks.transcribe.mockResolvedValue({
        text: "I saw vehicles turning back.",
      });
      mocks.parse.mockResolvedValue({ choices: [{ message: { parsed } }] });
      const result = await analyzeReport(
        { ...input, inputType: "audio" },
        { data: new Uint8Array([1]), type: mime },
      );
      expect(result.extractionNotes.join(" ")).toContain(
        "Audio transcript: I saw vehicles turning back.",
      );
      expect(
        mocks.parse.mock.calls[0][0].messages[1].content[0].text,
      ).toContain(input.text);
    },
  );
});
describe("Google Maps unavailable and ambiguous location behavior", () => {
  const locationResult = (
    address: string,
    name: string,
    types: string[] = ["locality"],
    country = "NG",
    partial = false,
  ) => ({
    status: "OK",
    results: [
      {
        formatted_address: address,
        partial_match: partial,
        types,
        address_components: [
          { long_name: name, short_name: name, types },
          { long_name: "Nigeria", short_name: country, types: ["country"] },
        ],
        geometry: { location: { lat: 6.5, lng: 3.4 } },
      },
    ],
  });
  it("does not fake route geometry when Google Maps is missing", async () => {
    await expect(directions("A", "B")).rejects.toThrow("does not simulate");
    expect(await geocode("Market Junction")).toBeNull();
  });
  it("rejects generic local landmarks even when a provider would supply coordinates", async () => {
    mocks.env.googleMapsApiKey = "test-key";
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(await geocode("Market Junction")).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects a geocoder street substitution for a district query", async () => {
    mocks.env.googleMapsApiKey = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () =>
          locationResult("Yaba Road, Lagos, Nigeria", "Yaba Road", ["route"]),
      })),
    );
    expect(await geocode("Yaba, Lagos")).toBeNull();
  });
  it("accepts an exact Nigerian place without restricting the country", async () => {
    mocks.env.googleMapsApiKey = "test-key";
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => locationResult("Ikeja, Lagos, Nigeria", "Ikeja"),
    }));
    vi.stubGlobal("fetch", fetcher);
    expect(await geocode("Ikeja, Lagos")).toEqual({
      raw: "Ikeja, Lagos",
      normalizedLabel: "Ikeja, Lagos, Nigeria",
      longitude: 3.4,
      latitude: 6.5,
    });
    expect(
      (fetcher.mock.calls[0] as unknown as [URL])[0].searchParams.get(
        "components",
      ),
    ).toBeNull();
  });
  it("accepts international places and rejects partial matches", async () => {
    mocks.env.googleMapsApiKey = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () =>
          locationResult("Lugbe, Germany", "Lugbe", ["locality"], "DE"),
      })),
    );
    expect(await geocode("Lugbe, Germany")).toMatchObject({
      normalizedLabel: "Lugbe, Germany",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () =>
          locationResult("Lugbe, Nigeria", "Lugbe", ["locality"], "NG", true),
      })),
    );
    expect(await geocode("Lugbe")).toBeNull();
  });
  it("uses the selected place ID without reinterpreting its display label", async () => {
    mocks.env.googleMapsApiKey = "test-key";
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => locationResult("Lugbe, Abuja, Nigeria", "Lugbe"),
    }));
    vi.stubGlobal("fetch", fetcher);
    expect(await geocode("Lugbe district", "ChIJLugbe")).toMatchObject({
      normalizedLabel: "Lugbe, Abuja, Nigeria",
    });
    expect(
      (fetcher.mock.calls[0] as unknown as [URL])[0].searchParams.get(
        "place_id",
      ),
    ).toBe("ChIJLugbe");
  });
  it("converts Google route duration and GeoJSON without losing alternative routes", async () => {
    mocks.env.googleMapsApiKey = "test-key";
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => locationResult("Lugbe, Abuja, Nigeria", "Lugbe"),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => locationResult("Wuse, Abuja, Nigeria", "Wuse"),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          routes: [
            {
              distanceMeters: 20000,
              duration: "1200s",
              polyline: {
                geoJsonLinestring: {
                  coordinates: [
                    [7.3, 8.9],
                    [7.4, 9.0],
                  ],
                },
              },
            },
            {
              distanceMeters: 23000,
              duration: "1500.5s",
              polyline: {
                geoJsonLinestring: {
                  coordinates: [
                    [7.3, 8.9],
                    [7.35, 8.95],
                    [7.4, 9.0],
                  ],
                },
              },
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetcher);
    const result = await directions("Lugbe", "Wuse", {
      originPlaceId: "ChIJLugbe",
      destinationPlaceId: "ChIJWuse",
    });
    expect(result.distanceMeters).toBe(20000);
    expect(result.durationSeconds).toBe(1200);
    expect(result.alternatives[0].durationSeconds).toBe(1500.5);
    const request = JSON.parse(fetcher.mock.calls[2][1].body);
    expect(request.origin).toEqual({ placeId: "ChIJLugbe" });
    expect(request.destination).toEqual({ placeId: "ChIJWuse" });
    expect(request.polylineEncoding).toBe("GEO_JSON_LINESTRING");
    expect(fetcher.mock.calls[2][0]).toBe(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
    );
  });
});
