# SignalCheck

Turn scattered community reports into explainable safety signals. SignalCheck interprets text, voice recordings and screenshots; stores atomic claims; groups related reports; and exposes evidence, uncertainty and freshness to residents and coordinators.

**AI interprets evidence. The deterministic engine computes corroboration.** A corroborated road disruption never establishes a separate armed-activity rumour as fact. Severity and corroboration are separate.

## Run locally

For a self-contained recording demo on **http://localhost:3001**:

```bash
npm run seed:demo
npm run dev:demo
```

This uses the redesigned UI with six fictional incidents and 26 reports in `.data/loom`, without changing live configuration or data. Seeding resets only this recording dataset. Ask and report analysis use the existing simulated demo responses. Choose **Coordinator → Open coordinator workspace** to demonstrate briefs, verification requests, and alert drafts. Map tiles still require configured Google Maps keys.

Requires Node.js 22+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The example enables explicit local demo mode. Local fictional data is initialized automatically and persisted in `.data/store.json`. `SIGNALCHECK_DEMO_MODE=true npm run seed` resets local demo fixtures. The six scenarios contain 26 reports, duplicate rumours, weak emerging signals, contradictions, a reopening and stale evidence.

Store credentials in the ignored `.env.local`. Set your own `COORDINATOR_PASSWORD` for the coordinator sign-in form and a strong, random `SESSION_SECRET` before sharing a deployment. Never commit secret-bearing environment files.

## Live configuration

