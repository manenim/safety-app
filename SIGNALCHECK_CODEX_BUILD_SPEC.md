# SignalCheck — Codex One-Shot Build Specification

> **Purpose of this file**
>
> This document is the implementation contract for Codex. Build the entire application described here end-to-end before optimizing the visual design. The application must be fully functional, deployable, testable, and usable with a deliberately simple but clean UI.
>
> **Primary objective:** Ship a working AI-powered community safety intelligence platform that turns noisy, fragmented reports into structured incidents, evidence-backed claims, explainable safety signals, route-aware guidance, and coordinator-ready alerts.
>
> **Important:** Do not spend excessive time on visual polish. Build a coherent, accessible, responsive interface that exposes every major capability. A later design pass will replace/refine the UI using Google Stitch + AntiGravity. Preserve architectural separation so that the visual layer can be replaced without rewriting the application logic.

---

# 1. Project Name

**SignalCheck**

Suggested tagline:

> **Turn scattered reports into explainable safety signals.**

Alternative product descriptor:

> **AI-powered community safety intelligence for noisy, fast-moving situations.**

---

# 2. Product Problem

SignalCheck is inspired by a scenario where a person needs to decide whether a road or nearby area is safe, but the information available to them is fragmented across:

- WhatsApp rumours
- eyewitness reports
- local radio
- community groups
- voice notes
- screenshots
- trusted local coordinators
- second-hand information
- incomplete reports
- contradictory reports

The user does **not** need another social feed. They need a system that can answer:

- What is actually being reported?
- Which reports refer to the same incident?
- Which claims are supported by multiple independent sources?
- Which claims are only rumours?
- Which reports contradict one another?
- How fresh is the information?
- Does the incident affect my intended route?
- What changed recently?
- What should a community coordinator communicate publicly?
- What evidence supports the current incident status?

SignalCheck must use AI to transform messy information into structured, explainable intelligence.

---

# 3. Core Product Principle

The application must **not** treat an LLM as an oracle of truth.

The AI may:

- understand messy human language
- transcribe speech
- translate/localize
- extract entities
- extract atomic claims
- normalize places
- detect semantic similarity
- cluster reports
- identify apparent contradictions
- summarize evidence
- generate user-facing explanations
- generate community alerts
- answer questions against the application's evidence
- detect emerging patterns

The AI must **not** simply hallucinate a truth score or invent certainty.

Trust/corroboration status must be produced by an explainable evidence engine using stored reports, source type, independence, freshness, contradiction counts, and corroborated claims.

Never display arbitrary values such as "87% true" unless the value comes from a clearly documented deterministic formula. Prefer labels such as:

- UNVERIFIED
- EMERGING
- CORROBORATED
- CONFLICTING
- STALE
- RESOLVED

Each status must be explainable.

---

# 4. Hackathon Product Goal

The working prototype should feel broad and AI-rich while remaining architecturally coherent.

The app must demonstrate that one intelligence pipeline can serve three primary personas:

## 4.1 Resident / Public User

Needs to:

- see active incidents
- see evidence-backed incident status
- ask natural-language safety questions
- check whether a route may be affected
- see a map
- understand why a signal is considered credible or uncertain
- see freshness and supporting evidence
- avoid confusing "no signal" with "guaranteed safe"

## 4.2 Reporter / Community Member

Needs to:

- submit text
- upload an image/screenshot
- submit/upload audio
- optionally specify location manually
- describe whether the report is firsthand or second-hand
- allow AI to extract structured details
- see what the AI understood
- see whether the report matched an existing incident or created a new one

## 4.3 Coordinator / Community Leader

Needs to:

- monitor active incidents
- see emerging signals
- inspect claims/evidence
- see contradictions
- generate public alerts
- generate radio-style announcements
- translate/localize alerts
- request additional verification
- ask "what changed?"
- see a situation brief
- see stale/unresolved incidents
- see route/area impact

---

# 5. Required Technology Direction

Use a modern TypeScript-first stack optimized for shipping quickly.

## Preferred application architecture

Use a **single Next.js application** unless the existing repository already has a clearly established frontend/backend split.

Recommended:

- Next.js (latest stable App Router)
- TypeScript
- React
- Tailwind CSS
- Supabase
  - Postgres
  - Storage
  - Auth if practical
  - pgvector if available/needed
- OpenAI API
  - text reasoning
  - structured outputs
  - vision
  - audio transcription
  - embeddings if appropriate
- Mapbox
  - map rendering
  - geocoding
  - directions / route geometry
- Zod
- server-only service/repository layer
- Vitest or Jest for critical tests
- Playwright for basic happy-path E2E if time allows

A separate backend service is **not required** if Next.js server routes/server actions cleanly support the application. Avoid introducing infrastructure complexity for its own sake.

---

# 6. Environment Configuration

There is a file named:

`envs.txt`

in the root directory.

It contains environment variables for both frontend-safe variables and server-only variables.

## Codex requirements

1. Read `envs.txt`.
2. Identify all `KEY=value` pairs.
3. Map them into the runtime configuration required by the application.
4. Never print secret values in logs, generated documentation, test output, or commit history.
5. Never expose server secrets to the browser.
6. Only variables explicitly intended for client use may use `NEXT_PUBLIC_`.
7. Add `envs.txt` to `.gitignore`.
8. Add `.env`, `.env.local`, `.env.production`, and other secret-bearing env files to `.gitignore`.
9. Generate a safe `.env.example` with variable names but **no secret values**.
10. If the values from `envs.txt` need to be copied to `.env.local`, do so locally but never commit the generated secret file.
11. Validate environment variables at application startup using a typed env module.
12. Fail with a clear developer-facing error if required variables are missing.

Expected categories may include:

- OpenAI
- Supabase URL
- Supabase publishable/public key
- Supabase server/secret key
- database connection URL
- Mapbox public token
- optional alert/email provider credentials

