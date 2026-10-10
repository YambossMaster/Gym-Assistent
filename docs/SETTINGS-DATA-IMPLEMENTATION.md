# Settings data correction — implementation contract

Product Owner approved both product specifications on 2026-10-10, adding Coach-prefixed filenames
and arbitrary historical ranges of up to 366 inclusive days. This is a later M8-D correction, not
a reopening of delivered M8-B-Export. On the follow-up review the PO requested continued engineering
checks and corrected Excel layout; these are not waiting on a new product decision. The PO then
authorized background download UX and commit/push-main/CI/deploy after checks pass. Installed-PWA
acceptance is the PO's next gate after deployment. Exact preview, literal APPLY and same-SHA
Production release #3 completed on 2026-10-10; see the active Status for evidence.

## Approved background execution correction

- Fetch a bounded, tenant-scoped snapshot with the API; derive and serialize finance data inside
  a short-lived Worker with a 192 MiB old-generation heap limit and no inherited environment secrets.
  Stream committed XLSX rows to bounded memory instead of retaining the entire workbook graph.
  One finance worker per process; at most two total generators so calendar reads retain headroom.
  A 30-second deadline or disconnected request terminates the worker and releases admission only
  after termination. No disk artifact, persistent job service or new infrastructure is introduced.
- Downloads live above Coach routes, in a per-identity TanStack mutation with no automatic retries.
  Same-tick guarding, disabled submit and server admission prevent duplicate active generation.
  Closing the dialog or navigating private pages does not cancel. Explicit cancel and sign-out do.
- Show a compact, collapsible status card: preparing with indeterminate progress and elapsed time,
  ready with a save action, or actionable failure. Do not invent percent/ETA or claim device-save
  completion. Saving uses a fresh user gesture for mobile compatibility. Ready blobs expire after
  five minutes and are never persisted. Closing/reloading the App is not guaranteed background
  execution; pending state warns to keep it open and registers beforeunload as best-effort protection.
- Verify format round-trip, source semantics, worker cancellation/error cleanup, duplicate admission,
  main-thread responsiveness, bounded memory, route-change continuity, identity cleanup and mobile
  notice reachability. Genuine Apple/Google and installed-phone evidence remains separate.

## Interfaces and authority

- `POST /v1/finance-export`: XLSX/CSV, start/end, optional venueId (`none` means unassigned),
  includePrivateNotes. Verified Coach only; current Prime before and after generation.
- `GET /v1/calendar-integration`: versioned settings; while active, an authenticated owner also
  receives the recoverable 256-bit bearer token needed to copy the same subscription URL.
  Downgraded owners can still inspect/revoke existing settings, but receive no live event URL.
- `POST /v1/calendar-integration`: versioned create/reset/update/disable; active results return the
  same recoverable token. Except disable, current Prime is required. Zero is the initial version.
- `POST /v1/calendar-integration/download`: bounded range plus explicit sharing settings, Prime only.
- `GET /v1/public/calendar/:token.ics`: narrow private-path feed; hashed subscription secret resolves one
  owner; current account availability and entitlement checked on each request. No login redirects.
- Legacy `POST /v1/exports` is retired with 410 after both replacement entrances are integrated.
  Preserve historical format code/tests as delivered evidence; no underlying user records deleted.

## Persistence and serialization

Calendar settings and minimal published-event state live in private tables with tenant RLS.
One settings row per Workspace stores only token hash, non-secret random salt, version, revoked time
and sharing flags. A dedicated server-only `CALENDAR_SUBSCRIPTION_SECRET` plus Workspace ID and salt
reconstructs the token with HMAC-SHA-256; raw tokens never persist. Legacy rows without a salt remain
valid but cannot be reconstructed until the owner explicitly resets the link.
Feed reconciliation compares the current allowed event projection with the previously emitted
UIDs, under a settings-row lock. Missing events become privacy-free cancelled tombstones for
210 days. Reappearing events increment their stored sequence; reset clears emitted-event history.
No reads create sessions. UTC ICS uses stable pseudonymous UID (hash of event kind and ID),
stored sequence/revision instant, escaped text and UTF-8 octet-aware line folding.

