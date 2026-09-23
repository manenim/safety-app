import { createPlaceSeed, type DemoPlace } from "./place-seed";
import { createPresentationSeed } from "./presentation-seed";
import { buildRelations, computeEvidence } from "./evidence";
import type { Incident, Perspective, SourceType, Store, Claim } from "./types";

export const judgingPlaces = [
  {
    id: "ChIJl1KBvCcLThAR1r_hA0XxzhE",
    label:
      "Julius Berger Roundabout road safety office, Mabushi, Abuja, Nigeria",
  },
  {
    id: "ChIJVVVh8-4KThARYcEeSaAjCWY",
    label: "Banex Plaza wuse, Aminu Kano Crescent, Abuja, Nigeria",
  },
  {
    id: "ChIJQ-iUsWEJThARUUdSmH9wv88",
    label: "Aya Bus Stop, Asokoro, Abuja, Nigeria",
  },
  {
    id: "ChIJteFqRWUMThARss_lOlsxWI8",
    label:
      "Apo Roundabout Bus Stop, Nnamdi Azikiwe Express Way, Abuja, Nigeria",
  },
  {
    id: "EkYxc3QgQXZlbnVlLCBHd2FyaW5wYSwgQWJ1amEgOTAwMTA4LCBGZWRlcmFsIENhcGl0YWwgVGVycml0b3J5LCBOaWdlcmlhIi4qLAoUChIJifP_KWZ1ThARAHH84fmLBS4SFAoSCdkv1kxfdE4QESuhDqK0F71T",
    label: "1st Avenue, Gwarinpa, Abuja, Nigeria",
  },
  {
    id: "ChIJa11mbTrfTRARhtFVtZa7Zwo",
    label: "Kubwa Model Market, Kubwa, Abuja, Nigeria",
  },
] as const;