Do not assume exact names if `envs.txt` already defines them. Prefer the existing names where practical and centralize mapping in one env module.

---

# 7. Repository Hygiene

The repository must include:

- `README.md`
- `CODEX_BUILD_SPEC.md` or this file under the provided filename
- `.env.example`
- `.gitignore`
- database migration/schema files
- seed script
- test scripts
- setup instructions
- deployment instructions
- concise architecture explanation
- API/feature overview
- screenshots optional, not required
- no committed secrets

Suggested npm scripts:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "seed": "tsx scripts/seed.ts"
}
```

Adapt to the actual framework/tooling used.

---

# 8. Architectural Rule: UI Must Be Replaceable

The current UI is temporary.

Do not put business logic inside visual components.

Bad:

```tsx
function IncidentCard() {
  // fetch database
  // call OpenAI
  // calculate corroboration
  // render HTML
}
```

Good:

```text
data repositories
    ↓
domain services
    ↓
AI services
    ↓
application service / route handler
    ↓
typed DTO / view model
    ↓
React UI
```

Visual components should consume typed view models.

Example:

```ts
export type IncidentView = {
  id: string
  title: string
  status:
    | "unverified"
    | "emerging"
    | "corroborated"
    | "conflicting"
    | "stale"
    | "resolved"
  severity: "low" | "medium" | "high" | "critical"
  summary: string
  location: {
    label: string
    latitude?: number
    longitude?: number
  }
  supportingReports: number
  contradictingReports: number
  independentSourceCount: number
  updatedAt: string
  firstReportedAt: string
  claims: ClaimView[]
  explanation: string[]
}
```

The future design pass should be able to replace `IncidentCard`, `IncidentDetail`, dashboards, layout, etc. without touching AI/domain logic.

---

# 9. Suggested Folder Structure

Use a clean structure similar to:

```text
src/
├── app/
│   ├── page.tsx
│   ├── report/
│   │   └── page.tsx
│   ├── incidents/
│   │   ├── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── ask/
│   │   └── page.tsx
│   ├── routes/
│   │   └── page.tsx
│   ├── command-center/
│   │   └── page.tsx
│   └── api/
│       ├── reports/
│       ├── incidents/
│       ├── assistant/
│       ├── route-check/
│       ├── alerts/
│       └── situation-brief/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── incidents/
│   ├── reports/
│   ├── evidence/
│   ├── maps/
│   ├── assistant/
│   └── command-center/
│
├── features/
│   ├── reports/
│   ├── incidents/
│   ├── evidence/
│   ├── assistant/
│   ├── alerts/
│   ├── routing/
│   └── situation/
│
├── server/
│   ├── repositories/
│   ├── services/
│   └── jobs/
│
├── lib/
│   ├── ai/
│   ├── supabase/
│   ├── mapbox/
│   ├── env/
│   ├── validation/
│   └── utils/
│
├── db/
│   ├── schema/
│   ├── migrations/
│   └── seed/
│
└── types/
```

Exact naming may vary, but maintain separation.

---

# 10. Major Product Surfaces

Build all of the following.

## 10.1 Public Home / Signal Feed

Purpose:

Give a resident an immediate overview of what is currently happening.

Must include:

- app header / simple navigation
- "Ask SignalCheck" CTA
- "Report an incident" CTA
- active incident list
- incident status badge
- severity
- location
- freshness
- short AI summary
- number of independent supporting sources
- contradiction indicator
- map preview or map section
- filters:
  - status
  - severity
  - time window
  - location/search
- section for emerging signals
- section for recently resolved/stale incidents

Example card:

```text
CORROBORATED
Road disruption near Market Junction

Updated 4 minutes ago
4 independent reports
1 conflicting report

Multiple reports indicate vehicles are turning back
around the northern junction.