Feed lookup validates the token first, then uses the resolved Workspace scope for RLS. Account
deletion requests block reads. Entitlement failure revokes the presented token. Auth errors are
uniform 404 without records. Settings writes use optimistic versions and transactions.
Scheduling projection queries only session ID/timing/status/name/location and block ID/timing;
no private notes. Queries cap at 10,001 current or retained events; oversized feeds fail, not truncate.
App and same-origin proxy avoid raw request URLs in logs; production upstream logging requires
explicit deployment review before enabling this endpoint in Production.

Finance reuses Finance Module's ledger, with a bounded export snapshot and missing-cost projection.
ExcelJS 4.4.0 writes a two-sheet static workbook. Text is never a formula; CSV escapes all text.
Generation is bounded by input/output limits, one request per owner, two generators per process
and a 30-second response deadline. Derivation and serialization run in a terminable worker;
source retrieval remains on the API. Production-host database/load evidence remains separate.
Large source snapshots reject before materialization; never remove source dependencies needed
for historical financial rules. Both binary responses use RFC 5987 UTF-8 filenames and no-store.
TWD follows the existing ledger's whole-dollar storage (factor 1), not ISO cents; other currencies
use the existing currency fraction convention. This corrects the draft's TWD example without
changing user records or monetary semantics.

## Local review boundary

Run focused domain/format/HTTP/UI-state tests and typechecks. Produce synthetic downloadable
examples; no live customer data is a fixture. Continue independent engineering verification after
the PO's follow-up request. External calendar acceptance requires a reachable authorized HTTPS
deployment; installed-PWA proof requires real devices. No package completion claim before those gates.

## Local evidence and release holds — 2026-10-10

- API: 7 focused files / 37 tests; Web: 2 focused files / 5 tests. Both workspace typechecks pass.
- Synthetic samples are generated offline with `node --import tsx apps/api/src/e2e/preview-settings-data.ts`.
  XLSX/CSV contain TWD 12,000 income, 3,000 expense, -200 expense credit, difference 9,200,
  plus a separate JPY total. Revised files live in ignored `output/settings-data-review-v2/`.
- XLSX round-trip verifies numeric/date cells, formula-neutral text, hidden/reference exclusion,
  per-request notes, currency separation and historical leap-year selection. Native Excel opened
  the revised workbook read-only, confirmed numeric 12,000 and Microsoft JhengHei, and exported
  summary/detail PDFs. Both were rendered to PNG and visually inspected. Totals precede notes,
  row fills stop at populated columns, and the synthetic summary prints on one A4 page.
- Migration `20261009171747_settings_calendar_integration.sql` was generated through Supabase CLI;
  development dry-run identified it and two reviewed baseline dependencies (`20261006145359`,
  `20261008063726`). All three were applied only to `yvhijxhtelujfsaplzpi`; history confirmed.
  `settings-calendar-rls.ts` passed 9 assertions under the actual development runtime role,
  including tenant reads, cross-tenant write denial and lookup-only token access. Its transaction
  rolled back; read-back confirmed both calendar tables empty. Connector SET ROLE was unavailable,
  so the proof used the existing API connection instead. Production remains unchanged.
- Full install audit and `npm audit --omit=dev`: 0 vulnerabilities after Fastify/fast-uri,
  source-map-js and uuid remediation. Root uuid override pins 11.1.1 (CommonJS supported).
  Existing-lock npm resolution ignored overrides; a clean isolated resolution provided the exact
  uuid metadata, imported without unrelated upgrades. Actual ExcelJS resolution confirms 11.1.1;
  all 37 API tests and 5 Web tests passed again, with both typechecks.
