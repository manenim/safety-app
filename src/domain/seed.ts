import type { Store, Incident, SourceType, Perspective, Claim } from "./types";

const id = (kind: number, n: number) =>
  `${String(kind).padStart(8, "0")}-0000-4000-8000-${String(n).padStart(12, "0")}`;
/** Pure deterministic fixtures, with all observation times relative to the clock. */
export function createSeed(now = Date.now()): Store {
  const store: Store = {
    incidents: [],
    reports: [],
    claims: [],
    relations: [],
    history: [],
    alerts: [],
    verifications: [],
  };
  const at = (minutes: number) =>
    new Date(now - minutes * 60_000).toISOString();
  const definitions: Array<
    [
      string,
      Incident["incidentType"],
      Incident["status"],
      Incident["severity"],
      string,
      number,
      number,
      string,
    ]
  > = [
    [
      "Road disruption at Market Junction",
      "road_blockage",
      "corroborated",
      "high",
      "Market Junction, Lagos",
      6.5244,
      3.3792,
      "Independent firsthand reports support road obstruction and vehicles turning back. Armed activity is disputed and is not established.",
    ],
    [
      "Possible disruption near Central Bridge",
      "road_blockage",
      "emerging",
      "medium",
      "Central Bridge, Lagos",
      6.5304,
      3.3892,
      "Several second-hand reports describe delays near the bridge. Independent firsthand verification is still needed.",
    ],
    [
      "School Road reopening reported",
      "road_blockage",
      "resolved",
      "low",
      "School Road, Lagos",
      6.5154,
      3.3662,
      "Two later independent eyewitness observations report traffic moving again after an earlier obstruction. Conditions may change.",
    ],
    [
      "Conflicting reports of waterfront access",
      "road_blockage",
      "conflicting",
      "medium",
      "Waterfront Road, Lagos",
      6.5064,
      3.3932,
      "Recent firsthand reports disagree about whether the road is obstructed. The current access situation is uncertain.",
    ],
    [
      "Old smoke reports near Industrial Estate",
      "fire",
      "stale",
      "high",
      "Industrial Estate, Lagos",
      6.5524,
      3.3592,
      "Earlier reports described smoke near a warehouse. No recent observation establishes the current situation.",
    ],
    [
      "Unverified power outage message",
      "infrastructure_failure",
      "unverified",
      "low",
      "North Estate, Lagos",
      6.5644,
      3.3822,
      "Copies of a forwarded power outage message share one apparent origin. There is no independent firsthand confirmation.",
    ],
  ];
  definitions.forEach(
    (
      [
        title,
        incidentType,
        status,
        severity,
        label,
        latitude,
        longitude,
        summary,
      ],
      index,
    ) => {
      const minutes = index === 4 ? 360 : 70;
      const incident: Incident = {
        id: id(1, index + 1),
        isDemo: true,
        title,
        incidentType,
        status,
        severity,
        summary,
        location: { raw: label, normalizedLabel: label, latitude, longitude },
        firstReportedAt: at(minutes),
        lastReportedAt: at(minutes),
        lastCorroboratedAt: status === "corroborated" ? at(5) : null,
        statusUpdatedAt: at(5),
        resolvedAt: status === "resolved" ? at(4) : null,
        createdAt: at(minutes),
        updatedAt: at(5),
      };
      store.incidents.push(incident);
    },
  );
  let count = 0;
  function report(
    incidentIndex: number,
    minutes: number,
    text: string,
    category: string,
    stance: Claim["stance"],
    perspective: Perspective,
    source: SourceType,
    group?: string,
  ) {
    count++;
    const incident = store.incidents[incidentIndex];
    const reportId = id(2, count);
    const observedAt = at(minutes);
    const independenceGroup = group || `seed-independent-${count}`;
    const canonicalText =
      ({
        road_blockage: "The road is obstructed",
        armed_activity: "Armed people are present",
        security_presence: "Security personnel are present",
        fire: "There is a fire",
        infrastructure_failure: "There is an electricity outage",
      }[category] || "A disruption is present") +
      ` at ${incident.location.normalizedLabel}.`;
    const normalized = {
      language: "English",
      translatedText: null,
      normalizedText: text,
      incidentType: incident.incidentType,
      location: incident.location,
      observedAt,
      sourcePerspective: perspective,
      observations: perspective === "firsthand" ? [text] : [],
      claims: [
        {
          text: canonicalText,
          category,
          polarity:
            stance === "support"
              ? ("supports" as const)
              : stance === "deny"
                ? ("denies" as const)
                : ("uncertain" as const),
          perspective,
        },
      ],
      urgency: incident.severity,
      extractionNotes: [
        "Seeded demonstration report; no real-world incident is asserted.",
      ],
    };
    store.reports.push({
      id: reportId,
      incidentId: incident.id,
      rawText: text,
      normalized,
      sourceType: source,
      sourceFingerprint: `seed-source-${independenceGroup}`,
      independenceGroup,
      origin: group || "",
      submittedAt: observedAt,
      observedAt,
      inputType: perspective === "forwarded" ? "screenshot" : "text",
      mediaPath: null,
      analysisStatus: "complete",
      analysisError: null,
      notes: "Fictional demonstration evidence.",
      locationHint: incident.location.normalizedLabel || "",
    });
    store.claims.push({
      id: id(3, count),
      incidentId: incident.id,
      reportId,
      canonicalText,
      category,
      stance,
      firsthandness: perspective,
      createdAt: observedAt,
    });
  }
  report(
    0,
    24,
    "A neighbour said armed people were seen at Market Junction; I did not see them.",
    "armed_activity",
    "support",
    "secondhand",
    "second-hand",
    "market-rumour",
  );
  report(
    0,
    15,
    "I saw vehicles turning back because Market Junction was obstructed.",
    "road_blockage",
    "support",
    "firsthand",
    "eyewitness",
  );
  report(
    0,
    12,
    "At Market Junction now: the road is obstructed and vehicles are turning back.",
    "road_blockage",
    "support",
    "firsthand",
    "trusted community source",
  );
  report(
    0,
    18,
    "Forwarded: armed people were seen at Market Junction.",
    "armed_activity",
    "support",
    "forwarded",
    "anonymous/unknown",
    "market-rumour",
  );
  report(
    0,
    10,
    "I can see the junction and have not seen any armed people.",
    "armed_activity",
    "deny",
    "firsthand",
    "community member",
  );
  report(
    0,
    5,
    "I reached the Market Junction filling station and had to turn back due to obstruction.",
    "road_blockage",
    "support",
    "firsthand",
    "eyewitness",
  );
  report(
    0,
    6,
    "I observed police directing vehicles at Market Junction.",
    "security_presence",
    "support",
    "firsthand",
    "eyewitness",
  );
  report(
    1,
    18,
    "A driver told me there may be an obstruction near Central Bridge.",
    "road_blockage",
    "support",
    "secondhand",
    "second-hand",
  );
  report(
    1,
    12,
    "My colleague says vehicles are delayed near Central Bridge.",
    "road_blockage",
    "support",
    "secondhand",
    "community member",
  );
  report(
    1,
    8,
    "Someone in the neighbourhood group mentioned a possible bridge obstruction.",
    "road_blockage",
    "support",
    "secondhand",
    "second-hand",
  );
  report(
    1,
    4,
    "I heard traffic may be turning back at Central Bridge, but cannot verify.",
    "road_blockage",
    "uncertain",
    "unknown",
    "anonymous/unknown",
  );
  report(
    2,
    65,
    "School Road is blocked by a fallen branch; I am at the scene.",
    "road_blockage",
    "support",
    "firsthand",
    "eyewitness",
  );
  report(
    2,
    55,
    "I saw a branch obstructing School Road traffic.",
    "road_blockage",
    "support",
    "firsthand",
    "community member",
  );
  report(
    2,
    7,
    "I just drove through School Road. The obstruction has been removed and the road is open.",
    "road_blockage",
    "deny",
    "firsthand",
    "eyewitness",
  );
  report(
    2,
    4,
    "School Road is now open; I am watching vehicles pass in both directions.",
    "road_blockage",
    "deny",
    "firsthand",
    "trusted community source",
  );
  report(
    3,
    14,
    "I see a barrier blocking Waterfront Road at the east access.",
    "road_blockage",
    "support",
    "firsthand",
    "eyewitness",
  );
  report(
    3,
    11,
    "Vehicles are unable to pass the Waterfront Road access where I am standing.",
    "road_blockage",
    "support",
    "firsthand",
    "community member",
  );
  report(
    3,
    12,
    "I am at Waterfront Road and traffic is passing; I see no obstruction.",
    "road_blockage",
    "deny",
    "firsthand",
    "eyewitness",
  );
  report(
    3,
    9,
    "I have just driven through Waterfront Road without any obstruction.",
    "road_blockage",
    "deny",
    "firsthand",
    "trusted community source",
  );
  report(
    4,
    380,
    "I saw flames behind a warehouse at Industrial Estate earlier.",
    "fire",
    "support",
    "firsthand",
    "eyewitness",
  );
  report(
    4,
    370,
    "There was smoke and a fire near the Industrial Estate warehouse.",
    "fire",
    "support",
    "firsthand",
    "community member",
  );
  report(
    4,
    355,
    "A driver reported a warehouse fire in Industrial Estate.",
    "fire",
    "support",
    "secondhand",
    "second-hand",
  );
  report(
    4,
    340,
    "Forwarded earlier message: smoke near the Industrial Estate warehouse.",
    "fire",
    "support",
    "forwarded",
    "anonymous/unknown",
  );
  for (const minutes of [16, 11, 8])
    report(
      5,
      minutes,
      "Forwarded: North Estate has lost electricity. Please verify locally.",
      "infrastructure_failure",
      "support",
      "forwarded",
      "anonymous/unknown",
      "north-outage-forward",
    );
  for (const incident of store.incidents) {
    const reports = store.reports.filter((r) => r.incidentId === incident.id);
    incident.firstReportedAt = reports.map((r) => r.observedAt).sort()[0];
    incident.lastReportedAt = reports
      .map((r) => r.observedAt)
      .sort()
      .at(-1)!;
    incident.createdAt = incident.firstReportedAt;
    incident.updatedAt = incident.lastReportedAt;
    incident.statusUpdatedAt = incident.lastReportedAt;
    store.history.push({
      id: id(4, store.history.length + 1),
      incidentId: incident.id,
      previousStatus: null,
      newStatus: "unverified",
      reason: ["First demonstration report received."],
      createdAt: incident.firstReportedAt,
    });
    if (incident.status !== "unverified")
      store.history.push({
        id: id(4, store.history.length + 1),
        incidentId: incident.id,
        previousStatus: "unverified",
        newStatus: incident.status,
        reason: [incident.summary],
        createdAt: incident.lastReportedAt,
      });
    const claims = store.claims.filter((c) => c.incidentId === incident.id);
    for (let a = 0; a < claims.length; a++)
      for (let b = a + 1; b < claims.length; b++) {
        const first = claims[a],
          second = claims[b];
        if (
          first.category !== second.category ||
          first.stance === "uncertain" ||
          second.stance === "uncertain"
        )
          continue;
        const different = first.stance !== second.stance;
        const updated =
          different &&
          Math.abs(Date.parse(first.createdAt) - Date.parse(second.createdAt)) >
            15 * 60_000;
        store.relations.push({
          id: id(5, store.relations.length + 1),
          claimAId: first.id,
          claimBId: second.id,
          relation: updated
            ? "updates"
            : different
              ? "contradicts"
              : "supports",
          explanation: updated
            ? "Later observation may reflect a changed situation."
            : different
              ? "Opposing observations in a similar time window; current conditions remain uncertain."
              : "Reports make compatible claims; source independence is assessed separately.",
          createdAt:
            first.createdAt > second.createdAt
              ? first.createdAt
              : second.createdAt,
        });
      }
  }
  return store;
}