[View evidence]
```

Do not imply that "no incidents" means guaranteed safety.

---

## 10.2 Report Submission

Support:

### Text report

Textarea plus optional:

- location
- source type
- time observed
- reporter notes

### Audio report

Allow:

- audio file upload
- ideally browser voice recording if simple
- transcribe on server
- normalize transcription

### Image / screenshot report

Allow:

- screenshot/image upload
- use vision to extract relevant claims/text
- treat screenshots/forwarded messages as evidence with lower default source confidence unless the user explicitly says it is firsthand evidence

### Reporter metadata

Allow source type:

- eyewitness
- second-hand
- community member
- trusted community source
- security/vigilante source
- official source
- anonymous/unknown

Do **not** automatically equate a source label with factual truth.

### AI preview

After submission, show:

- detected incident type
- detected location
- detected time
- source classification
- extracted observations
- atomic claims
- whether it appears firsthand/second-hand
- matched incident if any
- AI-generated normalized summary

User can confirm/correct extracted fields before final save if implementation is reasonable.

At minimum, display what was extracted.

---

# 11. AI Engine A — Multimodal Report Understanding

Create one service responsible for turning raw input into a structured report.

Inputs may include:

- free text
- transcript
- image/screenshot
- location hint
- source hint
- current timestamp

Output should be strongly typed and validated.

Suggested schema:

```ts
type NormalizedReport = {
  language: string
  translatedText?: string
  normalizedText: string
  incidentType:
    | "road_blockage"
    | "violence"
    | "gunshots"
    | "fire"
    | "accident"
    | "protest"
    | "security_presence"
    | "suspicious_activity"
    | "infrastructure_failure"
    | "other"
  location: {
    raw: string | null
    normalizedLabel: string | null
    latitude?: number | null
    longitude?: number | null
  }
  observedAt?: string | null
  sourcePerspective:
    | "firsthand"
    | "secondhand"
    | "forwarded"
    | "unknown"
  observations: string[]
  claims: Array<{
    text: string
    category: string
    polarity: "supports" | "denies" | "uncertain"
  }>
  urgency: "low" | "medium" | "high" | "critical"
  extractionNotes: string[]
}
```

Use structured output / JSON schema where available.

Never trust malformed model output; validate with Zod.

---

# 12. Language Support

The product must be capable of handling:

- English
- Nigerian Pidgin
- other languages supported by the chosen model

The MVP need not have manually authored localization for the entire interface.

However, reports should be:

- detected for language
- normalized into English for internal reasoning if needed
- retain original content
- expose translated content where useful

Alert generation should support selecting output language.

Suggested language options in UI:

- English
- Pidgin
- Hausa

If model support is sufficient, allow additional freeform languages.

---

# 13. AI Engine B — Claim Extraction

A report may contain multiple distinct claims.

Example:

> "Everybody is turning back near the bridge. I heard there were gunmen, and police are around."

This should become distinct claims:

1. vehicles are turning back
2. armed persons are present
3. police/security are present

Each claim must be stored separately.

Suggested fields:

```ts
type Claim = {
  id: string
  incidentId: string
  reportId: string
  canonicalText: string
  category: string
  stance: "support" | "deny" | "uncertain"
  firsthandness: "firsthand" | "secondhand" | "forwarded" | "unknown"
  createdAt: string
}
```

This enables claim-level evidence instead of treating whole reports as true/false.

---

# 14. AI Engine B — Incident Matching / Clustering

When a new report arrives:

1. normalize content
2. geocode location if possible
3. search recent incidents
4. compare:
   - geographic proximity
   - semantic similarity
   - incident type
   - time window
5. decide:
   - match existing incident
   - create new incident
   - mark uncertain match for human inspection if necessary

Use embeddings if useful.

Recommended heuristic:

- only compare against incidents within a configurable time window such as 6 hours
- favor same normalized area/location
- use semantic similarity threshold
- use incident type compatibility
- if location differs significantly, do not match based on semantics alone

Do not make geographic clustering overly strict because local place descriptions may be messy.

---

# 15. Geocoding / Location Intelligence

Use Mapbox geocoding for:

- manual location search
- AI-extracted place names
- route endpoints
- normalized coordinates

Store:

- original location text
- normalized place label
- latitude
- longitude

If geocoding fails:

- preserve text-only location
- do not block report ingestion

The product should degrade gracefully.

---

# 16. Evidence Graph

The evidence graph is a core feature.

An incident contains:

- reports
- claims
- source identities or source fingerprints where available
- support/deny relationships
- temporal information

Example conceptual structure:

```text
INCIDENT: Market Junction disturbance

Claim A: vehicles turning back
├── Report 1 — eyewitness — supports
├── Report 2 — eyewitness — supports
└── Report 5 — second-hand — supports

Claim B: police present
├── Report 1 — eyewitness — supports
└── Report 4 — trusted source — supports

Claim C: armed attackers present
├── Report 2 — second-hand — supports
├── Report 3 — forwarded message — supports
└── Report 4 — trusted source — denies
```

The UI should expose this in a simple list/tree/card view.

A fancy graph visualization is optional. A clear evidence table is sufficient.

---

# 17. Source Independence

Multiple copies of the same rumour should not count as multiple independent confirmations.

Implement practical source independence logic.

At minimum:

- identical/near-identical forwarded content should be grouped as likely duplicate propagation
- the same authenticated reporter counts once
- repeated submissions from same source within a short window should not inflate independent source count
- if screenshots contain near-identical text, treat them as potentially duplicated information
- second-hand reports that explicitly reference the same origin should not multiply corroboration

Store an `independenceGroup` or equivalent.

The UI should show:

> "4 reports received, 2 independent sources."

That distinction is important.

---

# 18. Duplicate / Noise Suppression

If 20 reports all describe the same incident:

- do not create 20 incidents
- update one incident
- deduplicate very similar submissions when appropriate
- keep original reports stored for auditability

The public feed should show one incident with aggregated evidence.

---

# 19. AI Engine C — Contradiction Detection

For claims associated with the same incident, detect contradictions.

Examples:

- "road blocked" vs "road now open"
- "gunshots heard" vs "no gunshots heard"
- "police are present" vs "no security personnel present"

Do not overuse contradiction labeling when differences may simply reflect different timestamps.

Time awareness matters:

> "Road was blocked at 18:20" and "Road reopened at 18:50" are not necessarily contradictory.

Store contradiction relationships where useful.

Suggested shape:

```ts
type ClaimRelation = {
  id: string
  claimAId: string
  claimBId: string
  relation: "supports" | "contradicts" | "updates" | "unrelated"
  explanation?: string
}
```

---

# 20. Deterministic Evidence / Corroboration Engine

Do not let the LLM directly declare truth.

Build a deterministic domain service that calculates incident state.

Inputs may include:

- count of independent supporting sources
- source perspective
- trusted source presence
- contradictions
- recency
- claim coverage
- report freshness
- latest updates
- duplicate propagation

Suggested state logic:

## UNVERIFIED

Typical conditions:

- only one weak/unconfirmed report
- only forwarded/second-hand information
- insufficient independent corroboration

## EMERGING

Typical conditions:

- multiple related recent reports
- evidence is suggestive
- but not enough independent support for corroboration

## CORROBORATED

Typical conditions:

- at least two independent recent sources support material claims
- or one trusted source plus another independent supporting source
- no severe unresolved contradiction affecting the core claim

## CONFLICTING

Typical conditions:

- credible evidence materially supports and denies the same core claim
- or the current situation is unclear because reports disagree

## STALE

Typical conditions:

- information has aged beyond relevance threshold
- no recent update
- cannot safely present as current

## RESOLVED

Typical conditions:

- credible recent update indicates the incident ended / road reopened / danger cleared
- retain history

Do not hard-code all logic in UI.

Put thresholds in config.

---

# 21. Explainability

Every incident must have a human-readable "Why this status?" section generated from deterministic facts.

Example:

```text
Why SignalCheck marks this as CORROBORATED

