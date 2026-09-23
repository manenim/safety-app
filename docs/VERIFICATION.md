# Verification record

Verified 22 September 2026.

- `npm run lint`: passes without warnings.
- `npm run typecheck`: passes.
- `npm test`: 56 tests across six suites pass.
- `npm run test:e2e`: three Chromium scenarios pass: text report → matched incident → evidence → assistant; protected coordinator access → alert/brief/changes → logout; mobile feed width.
- `npm run build`: optimized Next.js production build passes for all pages and API handlers.
- Live Supabase migration, seed, service-role reads, transaction writes and private media round-trip verified; public raw data/media access denied.
- Real OpenAI sample Pidgin extraction, image vision and synthetic voice transcription preserve per-claim perspective. Grounded assistant citations verified.
- Live authenticated alerts in English, Pidgin and Hausa return saved content; situation brief succeeds. Nothing sent externally.
- Mapbox permanent geocoding and driving directions verified. Ambiguous Yaba district → Yaba Road substitution rejected; explicit Yaba Road directions accepted.
- Browser Mapbox tiles and six seeded markers verified. Desktop and 390px mobile layouts inspected; no horizontal page overflow.
- Secret scan of source, tests, scripts and `.next/static` found zero server credential values.

The fixtures are fictional, visibly labeled and isolated from live report matching and route-impact assessments. This verification does not assert that community reports are true or routes safe. Deployment has not been performed.

For a version-control checkpoint before redesign (this folder initially had no Git repository):

```bash
git init -b main
git add .
git commit -m "feat: complete functional SignalCheck MVP"
git tag functional-mvp
git checkout -b ui-redesign
```

Review staged files before committing; secret-bearing files are excluded by `.gitignore`.

## Same-origin request regression

The initial origin guard compared browser Origin against Next.js's internal bind URL (`0.0.0.0`), blocking normal localhost requests. It now validates the browser-facing host and protocol, using forwarded routing headers when present and rejecting malformed or foreign origins. Reverse proxies must overwrite these headers.

Added 18 regression cases for localhost, loopback, LAN and proxied HTTPS origins, port/scheme mismatches, malformed forwarded headers and cross-site rejection. The full suite now contains 74 tests. Browser tests now start Next with the same `--hostname 0.0.0.0` option as the actual app. All three browser scenarios pass, and the live Ask page returns an answer for the reported Market Junction question.