- The initial 20,000-row probe failed responsiveness: 20,919 ms / peak 514 MiB / event-loop
  delay 13,741 ms. Worker plus streaming correction, compiled-JS rerun: 14,216 ms, 1,527,942
  bytes, peak 203 MiB and maximum event-loop delay 94 ms. Responsiveness (<1 s) and memory
  (<384 MiB) assertions pass. This is Windows serializer evidence, not production-host/DB load.
- Worker abort/recovery, same-tick duplicate prevention, HTTP duplicate admission, responsive
  health checks, proxy disconnect propagation and identity cleanup have focused tests.
  Chrome with a loopback-only synthetic 20,000-row API verified dialog dismissal, navigation,
  typing during generation and the ready card at desktop and 390x844 without horizontal overflow.
  The browser connector timed out while observing the save/download event and then disconnected;
  device-save completion and viewport cleanup could not be confirmed. No installed-PWA claim.
- Full workspace verification and exact-SHA remote delivery were authorized and completed in CI
  #137 / Production release #3. Apple and Google initial synthetic subscriptions passed; external
  refresh timing and installed-PWA acceptance remain separate, with PO phone testing next.

### Authorized release preflight

- API full run: 200 passed, one existing CJK PDF test timed out under concurrent local checks.
  Isolated unchanged-file rerun: all 5 format tests pass (finance PDF 15.9 s). No timeout was raised.
  Web: all 77 files / 342 tests pass, with existing React act warnings. Both typechecks and both
  production builds pass; Web retains the existing large-chunk warning. Remote full CI is required.
- `settings-calendar-live.ts` exercises the real development adapter with rollback-only savepoints:
  create/get/feed stability/privacy/download/stale version/cancellation/reset/disable pass.
  Prime is stubbed, so this is SQL/adapter evidence, not live entitlement or parallel-lock proof.
  Its initial UID assertion missed standard ICS unfolding; fixing the assertion, not product code,
  made the same probe pass. Independent read-back: subscriptions/events/fixture blocks all zero.
- Latest streaming samples in `output/settings-data-review-v3/` again opened read-only in native
  Excel: two sheets, Microsoft JhengHei, numeric 12,000. Summary/detail PDF render inspection passed.

### Exact-SHA CI and remaining release decision

- Main commit `13587f054e44ec370b89f6b9398b92cc199c2fea` is pushed. [CI #136](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37977614654)
  passed full verify (API 201 / Web 342), builds, browser UI, development dry-run and Production
  preview. The preview lists only `20261009171747_settings_calendar_integration.sql`.
- PO supplied literal APPLY for that preview and SHA. No Production migration/deploy was started.
- Final upstream privacy review cannot yet substantiate the frozen requirement that Fly proxy
  logs always mask URL credentials. Current [Fly staff guidance](https://community.fly.io/t/where-are-platform-logs-stored-for-an-nrt-app-data-residency-follow-up-to-a-closed-thread/28598)
  says ordinary request logs are not stored, but support debugging can retain them; historical
  [Fly proxy error-log evidence](https://community.fly.io/t/seeing-requests-to-the-fly-proxy-in-the-logs/2318)
  includes `request.url`. This is a protection/verification gap, not evidence of a leaked token.
  The live Machine uses ordinary Fly HTTP/TLS routing; app-side URL suppression alone does not
  prove provider-side suppression. Do not weaken the frozen security contract implicitly.
- PO rejected split delivery and paid ingress changes. After Basic Auth worked on Apple but not
  Google, PO approved a 256-bit private path and accepted Fly upstream path-log residual risk.
  Application logs retain only route templates and generic calendar errors.
- Prime expiry now returns one stable all-day transparent notice, never real schedules; the first
  observed expiry clears publication history and retains a notice-only capability. Renewal needs
  a new link; explicit disable revokes it. Entitlement errors fail closed and generation rechecks
  access. No schema change. See `CALENDAR-SUBSCRIPTION-SECURITY.md` for full security/release gates.
- Preserve prior migration approval but refresh exact-SHA CI and preview for the changed code.
  A synthetic Google subscription fetched the private path with HTTP 200 and displayed the event.