• 4 reports received
• 3 appear to be independent sources
• 2 are firsthand observations
• All 3 independent sources agree vehicles are turning back
• 1 separate report disputes whether the road remains blocked
• Latest supporting report: 4 minutes ago
```

AI may polish wording, but the facts must come from the evidence engine.

---

# 22. Freshness / Time Decay

Safety information goes stale quickly.

Implement:

- `firstReportedAt`
- `lastReportedAt`
- `lastCorroboratedAt`
- `statusUpdatedAt`
- expiry/freshness rules

Example UI:

- "Updated 4 min ago"
- "No new evidence for 52 min"
- "STALE — last reliable update 2 hours ago"

A background cron is optional.

At minimum, recompute freshness whenever incidents are fetched or updated.

---

# 23. AI Engine D — Emerging Signal Detection

This is a visible hackathon feature.

Detect weak signals before they are corroborated.

Example:

- 18:20 — unusual crowd near Central Bridge
- 18:24 — cars slowing near Central Bridge
- 18:27 — vehicles turning around

The system should identify:

> **Emerging signal detected:** Several recent reports around Central Bridge may indicate a developing road disruption.

Implementation:

- cluster recent unmatched or weakly matched reports
- combine:
  - temporal proximity
  - location proximity
  - semantic similarity
  - related event categories
- create/update incident with `EMERGING` status

Expose this in:

- public feed
- coordinator dashboard
- situation brief

---

# 24. Incident Severity

Separate **corroboration status** from **severity**.

A highly severe rumour may still be unverified.

Example severity values:

- low
- medium
- high
- critical

AI may recommend severity based on report content, but application logic should store it separately from evidence status.

Examples:

- congestion: low/medium
- blocked road: medium
- fire: high
- credible active violence: critical

Never allow a severe label to imply corroboration.

---

# 25. Ask SignalCheck — Natural Language Q&A

Build a dedicated assistant page.

The assistant must answer questions using stored SignalCheck incidents/reports, not generic model knowledge alone.

Examples:

- "Is Market Road safe right now?"
- "What happened near Central Bridge?"
- "Why is the gunmen claim still unverified?"
- "What changed in the last 30 minutes?"
- "Which roads currently have corroborated disruptions?"
- "What evidence supports the Market Junction warning?"
- "Are there any conflicting reports near the station?"

Use retrieval against:

- incidents
- claims
- reports
- status explanations
- freshness
- locations

The assistant must distinguish:

- corroborated evidence
- unverified claims
- no available SignalCheck evidence

It must never say:

> "This road is definitely safe."

Prefer:

> "SignalCheck currently has no active corroborated incident affecting this route. That does not guarantee the route is safe."

---

# 26. Assistant Citation / Evidence References

When possible, answers should include small internal references such as:

- Incident: Market Junction disruption
- Report count: 4
- Last update: 6 min ago
- Claim: vehicles turning back
- Status: corroborated

No need for formal academic citations.

The goal is transparency.

---

# 27. Route Safety Assistant

Build a route-check page.

User inputs:

- origin
- destination

Use Mapbox:

1. geocode origin/destination
2. request route geometry
3. retrieve active incidents with coordinates
4. determine which incidents lie near/intersect the route
5. classify route impact

Output:

```text
ROUTE CHECK

Market Square → Unity Estate

1 active incident may affect this route.

Market Junction road disruption
CORROBORATED
Updated 7 minutes ago
~300m from route

Suggested action:
Consider an alternate route while the disruption remains active.
```

If Mapbox returns alternatives, show one if practical.

Do not claim the route is safe.

States:

- no known active signal
- caution
- impacted
- uncertain due to unverified/emerging reports

Use a configurable proximity buffer.

---

# 28. Map View

Build a map that shows:

- active incidents
- status marker/badge
- severity
- click marker to open incident summary

Optional:

- route polyline
- incident clusters
- filters

The map is a supporting visualization, not the only way to access information.

---

# 29. Coordinator Command Center

Build a dedicated command center.

Must include:

## Overview metrics

- active incidents
- corroborated incidents
- emerging signals
- conflicting incidents
- reports in last hour
- stale incidents
- high/critical severity incidents

## Active intelligence list

Sortable/filterable.

## Emerging signals

Dedicated panel.

## AI Situation Brief

A generated summary answering:

- what changed recently
- where activity increased
- what is corroborated
- what remains unverified
- what contradictions exist
- what needs more evidence

Example:

> Activity increased around Market Junction at approximately 18:32. Three independent sources now report vehicles turning back. A separate claim of armed activity remains unverified. Two recent reports near Central Bridge may indicate an emerging disruption but currently lack sufficient corroboration.

## Incident inspection

Coordinator can open an incident and see:

- reports
- claims
- evidence relationships
- source types
- status explanation
- contradictions
- timeline

## Alert generation

See section below.

---

# 30. AI Situation Brief

Implement endpoint/service that can produce briefs for:

- last 30 minutes
- last hour
- today
- a specific incident

The model should receive structured facts, not unrestricted raw data when avoidable.

Brief format:

```text
Situation Brief — Last 60 Minutes

Confirmed / Corroborated
- ...

Emerging
- ...

Conflicting / Unverified
- ...

Resolved
- ...

