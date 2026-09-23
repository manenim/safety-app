# SignalCheck Implementation Plan

**Goal:** Implement the full provided SignalCheck specification.
**Architecture:** Next.js App Router UI consumes typed API DTOs. Server services orchestrate OpenAI, Mapbox and Supabase. Pure domain functions own corroboration, source independence, matching and geography.
**Spec:** SIGNALCHECK_CODEX_BUILD_SPEC.md
**Constraints:** Never infer safety from absence of evidence. Keep credentials and reporter identifiers private. No AI truth scores. Preserve raw reports on analysis failure. Demo behavior must be explicit.

- [x] Foundation: typed contracts, environment validation, dependency setup.
- [x] Evidence: test unverified/emerging/corroborated/conflicting/stale/resolved, duplicate source counting, mixed firsthand claims, time-aware contradictions, matching and route geometry; implement pure functions.
- [x] Persistence: relational SQL migration with RLS and private storage; repository; deterministic 6-incident / 26-report seed; execute migration and seed against configured project.
- [x] Intelligence: validated multimodal extraction, geocoding, route directions, grounded generation; bounded prompts and recoverable provider errors.
- [x] API orchestration: preserve pending reports, analyze/retry, match/create, claims, history; anonymized public DTOs; coordinator cookie authentication and protected operations.
- [x] UI: feed and filters, detail evidence/timeline, multimodal report submission, ask, route map, command center, alert generation and copy/download.
- [x] Verification: unit/integration tests, browser happy path, real provider smoke checks, lint/typecheck/build.
- [x] Handoff: README, environment example, UI_HANDOFF, limitations and deployment guidance.

Execution uses independent agents for persistence, AI integrations, and visual components after shared contracts are written; primary agent implements domain and API and reviews integration. No repository or existing branches were present. User's spec explicitly authorizes autonomous implementation; no additional design approval is needed.

Final verification: lint and typecheck clean; 56 unit/integration tests and 3 Playwright browser tests pass; production build passes. Live Supabase migrations/seeding/private storage, real multimodal OpenAI and Mapbox integrations verified. Fictional fixtures are labeled and excluded from live ingestion matching/route impact. No external deployment or outbound messaging performed.
