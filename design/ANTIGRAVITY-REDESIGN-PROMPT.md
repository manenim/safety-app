# Implement the SignalCheck social UI redesign

You are implementing a visual redesign of an **already-built and working demo application**. Work in the existing repository and complete the implementation, rather than producing another design proposal or a separate prototype.

Repository: `/home/manenim/Documents/dev/hacathon/safety-app`

Stitch project: https://stitch.withgoogle.com/projects/17301679359797473869

## 1. Understand the assignment before editing

SignalCheck is a community safety evidence app. Residents read incident updates, submit observations, inspect evidence, ask evidence-grounded questions, and check incidents near a driving route. Coordinators inspect private reports and prepare internal requests, briefs, and alert drafts.

**The functionality already exists. Replace its presentation, not its product or backend.**

The user wants a modern consumer social application, closest to **X/Twitter and Reddit**, with the spacious, recognizable icon-and-label navigation seen in Instagram. The earlier Twitter-like screens were liked and considered a selling point. A subsequent redesign that exposed every field, count, and tool simultaneously was rejected because it looked like a business SaaS dashboard.

This feedback applies to **every screen**, including Coordinator. Do not make the public feed social while leaving the rest as administrative forms.

### Important warning about the design references

The Stitch project contains legacy screens, rejected dashboard-looking revisions, and newer attempts to restore the social direction. **Not every artboard or revision is approved, accurate, or implementation-ready.** Do not assume that the newest timestamp is the best reference.

Use the `V2 WHITE` family and the restored Twitter-like feed as visual references. Preserve that consumer-social composition across all routes. Compare the actual rendered designs, not just Stitch's textual completion summaries.

Some generated screens previously invented dispatch, publishing, confidence scores, user identities, and other unsupported features. Never implement these just because they appear in a mockup.

### Source-of-truth order

1. This brief and the user's latest feedback determine the visual direction and scope.
2. Existing working components, types, services, and APIs determine actual functionality and data.
3. `UI_HANDOFF.md` explains the implemented product; current source code wins if there is a discrepancy.
4. `design/stitch-redesign-brief.md` provides design context; use its latest correction sections over older descriptions.
5. Stitch supplies visual references, not permission to invent functionality.

**Do not export or download anything from Stitch.** Inspect its existing screens through the available browser or design tools. Do not modify the Stitch project as part of this implementation. Do not silently substitute an inaccessible reference with an invented dashboard. If access is unavailable, inspect the repository and use any supplied references, then explain the specific access limitation.

## 2. Read the repository first

Read applicable `AGENTS.md` instructions, `README.md`, `UI_HANDOFF.md`, `package.json`, the existing test setup, and the components being changed.

This repository explicitly warns that its installed Next.js version has breaking changes. **Before writing application code, read the relevant documentation in `node_modules/next/dist/docs/`.** Use the installed version's APIs, rather than assuming older Next.js conventions.

Inspect at least:

- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/components/ui.tsx`
- `src/components/feed.tsx`
- `src/components/incident-detail.tsx`
- `src/components/report-form.tsx`
- `src/components/assistant.tsx`
- `src/components/route-check.tsx`
- `src/components/signal-map.tsx`
- `src/components/command-center.tsx`
- `src/domain/types.ts`
- `src/domain/evidence.ts`
- `src/server/services.ts`
- `src/server/auth.ts`
- `tests/e2e/happy-path.spec.ts`
- `playwright.config.ts`

Inspect the working tree before editing and preserve existing user changes. Do not overwrite unrelated work. Use the existing package manager and lockfile.

Create a concise implementation checklist mapping the pages to their components and existing actions. Then implement; do not stop at the checklist or repeatedly ask for permission for routine presentation changes.

## 3. Non-negotiable implementation boundaries

- Keep existing routes, API request/response contracts, database schema, evidence logic, provider integrations, authentication, and demo behavior.
- Do not rebuild the app from scratch or create a parallel static mock application.
- Do not replace real data with the sample text, numbers, timestamps, or incident IDs shown in Stitch.
- Do not add APIs, tables, services, permissions, user accounts, or business workflows to make a mockup work.
- Do not move privileged provider calls or evidence calculations into client components.
- Preserve server enforcement of coordinator authorization and report ownership.
- Preserve input validation, submission behavior, recording, upload, retry, loading, empty, error, and success states.
- Reuse existing dependencies, including `lucide-react` and Mapbox. Do not introduce a UI framework, CSS framework, or state library simply to restyle the application.
- Do not copy generated Stitch HTML wholesale into the project. Implement the visual language with reusable components integrated into the current app.
- UI-only tabs, disclosures, menus, sheets, responsive navigation, and reorganized sections are allowed when they expose existing functionality. They must not introduce new domain behavior.
- Do not deploy, run production migrations, reseed live data, or change secrets as part of the redesign.

**Feature parity means controls remain available. It does not mean every field and result is visible simultaneously.**

## 4. Visual direction: a consumer social app

### Overall appearance

- White page background: `#FFFFFF`.
- Optional neutral off-white surfaces: `#FAFAFA` or `#F7F7F7`.
- No green/sage-tinted page background and no dark theme.
- Charcoal primary text, approximately `#172026`.
- Muted secondary text, approximately `#667085`.
- Fine neutral separators, approximately `#E6E8EB`.
- Restrained teal, approximately `#087B75`, for principal actions and selected states.
- Use a single clean sans-serif such as DM Sans, loaded appropriately through the existing Next.js setup.
- Main reading text and form inputs: approximately 16px. Metadata: 13–14px. Main headings: approximately 22–28px.
- Use flat, continuous post rows, subtle thread connectors, circular generic source icons, and quiet inline metadata.
- Reserve contained surfaces for things that benefit from enclosure: inputs, menus, attachment previews, quoted incidents, and map media.
- Avoid excessive borders, nested cards, large rounded dashboard panels, KPI tile grids, broad statistical strips, giant headings, decorative gradients, and empty hero space.

The main content should feel like something a resident would open to read and participate in a community, rather than a tool an administrator uses to manage records.

### Navigation

Desktop:

- One approximately 220px left rail.
- Exactly one visible SignalCheck brand in the shell.
- Recognizable 24–26px icons with approximately 20px labels and comfortable 48–52px rows.
- Links: **Feed, Report, Ask, Routes, Coordinator**.
- A restrained active state; no heavy enterprise-style navigation blocks.
- No simultaneous duplicate top navigation.

Mobile:

- One compact top header with one SignalCheck brand.
- One bottom navigation bar: **Feed, Report, Ask, Routes, Tools**.
- Tools opens the existing `/command-center` route.
- Clear icons, approximately 12px labels, minimum 44px targets, and safe-area padding.
- Hide the desktop shell at mobile widths and the mobile shell at desktop widths.

Do not repeat branding in page headings, secondary sidebars, footer signatures, or nested shells. Do not invent profile menus, notification bells, DMs, settings pages, or accounts.

### Responsive composition

- Desktop: left rail, a comfortable approximately 640–700px reading column, and an optional useful context column only where space and content justify it.
- Tablet: reduce the rail to icons when needed; remove or move secondary context naturally.
- Mobile: one full-width reading column with approximately 16px content insets. Do not render a shrunken desktop app inside a narrow card.
- Use fluid sizing, `min-width: 0`, sensible maximum widths, wrapping, and bounded media heights.
- Long answers, filenames, evidence text, and draft output must wrap without horizontal page overflow.
- Fixed navigation and sticky controls must not cover content, validation messages, or the focused input.
- Keep browser zoom enabled. Respect reduced motion and visible keyboard focus.

## 5. Screen-to-code mapping

| Stitch reference | Existing route/state | Main component |
| --- | --- | --- |
| Community feed, desktop/mobile | `/`, `/incidents` | `feed.tsx` |
| Evidence thread, desktop/mobile | `/incidents/[id]` | `incident-detail.tsx` |
| Report composer, desktop/mobile | `/report` input state | `report-form.tsx` |
| Report saved, desktop/mobile | `/report` result/retry state | `report-form.tsx` |
| Ask, desktop/mobile | `/ask` | `assistant.tsx` |
| Routes, desktop/mobile | `/routes` | `route-check.tsx`, `signal-map.tsx` |
| Coordinator workspace, desktop/mobile | `/command-center` | `command-center.tsx` |
| Alert draft, desktop/mobile | Existing coordinator form/result | `command-center.tsx` |