What needs verification
- ...
```

---

# 31. "What Changed?" Intelligence

This is a high-value AI feature.

Given a previous time window and current state, summarize meaningful changes.

Examples:

- incident upgraded from emerging to corroborated
- new contradiction appeared
- road reopening reported
- new emerging cluster detected
- severity increased
- incident became stale
- new area affected

Expose from command center.

---

# 32. Recommended Next Verification Step

For unverified/emerging/conflicting incidents, generate practical verification needs.

Examples:

> "Need one independent firsthand report near the northern junction."

> "Current reports disagree on whether the road has reopened. A fresh observation from the junction would resolve the conflict."

> "The claim of gunshots is currently supported only by second-hand reports."

This can be AI-generated from evidence gaps.

Do not expose sensitive reporter identity.

---

# 33. Community Alert Generator

Coordinator can generate a public alert from an incident.

Formats:

- short alert
- SMS-style alert
- WhatsApp-style message
- radio announcement
- push notification
- community briefing

Inputs:

- incident
- audience
- language
- desired length

Output must preserve evidence status.

Bad:

> "Gunmen are attacking Market Road."

Good when unverified:

> "Unverified reports of armed activity are circulating around Market Road. SignalCheck has not yet received independent confirmation. Residents are advised to avoid spreading unconfirmed claims and use caution while updates are gathered."

Good when corroborated road disruption:

> "Multiple independent reports indicate a road disruption near Market Junction. Motorists should consider an alternate route until a fresh update confirms reopening."

---

# 34. Alert Translation

Allow translation/localization.

At minimum:

- English
- Pidgin
- Hausa

Keep status nuance intact.

Do not convert "unverified" into definitive wording during translation.

---

# 35. Optional Alert Delivery

If an email provider API key exists in `envs.txt`, optionally implement an actual send action for demonstration.

If not, provide:

- copy button
- downloadable/plain-text output
- "ready to send" state

Do not block the application on external messaging integrations.

---

# 36. Data Model

Use Supabase Postgres.

Suggested tables are below. Adapt naming as needed.

## users

For authenticated coordinator/admin users if auth is implemented.

```text
id
email
display_name
role
created_at
```

## sources

Represents report origin or source identity/fingerprint.

```text
id
user_id nullable
display_name nullable
source_type
trust_tier
fingerprint nullable
created_at
```

`trust_tier` is contextual metadata, not truth.

## reports

```text
id
source_id nullable
raw_text
normalized_text
language
translated_text nullable
input_type              // text | audio | image | screenshot
media_url nullable
source_perspective      // firsthand | secondhand | forwarded | unknown
incident_type
severity
raw_location_text nullable
location_label nullable
latitude nullable
longitude nullable
observed_at nullable
submitted_at
ai_metadata jsonb
independence_group nullable
matched_incident_id nullable
```

## incidents

```text
id
title
slug nullable
incident_type
status
severity
summary
location_label nullable
latitude nullable
longitude nullable
first_reported_at
last_reported_at
last_corroborated_at nullable
status_updated_at
resolved_at nullable
created_at
updated_at
```

## claims

```text
id
incident_id
report_id
canonical_text
category
stance
firsthandness
created_at
```

## claim_relations

```text
id
claim_a_id
claim_b_id
relation
explanation nullable
created_at
```

## incident_status_history

```text
id
incident_id
previous_status nullable
new_status
reason jsonb
created_at
```

## generated_alerts

```text
id
incident_id
format
language
content
created_by nullable
created_at
```

## ai_interactions

Optional audit/debug table:

```text
id
kind
entity_type
entity_id nullable
model
input_metadata jsonb
output_metadata jsonb
latency_ms nullable
created_at
```

Do **not** store API keys.

---

# 37. Vector Search

If pgvector is available:

- generate embeddings for normalized reports and incidents
- use embeddings for semantic incident matching
- optionally use for Ask SignalCheck retrieval

Store embedding columns on:

- reports
- incidents

If vector setup becomes fragile, fall back to model-assisted matching over a bounded set of recent incidents.

Application correctness is more important than forcing a vector database.

---

# 38. Database Migrations and Seed Data

Create migrations/schema.

Also create a deterministic seed script with rich demo data.

Seed at least:

- 3 locations/areas
- 4–6 incidents
- 20–30 reports
- mixture of:
  - eyewitness
  - second-hand
  - forwarded
  - trusted source
  - duplicate rumours
  - contradictory reports
  - resolved incidents
  - emerging cluster
  - stale incident

---

# 39. Required Demo Scenario

Seed and/or make it easy to reproduce the following scenario.

## Market Junction

Initial state:

- one second-hand report claiming armed activity
- one eyewitness saying vehicles are turning back
- one trusted source confirming road obstruction
- one forwarded screenshot repeating the armed-activity rumour
- one later report disputing the armed-activity claim

Expected outcome:

- incident is CORROBORATED for **road disruption**
- "armed attackers present" remains UNVERIFIED or CONFLICTING
- evidence graph shows claims separately
- public summary does not repeat the most alarming claim as established fact

This is the primary demonstration of claim-level reasoning.

---

# 40. Required Emerging Signal Scenario

## Central Bridge

Seed:

- unusual crowd
- vehicles slowing
- people turning around

Within a short time window.

Expected outcome:

- EMERGING
- visible in dashboard
- situation brief references it
- verification recommendation asks for a fresh firsthand report

---

# 41. Required Resolved Scenario

Seed an incident where:

- road was previously blocked
- later credible reports indicate reopening

Expected:

- status changes to RESOLVED
- incident history still visible
- assistant can explain that the previous alert is no longer current

---

# 42. API / Server Contract

The exact route names can differ, but support equivalent capabilities.

Suggested endpoints:

```text
POST   /api/reports
POST   /api/reports/analyze
GET    /api/reports/:id

GET    /api/incidents
GET    /api/incidents/:id
POST   /api/incidents/:id/recompute

POST   /api/assistant
POST   /api/route-check

POST   /api/alerts/generate
POST   /api/situation-brief
POST   /api/what-changed

GET    /api/dashboard
```

Use server-only API access for OpenAI and privileged Supabase operations.

---

# 43. Report Ingestion Flow

Implement the following orchestration:

```text
User submission
    ↓
Validate input
    ↓
Store/upload media if applicable
    ↓
Audio transcription if needed
    ↓
Vision extraction if needed
    ↓
Language detection / translation
    ↓
Structured report extraction
    ↓
Geocode location
    ↓
Extract atomic claims
    ↓