type Observation = {
  minutes: number;
  text: string;
  stance?: Claim["stance"];
  perspective?: Perspective;
  source?: SourceType;
};
type Scenario = {
  title: string;
  incidentType: Incident["incidentType"];
  claim: string;
  summary: string;
  observations: Observation[];
};
const scenarios: Scenario[] = [
  {
    title: "Broken-down bus obstructing a lane near Berger",
    incidentType: "road_blockage",
    claim:
      "A broken-down bus obstructs a traffic lane near the Julius Berger Roundabout road safety office.",
    summary:
      "Three independent firsthand observations describe a stationary bus obstructing one lane near Berger. Vehicles are merging into the remaining lane; a complete road closure has not been reported.",
    observations: [
      {
        minutes: 22,
        text: "I am beside the road safety office near Berger. A bus has stopped in one lane and cars are squeezing past in the other lane.",
      },
      {
        minutes: 16,
        text: "My taxi passed the stalled bus at Berger. One lane was obstructed and the queue was moving slowly.",
      },
      {
        minutes: 7,
        text: "From the pedestrian crossing near Berger I can still see the stationary bus. Drivers are merging around it.",
      },
    ],
  },
  {
    title: "Conflicting reports about the access road near Banex",
    incidentType: "road_blockage",
    claim:
      "Standing water prevents vehicles passing the access road near Banex Plaza.",
    summary:
      "Two firsthand reports describe an access road obstructed by standing water, while another driver reports passing through. Reports may concern different entrances; access remains uncertain.",
    observations: [
      {
        minutes: 17,
        text: "I am outside Banex Plaza on Aminu Kano Crescent. Water covers the access road and the small cars ahead are turning back.",
      },
      {
        minutes: 13,
        text: "At the Banex access road I could not drive through the standing water. I turned around at the entrance.",
      },
      {
        minutes: 10,
        text: "I have just left Banex by an access road and traffic was passing. I did not encounter an obstruction on that exit.",
        stance: "deny",
      },
    ],
  },
  {
    title: "Traffic officers directing vehicles at AYA",
    incidentType: "security_presence",
    claim: "Traffic officers are directing vehicles near Aya Bus Stop.",
    summary:
      "Two independent firsthand observations support traffic officers being present at AYA. Reports describe traffic control, with no evidence establishing an attack or a road closure.",
    observations: [
      {
        minutes: 20,
        text: "I am waiting at Aya Bus Stop. Two uniformed traffic officers are directing vehicles through the junction.",
      },
      {
        minutes: 9,
        text: "I passed AYA in a bus and saw officers managing the turning traffic. Vehicles continued moving.",
      },
      {
        minutes: 6,
        text: "My driver told me traffic officers were controlling the AYA junction. I am not at the junction myself.",
        perspective: "secondhand",
        source: "second-hand",
      },
    ],
  },
  {
    title: "Possible lane obstruction near Apo Roundabout",
    incidentType: "road_blockage",
    claim: "A lane is obstructed near Apo Roundabout Bus Stop.",
    summary:
      "Separate secondhand accounts describe a possible lane obstruction near Apo Roundabout Bus Stop. No firsthand observation has yet established the cause or current access.",
    observations: [
      {
        minutes: 19,
        text: "My colleague called from a bus near Apo Roundabout Bus Stop and said a lane was obstructed. I have not seen it myself.",
        perspective: "secondhand",
        source: "second-hand",
      },
      {
        minutes: 11,
        text: "A delivery driver told me vehicles were avoiding one lane by Apo Roundabout. I do not know what is blocking it.",
        perspective: "secondhand",
        source: "community member",
      },
      {
        minutes: 5,
        text: "There is talk of an obstruction at Apo Roundabout Bus Stop, but I cannot tell whether it is still there.",
        stance: "uncertain",
        perspective: "unknown",
        source: "anonymous/unknown",
      },
    ],
  },
  {
    title: "Power outage reported on 1st Avenue, Gwarinpa",
    incidentType: "infrastructure_failure",
    claim:
      "There is an electricity outage affecting premises on 1st Avenue, Gwarinpa.",
    summary:
      "Three independent local observations describe loss of electricity along part of 1st Avenue. The extent and cause of the outage are not established.",
    observations: [
      {
        minutes: 28,
        text: "The lights in my shop on 1st Avenue, Gwarinpa, went off. The adjacent shop is also without electricity.",
      },
      {
        minutes: 18,
        text: "I am at home on 1st Avenue and our electricity supply is off. I cannot speak for the rest of Gwarinpa.",
      },
      {
        minutes: 8,
        text: "Our workshop on 1st Avenue is still without mains power. We have switched to a generator.",
      },
    ],
  },
  {
    title: "Market access restored near Kubwa Model Market",
    incidentType: "road_blockage",
    claim: "A fallen branch obstructs the access road near Kubwa Model Market.",
    summary:
      "Earlier firsthand reports described a fallen branch obstructing market access. Two later independent observations report the branch removed and vehicles passing again.",
    observations: [
      {
        minutes: 62,
        text: "A large branch has fallen across the access road by Kubwa Model Market. I can see drivers turning back.",
      },
      {
        minutes: 54,
        text: "I reached the Kubwa Model Market access road and saw the fallen branch obstructing vehicles.",
      },
      {
        minutes: 12,
        text: "I have just driven into Kubwa Model Market. The branch is now beside the road and the access is clear.",
        stance: "deny",
      },
      {
        minutes: 5,
        text: "From the market entrance I can see vehicles passing in both directions. The fallen branch has been removed.",
        stance: "deny",
      },
    ],
  },
];
const id = (kind: number, n: number) =>
  `${String(kind).padStart(8, "0")}-0000-4000-8000-${String(n).padStart(12, "0")}`;

