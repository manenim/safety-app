# SignalCheck UI handoff

This describes the implemented application. The presentation layer can be replaced without moving evidence logic or provider calls into React components.

## Pages and components

| Path | Purpose and main components | User actions |
| --- | --- | --- |
| `/`, `/incidents` | `Feed`, `IncidentCard`, `SignalMap` | Search; filter status, severity, incident type, time; clear filters; list/map display; refresh; open evidence; report; ask |
| `/report` | `ReportForm` | Choose text/audio/image/screenshot; upload or record voice; enter context, location, time, source type, origin, notes; submit; inspect extraction; retry failed analysis; open incident; start another report |
| `/incidents/[id]` | `IncidentDetail`, `SignalMap` | Inspect status explanation, individual claims and reports, relations and timeline; open assistant scoped to incident; open coordinator tools |
| `/ask` | `Assistant` | Suggested questions; free-text question; optional incident context via query string; clear context; inspect cited incidents |
| `/routes` | `RouteCheck`, `SignalMap` | Enter origin/destination; check actual driving route; inspect nearby incidents, alternate geometry and unavailable-location information |
| `/command-center` | `CommandCenter`, `IncidentCard`, `InternalReports`, `CopyDownload` | Public metrics; login/logout; demo login only in explicit demo mode; search/filter/sort incidents; select focus and time window; brief; changes; verification request; inspect internal report details; draft alert, copy, download |

Shared primitives in `src/components/ui.tsx`: `Shell`, `PageHeading`, `StatusBadge`, `SeverityBadge`, `IncidentCard`, `DemoNotice`, `ErrorMessage`, `Loading`, `Empty`, `CopyDownload`, `useApi`, `api`, `post`, date formatting. `src/app/layout.tsx` provides the shell and global styles. `error.tsx`, `not-found.tsx`, and `loading.tsx` supply route-level states. `globals.css` owns the visual system.

## Visible information

### Feed and cards

Incident title, status, severity, location label, relative freshness with absolute timestamp, summary, apparent independent-source count, total report count, conflicting report count, and fictional-demo indicator. Feed groups active, emerging, stale and resolved incidents. Demo banners distinguish explicit deterministic mode from individually fictional scenarios stored in live persistence.

### Incident detail

Title, demo indicator, status, severity, summary, place, first/last report times, last corroboration time, status update time, total reports, source counts, firsthand count, contradictions and status explanation. Claim cards show canonical proposition, category, assessment, supporting/denying/uncertain source counts, and evidence rows with source label, perspective, stance and observation time. Reports show anonymized normalized summary, source type, input type, observation/submission times, language and likely duplication. Relationships identify support, contradictions and temporal updates. History shows prior/new status, reasons and timestamps. Verification recommendation exposes the next evidence gap.

### Report fields and result

Text/context; image/screenshot/audio file; browser voice recording; manual place hint; local observation time; source type; optional originating channel and notes. Limits: 12,000 text characters, 250 location characters, 150 origin characters, 1,500 notes characters and 10 MB per upload. Source options: eyewitness, second-hand, community member, trusted community source, security/vigilante source, official source, anonymous/unknown.

Saved result: report ID (used internally for retry), analysis status/error, incident type, detected place/time, language, urgency, report perspective, normalized summary, translated text, firsthand observations, atomic claim text/polarity/per-claim perspective, extraction notes, incident link/status. The UI presents extraction after save; there is no pre-save correction workflow. Failed analysis preserves the stored report and supports retry.

### Assistant

Question, optional selected incident, returned answer, mode (`ai`, `demo`, `evidence-fallback`), citation title/status/last report time and incident links. No matching evidence is explicit. Text is rendered safely as plain text, not untrusted HTML.

### Routes and map

Origin/destination labels; route impact state, summary, distance, duration, nearby incidents and metres from the route, unlocated incident count and alternative routes. Google Maps renders incident markers with status colors; marker links lead to incident evidence. Main route geometry is teal, alternatives muted. No map or directions are fabricated when Google Maps is unavailable. An accessible text location list remains available. Live route assessments exclude fictional demo incidents.

### Coordinator

Active, corroborated, emerging, conflicting, high/critical, reports-last-hour and stale metrics. Intelligence table shows incident, status, severity, independent sources and freshness. Workspace has incident selection, 30-minute/hour/day time windows, brief/changes outputs, verification recommendation/request output and internal report details. Full report text, notes, origin, analysis state and AI extraction notes are shown only after server authorization; source fingerprints are never displayed.

Alert fields: incident focus, short/SMS/WhatsApp/radio/push/briefing format, English/Pidgin/Hausa/Yoruba/Igbo language, audience, brief/standard/detailed length. Output contains the generated draft, language and saved state. Copy and text download are implemented; sending messages is not.

## States and interaction behavior

- **Loading:** feed/card skeletons; map loading; command-center loading; assistant checking evidence; report saving/analyzing; brief/change/alert generation labels.
- **Empty:** no matching filtered incidents; no emerging incidents; no cited evidence; no geolocated incident; no recorded changes in a time window. Empty evidence never implies safety.
- **Success:** stored report and extraction; matched/new incident link; generated answer/citations; route result; authenticated coordinator; saved alert; prepared verification request; clipboard confirmation.
- **Error:** inline safe API messages with retry where appropriate; failed analysis can be retried; unavailable transcription/vision supports resubmitting a manual description; map/directions unavailable; auth failure; clipboard fallback.
- **Disabled:** submission while analysis runs or microphone is recording; generation while an action is pending; incident-specific coordinator actions until a focus is selected; busy auth controls.
- **Permission:** public overview remains visible before login. Coordinator-only endpoints validate the signed session on the server. Demo access is unavailable in live mode.
- **Freshness:** recomputed by server reads/ingestion; feed refresh obtains current status. No websocket or background push feed.

