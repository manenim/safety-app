# SignalCheck — community social redesign

Design destination: [SignalCheck Community Social Redesign](https://stitch.withgoogle.com/projects/17301679359797473869), using Gemini 3.8 Flash (Balanced), Web mode.

## Current user direction — supersedes the initial visual brief below

- The user rejected the first pass because it still looked corporate/dashboard-like.
- Preferred reference: **X / Reddit — compact feeds and conversation threads**.
- Instagram and Facebook screenshots were supplied to clarify spacious, recognizable navigation, with one coherent navigation system.
- The SignalCheck logo must appear **exactly once per screen**, never four times through nested shells.
- Background: **white**, with optional neutral off-white. No green tint and no dark theme. Use `#FFFFFF`, secondary surfaces `#F7F7F7`, ink `#17191C`, secondary text `#60666C`, rules `#E5E7EB`. Small teal accents only.
- Desktop: one left rail, clear icon/text navigation, central continuous feed. Mobile: one compact header and one bottom navigation bar.
- Do not export. Keep generated design work inside Stitch. The local file is the written brief, not an export of generated screens.
- A new matched desktop/mobile white feed pair is the visual anchor before adapting all remaining pages.
- The September 23 compatibility pass was visually rejected: exposing every filter, metric, tool, and output simultaneously made all pages resemble SaaS dashboards. Restore the earlier Twitter-like presentation across the whole set. Feature parity means controls remain available through normal disclosures; it does not mean every control must be visible at once.
- Use a continuous post timeline, 44px generic anonymous signal icons, 16px post text, large 20px desktop navigation labels, thin separators, and compact post action rows. Filters belong in a popover/sheet; advanced report context and coordinator tools use disclosures. Avoid KPI strips, dense form walls, nested card grids, and administrative jargon.
- Ask should read as one question and one evidence response in a conversation, report creation as a social composer, saved report as a compact confirmation plus expandable extraction, routes as a map post with compact inputs, and coordinator tools as an incident feed with contextual actions. Alert drafting remains a focused composer with advanced options grouped compactly.

## Product intent

Transform the existing safety application into a contemporary community product with a familiar social feed, generic source-type icons, conversational reporting, evidence threads and a single-question evidence assistant. Preserve all existing functions and privacy boundaries described in `UI_HANDOFF.md`. Design work only; the application source has not been replaced.

## Implementation boundary — September 23 correction

The existing components and data contracts are authoritative over any Stitch mockup. Every visible value and action must map to an existing field, state, or operation. A backend endpoint alone does not authorize adding a new UI feature. In particular, omit the recompute action absent from the current coordinator component.

- Ask has one submitted question and one returned answer; a subsequent question replaces the result. No multi-turn history, saved conversations, voice questions, attachments, feedback votes, or new copy/share controls.
- Coordinator supports public counts, password access, incident search/status/sort, incident focus, time window, situation brief, changes, internal verification request, protected report inspection, and alert drafts. No dispatch, assignments, named operator profiles, direct truth verification, telemetry, geographic-radius metrics, confidence scores, or separate review queue.
- Alert drafting preserves incident, format, language, audience, and length. Output supports Copy and Download. It is not an editable-and-resavable draft feature and never sends a message.
- Reporting saves before analysis. No severity selector, pre-save correction, GPS location action, privacy toggle, or offline drafts.
- Report saved and Alert draft artboards are existing page states, not new routes.
- UI-only grouping and responsive navigation are permitted; new domain behavior, schema, services, and APIs are outside this redesign.
- Mockups must not be treated as evidence that responsive application behavior has been tested. Validate the real implementation at the listed breakpoints.

Residents check updates on phones outdoors. Prioritize a bright, readable interface, short natural-language summaries, touch-friendly controls and progressive disclosure. Social presentation does not introduce accounts, likes, followers, DMs, notification inboxes, raw public uploads or live push services.

## Shared art direction

- White `#FFFFFF` reading surfaces and canvas, optional neutral off-white `#FAFAFA`, ink `#172026`, secondary text `#667085`, primary teal `#087B75`, separators `#E6E8EB`. No green-tinted background.
- DM Sans, weights 400/500/600/700. Desktop titles 26–30 px; mobile 22–26 px; post titles 18–20 px; body and inputs 16 px; secondary text 13–14 px. Line height approximately 1.5.
- 4/8 px spacing foundation, 16–24 px gutters, 12–16 px radii, pill chips and circular anonymous-source icons. Consistent outline icons, restrained color, fine post separators.
- No dashboard metric walls, generic hero sections, gradients, glass effects, giant corner radii, fabricated incident photos or identifiable reporter portraits.
- Reuse the SignalCheck wordmark with a small signal/ripple mark. Photography is unnecessary for this text-and-evidence product; no generated imagery should masquerade as a report.

## Responsive structure

- Desktop: fluid shell, 208–224 px navigation, 640–760 px reading column, optional useful context rail only when space permits. Navigation: Feed, Report, Ask, Routes, Coordinator. Map is a Feed view, not a separate route.
- Tablet 768–1100 px: icon navigation rail and flexible main column. Context moves below content or into a clearly labeled tab/drawer.
- Phone 360–430 px: single column, 16 px gutters, compact header, fixed Feed / Report / Ask / Routes / Tools bottom navigation. Include safe-area padding and enough content inset to prevent coverage. Tools opens the existing Coordinator page.
- Forms stack, incident tables become labeled rows, filter controls use a full-width sheet, long evidence wraps. Minimum 44 px hit targets. Sticky composers sit above navigation and the keyboard.
- Validate at 360, 390, 768, 1024 and 1440 px. Separate device mockups illustrate layout intent; browser tests are still required before claiming implementation responsiveness.

## Non-negotiable evidence semantics

Always distinguish Unverified, Emerging, Corroborated, Conflicting, Stale and Resolved from severity (low, medium, high, critical). Pair color with text. Corroboration is claim-specific, not official verification or absolute truth. Show timestamps, apparent independent-source counts, total reports and contradictions. Repeated messages are not independent evidence. Distinguish firsthand and secondhand perspectives. No confidence percentages, guaranteed-safe routes or fake LIVE labels.

All mock incident content must be marked `Demo · fictional reports`. Use anonymized labels such as Community report 04 and Eyewitness report 07. Maps in mockups are illustrative. Production must use actual provider geometry or an explicit unavailable state. Lack of reports does not guarantee safety. Do not claim alerts or verification requests are sent to anyone.

## Page-by-page prompts

### 01 — Around you: `/` and `/incidents`

Create a polished social community feed. Compact Around you header, place/search, manual refresh and last-updated time. Latest / Emerging / Earlier updates groups and Feed/Map view switch. Filter sheet retains status, severity, type and time (1h, 6h, 24h, 7d, all time), with applied chips and reset. Composer teaser: “What’s happening around you?” with Text / Photo or screenshot / Voice entry points. Each post includes anonymous icon, location/time, readable title, short summary, status and separate severity, apparent independent-source count, reports and conflicts, View evidence and Add an observation. No reaction counts. Right rail contains map context and a route-check shortcut.

### 02 — Evidence thread: `/incidents/[id]`

Create a social post-detail page with back navigation, status, severity, summary, place, freshness and inline source counts. Show “What we know” and “What still needs checking.” Example: vehicle obstruction is corroborated while a separate armed-activity rumor remains unverified. Evidence / Community reports / Timeline sections present claim propositions, category, support/deny/uncertain counts, source perspective, stance and observation time. Show anonymized summaries, input/source type, observed/submitted time, language and duplication labels. Include relationships, why-this-status explanation, next evidence gap and first/last/corroboration/status-change timestamps. Actions: Add an observation, Ask about this update, Coordinator tools.

### 03 — Composer: `/report`

Create a friendly expanded social composer with Text / Voice / Image / Screenshot modes. Visible labels, 16 px fields and privacy explanation. Text limit 12,000 characters; location 250; optional origin 150; notes 1,500; one upload up to 10 MB. Include observation date/time and all existing source types. Optional context uses disclosure. Voice has record/stop, elapsed time and upload fallback. Attachment has filename and remove. Submit saves then analyzes; no invented pre-save correction flow. Preserve input on errors and disable conflicting actions while recording/saving/analyzing.

### 04 — Conversation: `/ask`

Create one question and evidence answer with suggested questions, optional incident-context chip and clear action. Show a sample question about Market Junction. Each submission replaces the previous result. Answer distinguishes reported obstruction from unverified rumor and explains uncertainty/freshness. Citation cards link incident title, status and last-report time. Textarea supports up to 1,500 characters. Include checking-evidence, no-evidence and evidence-fallback modes. Do not invent multi-turn or persistent message history, voice questions, attachments, or external integrations.

### 05 — Journey: `/routes`

Create origin/destination inputs, Check route, map and route results. Show reported impact, actual-route distance/duration, incident distances from route, alternative route geometry, status and separate severity. Include unlocated active-incident count. No safe scores. An empty result says no nearby reports and explicitly does not guarantee safety. Missing/ambiguous locations and unavailable directions show no fabricated path. Provide accessible location list. Mobile uses bounded map plus readable route details, with editable endpoints.

### 06 — Coordinator: `/command-center`

Create a community-review workspace sharing the public visual system. Public overview remains before sign-in; authentication unlocks private data and actions. Compact summary counts for active, corroborated, emerging, conflicting, high/critical, reports-last-hour, stale. Search/status/sortable queue, selected incident and review pane, recent activity, 30m/1h/24h windows. Situation brief, What changed, Prepare verification request, Inspect private reports and Draft community alert. Private inspection shows original text, notes, origin, analysis state/extraction notes, never source fingerprints. Verification requests are internal records. Include password sign-in/error and Sign out states.

### 07 — Saved report and recovery: `/report` states

Create the report-saved receipt and post-save analysis. Include matched incident link/status, detected place/time, language, urgency, report perspective, normalized summary, translation, firsthand observations, atomic claims/polarity/per-claim perspective and extraction notes. Progressive disclosure keeps the receipt readable. Actions View incident and Share another update. Failed analysis says the report is safely stored and offers Retry analysis. Never imply failure discarded the report or require duplicate submission.

### 08 — Draft community alert: coordinator subview

Create a focused draft generation form with incident focus, format (short, SMS, WhatsApp, radio, push, briefing), language (English, Pidgin, Hausa, Yoruba, Igbo), audience and brief/standard/detailed length. Generate draft, saved-state label, full readable output, Copy and Download text. State "Draft saved. No message has been sent." Do not show editing/resaving, Send or publish success. Explain unsupported translation in demo mode. Include generation pending/error, copied feedback and manual-copy fallback. Preserve uncertainty, observation times and claim-level distinctions in sample draft text.

### 09 — Map view: `/incidents` state

Create a full map-focused view sharing feed filters. Pins pair icons and labels; selected incident opens an accessible preview and View evidence. List/Map switch stays visible. Include missing-location list and provider-unavailable state. At mobile widths use map plus a bounded, scrollable selected-incident sheet without hiding bottom navigation.

### 10 — Shared states

Create skeleton feed, no matching filters with Clear filters, network error with retry, unavailable map with location list, assistant no evidence, microphone-denied upload fallback, coordinator sign-in error, not-found route with Back to feed, disabled/loading controls and keyboard focus examples. Reuse exact components and text styles.

## Review criteria

Review every generated screen for page coverage, visual consistency, readable hierarchy, clipping, missing fields, fabricated product capabilities and incorrect safety claims. Use structural mobile layouts rather than scaled desktop screenshots. Confirm generated code in a browser at required breakpoints when export access permits. Distinguish visual mockup review from tested application behavior.

## First-pass corrections sent to Gemini

The initial output was checked in Chrome using Playwright snapshots and visual inspection. A second prompt explicitly requested actual edits across the six screens and shared shell:

- Replace generated Newsreader/Hanken Grotesk typography with the requested DM Sans.
- Remove duplicated top navigation, repeated wordmark and redundant contextual sidebar; preserve one desktop navigation rail.
- Remove invented accounts, saved posts, likes/corroboration reactions, GPS verification, merchant reputation, live monitoring and manual verification controls.
- Replace fake live-map and route-clear labels with illustrative/demo wording. Remove confidence scores and absolute verification claims.
- Correct the corroboration explanation to two independent firsthand supporting source groups for the core claim.
- Restore exact report source categories and all four input modes. Remove unsupported EXIF-stripping and automatic contact promises.
- Preserve authenticated coordinator operations and restore all seven compact overview metrics.
- Replace blank map blocks with clearly labeled illustrative street schematics and text alternatives.

The design model's statements about its output must be checked against the resulting screens; a claim of compliance alone is not verification.