Report saved and Alert draft are **existing states**, not new product routes.

## 6. Page-specific implementation requirements

### A. Feed

Build an unmistakable social timeline: compact header, continuous incident posts, circular anonymous signal icons, readable summaries, fine dividers, and small evidence actions.

Each post uses actual incident data: title, location, freshness, status, separate severity, summary, independent-source count, report count, and conflicting-report count. The icon is a presentation aid, not a user identity. Preserve fictional-demo indicators.

Keep search, manual refresh, list/map view, clear filters, and all status/severity/type/time filters. Put advanced filters in an accessible popover or mobile sheet so the default view remains a feed. Group or filter active, emerging, stale, and resolved content using the existing logic.

Use the actual incident type options from `src/domain/types.ts`: road blockage, violence, gunshots, fire, accident, protest, security presence, suspicious activity, infrastructure failure, and other. Do not turn illustrative incident names into new enum values.

Actions link to existing evidence, Ask, and Report flows. Do not implement likes, upvotes, comments, replies, follows, bookmarks, sharing, people recommendations, or realtime push updates.

Map remains a view of the existing feed. Keep its markers and accessible text fallback.

### B. Evidence thread

Style the incident as a post detail followed by a readable evidence thread. Use source-type icons, subtle connectors, and quiet inline metadata instead of dashboard fact grids.

Preserve:

- Status, separate severity, summary, location, demo indication, and relevant timestamps.
- Report, independent-source, firsthand, and contradiction counts.
- Status explanation and verification recommendation.
- Claim proposition, category, assessment, supporting/denying/uncertain counts.
- Evidence source type, perspective, stance, and observation time.
- Anonymized public summaries, input/source type, observed/submitted time, language, and duplication information.
- Support, contradiction, and temporal-update relationships.
- Status history with reasons and timestamps.
- Incident-scoped Ask and Coordinator links.

Use tabs or disclosures for Claims, Reports, Timeline, and detailed metadata. Keep the main post and first meaningful evidence visible immediately. A thread layout does not create a commenting feature.

Never expose private raw reports, source fingerprints, media URLs, identities, or coordinator-only metadata in this public page.

### C. Report composer

Make it feel like composing a community post: a clear observation textarea, compact media toolbar, one attachment preview when appropriate, concise context controls, and one primary submission action.

Keep exactly the existing input modes: Text, Audio, Image, Screenshot. Preserve the single-file 10MB limit and browser audio recording/upload behavior. Do not allow multiple files or combine media modes in ways the current form does not support.

Preserve these fields and limits:

- Text/context: 12,000 characters.
- Location hint: 250 characters.
- Observation date/time.
- Source type: eyewitness, second-hand, community member, trusted community source, security/vigilante source, official source, anonymous/unknown.
- Optional originating channel: 150 characters.
- Optional notes: 1,500 characters.

Use accessible disclosures for secondary context. Preserve form values through appropriate presentation changes and error states. Do not hide validation errors inside a closed disclosure without opening it or guiding focus to it.

No severity selector, GPS action, anonymity toggle, pre-save AI correction, offline drafts, tagging, or audience privacy feature.

### D. Saved report and analysis recovery

Default to a compact confirmation and matched-incident preview. Place extraction details in an accessible `What we extracted` disclosure.

Retain actual analysis status, incident type, detected place/time, language, urgency, source perspective, normalized summary, optional translation, observations, extracted claims, extraction notes, and matched incident link/status.

Raw extracted claims show **polarity** (`supports`, `denies`, `uncertain`) and **perspective** (`firsthand`, `secondhand`, `forwarded`, `unknown`). Do not substitute an assessed incident status for these fields.

Failed analysis must keep the saved report and expose the existing retry action. Do not show Retry analysis as though successful analysis failed. Preserve Report something else.

No confidence percentages, fabricated verification pipeline, automatic dispatch, or offline-storage claims.