Generate embedding if used
    ↓
Find candidate incident matches
    ↓
Match or create incident
    ↓
Assign independence group
    ↓
Persist report + claims
    ↓
Analyze claim relationships / contradictions
    ↓
Recompute incident evidence state
    ↓
Update summary
    ↓
Return normalized report + incident + explanation
```

Handle failures gracefully.

If AI analysis fails:

- preserve the report
- show a retry state
- do not lose user input

---

# 44. OpenAI Integration

Centralize all model calls.

Suggested files:

```text
lib/ai/client.ts
lib/ai/schemas.ts
lib/ai/analyze-report.ts
lib/ai/extract-claims.ts
lib/ai/match-incident.ts
lib/ai/compare-claims.ts
lib/ai/generate-summary.ts
lib/ai/generate-alert.ts
lib/ai/situation-brief.ts
lib/ai/assistant.ts
lib/ai/transcribe.ts
lib/ai/analyze-image.ts
```

Requirements:

- server-only
- Zod validation
- retries for transient failures
- sane timeouts
- no secret logging
- model name configurable by env or constant
- prompts live in code, not components
- structured output whenever practical

---

# 45. Prompt Engineering Principles

Prompts must emphasize:

- do not infer facts not present in evidence
- distinguish firsthand vs second-hand
- retain uncertainty
- preserve timestamps
- preserve location ambiguity
- extract claims atomically
- do not merge distinct claims
- do not amplify sensational claims
- return structured data
- prefer `unknown` over invented values

Assistant prompts must state:

> "Use only SignalCheck evidence supplied in context for current incident claims. If evidence is unavailable, say that SignalCheck has no current evidence rather than inventing a result."

---

# 46. Safety and Product Integrity Rules

This application deals with real-world safety information.

Implement these UX rules:

1. Never claim guaranteed safety.
2. Never treat absence of reports as proof of safety.
3. Always show freshness.
4. Always distinguish:
   - observed fact
   - second-hand report
   - forwarded claim
   - AI inference
   - system status
5. Preserve uncertainty.
6. Avoid panic-inducing wording.
7. Make "why this status?" visible.
8. Avoid precise certainty percentages unless derived from a documented deterministic metric.
9. Do not expose private reporter identity publicly.
10. Keep trusted-source labels separate from claim truth.
11. Make stale information visually clear.
12. If route data is unavailable, say so clearly.
13. Generated alerts must preserve evidence status.

Include a compact product notice such as:

> SignalCheck summarizes community-reported information and does not guarantee safety. Conditions can change quickly. Use local official guidance and emergency channels where available.

---

# 47. Authentication

Authentication is useful but should not block public demo flows.

Recommended:

- public can view feed, incidents, ask assistant, route check
- public can submit reports with optional identity
- coordinator route can use simple Supabase Auth
- if auth setup becomes time-consuming, use a demo coordinator mode protected by a simple environment-controlled access pattern, while documenting it clearly

Do not hard-code real credentials.

---

# 48. Command Center Permissions

Coordinator-only actions:

- generate official/community alert
- view full report metadata
- mark incident resolved if manual override exists
- request verification
- inspect source detail
- see internal AI metadata if useful

Public users should see anonymized evidence.

---

# 49. Manual Overrides

Because AI can be wrong, coordinators should have limited override capability.

Optional but recommended:

- mark report as duplicate
- change source type
- mark incident resolved
- merge incidents
- split incident only if easy
- correct location

All overrides should preserve auditability.

Do not delete raw evidence silently.

---

# 50. UI Design Requirements for the First Pass

The first-pass UI should be:

- clean
- neutral
- responsive
- accessible
- legible
- functional
- visually consistent
- easy to replace later

Do not over-design.

Suggested visual language:

- light neutral background
- dark text
- status badges
- clear cards
- restrained use of red/amber/green
- simple charts
- simple map layout
- responsive mobile navigation

Do not introduce custom illustration work.

Use standard component patterns.

---

# 51. Required Pages

At minimum:

```text
/
  Public Signal Feed

/report
  Submit text/audio/image/screenshot

/incidents
  Incident list

/incidents/[id]
  Incident detail + claims + evidence + timeline

/ask
  Ask SignalCheck assistant

/routes
  Route safety assistant

/command-center
  Coordinator dashboard