/** Fictional test scenarios; every supplied location must be resolved by Google. */
export function createJudgingSeed(
  places: DemoPlace[],
  now = Date.now(),
): Store {
  if (
    places.length !== 12 ||
    places.some(
      (p) =>
        !p.id ||
        !Number.isFinite(p.location.latitude) ||
        !Number.isFinite(p.location.longitude),
    )
  )
    throw new Error(
      "Twelve resolved Google Places are required for the judging dataset.",
    );
  const seed = createPlaceSeed(places.slice(0, 6), now);
  const presentation = createPresentationSeed(places[0], now);
  const firstId = seed.incidents[0].id;
  const oldClaimIds = new Set(
    seed.claims.filter((c) => c.incidentId === firstId).map((c) => c.id),
  );
  seed.incidents = [...presentation.incidents, ...seed.incidents.slice(1)];
  seed.reports = [
    ...presentation.reports,
    ...seed.reports.filter((r) => r.incidentId !== firstId),
  ];
  seed.claims = [
    ...presentation.claims,
    ...seed.claims.filter((c) => c.incidentId !== firstId),
  ];
  seed.history = [
    ...presentation.history,
    ...seed.history.filter((h) => h.incidentId !== firstId),
  ];
  seed.relations = [
    ...presentation.relations,
    ...seed.relations.filter(
      (r) => !oldClaimIds.has(r.claimAId) && !oldClaimIds.has(r.claimBId),
    ),
  ];
  const at = (minutes: number) => new Date(now - minutes * 60000).toISOString();
  scenarios.forEach((scenario, index) => {
    const place = places[index + 6];
    const incident: Incident = {
      id: id(1, index + 7),
      isDemo: true,
      title: scenario.title,
      incidentType: scenario.incidentType,
      status: "unverified",
      severity:
        scenario.incidentType === "infrastructure_failure" ? "low" : "medium",
      summary: scenario.summary,
      location: { ...place.location },
      firstReportedAt: at(scenario.observations[0].minutes),
      lastReportedAt: at(scenario.observations.at(-1)!.minutes),
      lastCorroboratedAt: null,
      resolvedAt: null,
      statusUpdatedAt: at(scenario.observations.at(-1)!.minutes),
      createdAt: at(scenario.observations[0].minutes),
      updatedAt: at(scenario.observations.at(-1)!.minutes),
    };
    scenario.observations.forEach((observation, reportIndex) => {
      const n = 100 + index * 10 + reportIndex;
      const observedAt = at(observation.minutes);
      const perspective = observation.perspective || "firsthand";
      const stance = observation.stance || "support";
      const group = `seed-judging-${n}`;
      seed.reports.push({
        id: id(2, n),
        incidentId: incident.id,
        rawText: observation.text,
        sourceType: observation.source || "eyewitness",
        sourceFingerprint: group,
        independenceGroup: group,
        origin: "",
        submittedAt: observedAt,
        observedAt,
        inputType: "text",
        mediaPath: null,
        analysisStatus: "complete",
        analysisError: null,
        notes:
          "Fictional demo report at a real Google Place. Not an actual incident.",
        locationHint: place.label,
        locationPlaceId: place.id,
        normalized: {
          language: "English",
          translatedText: null,
          normalizedText: observation.text,
          incidentType: incident.incidentType,
          location: { ...place.location },
          observedAt,
          sourcePerspective: perspective,
          observations: perspective === "firsthand" ? [observation.text] : [],
          claims: [
            {
              text: scenario.claim,
              category: incident.incidentType,
              perspective,
              polarity:
                stance === "support"
                  ? "supports"
                  : stance === "deny"
                    ? "denies"
                    : "uncertain",
            },
          ],
          urgency: incident.severity,
          extractionNotes: [
            "Seeded demonstration report; no real-world incident is asserted.",
          ],
        },
      });
      seed.claims.push({
        id: id(3, n),
        incidentId: incident.id,
        reportId: id(2, n),
        canonicalText: scenario.claim,
        category: incident.incidentType,
        stance,
        firsthandness: perspective,
        createdAt: observedAt,
      });
    });
    const reports = seed.reports.filter((r) => r.incidentId === incident.id);
    const claims = seed.claims.filter((c) => c.incidentId === incident.id);
    incident.status = computeEvidence(incident, reports, claims, now).status;
    if (incident.status === "corroborated")
      incident.lastCorroboratedAt = incident.lastReportedAt;
    if (incident.status === "resolved")
      incident.resolvedAt = incident.lastReportedAt;
    seed.incidents.push(incident);
    seed.relations.push(
      ...buildRelations(claims, reports).map((relation, relationIndex) => ({
        ...relation,
        id: id(5, 100 + index * 10 + relationIndex),
        createdAt: incident.lastReportedAt,
      })),
    );
    seed.history.push({
      id: id(4, 100 + index * 2),
      incidentId: incident.id,
      previousStatus: null,
      newStatus: "unverified",
      reason: ["Initial community report received."],
      createdAt: incident.firstReportedAt,
    });
    if (incident.status !== "unverified")
      seed.history.push({
        id: id(4, 101 + index * 2),
        incidentId: incident.id,
        previousStatus: "unverified",
        newStatus: incident.status,
        reason: [scenario.summary],
        createdAt: incident.lastReportedAt,
      });
  });
  return seed;
}