### E. Ask

Use a clean conversation-like layout with one submitted question, one returned evidence answer, citations, and a reply-style question composer. This is **not a multi-turn chat product**.

Preserve:

- The existing four suggested questions.
- A maximum 1,500-character question.
- Optional incident context from `incidentId`, its incident link, and Clear context.
- Existing request behavior: each submission replaces the previous result.
- Answer rendered safely as plain text.
- Mode: AI-assisted, Demo response, or Evidence summary.
- Citation title, status, last-report time, and incident link.
- Busy, error, and no-evidence states.

No conversation history, saved chats, new-chat workflow, microphone, attachments, feedback votes, invented message timestamps, or unrelated location-search sidebar.

### F. Routes

Use a compact journey input area followed by a map presented like post media, then nearby incident posts. Keep it readable and consumer-oriented rather than a logistics dashboard.

Preserve origin, destination, the existing swap action, Check route, route impact state/summary, distance, duration, nearby incidents and distance from the route, unlocated incident count, and returned alternatives.

Alternatives are not safety recommendations. An incident with no confirmed location cannot be asserted to lie along the route. Preserve the exclusion of fictional demo incidents from live route assessment.

Use actual Mapbox behavior and geometry. When maps or directions are unavailable, retain the existing honest unavailable state and text location fallback. Never replace the real map with a production-looking static schematic or fabricated directions.

No saved routes, GPS tracking, turn-by-turn navigation, transport modes, traffic prediction, or guaranteed-safe route labels.

### G. Coordinator

This must still look like the same social app: an incident feed with contextual review tools, not a KPI dashboard.

Keep the seven public counts available in a compact Overview disclosure: active, corroborated, emerging, conflicting, high/critical, reports last hour, stale. Preserve public overview access before login.

Keep password login, sign-out, and demo login only when actual demo mode permits it. Do not display authenticated private content alongside an invented permission-elevation form.

Preserve incident search, status filtering, Latest/Severity/Sources sorting, incident focus, and 30-minute/1-hour/24-hour windows.

Use lightweight tabs or disclosures for these existing tools:

1. Generate situation brief.
2. What changed.
3. Prepare internal verification request.
4. Inspect internal reports.
5. Generate alert draft.

Show one relevant tool panel at a time instead of every form and output simultaneously. Preserve each tool's inputs, output, Copy/Download behavior, loading/error state, and selection requirements. Keep useful generated output when switching presentation tabs where appropriate.

Private report inspection retains the existing authorized fields: original text, source/input type, origin, location hint, notes, observed/submitted times, analysis state, normalized summary, perspective, extraction notes, and analysis errors. Never display fingerprints or fabricated tracking metadata.

Verification requests are internal records. They do not dispatch people, contact sources, or mark an incident true.

Do not add Recompute assessment just because an endpoint exists; the current coordinator UI does not expose it. Do not add assignments, review queues with new workflow states, spotter routing, operator profiles, geographic-radius metrics, velocity measurements, or publishing.

### H. Alert draft

Present this as a focused community-update composer with compact option controls and a readable generated result, not a wizard or administrative form wall.

Keep exactly:

- Incident focus.
- Format: Short, SMS, WhatsApp, Radio, Push, Briefing.
- Language: English, Pidgin, Hausa, Yoruba, Igbo.
- Audience text, maximum 150 characters.
- Length: Brief, Standard, Detailed.
- Generate action, busy/error states, returned text, language, saved state, Copy, Download.

The generated output is read-only unless existing source code explicitly supports otherwise. Do not add editing/resaving or draft history.

Use the existing clear notice: **Draft saved. No message has been sent.** No Send, Publish, scheduling, recipients, connected channels, delivery analytics, or approval workflow.

## 7. Evidence semantics must remain intact

