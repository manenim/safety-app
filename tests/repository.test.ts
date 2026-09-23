import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSeed } from "../src/domain/seed";
import { toIncidentView } from "../src/domain/evidence";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("../src/lib/env", () => ({
  getEnv: () => ({
    demoMode: process.env.SIGNALCHECK_DEMO_MODE === "true",
    supabaseUrl: "https://example.supabase.co",
    supabaseKey: "test-only",
  }),
}));
import {
  downloadMedia,
  mutateStore,
  readStore,
  uploadMedia,
} from "../src/server/repository";

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "signalcheck-test-"));
  vi.stubEnv("SIGNALCHECK_DATA_DIR", directory);
  vi.stubEnv("SIGNALCHECK_DEMO_MODE", "true");
  mocks.rpc.mockReset();
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

describe("deterministic seed", () => {
  it("contains six coherent scenarios, 26 reports, and valid evidence references", () => {
    const now = Date.parse("2026-09-22T12:00:00Z");
    const seed = createSeed(now);
    expect(createSeed(now)).toEqual(seed);
    expect(seed.incidents).toHaveLength(6);
    expect(seed.reports).toHaveLength(26);
    expect(new Set(seed.incidents.map((i) => i.status)).size).toBe(6);
    for (const claim of seed.claims) {
      const report = seed.reports.find((r) => r.id === claim.reportId)!;
      expect(report.incidentId).toBe(claim.incidentId);
      expect(report.observedAt).toBe(claim.createdAt);
    }
    const resolved = seed.incidents.find((i) => i.status === "resolved")!;
    const claims = seed.claims.filter((c) => c.incidentId === resolved.id);
    expect(claims.every((c) => c.category === resolved.incidentType)).toBe(
      true,
    );
    expect(
      Math.min(
        ...claims
          .filter((c) => c.stance === "deny")
          .map((c) => Date.parse(c.createdAt)),
      ) -
        Math.max(
          ...claims
            .filter((c) => c.stance === "support")
            .map((c) => Date.parse(c.createdAt)),
        ),
    ).toBeGreaterThan(15 * 60_000);
    const forwarded = seed.reports.filter(
      (r) => r.incidentId === seed.incidents[5].id,
    );
    expect(new Set(forwarded.map((r) => r.independenceGroup)).size).toBe(1);
    expect(
      seed.incidents.map(
        (incident) => toIncidentView(incident, seed, now).status,
      ),
    ).toEqual([
      "corroborated",
      "emerging",
      "resolved",
      "conflicting",
      "stale",
      "unverified",
    ]);
    const market = toIncidentView(seed.incidents[0], seed, now);
    expect(
      market.claims.find((claim) => claim.category === "armed_activity")
        ?.status,
    ).toBe("unverified");
  });
});

describe("persistent repository", () => {
  it("serializes overlapping writes without losing records", async () => {
    await readStore();
    await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        mutateStore(async (store) => {
          await Promise.resolve();
          store.verifications.push({
            id: `test-${index}`,
            incidentId: store.incidents[0].id,
            content: `Check ${index}`,
            createdAt: new Date().toISOString(),
          });
        }),
      ),
    );
    expect((await readStore()).verifications).toHaveLength(12);
  });
  it("does not persist mutations when the callback fails", async () => {
    const initial = await readStore();
    await expect(
      mutateStore((store) => {
        store.incidents = [];
        throw new Error("cancel");
      }),
    ).rejects.toThrow("cancel");
    expect((await readStore()).incidents).toEqual(initial.incidents);
  });
  it("round-trips private media and rejects path traversal and unsupported types", async () => {
    const path = await uploadMedia(
      new File([new Uint8Array([1, 2, 3])], "clip.webm", {
        type: "audio/webm",
      }),
    );
    const downloaded = await downloadMedia(path);
    expect(downloaded.type).toBe("audio/webm");
    expect([...downloaded.data]).toEqual([1, 2, 3]);
    await expect(downloadMedia("../../.env.local")).rejects.toThrow(
      "Invalid media reference",
    );
    await expect(
      uploadMedia(new File(["script"], "x.html", { type: "text/html" })),
    ).rejects.toThrow("supported");
  });
  it("retries live writes against a fresh snapshot after a version conflict", async () => {
    vi.stubEnv("SIGNALCHECK_DEMO_MODE", "false");
    const seed = createSeed();
    const newer = structuredClone(seed);
    newer.verifications.push({
      id: "other-request",
      incidentId: seed.incidents[0].id,
      content: "Concurrent update",
      createdAt: new Date().toISOString(),
    });
    mocks.rpc
      .mockResolvedValueOnce({
        data: { version: 1, store: structuredClone(seed) },
        error: null,
      })
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({
        data: { version: 2, store: newer },
        error: null,
      })
      .mockResolvedValueOnce({ data: true, error: null });
    await mutateStore((store) => {
      store.verifications.push({
        id: "our-request",
        incidentId: store.incidents[0].id,
        content: "Our update",
        createdAt: new Date().toISOString(),
      });
    });
    const last = mocks.rpc.mock.calls.at(-1)!;
    expect(last[0]).toBe("signalcheck_commit_store");
    expect(last[1].expected_version).toBe(2);
    expect(
      last[1].next_store.verifications.map((v: { id: string }) => v.id),
    ).toEqual(["other-request", "our-request"]);
  });
});

it("retries a transient snapshot failure before saving an upload report", async () => {
  vi.stubEnv("SIGNALCHECK_DEMO_MODE", "false");
  const seed = createSeed();
  mocks.rpc
    .mockResolvedValueOnce({
      data: null,
      error: { code: "", message: "TypeError: fetch failed" },
      status: 0,
    })
    .mockResolvedValueOnce({ data: { version: 1, store: seed }, error: null })
    .mockResolvedValueOnce({ data: true, error: null });
  let mutations = 0;
  await mutateStore(() => {
    mutations++;
  });
  expect(mutations).toBe(1);
  expect(mocks.rpc.mock.calls.map(([name]) => name)).toEqual([
    "signalcheck_read_store",
    "signalcheck_read_store",
    "signalcheck_commit_store",
  ]);
});
