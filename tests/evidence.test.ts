import { describe, it, expect } from "vitest";
import {
  computeEvidence,
  independenceGroup,
  matchIncident,
  buildRelations,
} from "../src/domain/evidence";
import { distanceToRoute } from "../src/domain/geo";
import type { Claim, Report, Incident } from "../src/domain/types";
const now = Date.parse("2026-09-22T10:00:00Z");
const at = (minutes: number) => new Date(now - minutes * 60000).toISOString();
const incident: Incident = {
  id: "i",
  title: "Road blocked",
  incidentType: "road_blockage",
  status: "unverified",
  severity: "medium",
  summary: "",
  location: {
    raw: "Market Junction",
    normalizedLabel: "Market Junction",
    latitude: 6.5,
    longitude: 3.3,
  },
  firstReportedAt: at(30),
  lastReportedAt: at(2),
  lastCorroboratedAt: null,
  statusUpdatedAt: at(2),
  resolvedAt: null,
  createdAt: at(30),
  updatedAt: at(2),
};
function report(
  id: string,
  perspective: Claim["firsthandness"] = "firsthand",
  minutes = 2,
): Report {
  return {
    id,
    incidentId: "i",
    rawText: `Vehicles turning back (${perspective})`,
    normalized: null,
    sourceType: "eyewitness",
    sourceFingerprint: id,
    independenceGroup: id,
    origin: "",
    submittedAt: at(minutes),
    observedAt: at(minutes),
    inputType: "text",
    mediaPath: null,
    analysisStatus: "complete",
    analysisError: null,
    notes: "",
    locationHint: "Market Junction",
  };
}
function claim(
  r: Report,
  stance: Claim["stance"] = "support",
  category = "road_blockage",
  perspective: Claim["firsthandness"] = "firsthand",
): Claim {
  return {
    id: r.id + category,
    reportId: r.id,
    incidentId: "i",
    canonicalText: "Road is blocked",
    category,
    stance,
    firsthandness: perspective,
    createdAt: r.observedAt,
  };
}
function evaluate(rs: Report[], cs: Claim[]) {
  return computeEvidence(incident, rs, cs, now);
}
describe("claim-aware evidence", () => {
  it("leaves one secondhand report unverified", () => {
    const r = report("a");
    expect(
      evaluate([r], [claim(r, "support", "road_blockage", "secondhand")])
        .status,
    ).toBe("unverified");
  });
  it("surfaces multiple weak sources as emerging", () => {
    const rs = [report("a"), report("b"), report("c")];
    expect(
      evaluate(
        rs,
        rs.map((r) => claim(r, "support", "road_blockage", "secondhand")),
      ).status,
    ).toBe("emerging");
  });
  it("corroborates two independent firsthand sources", () => {
    const rs = [report("a"), report("b")];
    expect(
      evaluate(
        rs,
        rs.map((r) => claim(r)),
      ).status,
    ).toBe("corroborated");
  });
  it("does not count repeated sources twice", () => {
    const rs = [report("a"), { ...report("b"), independenceGroup: "a" }];
    expect(
      evaluate(
        rs,
        rs.map((r) => claim(r)),
      ).status,
    ).toBe("unverified");
    expect(
      evaluate(
        rs,
        rs.map((r) => claim(r)),
      ).independentSourceCount,
    ).toBe(1);
  });
  it("does not let a trusted source label upgrade a secondhand claim", () => {
    const rs = [
      { ...report("a"), sourceType: "official source" as const },
      report("b"),
    ];
    expect(
      evaluate(
        rs,
        rs.map((r) => claim(r, "support", "road_blockage", "secondhand")),
      ).status,
    ).toBe("emerging");
  });
  it("marks contemporaneous material disagreement conflicting", () => {
    const rs = [report("a"), report("b"), report("c")];
    expect(
      evaluate(rs, [claim(rs[0]), claim(rs[1]), claim(rs[2], "deny")]).status,
    ).toBe("conflicting");
  });
  it("keeps separate armed rumor out of corroborated road status", () => {
    const rs = [report("a"), report("b"), report("c"), report("d")];
    const result = evaluate(rs, [
      claim(rs[0]),
      claim(rs[1]),
      claim(rs[2], "support", "armed_activity", "secondhand"),
      claim(rs[3], "deny", "armed_activity"),
    ]);
    expect(result.status).toBe("corroborated");
    expect(
      result.claims.find((c) => c.category === "armed_activity")?.status,
    ).toBe("unverified");
  });
  it("expires old evidence regardless of submission recency", () => {
    const r = { ...report("a", "firsthand", 180), submittedAt: at(1) };
    expect(evaluate([r], [claim(r)]).status).toBe("stale");
  });
  it("resolves a road only after two fresh independent firsthand reopening updates", () => {
    const rs = [
      report("a", "firsthand", 40),
      report("b", "firsthand", 35),
      report("c"),
      report("d"),
    ];
    expect(
      evaluate(rs, [
        claim(rs[0]),
        claim(rs[1]),
        claim(rs[2], "deny"),
        claim(rs[3], "deny"),
      ]).status,
    ).toBe("resolved");
  });
  it("does not resolve a road with one unconfirmed denial", () => {
    const rs = [report("a", "firsthand", 40), report("b")];
    expect(
      evaluate(rs, [
        claim(rs[0]),
        claim(rs[1], "deny", "road_blockage", "secondhand"),
      ]).status,
    ).not.toBe("resolved");
  });
  it("cannot keep an incident fresh through irrelevant new claims", () => {
    const rs = [report("a", "firsthand", 180), report("b")];
    expect(
      evaluate(rs, [claim(rs[0]), claim(rs[1], "support", "security_presence")])
        .status,
    ).toBe("stale");
  });
  it("recognizes temporal updates instead of contradictions", () => {
    const rs = [report("a", "firsthand", 40), report("b")];
    expect(
      buildRelations([claim(rs[0]), claim(rs[1], "deny")], rs).some(
        (r) => r.relation === "updates",
      ),
    ).toBe(true);
  });
});
describe("matching and independence", () => {
  it("groups near identical forwarded rumors", () => {
    const old = {
      ...report("a"),
      rawText: "Forwarded: Road blocked at Market Junction today!",
      independenceGroup: "original",
    };
    expect(
      independenceGroup(
        "Road blocked at Market Junction today",
        "different",
        "forwarded",
        "",
        [old],
      ),
    ).toBe("original");
  });
  it("counts one origin only once", () => {
    const old = {
      ...report("a"),
      origin: "Radio One",
      independenceGroup: "origin",
    };
    expect(
      independenceGroup(
        "A different paraphrase",
        "b",
        "secondhand",
        "radio one",
        [old],
      ),
    ).toBe("origin");
  });
  it("does not merge identical incidents far apart", () => {
    expect(
      matchIncident(
        {
          incidentType: "road_blockage",
          location: { ...incident.location, latitude: 8 },
        },
        [incident],
        now,
      ),
    ).toBeNull();
  });
  it("matches the same recent area", () => {
    expect(
      matchIncident(
        { incidentType: "road_blockage", location: incident.location },
        [incident],
        now,
      )?.id,
    ).toBe("i");
  });
});
it("measures proximity to segments rather than only route vertices", () => {
  expect(
    distanceToRoute(
      [3.305, 6.5001],
      [
        [3.3, 6.5],
        [3.31, 6.5],
      ],
    ),
  ).toBeLessThan(20);
  expect(
    distanceToRoute(
      [4, 8],
      [
        [3.3, 6.5],
        [3.31, 6.5],
      ],
    ),
  ).toBeGreaterThan(100000);
});