- Incident statuses are exactly Unverified, Emerging, Corroborated, Conflicting, Stale, Resolved.
- Severity is a separate low/medium/high/critical field.
- Keep claim-level corroboration separate from incident-level summary wording.
- Corroborating a road obstruction does not corroborate an associated armed-activity rumor.
- Repeated or forwarded reports are not automatically independent sources.
- Do not change source-independence calculations or evidence thresholds.
- No confidence percentages, verified-person reputation, unsupported certainty, or “safe because there are no reports” wording.
- Preserve demo/fictional labels and existing live/demo distinctions.
- Use real application output. Never hard-code Stitch's sample merchant, municipal, detour, dispatch, or security claims.

Keep explanations brief in the default interface. Detailed evidence belongs in the appropriate disclosure, not a wall of cautionary text on every screen.

## 8. Implementation approach

1. Inspect the running app and relevant Stitch references. Record important behavior before changing layout.
2. Establish shared typography, color, spacing, navigation, buttons, fields, status/severity chips, post anatomy, and disclosures in the existing component/style structure.
3. Implement Feed first as the visual anchor. Inspect it in a browser at desktop and mobile sizes before applying the shared structure elsewhere.
4. Implement Evidence and Ask using the same reading rhythm.
5. Implement Report and saved/retry states.
6. Implement Routes using the actual map component.
7. Implement Coordinator and Alert using contextual panels and progressive disclosure.
8. Complete accessibility, responsive, and behavioral checks across every route.

Keep component extraction purposeful. Prefer small reusable primitives over a new generic dashboard framework. Use real icons rather than visible icon-font ligature strings. No fabricated photographic evidence or identifiable reporter avatars are needed.

## 9. Verification and acceptance criteria

Run the applicable existing checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Inspect the existing Playwright configuration before running it. It uses the isolated demo server on port 3100, `.data/e2e`, and `.next-e2e`. Do not run tests against live data or casually replace a user's active server.

Update E2E selectors only when labels or presentation have intentionally changed. If extraction or coordinator tools are now in disclosures, make the test open the disclosure before asserting the existing behavior. **Do not remove or weaken behavioral assertions to get green tests.** Add focused regression coverage where the restructuring creates real risk, rather than snapshot tests that merely mirror the markup.

Verify in a real browser at widths **360, 390, 768, 1024, and 1440px**:

- Every route renders with no horizontal page overflow.
- Exactly one visible shell brand and the correct navigation for the viewport.
- Feed feels like a consumer social timeline, not a filtered admin table.
- All other pages clearly share that social visual language.
- Filters, menus, sheets, tabs, and disclosures work with pointer and keyboard.
- Hidden panels do not leave invisible focusable controls in the tab order.
- Focus, labels, selected states, contrast, status announcements, and reduced motion remain accessible.
- Bottom navigation, sticky composers, and mobile keyboards do not obscure important actions or errors.
- Long answers, drafts, report text, and filenames wrap correctly.
- Loading, no-results, API failure, and map-unavailable states remain usable.
- Text report submission, extracted claims, incident evidence, and scoped Ask work end to end.
- Upload and audio recording controls preserve their existing state and constraints; inspect permission/error behavior where feasible.
- Coordinator authorization still protects private actions and report content.
- Brief, changes, verification request, and alert generation still use the existing APIs.
- Copy/Download work where already implemented; no sending/publishing feature has appeared.
- Route input, swap, results, alternatives, and unavailable fallbacks still work.

Take local browser screenshots of the implemented app for visual review where useful. This is not permission to export Stitch assets.

Do not equate a successful build or a static mobile artboard with verified responsiveness. Report actual checks and any limitations honestly.

## 10. Definition of done and handoff

Complete the redesign across the existing app, not just the homepage. Keep the demo functional and preserve the original feature scope.

Before finishing, review for both failure modes:

1. **Feature drift:** implementing invented mockup behavior.
2. **Visual regression:** turning feature parity into another SaaS dashboard.

In the final handoff, provide:

- A concise description of the visual changes and the pages completed.
- The principal files changed.
- The checks run and their actual outcomes.
- Local preview information and representative implementation screenshots, if available.
- Any remaining issue or unavailable validation, stated explicitly.
- Confirmation of whether backend contracts, authentication, and evidence behavior remained unchanged.

Do not claim user approval of the final visuals. Do not deploy or export from Stitch. Deliver a working, responsive implementation of the preferred social direction using the app we already have.