```

Optional:

```text
/login
/settings
/about
```

---

# 52. Incident Detail Page

This page is critical.

Must show:

- title
- status
- severity
- summary
- location/map
- first reported
- last updated
- freshness
- supporting independent source count
- contradicting reports
- "Why this status?"
- claim list
- each claim's evidence
- timeline
- raw/anonymized reports
- contradiction indicators
- generated alert button for coordinator
- ask-about-this-incident CTA

---

# 53. Evidence Timeline

Show incident evolution.

Example:

```text
18:21  First report received
18:24  Second related report received
18:27  Incident marked EMERGING
18:33  Independent eyewitness corroboration
18:34  Incident marked CORROBORATED
18:42  Contradictory report received
18:48  Road reopening reported
```

Store status history.

---

# 54. Public Feed Filters

Implement useful filters:

- status
- severity
- incident type
- freshness
- search
- map/list toggle if practical

Do not build complex advanced filters.

---

# 55. Coordinator Metrics

Simple cards:

```text
Active incidents
Corroborated
Emerging
Conflicting
High/Critical
Reports in last hour
```

A small timeline/recent activity panel is useful.

No need for complex charting library unless helpful.

---

# 56. Error States

Every external dependency can fail.

Handle:

- OpenAI timeout
- invalid model output
- Supabase error
- upload error
- Mapbox geocoding failure
- Directions API failure
- unsupported audio/image
- missing coordinates
- empty assistant retrieval

Show meaningful messages.

Never leak stack traces or secrets in production UI.

---

# 57. Loading States

Add:

- report analysis progress
- assistant thinking/loading
- map loading
- incident feed skeleton
- alert generation loading
- situation brief loading

Report submission flow should communicate steps such as:

```text
Analyzing report…
Extracting claims…
Checking related incidents…
Updating evidence…
```

This also makes the AI capabilities visible in the demo.

---

# 58. Observability / Debugging

Add server-side structured logs for:

- report ingestion started/completed
- AI call type
- incident match result
- evidence status change
- alert generation
- route check

Do not log secrets.

In development, allow a debug panel or console output if useful.

---

# 59. Performance

Keep model calls bounded.

Avoid sending the entire database to the LLM.

Use:

- recent candidate incidents
- retrieved relevant incidents
- structured summaries
- bounded report sets

Cache where appropriate.

Do not optimize prematurely at the expense of correctness.

---

# 60. AI Cost Awareness

Keep API usage hackathon-friendly.

Prefer:

- smaller/fast model for extraction/classification when adequate
- stronger model only for complex synthesis if needed
- embeddings for scalable retrieval
- bounded prompt context
- no repeated regeneration when data has not changed

Make model names configurable.

---

# 61. Testing Requirements

The application is safety-adjacent, so test the deterministic parts heavily.

## Unit tests

At minimum:

### Evidence engine

Test:

- one second-hand report → UNVERIFIED
- several weak related reports → EMERGING
- two independent supporting sources → CORROBORATED
- strong support + material credible contradiction → CONFLICTING
- old incident → STALE
- fresh resolution evidence → RESOLVED

### Independence counting

Test duplicates do not inflate count.

### Route proximity

Test incident near route vs far away.

### Freshness

Test expiry thresholds.

### Input validation

Text/audio/image constraints.

---

# 62. Integration Tests

Where practical:

- report submission creates report and incident
- second matching report attaches to existing incident
- contradiction updates evidence state
- assistant retrieves relevant incident
- alert generation preserves status language

Mock OpenAI calls in automated tests.

Do not make CI depend on paid API calls.

---

# 63. E2E Happy Path

If Playwright is installed, implement one basic happy path:

1. open feed
2. submit text report
3. see AI analysis result
4. open matched/new incident
5. see status/evidence
6. ask assistant about incident

Use seeded/mock mode for repeatability.

---

# 64. Demo Mode

Create a reliable demo experience.

Strongly recommended:

- seed script
- deterministic demo data
- obvious "Use demo data" behavior
- app still supports real model calls

If model/API failure occurs during live demo, seeded incidents should keep the app useful.

Do not fake core AI behavior in normal mode.

---

# 65. Primary Demo Flow to Optimize

The UI should make this flow smooth:

1. Open public feed.
2. Show Market Junction incident.
3. Submit a new Pidgin/text/audio report.
4. Show AI extraction.
5. Show matched incident.
6. Show evidence status update.
7. Open incident.
8. Show claim-level evidence.
9. Point out that "armed attackers" is still not established.
10. Ask SignalCheck:
   - "Can I use Market Road?"
11. Show route-aware/evidence-aware response.
12. Open command center.
13. Show situation brief.
14. Generate a community alert.

This sequence should fit a short video.

---

# 66. Suggested Demo Input

Text/Pidgin example:

> "Abeg everybody dey turn back for Market Junction near the filling station. I just pass there now and police dey around. I hear say some people see gunmen but I no see anybody with gun."

Expected extraction:

- location: Market Junction near filling station
- firsthand observations:
  - vehicles turning back
  - police/security present
- second-hand claim:
  - gunmen reportedly seen
- source perspective:
  - mixed, but main observation firsthand
- matching incident:
  - Market Junction road disruption

Important:
Do not treat "gunmen present" as firsthand confirmation.

---

# 67. README Requirements

The generated README must include:

- project overview
- problem statement
- major AI features
- architecture
- setup instructions
- environment setup
- database setup
- seed instructions
- run locally
- build
- test
- deploy
- key product design principle:
  - AI interprets evidence; deterministic engine computes corroboration
- limitations
- safety notice
- future improvements

Keep it concise enough to read.

---

# 68. Deployment

Target deployment:

- Vercel for Next.js
- Supabase hosted project
- Mapbox hosted API
- OpenAI hosted API

Codex should ensure:

- `npm run build` passes
- production-safe env usage
- server-only modules are not bundled into client
- file uploads use Supabase Storage
- no localhost-only assumptions
- production URLs work

---

# 69. Storage Buckets

If using Supabase Storage, create buckets such as:

```text
report-media
```

Store:

- audio
- screenshots
- images

Use appropriate access controls.

Public UI should use safe URLs.

If private bucket usage becomes difficult for the prototype, use signed URLs.

---

# 70. Security

Implement reasonable prototype security:

- validate uploads
- file size limits
- accepted MIME types
- sanitize display content
- server-side API calls
- do not expose Supabase secret/service keys
- basic rate limiting if simple
- no direct user-controlled SQL
- no eval
- safe markdown rendering if used
- validate all AI output before persistence

---

# 71. Privacy

Public incident views should not show:

- reporter email
- private account identifiers
- full source fingerprints
- private metadata

The evidence UI can show:

- "Eyewitness report"
- "Trusted community source"
- "Forwarded screenshot"

not personally identifying data.

---

# 72. Graceful Fallbacks

If:

### Mapbox is unavailable
Show text location and continue.

### Audio transcription fails
Allow manual transcript/input.

### Vision analysis fails
Keep uploaded file and allow manual description.

### OpenAI classification fails
Store report as pending analysis and expose retry.

### Supabase vector extension unavailable
Use normal DB query + bounded AI matching.

Do not let one optional capability make the entire application unusable.

---

# 73. Feature Completeness Checklist

Codex should not consider the application complete until these are present.

## Core ingestion

- [ ] text report
- [ ] audio report/transcription
- [ ] image/screenshot analysis
- [ ] structured extraction
- [ ] language normalization
- [ ] source perspective classification
- [ ] location extraction/geocoding
- [ ] claim extraction

## Incident intelligence

- [ ] incident matching
- [ ] duplicate suppression
- [ ] source independence
- [ ] evidence graph
- [ ] contradiction detection
- [ ] corroboration engine
- [ ] severity
- [ ] freshness
- [ ] status history
- [ ] emerging signal detection

## Public experience

- [ ] active feed
- [ ] map
- [ ] incident details
- [ ] explainability
- [ ] Ask SignalCheck
- [ ] route check

## Coordinator experience

- [ ] command center
- [ ] metrics
- [ ] situation brief
- [ ] what changed
- [ ] verification recommendation
- [ ] alert generation
- [ ] translation

## Engineering

- [ ] env validation
- [ ] secrets excluded from git
- [ ] migrations
- [ ] seed data
- [ ] unit tests
- [ ] integration tests
- [ ] README
- [ ] build passes
- [ ] lint/typecheck passes
- [ ] deploy-ready

---

# 74. UI Replacement Readiness

Before finishing, Codex must create a document:

`UI_HANDOFF.md`

This will later be used to generate a Google Stitch design prompt.

It must describe the **actual implemented app**, not the intended app.

Include:

- all pages
- route paths
- page purpose
- every major component
- every visible data field
- every user action
- all states:
  - loading
  - empty
  - success
  - error
  - disabled
- actual API endpoints/server actions
- actual TypeScript view models
- mobile considerations
- map behavior
- coordinator-only behavior
- incident status color/semantic meanings
- screenshots optional

Also include a final section:

> "Google Stitch Redesign Prompt"

Codex should generate a ready-to-copy prompt describing the actual working app and instructing Stitch to redesign the visual experience without changing product behavior.

---

# 75. AntiGravity Handoff Readiness

The code must be easy for another coding agent to restyle.

Requirements:

- componentized UI
- clear props
- reusable design primitives
- business logic isolated
- API contracts stable
- no giant page components with all logic inline
- no duplicated domain logic
- no direct OpenAI calls from components

---

# 76. Git Safety Before UI Redesign

Once the functional MVP works, recommend:

```bash
git add .
git commit -m "feat: complete functional SignalCheck MVP"
git tag functional-mvp
git checkout -b ui-redesign
```

Do not automatically push unless repository configuration and user intent make that appropriate.

---

# 77. Definition of Done

The project is done when:

1. App runs locally.
2. Build passes.
3. Real OpenAI calls work with configured envs.
4. Supabase persistence works.
5. Mapbox map/geocoding works.
6. Text report can be submitted.
7. Audio can be transcribed.
8. Screenshot/image can be analyzed.
9. AI extracts structured report.
10. Claims are stored separately.
11. New reports match/create incidents.
12. Duplicates do not inflate corroboration.
13. Contradictory claims are visible.
14. Deterministic engine computes status.
15. Incident detail explains why.
16. Emerging signals appear.
17. Assistant answers from live evidence.
18. Route check considers active incidents.
19. Command center works.
20. Situation brief works.
21. Alert generator works.
22. Translation works.
23. Seed/demo data works.
24. Tests for critical deterministic logic pass.
25. README exists.
26. `UI_HANDOFF.md` exists.
27. No secrets are committed.
28. UI is usable on desktop and mobile.

---

# 78. Build Priority If Time Becomes Constrained

The desired outcome is to implement everything above.

If an unexpected blocker forces prioritization, follow this strict order:

## P0 — must work

- env setup
- Supabase schema
- text ingestion
- structured AI extraction
- claims
- incident matching
- evidence engine
- public feed
- incident detail
- seeded demo data
- Ask SignalCheck
- command center
- alert generation

## P1 — high-value

- screenshots/vision
- audio transcription
- route assistant
- Mapbox map
- emerging signal detection
- situation brief
- what changed
- translations

## P2 — polish

- browser audio recording
- advanced coordinator overrides
- sophisticated charting
- actual outbound email/SMS
- graph visualization
- advanced auth

Do not sacrifice the coherent P0 flow for optional polish.

---

# 79. Quality Bar

Prefer:

- simple working code
- typed contracts
- explicit domain logic
- recoverable failures
- realistic demo data
- explainable AI
- reliable build

over:

- overengineering
- unnecessary microservices
- exotic infrastructure
- huge design systems
- animations
- perfect visual polish
- complex authentication

---

# 80. Final Instruction to Codex

Treat this document as the source of truth.

Your job is to build the complete working application in the current repository.

Proceed autonomously:

1. inspect the repository
2. inspect `envs.txt`
3. determine current project state
4. create the required architecture
5. configure environment handling safely
6. implement database/schema/migrations
7. implement the AI layer
8. implement deterministic evidence logic
9. implement all product surfaces
10. seed demo data
11. add tests
12. run lint/typecheck/tests
13. run production build
14. fix failures
15. create/update README
16. create `UI_HANDOFF.md`
17. leave the repository in a runnable state

Do not stop after scaffolding.

Do not leave placeholder pages for core features.

Do not replace required features with TODO comments.

Do not hide broken functionality behind static mock UI.

Mocks are acceptable only in tests or explicit demo fallback states.

Use the configured real services wherever possible.

At completion, provide a concise summary containing:

- what was built
- routes/pages
- AI features implemented
- database tables
- important architectural decisions
- test/build status
- exact local run command
- any unavoidable limitations
- which files are important for the subsequent UI redesign

---

# 81. Product Narrative for Implementation Decisions

When uncertain, optimize around this statement:

> **SignalCheck transforms fragmented community reports—text, voice, screenshots and eyewitness observations—into structured incidents, evidence-backed claims and actionable safety signals. AI understands the noise; an explainable evidence engine determines what is actually supported.**

And this user promise:

> **SignalCheck should help a user understand what is known, what is uncertain, what changed, and why the system is saying so.**

That is the product.