## API contracts

Source: `src/app/api/**/route.ts`, DTOs in `src/domain/types.ts`.

| Method and endpoint | Request / response |
| --- | --- |
| `GET /api/incidents` | `{ incidents: IncidentView[], demoMode: boolean }` |
| `GET /api/incidents/:id` | `{ incident: IncidentView }` |
| `GET /api/dashboard` | `Dashboard` |
| `POST /api/reports` | Multipart `text, locationHint, sourceType, observedAt, notes, origin, inputType, media`; response `{ report: { id, analysisStatus, normalized, analysisError, incidentId }, incident: IncidentView \| null }` |
| `GET /api/reports/:id` | Owner cookie required; `{ report }` |
| `POST /api/reports/:id/retry` | Owner cookie; same result shape as submission |
| `POST /api/assistant` | `{ question, incidentId? }` → `AssistantResult` |
| `POST /api/route-check` | `{ origin, destination }` → `RouteResult` |
| `POST /api/coordinator/login` | `{ password }` or explicit demo `{ demo: true }` → `{ ok: true }` and HttpOnly cookie |
| `POST /api/coordinator/logout` | `{}` → `{ ok: true }` |
| `GET /api/coordinator/incidents/:id/reports` | Protected `{ reports: Report[] }`, fingerprints masked |
| `POST /api/incidents/:id/recompute` | Protected `{ incident: IncidentView }` |
| `POST /api/incidents/:id/verify` | Protected `{ request: VerificationRequest }` |
| `POST /api/alerts/generate` | Protected `{ incidentId, format, language, audience, length }` → `{ alert: GeneratedAlert }` |
| `POST /api/situation-brief` | Protected `{ windowMinutes: 30 \| 60 \| 1440, incidentId? }` → `{ content, changes: StatusHistory[] }` |
| `POST /api/what-changed` | Protected `{ windowMinutes }` → `{ content, changes }` |
| `GET /api/health` | `{ ok, demoMode }` |

All failures return `{ error: string }` with a meaningful HTTP status. No presentation component calls OpenAI, privileged Supabase or secret-bearing Google Maps services directly.

## Actual view models

`IncidentView` extends `Incident` with `reportCount`, `independentSourceCount`, `supportingReports`, `contradictingReports`, `firsthandCount`, `explanation[]`, `verificationRecommendation`, `claims: ClaimView[]`, `reports: PublicReport[]`, `timeline: StatusHistory[]`, and `relations: ClaimRelation[]`.

`Incident` includes `id`, optional `isDemo`, `title`, `incidentType`, `status`, `severity`, `summary`, `location`, `firstReportedAt`, `lastReportedAt`, `lastCorroboratedAt`, `statusUpdatedAt`, `resolvedAt`, `createdAt`, `updatedAt`. `Location` includes raw/normalized labels and nullable latitude/longitude.

`ClaimView` includes `id`, `text`, `category`, `status`, supporting/denying/uncertain source counts and evidence rows (`reportId`, source type, stance, perspective, observed time). `PublicReport` intentionally excludes raw private metadata and identity fingerprints.

`NormalizedReport` describes language, translation, normalized text, incident type, location, observation time, overall perspective, observations, atomic claims each with its own perspective, urgency and extraction notes. `AssistantResult` contains answer/citations/mode. `RouteResult` contains impact state, summary, geometry, origin/destination, metres/seconds, affected incidents, alternatives and unlocated count. `Dashboard` contains incidents, seven metrics, demo mode and coordinator authorization state.

Treat these models and endpoints as stable interfaces. Keep evidence calculations in `src/domain/evidence.ts` and workflows in `src/server/services.ts`.

## Status semantics and accessibility

- **Unverified:** gray; insufficient independent firsthand evidence.
- **Emerging:** amber; related reports need corroboration.
- **Corroborated:** teal; multiple independent firsthand sources support the core claim.
- **Conflicting:** muted red; credible contemporaneous core disagreement.
- **Stale:** muted gray; observation has expired for current assessment.
- **Resolved:** subdued green; later independent updates indicate the incident ended.

Color is always paired with text. Severity is a separate label. Keep keyboard focus visible, associated input labels, status/alert live regions, skip link, touch-friendly controls and readable contrast. Honor reduced motion.

## Mobile considerations

Navigation collapses to a menu. Feed/map and form/sidebar layouts stack. Metrics wrap. Tables scroll inside their containers. Map has a bounded height and alternative location list. Long generated text, evidence and file names must wrap without creating horizontal page overflow. Browser recording requires microphone access and a secure context (or localhost); file upload is always available.

## Google Stitch Redesign Prompt

Redesign the implemented SignalCheck community safety intelligence application for mobile and desktop. Keep all existing routes, typed data, evidence behavior, API contracts and permission boundaries unchanged. Create a calm, legible interface for residents reading signals, reporters sharing observations, and coordinators reviewing evidence and drafting careful alerts. Design the public feed with filters and map; multimodal report form and extraction/retry result; incident detail with separate claim-level evidence, explanation and timeline; evidence-grounded assistant with citations; route impact with geometry and unavailable states; and coordinator dashboard with login, metrics, inspection, briefs, change summaries, verification requests and multilingual draft alerts. Preserve all listed loading, empty, error, success and disabled states. Always distinguish severity from corroboration, firsthand from hearsay, fictional demo data from live reports, and old evidence from current observations. Never imply guaranteed safety. Keep every important action and field described in this handoff. Use reusable visual components; do not move business logic into the UI or remove accessible text alternatives to maps. Deliver a cohesive replacement design system and responsive page designs ready for an implementation agent to apply to src/components and globals.css.