Set `SIGNALCHECK_DEMO_MODE=false`, `OPENAI_API_KEY`, `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`), `SUPABASE_SECRET_KEY`, `COORDINATOR_PASSWORD`, and `SESSION_SECRET`. These are validated at server startup. Add `GOOGLE_MAPS_API_KEY` for Places autocomplete, geocoding and routes, plus a separate `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` for the browser map. See [Google Maps setup](#google-maps-setup). `DATABASE_URL` is used only by migration and seed scripts. `OPENAI_MODEL` defaults to `gpt-4.1-mini`; transcription defaults to `gpt-4o-mini-transcribe`.

Only the browser Google Maps key is exposed to the UI. Restrict it to your deployment domains and Maps JavaScript API. The separate server key is used by the Places, Geocoding and Routes adapters. Server API and Supabase secret keys stay in server-only modules. Quotes around `.env.local` values preserve characters such as `#`; percent-encode special characters in the database URL password.

```bash
npm run db:migrate
npm run seed
npm run dev
```

Migrations create a private `signalcheck` schema, relational tables, service-role-only transaction RPCs and a private `report-media` bucket. Seeding merges deterministic fictional fixtures and preserves unrelated records. Fixtures retain `isDemo: true` internally; submitted reports never corroborate against them. This screening prototype includes them in route results automatically, without demo badges. A seeded database is useful for demonstrations but should not be presented as a live incident source.

### Google Maps setup

In your Google Cloud project, enable billing and these APIs: **Places API (New)**, **Geocoding API**, **Routes API**, and **Maps JavaScript API**.

- Set `GOOGLE_MAPS_API_KEY` to a server key restricted to Places API (New), Geocoding API, and Routes API. Use IP restrictions when your hosting provides static outbound IPs; website/referrer restrictions do not work for server requests.
- Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to a separate browser key restricted to Maps JavaScript API and your website origins. For development, allow `http://localhost:3000/*` and any other local port you use; add your deployed HTTPS domain for hosting.
- Optionally set `NEXT_PUBLIC_GOOGLE_MAP_ID` to your JavaScript map ID. Otherwise, the app uses Google's `DEMO_MAP_ID`.
- Restart the development server after changing keys. Rebuild deployed applications when changing the browser key.

Autocomplete searches worldwide. Select a specific landmark or address to retain its Google Place ID and obtain accurate coordinates. Test both autocomplete and a complete route; if suggestions work but the map does not, check the browser key's restrictions.

## Features

- `/` and `/incidents`: searchable feed, status/severity/type/time filters, map, emerging and stale/resolved sections.
- `/report`: global Google Places location autocomplete with selected place IDs resolved server-side to coordinates; text, image, screenshot, audio upload or browser recording; structured extraction, language handling, per-claim perspective and matched incident; saved failed analyses with retry.
- `/incidents/[id]`: claim evidence, source counts, contradictions, time-aware relationships, explanations, anonymized reports and status history.
- `/ask`: bounded retrieval, evidence-grounded answers and internal citations; explicit fallback if AI generation fails.
- `/routes`: actual Google Maps directions, incident-to-route segment distance, impact categories and alternatives. Missing or ambiguous locations produce an unavailable state, never simulated directions.
- `/command-center`: metrics, filtering/sorting, authenticated coordinator actions, situation briefs, recorded changes, verification requests, internal report inspection and multilingual alerts with copy/download.

Alerts support short, SMS, WhatsApp, radio, push and briefing formats. English, Pidgin and Hausa are available through live AI. Demo extraction is deliberately simple; demo audio/image requires a manual description and demo translation is explicitly unavailable. Generated content is a draft; nothing is automatically sent to anyone.

## Architecture

```text
React components → typed API DTOs → server services
                                  ├── pure evidence/matching/geography
                                  ├── OpenAI + Google Maps adapters
                                  └── Supabase repository / private storage
```

- `src/domain/types.ts`: shared contracts; `evidence.ts`: corroboration, matching, independence and claim relationships; `geo.ts`: route distance; `seed.ts`: reproducible fixtures.
- `src/lib/ai.ts`: validated structured extraction, vision, transcription, grounded generation and explicit demo behavior.
- `src/server/services.ts`: ingestion, pending/failed report recovery, claim persistence, summaries, retrieval, route checks and coordinator operations.
- `src/server/repository.ts`: database snapshot and transactional compare-and-swap writes. Database version locks prevent lost writes between instances; changed rows are upserted incrementally. Local demo writes are serialized with atomic file replacement.
- `src/components`: replaceable presentation; `src/app/api`: validation, permissions and safe errors.

## Evidence rules

Thresholds live in `src/domain/evidence.ts`:

- Current observations: within 90 minutes, not future-dated beyond five minutes.
- One source group: unverified. Multiple related weak groups: emerging.
- Two independent **firsthand** supporting groups on the core claim: corroborated.
- Independent firsthand support and denial within 15 minutes: conflicting.
- Two independent firsthand denials more than 15 minutes after the latest support: resolved.
- No fresh core evidence: stale. Later unrelated claims cannot refresh a stale core claim.
- Matching: compatible type and text location or coordinates within 1.8 km, within six hours. Resolved incidents are retained and new activity can create a new incident.
- Same signed browser source, stated original source, or near-identical wording groups repeated propagation. Source labels never establish truth.
- Route buffer: 600 metres from actual route segments. Unlocated active incidents prevent an unqualified no-signal interpretation.

Individual claim categories are assessed separately. These are documented system assessments, not probabilities or declarations of truth. Browser identity and copy detection are heuristic and cannot prove real-world independence.

## API

Public: `GET /api/locations/suggest?q=...`, `GET /api/incidents`, `GET /api/incidents/:id`, `GET /api/dashboard`, `POST /api/reports` (multipart), `GET /api/reports/:id` (same browser owner), `POST /api/reports/:id/retry`, `POST /api/assistant`, `POST /api/route-check`, `GET /api/health`.

Coordinator: `POST /api/coordinator/login`, `POST /api/coordinator/logout`, `GET /api/coordinator/incidents/:id/reports`, `POST /api/incidents/:id/recompute`, `POST /api/incidents/:id/verify`, `POST /api/alerts/generate`, `POST /api/situation-brief`, `POST /api/what-changed`.

Errors are JSON `{ "error": "safe message" }`. Authentication uses signed, HttpOnly, SameSite cookies with an eight-hour lifetime. No public raw database or media access. Reports and claims are anonymized in public DTOs; coordinator metadata requires server authorization. Uploads are limited to 10 MB with MIME and signature checks. Mutation routes validate the browser-facing Host (or forwarded host/protocol) and use basic per-process rate limits. Reverse proxies must overwrite `X-Forwarded-Host` and `X-Forwarded-Proto` with trusted routing values.

## Verify

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Tests cover evidence states, per-claim perspective, deduplication, matching, freshness, route distance, validation, persistence, service orchestration and provider boundaries without paid calls. E2E starts an isolated deterministic demo on port 3100 with separate data/build directories. Real provider smoke checks are manual and are not CI dependencies.

## Deploy

1. Create a Supabase project and run `npm run db:migrate` using its Postgres connection URL. Optional `npm run seed` loads clearly fictional examples.
2. Import this folder into Vercel as a Next.js application. Configure the live environment variables above; use a strong coordinator code/session secret. Keep demo mode **false** for serverless persistence.
3. Enable the Google APIs and restrict the two keys as described in [Google Maps setup](#google-maps-setup). Route handlers allow up to 120 seconds for ingestion; choose a hosting plan with suitable request duration limits.
4. Run a production build and test the deployed report, map and coordinator flows. Standard Vercel function request limits may be below the app's 10 MB ceiling; use smaller files or add signed direct uploads for larger deployments.

Local production: `npm run build && npm start`.

## Limitations and next steps

This is a functional prototype. The repository loads a bounded-project snapshot; production scale needs paginated queries and background processing. Rate limits are process-local; use distributed limits before broad public use. Anonymous users can reset browser identity. No claim of verified identity or resistance to coordinated false reporting is made. The category-based matching/contradiction engine is intentionally conservative and may need coordinator review. Local landmark geocoding often needs town/state context. There is no live emergency service feed.

No advanced account management, outbound messaging, embeddings, manual merge/split or full moderation workflow is included. Verification requests are stored internally; they do not contact a reporter.

SignalCheck summarizes community-reported information and does not guarantee safety. Conditions can change quickly. Use local official guidance and emergency channels where available.

## Abuja demo reports at real Google Places

For a broader test dataset, run `npm run seed:judging`. It loads **12 incidents and 45 fictional reports at real Google Places**, including the Airport Road presentation scenario. The additional reports cover lane obstructions, conflicting access reports, traffic officers, power outages, and resolved market access around Abuja. Coordinates are fetched from Google Place Details; submitted reports are preserved and the previous database snapshot is backed up privately before replacement.

Routes to try (select the matching Google suggestions):

- **Wuse Market → Airport Road, Lugbe**: the presentation's corroborated obstruction and disputed rumour.
- **Wuse Market → Banex Plaza wuse**: conflicting access reports near Banex.
- **Aya Bus Stop → Apo Roundabout Bus Stop**: traffic officers at AYA and an emerging obstruction near Apo.
- **1st Avenue, Gwarinpa → Kubwa Model Market**: a power outage and resolved market access.

For a focused presentation, run `npm run seed:presentation`. This replaces the seeded scenarios with one Airport Road, Lugbe incident and seven related reports: independent road-obstruction observations, a repeated rumour, a disputing observation, and a report of police directing traffic. Submitted reports are preserved and a private backup is saved before replacement. Use **Wuse Market, Abuja → Airport Road, Lugbe** for the route walkthrough. Run shortly before presenting so the observation timestamps are fresh; evidence continues to age normally.

`npm run seed:places` replaces the old six seed scenarios with 26 clearly fictional reports at Airport Road (Lugbe), Galadimawa Market, Lugbe Market, Area 1, Jabi Lake, and Wuse Market. It fetches coordinates from Google Place Details and uses the existing Supabase transaction RPC. It preserves submitted reports, removes the old seed's dependent records, and saves a private snapshot in `.data/seed-backups/` before committing. If a submitted report is attached to an old seed incident, replacement stops instead of removing that evidence.

The feed shows type-specific report markers colored by evidence status. Route maps use teal start pins and dark destination pins. Route checks include the seeded reports automatically. Nearby stale and resolved incidents appear for context, while only active evidence affects the route assessment. Seed evidence ages normally, so rerun `npm run seed:judging` shortly before testing to refresh observation times. Use `npx tsx scripts/seed-google-places.ts --judging` for a preview without database changes.
