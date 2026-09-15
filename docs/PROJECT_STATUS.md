# Gym Assistant project status

> Last verified: 2026-09-15. This file records live engineering state; scope and completion rules
> live in [`ROADMAP.md`](ROADMAP.md).

## Current snapshot

| Field              | Current value                                                                         |
| ------------------ | ------------------------------------------------------------------------------------- |
| Active phase       | **M7 — Local resilience and Demo migration**                                          |
| Current package    | **M7 complete**                                                                       |
| Package state      | **Done**                                                                              |
| Completed baseline | M0–M7 Done; M7 delivery commit `8885404`, GitHub Actions run `34976808273` successful |
| Branch baseline    | `main`; M7 delivery commit `888540469df530432c9ca62031742257900f077f`                 |
| Worktree           | No M7 implementation changes pending                                                  |
| Linked database    | Development only; M7 migrations through `20260915131743` applied; dry-run up to date  |
| Production         | Not configured; no real customer data                                                 |

## Next handoff

Stop at the M7 milestone boundary. Before entering M8, the Product Owner must authorize the
deployment/Beta package and resolve its hosting, secrets, recovery, observability, and security
decisions through Contract.

## Milestone status

| Milestone                              | State       | Evidence or remaining boundary                                                                                                  |
| -------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| M0 Repository and product contract     | Done        | Demo archived separately; formal workspaces, vocabulary, ADR/Roadmap/Status discipline established                              |
| M1 Cloud foundation tracer             | Done        | Supabase private schema, verified identity/Workspace derivation, two-Coach isolation, migration workflow, remote CI             |
| M2 Coach account operations            | Done        | Registration, six-digit OTP, Email/Google/recovery, settings, sessions, deletion lifecycle, Edge Function/cron, live acceptance |
| M3 Student and Lesson entitlement      | Done        | Student lifecycle, purchases/manual income, derived balances, two-Coach E2E, 390px acceptance, CI run `34565338417`             |
| M3.5 Frontend gap filling              | Done        | A0–A5 delivered; commit `e403170`, CI run `34766425884` Verify and migration-dry-run successful                                 |
| M4 Scheduling                          | Done        | Commit `dc83d92`; CI run `34947956256` Verify and migration-dry-run succeeded after complete local/live/browser evidence        |
| M5 Training and Exercise Library       | Done        | Commit `5afa212`; CI run `34956661567` Verify and migration-dry-run succeeded after complete local/live/browser evidence        |
| M6 Public Capability Links             | Done        | Commit `658ce1a`; CI run `34966898151` Verify and migration-dry-run succeeded after complete local/live/browser evidence        |
| M7 Local resilience and Demo migration | Done        | Commit `8885404`; CI run `34976808273` Verify and migration-dry-run succeeded after complete local/live/browser evidence        |
| M8 Deployment and Beta readiness       | Not started | No staging/production environment                                                                                               |
| M9 Post-V1 options                     | Deferred    | Evaluate after Beta                                                                                                             |

## Preserved implementation inventory

### Formal runtime

- React/Vite PWA in `apps/web`, Fastify modular monolith in `apps/api`, Supabase Auth/PostgreSQL.
- Same-origin `/api` contract with Vite development proxy.
- Root `start-gym-assistant.cmd` opens API at `127.0.0.1:3000` and Web at
  `http://127.0.0.1:5173`; it has been inspected but not end-to-end launch-verified.
- Account lifecycle deletion uses a server-only Supabase Edge Function, `pg_cron`, `pg_net`, and a
  Vault-held function-specific token.

### M0–M3 product/data foundation

- Public Coach registration with six-digit Email OTP, Email/password, Google OAuth, recovery,
  Workspace settings, session management, reversible 14-day deletion, immediate deletion, and
  365-day inactivity deletion.
- Versioned Student create/update/archive/delete and tenant-isolated list/detail.
- Lesson Purchase entitlement plus Coach-entered manual income in integer minor units/ISO currency.
- Remaining lessons derived as purchases minus completed Course Sessions, including visible
  negative balances.
- Deterministic M3 Demo migration preview/checksum; archived `form-coach-mvp-v1` remains unchanged.
- TanStack Query Coach-scoped in-memory caching, background revalidation, prefetch/invalidation,
  and Auth cache clearing are present in the current worktree.
- Formal App Shell route separation exists, but route content still has the M3.5 gaps below.

### M4 reset

- The abandoned M4 Scheduling adapter, Module, HTTP routes/tests, and original migration were
  removed with Product Owner approval before formal M4 work began.
- Linked development database history marks the former `20260911053840` migration reverted; rollback
  migration `20260912103452_remove_unstarted_m4_scheduling_core` restored M3's entitlement-only
  `course_session` schema.

### M4 Scheduling

- Server-authoritative Session, Series, Block, and Availability operations now use UTC storage,
  Workspace IANA conversion, version conflicts with current state, warning-only overlaps, and
  Coach-derived tenant isolation.
- Calendar supports Agenda/Day/Week/Month, drag-assisted editing, recurring Block scopes, Session
  lifecycle actions, availability editing, and accessible desktop/modal plus mobile/bottom-sheet
  interactions. Today and Student detail expose the owned schedule projections; Session detail
  remains scheduling-only until M5.
- Deterministic Demo scheduling preview validates entity counts, rejections, preserved legacy
  entitlement rows, conflict reports, and per-entity checksums without importing Demo persistence.

### M5 Training and Exercise Library

- Private-schema Exercise Definition, Training Preference, Training Record, occurrence snapshot,
  Set, and seven-day mutation-receipt data now sit behind a tenant-scoped Training Module and
  dedicated API role. The formal 100-item catalog uses stable keys and bootstrap-once semantics.
- Session Training supports coalesced autosave, identity/session/tab-scoped IndexedDB recovery,
  immutable occurrence snapshots, explicit conflicts, atomic completion, completed-record edits,
  reopen, qualified current/previous/personal bests, and mixed-unit display conversion.
- `/exercises`, Session Training, Student performance/trends, and Settings weight preference now
  match FORM's desktop and mobile visual language without importing Demo persistence or private
  Coach notes into Student projections.

### M7 Local resilience and Demo migration

- Coach/environment-scoped IndexedDB stores local drafts, a receipt-backed Training operation
  queue, UI preferences, and resumable import metadata; private Query data remains memory-only and
  Auth subject changes clear the departing Coach's local records.
- Settings provides exact Demo JSON backup, server-side validation and redacted preview, ordered
  five-phase import, safe retry, stale/conflict handling, and version-protected rollback. IDs are
  deterministic but Workspace-salted; raw legacy Capability tokens are rejected and never imported.
- App Shell exposes offline, pending, retry, and attention states. The archived Demo only gains an
  exact backup download and retains the `form-coach-mvp-v1` storage contract.

## Remaining route boundaries

- `/today`, `/calendar`, `/sessions/:id`, Student scheduling/performance, `/exercises`, and M5
  Settings now expose their server-authoritative projections.
- `/t/:token` and `/r/:token` now mount before Coach Auth with a separate, non-persisted public
  query client; the service worker excludes both route prefixes and all API responses.
- Some rendered copy describes implementation state rather than helping a Coach complete a task.

## Open risks and constraints

| Risk/constraint                                                   | Current handling                                                                                |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| M4 starter had been applied to development schema                 | Approved rollback migration restored M3 entitlement schema; local/remote migration list aligned |
| Frontend monolith increases accidental cross-route regressions    | M3.5-A1 decomposes by route while freezing behaviour                                            |
| Product UI can drift when engineering invents presentation/copy   | Four mandatory gates; Terra hard limit; Sol owns product convergence                            |
| Auth leaked-password-protection warning remains                   | Accepted development warning; resolve in M8 production security gate                            |
| GitHub-hosted Node 20 action compatibility warnings               | CI stays green; upgrade checkout/setup-node actions before GitHub removes compatibility         |
| Previously exposed development credentials require final rotation | No production use; rotate all deployment secrets during M8 before Beta                          |
| Demo seed/local data can be mistaken for production truth         | Use Demo only for behaviour/presentation; all official data comes from route projections        |

## Verification baseline

- M3 local: root check/build, live two-Coach isolation, migration preview, desktop and 390×844
  acceptance passed.
- M3 remote: commit `c55a95d`, GitHub Actions run `34565338417`, verify and migration-dry-run jobs
  successful.
- After M4 reset: linked rollback migration applied, migration dry-run is up-to-date, and Supabase
  advisors report only the pre-existing leaked-password-protection warning.
- M3.5-A3: commit `26bc036`; GitHub Actions CI #11 / run `34706580673` completed in 52 seconds with
  Verify and migration-dry-run jobs green (API 24, Web 45).
- M3.5-A4 local: root check passed (API 27, Web 51), root build passed with the existing bundle-size
  advisory, migration dry-run is up to date, linked `app_private` schema lint found no errors, and
  the live two-Coach E2E verified the Today allowlist/isolation then deleted its isolated Student.
  Desktop and exact 390×844 browser acceptance passed without horizontal overflow or console errors.
- M3.5-A4 remote: commit `ae6b764`, GitHub Actions CI #13 / run `34764878712` completed in 57
  seconds with Verify and migration-dry-run jobs successful (API 9 files/27 tests; Web 11 files/51
  tests).
- M3.5-A5 remote: commit `e403170`, GitHub Actions CI #14 / run `34766425884` completed
  successfully; Verify and migration-dry-run jobs both succeeded (API 9 files/27 tests; Web 11
  files/51 tests).
- M3.5 documentation reset: targeted Prettier check and repository-wide `git diff --check` passed
  on 2026-09-12; only Git's existing LF-to-CRLF notices were emitted.
- M4 local: root check passed (API 12 files/43 tests; Web 14 files/61 tests), root production builds
  passed with the existing over-500-kB Vite advisory, and `git diff --check` passed. Linked migration
  dry-run is up to date and linked `app_private` schema lint reports no errors.
- M4 live: isolated two-Coach E2E passed Session stale-version/current-state handling, Availability
  baseline conflict handling, recurring Block future/all scopes with preserved offsets, route
  projections, Series horizon/effective boundary, tenant isolation, and cleanup; the post-run Block
  residue count was zero. Deterministic Demo scheduling preview also passed.
- M4 browser: authenticated desktop and exact 390×844 acceptance passed for Calendar views,
  warning acknowledgement, modal/bottom-sheet focus and Escape restoration, Week-only horizontal
  scrolling, Today schedule, Student Series UI, no page overflow, and no console errors.
- M4 remote: commit `dc83d92`, GitHub Actions CI #17 / run `34947956256` completed in 58 seconds;
  Verify and migration-dry-run succeeded (API 12 files/43 tests; Web 14 files/61 tests).
- M5 Terra/Sol local: root check passed (API 14 files/51 tests; Web 15 files/65 tests), root builds
  passed with the existing over-500-kB advisory, and `git diff --check` passed. Demo preview passed
  with 100 stable catalog keys, checksum
  `0d915287e55739226788ff7c984a729bf734c1534b87d48eef8961ba632ac08a`, zero rejections,
  preserved legacy rows, and zero invented historical Training facts.
- M5 linked/live: four official CLI-created Training migrations through `20260915100537` are
  applied; final dry-run is up to date and linked `app_private` lint has no errors. Isolated M5 E2E
  passed catalog stability, receipt retry/mismatch, atomic completion, completed-record editing,
  performance allowlist, reopen, two-Coach isolation, and cleanup. M4 live regression also passed.
- M5 advisors/browser: security retains only the accepted leaked-password-protection warning; M5
  RLS and foreign-key performance findings were resolved, leaving only pre-existing M4/unused-index
  informational notices. Authenticated desktop and exact 390×844 acceptance passed Session editor,
  Exercise Library, Settings preference, Student performance/trend, autosave state, mobile sticky
  actions/navigation, and isolated fixture cleanup.
- M5 remote: commit `5afa212` pushed to `origin/main`; GitHub Actions CI #19 / run `34956661567`
  completed successfully. The `verify` and `migration-dry-run` jobs both succeeded for exact SHA
  `5afa2124e98f5fea74310516cf85119d7c62e006`.
- M6 remote: delivery commit `658ce1a` pushed to `origin/main`; GitHub Actions run `34966898151`
  completed successfully. Jobs `verify` and `migration-dry-run` both succeeded for exact SHA
  `658ce1a6f59007f7ad9f709445b5989dd69d778b`.
- M7 local: root check passed API 18 files/66 tests and Web 17 files/72 tests; root production build
  passed with the existing over-500-kB advisory. Demo check passed 9 files/61 tests and its release
  build passed. Repository `git diff --check` passed with only LF-to-CRLF notices.
- M7 linked/live: three official migrations through `20260915131743` are applied; final linked
  dry-run is up to date and `app_private` lint reports no schema errors. Isolated two-Coach E2E
  passed safe preview redaction, legacy-token rejection, Workspace-salted IDs, ordered five-phase
  import, tenant isolation, and exact created-row rollback; its test data was removed.
- M7 browser: authenticated desktop and exact 390×844 Settings acceptance passed import/recovery
  hierarchy, readable step progression, mobile stacking and sticky navigation without horizontal
  overflow; Chrome console reported no warnings or errors.
- M7 remote: delivery commit `8885404` is on `origin/main`; GitHub Actions CI #24 / run
  `34976808273` completed successfully in 1 minute 9 seconds for exact SHA
  `888540469df530432c9ca62031742257900f077f`. Job `verify` succeeded in 37 seconds (API 66, Web 72)
  and `migration-dry-run` succeeded in 24 seconds. The two annotations are the tracked Node 20
  action compatibility warnings, not job failures.

Current development validation commands:

```powershell
npm run check
npm run build
npm run db:push:dry
npm run e2e:m4 --workspace @gym-assistant/api
npm run preview:m4-demo --workspace @gym-assistant/api
npm run preview:m5 --workspace @gym-assistant/api
npm run e2e:m5 --workspace @gym-assistant/api
npm run e2e:m6 --workspace @gym-assistant/api
npm run e2e:m7 --workspace @gym-assistant/api
git diff --check
```

Run only the checks required by the current Roadmap package, then retain exact results here. A
local pass or successful push is not a remote CI completion claim.

## Engineering log

### 2026-09-15 — LOG-080 — M7 delivered with exact-SHA remote CI

- **Scope:** delivered the cohesive M7 Contract/Terra/Sol implementation and observed the remote CI
  result for the exact delivery commit.
- **Outcome:** commit `8885404` is on `origin/main`; Local resilience and Demo migration is Done and
  the protected baseline is now M0–M7. No M8 deployment or production scope was entered.
- **Verification:** GitHub Actions CI #24 / run `34976808273` succeeded in 1 minute 9 seconds for
  exact SHA `888540469df530432c9ca62031742257900f077f`; `verify` passed in 37 seconds with API 66 and
  Web 72 tests, and `migration-dry-run` passed in 24 seconds. Its two annotations are the already
  tracked Node 20 action compatibility warnings.
- **Next:** stop at the M7 milestone boundary. Product Owner authorization and a frozen M8 Contract
  are required before hosting, secrets, recovery, observability, or production security work.

### 2026-09-15 — LOG-079 — M7 Terra and Sol complete; CI delivery pending

- **Scope:** implemented the frozen M7 Contract across Coach-scoped local resilience, Demo exact
  backup, deterministic migration planning, private-schema run/ledger persistence, five-phase API
  execution, rollback, Settings recovery UI, and archived Demo backup affordance.
- **Outcome:** offline Training changes now survive and replay with stable operation IDs; incomplete
  imports resume without retaining raw source; import previews redact private notes and secrets;
  legacy Capability Links are safely rejected; Workspace-salted IDs and version checks protect
  tenant boundaries and rollback. A live E2E exposed JSONB key-order rollback misclassification,
  which was corrected with explicit version comparisons before the final passing run.
- **Verification:** root check passed API 66/Web 72 tests; root and Demo production builds passed;
  Demo check passed 61 tests; migration dry-run and `app_private` lint passed. Final isolated live
  E2E import `6ed27a15-04d9-42ee-b198-0ccd40048842` passed five phases, two-Coach isolation,
  redaction/rejection, and exact rollback. Authenticated desktop and exact 390×844 acceptance passed
  with no page overflow or browser console warnings/errors.
- **Next:** commit/push M7 and observe GitHub Actions `verify` plus `migration-dry-run` for its exact
  SHA; do not enter M8 without a new Product Owner decision.

### 2026-09-15 — LOG-078 — M7 Contract frozen and Terra authorized

- **Scope:** entered M7 after the Product Owner confirmed M6 completion; inspected the Demo storage
  graph, delivered M3–M6 authority seams, local Training draft/receipts, architecture, and current
  Supabase migration/security guidance.
- **Outcome:** [`M7-CONTRACT.md`](M7-CONTRACT.md) freezes the local allowlist, idempotent operation
  queue, exact backup, validation/preview, phased import, safe legacy-link rejection, retry, and
  rollback experiences. Server authority and `form-coach-mvp-v1` remain protected.
- **Verification:** Contract is mapped to every M7 Roadmap criterion; no implementation, migration,
  live/browser evidence, or delivery claim is made at this gate.
- **Next:** implement M7 Terra from Contract section 10, beginning with local adapters and pure Demo
  normalization before creating the serialized database migration.

### 2026-09-15 — LOG-077 — M6 delivered with exact-SHA remote CI

- **Scope:** deliver the cohesive M6 implementation and observe, rather than infer, its remote CI
  result.
- **Outcome:** commit `658ce1a` is on `origin/main`. Public Capability Links is Done and the M0–M6
  baseline is protected.
- **Verification:** GitHub Actions run `34966898151` completed successfully for exact SHA
  `658ce1a6f59007f7ad9f709445b5989dd69d778b`; job `verify` succeeded in 30 seconds and
  `migration-dry-run` succeeded in 25 seconds.
- **Next:** stop at the M6 milestone boundary and await Product Owner authorization to enter M7
  Contract.

### 2026-09-15 — LOG-076 — M6 cleanup recovered and every local/live gate passed

- **Scope:** execute the Product Owner-approved recovery of the exact interrupted M6 fixture, then
  rerun M6 and the complete pre-delivery verification matrix.
- **Outcome:** removed only Student `3d5b9269-94b9-4021-a506-b9298439ebc5`, restored weekdays 5–7
  of the same isolated test Coach from `06:00–22:00` to the verified inactive sentinel, corrected
  the M6 E2E Session-detail assertion, and completed a new full run through its `finally` cleanup.
- **Verification:** post-cleanup SQL reports zero `M6 E2E %` Students, zero linked Capability Links,
  and zero `06:00–22:00` Availability fixture windows. M6 live E2E passed result
  allowlist/consent/revocation, Coach isolation, lifecycle, secure headers, fresh-slot conflict, and
  exactly-once parallel redemption. Final root check passed API 60/Web 66 tests; root build,
  `git diff --check`, linked migration dry-run, and `app_private` lint passed. The existing Vite
  > 500-kB advisory remains unchanged.
- **Next:** create/push the cohesive M6 commit and confirm GitHub Actions Verify plus
  migration-dry-run for its exact SHA.

### 2026-09-15 — LOG-075 — M6 Terra/Sol implemented; delivery paused for exact test cleanup

- **Scope:** implemented the frozen Public Capability Links contract through private-schema
  persistence, Public Access orchestration/repository/HTTP boundaries, Coach management, standalone
  Training Result and Reschedule pages, PNG export, focus refresh, service-worker exclusion, and
  responsive FORM presentation.
- **Outcome:** linked migration `20260915111114_m6_public_capability_links` is applied and its final
  dry-run is up to date. Public secrets are 256-bit base64url values stored only as SHA-256 digests;
  responses use purpose-specific allowlists, no-store/no-referrer headers, IP/token rate buckets,
  immutable Training Note consent, automatic resource-change revocation, and serializable
  exactly-once rescheduling with a `40001` loser retry to the recoverable Used state.
- **Verification:** root check passed API 16 files/60 tests and Web 15 files/66 tests; root build and
  `git diff --check` passed with only the existing >500-kB Vite advisory. Linked `app_private` lint
  found no errors. M4 and M5 isolated live regressions passed. M6 live exercised Coach isolation,
  active/revoke/reissue, tampered/wrong-purpose/consent allowlists, stale-slot refresh, and parallel
  200/409 redemption. Chrome desktop/exact 390×844 accepted long names, no overflow, PNG download,
  keyboard/Escape focus restoration, and public routing without Auth UI.
- **Known issue:** stopping the final redundant E2E rerun terminated its `finally` midway, leaving
  the clearly named isolated Student `3d5b9269-94b9-4021-a506-b9298439ebc5` and weekdays 5–7 of the
  same test Coach at the fixture window. Read-only SQL confirmed the exact residue. The requested
  cleanup mutation was denied pending explicit authorization. Supabase security advisor retains
  only the accepted leaked-password warning; performance advisor retains pre-existing notices plus
  fresh/unused M6 index and multiple-permissive-policy warnings, with no security finding.
- **Next:** obtain explicit cleanup approval, restore/delete only the verified fixture, rerun M6
  E2E through cleanup and final checks, then commit/push and observe remote Verify plus
  migration-dry-run.

### 2026-09-15 — LOG-074 — M6 Contract frozen and implementation authorized

- **Scope:** Product Owner approved the complete M6 Contract and requested continuous engineering.
- **Outcome:** [`M6-CONTRACT.md`](M6-CONTRACT.md) is frozen. Terra may implement its schema, Module,
  HTTP, Web, and evidence package, followed in order by Sol convergence and CI delivery.
- **Verification:** the approved document and exact handoff were recorded. No M6 implementation,
  migration, live/browser acceptance, commit, push, or remote CI evidence is claimed at this gate.
- **Next:** execute M6 Terra from Contract section 9; return only missing product decisions to a
  Contract amendment.

### 2026-09-15 — LOG-073 — M6 Contract prepared for approval

- **Scope:** Product Owner authorized entry into M6 Contract after confirmed M5 delivery. Inspected
  the Demo public Training/Reschedule flows, formal M4 Scheduling and M5 Training authority seams,
  current Auth/PWA routing, ADRs, and current Supabase private-schema/Data API guidance.
- **Outcome:** [`M6-CONTRACT.md`](M6-CONTRACT.md) freezes for approval two 24-hour capability
  purposes, digest-only secrets, issue/revoke/reissue rules, Training Note consent, recursive public
  allowlists, conflict-free ±3-local-day reschedule slots, single-use transactional redemption,
  rate limiting, no-store/log-redaction boundaries, exact public states/copy, responsive acceptance,
  and the Terra/Sol/CI evidence matrix. Architecture now reflects the delivered M4/M5 seams. No M6
  implementation is authorized until Product Owner approval.
- **Verification:** the M5 `5afa212`/CI `34956661567` baseline and clean starting worktree were
  observed. Targeted Prettier check and repository `git diff --check` passed after the Contract and
  Architecture/Status alignment. No schema/API/Web implementation, migration, live or browser
  write, commit, push, or remote CI evidence is claimed.
- **Next:** Product Owner reviews and approves the complete M6 Contract. Then mark it frozen and
  execute M6 Terra from section 9 without reopening settled product decisions.

### 2026-09-15 — LOG-072 — M5 Training delivered

- **Scope:** implemented the frozen M5 Contract through Terra and Sol: private Training schema,
  tenant-scoped Module/repository/HTTP operations, formal catalog bootstrap, typed Coach-scoped Web
  queries, IndexedDB draft coordination, and FORM-converged Session/Exercises/Student/Settings UI.
- **Outcome:** Coaches can manage a stable 100-item/custom Exercise Library, record and recover
  Session Training with immutable snapshots and explicit conflicts, complete/reopen Sessions, edit
  completed records, choose display units, and inspect qualified Student performance without
  exposing private notes. Dedicated-role RLS uses verified transaction-local Workspace context.
- **Verification:** root check/build, deterministic preview, linked migrations/dry-run/lint,
  security/performance advisors, M4 regression, isolated M5 live E2E, authenticated desktop, and
  exact 390×844 acceptance passed. All isolated browser/E2E fixtures were removed. The Web build
  retains the existing bundle-size advisory; leaked-password protection remains the accepted
  development warning. Commit `5afa212` is on `origin/main`; GitHub Actions CI #19 / run
  `34956661567` completed successfully with Verify and migration-dry-run green for the exact commit.
- **Next:** stop at M5. Request Product Owner authorization to begin and freeze the M6 Contract
  before implementing any public Capability Link behavior.

### 2026-09-15 — LOG-071 — M5 Contract frozen and implementation authorized

- **Scope:** Product Owner approved the complete M5 Contract and requested Sol as the implementing
  agent.
- **Outcome:** [`M5-CONTRACT.md`](M5-CONTRACT.md) is frozen. Sol may execute the required Terra,
  Sol, and CI gates continuously without reopening settled scope or skipping gate evidence.
- **Verification:** the approved document and Status handoff were updated; implementation evidence
  is not claimed at this gate.
- **Next:** Sol implements M5 Terra from Contract section 9, proves that gate, then proceeds through
  Sol convergence and CI delivery.

### 2026-09-15 — LOG-070 — M5 Contract prepared for approval

- **Scope:** Product Owner authorized entry into the M5 Contract gate. Inspected the archived
  Session/Library/Student performance flows, domain rules, catalog, and formal M4 Module seams.
- **Outcome:** [`M5-CONTRACT.md`](M5-CONTRACT.md) specifies private definitions and immutable
  snapshots, set/history rules, unit conversion, versioned operations and atomic completion,
  identity-scoped draft recovery, route copy/states, responsive acceptance, and the evidence matrix.
  Explicit formal decisions are collected in section 2; this document awaits approval to freeze.
- **Verification:** M4 baseline commits and clean starting worktree were observed; GitHub connector
  rechecked run `34947956256`, with Verify and migration-dry-run successful. Contract consistency
  review, targeted Prettier check, and `git diff --check` passed. No M5 implementation, migration,
  live/browser acceptance, commit/push, or remote CI is claimed.
- **Known issue:** Architecture section 6.2 still describes the pre-M4 starting point. M5 uses
  the delivered M4 Contract, implementation, and LOG-069 as the current dependency evidence.
- **Next:** Product Owner approves the concrete Contract, then freeze it and begin M5 Terra.

### 2026-09-15 — LOG-069 — M4 Scheduling delivered

- **Scope:** delivered the complete frozen M4 Scheduling slice after its local, live database, Demo
  preview, desktop, and exact-mobile evidence passed.
- **Outcome:** M4 is Done on `main`; the protected M0–M4 baseline now includes the dated Course
  Session read/write contract required by M5 without adding any Training data or behaviour.
- **Verification:** commit `dc83d92` pushed to `origin/main`; GitHub Actions CI #17 / run
  `34947956256` completed successfully in 58 seconds. Verify passed API 12 files/43 tests and Web 14
  files/61 tests; migration-dry-run also succeeded. The two annotations are the tracked Node 20
  action compatibility warnings, not job failures.
- **Next:** freeze the M5 Training and Exercise Library Contract; do not begin Terra before Product
  Owner approval.

### 2026-09-15 — LOG-068 — M4 Scheduling locally complete

- **Scope:** completed the frozen M4 Contract through Terra and Sol without adding M5 Training
  behaviour: schema/migration, Scheduling Module and Postgres adapter, HTTP and typed Web bindings,
  Calendar/Today/Student/Session surfaces, Demo migration preview, and the required evidence paths.
- **Outcome:** Coaches can manage dated Sessions, recurring Series and Blocks, and availability from
  Demo-converged responsive routes. UTC/IANA conversion, version-current conflicts, warning-only
  overlaps, reconciliation horizons/effective boundaries, tenant isolation, scoped cache
  invalidation, lifecycle actions, and accessibility/focus behaviour remain server-authoritative
  and covered.
- **Verification:** root check passed (API 12 files/43 tests; Web 14 files/61 tests); root builds and
  `git diff --check` passed; linked migration dry-run is up to date and linked schema lint has no
  errors. Deterministic Demo preview and isolated live M4 two-Coach E2E passed with zero residual
  test Blocks. Authenticated desktop and exact 390×844 browser acceptance passed with no horizontal
  page overflow or console errors.
- **Known issue:** the Web build retains the existing over-500-kB chunk advisory. Remote CI evidence
  is not yet claimed.
- **Next:** commit and push M4, confirm GitHub Actions Verify and migration-dry-run, then record M4
  Done and hand off M5 Contract.

### 2026-09-14 — LOG-067 — M4 Series horizon and effective-boundary delivery

- **Scope:** Product Owner amended the frozen M4 Series contract with a selected future occurrence
  boundary and bounded automatic scheduling; implemented the authorized schema, Module, private
  Postgres adapter, typed client, test, and live-evidence changes.
- **Outcome:** `effective_from_session_id` limits a Series PATCH to that own future scheduled
  occurrence and later linked scheduled occurrences; omission starts at the first future linked
  occurrence. `auto_schedule_horizon` supports `NONE`, `1_WEEK`, `2_WEEKS`, and six-month
  `MAX_WINDOW`, and reconciliation will never create beyond its rolling cap.
- **Verification:** migration `20260913164133_m4_scheduling` applied to linked development;
  live M4 two-Coach E2E passed (horizon retention, selected-boundary update, isolation, cleanup).
  API 40 tests, Web 56 tests, root build, migration dry-run, and `git diff --check` passed.
  Local Supabase lint remains intentionally skipped because the local database is not running.
- **Known issue:** M4 is not yet a delivered milestone: Sol Calendar/Today/Student interaction
  convergence, browser acceptance, remote CI, and cohesive commit/push remain.
- **Next:** perform the M4 Sol gate against the completed Terra data contract; do not add M5
  Training behaviour.

### 2026-09-14 — LOG-066 — M4 typed mutation and reconciliation binding

- **Scope:** completed the independent Terra client binding and focused state coverage around the
  existing Scheduling HTTP contract; no Sol presentation or copy was introduced.
- **Outcome:** the Web API now types Session, Series, Block, and Availability operations; successful
  mutations invalidate Coach-scoped Calendar, Today, Student, Series, and Session projections.
  Accepted Series updates now re-run authorized reconciliation and report generated IDs. Calendar
  state selection has Loading, Error, Empty, Ready, and Refreshing tests.
- **Verification:** elevated API check passed (11 files, 36 tests); elevated Web check passed
  (12 files, 56 tests); root check/build and `git diff --check` passed. Supabase `db lint` could
  not connect because the local database at `127.0.0.1:54322` is not running. No migration, live
  database, browser, push, or remote-CI result is claimed.
- **Known issue:** future-only linked-occurrence edits need a selected occurrence/anchor input not
  present in the frozen request shape; availability version readback and all live PostgreSQL,
  two-Coach, Sol, and CI evidence remain outstanding.
- **Next:** amend the Series edit request boundary, then implement and transaction-test future-only
  persistence; do not choose that boundary in Terra.

### 2026-09-14 — LOG-065 — M4 reconciliation trigger coverage

- **Scope:** completed the frozen trigger wiring for the existing transactional Series reconciler.
- **Outcome:** creating a manual Session, completing/reopening/cancelling/deleting a Session, and
  creating/correcting/deleting a Lesson Purchase now re-run authorized Student reconciliation so
  future coverage remains derived from current entitlement and future scheduled Sessions.
- **Verification:** elevated API check passed (11 files, 34 tests) and `git diff --check` passed.
- **Known issue:** M4 Terra remains in progress; future-only Series edit persistence, Student
  schedule projections, typed Web mutations, PostgreSQL live evidence, and Sol/CI gates remain.
- **Next:** implement the frozen Student schedule projections and their allowlist/isolation tests.

### 2026-09-14 — LOG-064 — M4 transactional Series reconciliation wired

- **Scope:** wired the frozen Series reconciliation planner through the private Postgres adapter and
  the authorized explicit reconcile operation; no Sol work was added.
- **Outcome:** reconciliation now takes a transaction-scoped advisory lock per Workspace/Student,
  reads current entitlement and future Sessions, inserts only the planner's required future Series
  occurrences, and returns generated IDs. The API rejects cross-Workspace Student reconciliation
  with `404`.
- **Verification:** elevated API check passed (11 files, 34 tests) and `git diff --check` passed.
- **Known issue:** M4 Terra still needs direct PostgreSQL concurrency evidence, future-only Series
  edit persistence, Student schedule projections, typed mutations, and remaining state tests.
- **Next:** implement future-only Series edit persistence and its PostgreSQL-focused tests.

### 2026-09-14 — LOG-063 — M4 Series reconciliation rule isolated

- **Scope:** continued the frozen M4 Terra Series reconciliation work at its pure-rule boundary.
- **Outcome:** added a tested reconciliation planner: it counts all future scheduled Sessions for
  entitlement coverage, fills only the positive deficit after the latest Series occurrence, never
  backfills, and produces no duplicates once its proposed rows exist. Deactivated Series generate
  nothing.
- **Verification:** API typecheck and elevated focused reconciliation tests passed (3 tests).
- **Known issue:** persistence must still call this planner under a transaction/retry lock before it
  can create occurrences; Series updates must also apply the frozen future-only edit semantics.
- **Next:** wire the planner into transactional repository reconciliation and prove concurrent-safe
  persistence before any Sol work.

### 2026-09-14 — LOG-062 — M4 Terra Series creation boundary

- **Scope:** continued the frozen M4 Terra gate with the initial fixed Schedule Series operations;
  no Sol visual, interaction, or end-user-copy work was added.
- **Outcome:** Series list/create/update HTTP operations now resolve the verified Coach Workspace.
  Series creation derives its local cadence from the Workspace IANA time zone and atomically writes
  the Coach-drawn anchor Session with the new Series. Series updates are versioned and return the
  current authorized Series under the existing `409` conflict envelope.
- **Verification:** elevated API check passed (10 files, 30 tests); elevated Web check passed
  (11 files, 51 tests); root Prettier and `git diff --check` passed.
- **Known issue:** M4 Terra remains incomplete: reconciliation and future-occurrence edits, Student
  schedule projections, complete typed mutation bindings, live migration evidence, Sol convergence,
  and the CI delivery gate are unclaimed.
- **Next:** implement future-only Series reconciliation and its idempotency/coverage tests before
  any Sol work.

### 2026-09-14 — LOG-061 — M4 Terra scheduling-boundary correction

- **Scope:** continued the frozen M4 Terra implementation without entering Sol presentation work.
- **Outcome:** Calendar availability is now projected by local date and correctly applies a date
  override (including an intentionally empty unavailable date); Session and Block create/edit
  inputs require 15-minute boundaries. Added the contracted private Session read operation and
  versioned Calendar Block deletion with single/future/all recurrence scope. The replacement
  migration now enforces that a Series-linked Session belongs to a Series in the same Workspace.
- **Verification:** elevated focused Scheduling tests passed (2 tests); elevated API check passed
  (10 files, 29 tests); elevated Web check passed (11 files, 51 tests); root build passed with only
  the existing Vite >500-kB chunk advisory; root Prettier and `git diff --check` passed.
- **Known issue:** M4 remains Terra in progress. Schedule Series creation/reconciliation, Student
  schedule projections, complete typed mutation bindings, live migration evidence, Sol convergence,
  and the CI delivery gate remain unclaimed.
- **Next:** implement the frozen Schedule Series operations and reconciliation tests before any Sol
  work.

### 2026-09-14 — LOG-060 — M4 Terra started

- **Scope:** began the frozen M4 Terra gate without reusing the removed starter.
- **Outcome:** Supabase CLI generated migration `20260913164133_m4_scheduling`; its initial schema
  preserves date-less M3 Course Sessions as legacy entitlement rows and introduces the private M4
  Scheduling tables. A separate Scheduling Module/Postgres adapter, initial private Calendar and
  Session HTTP operations, M4 schedule augmentation on Today, and a Coach-scoped Calendar
  query/state skeleton are in the worktree. Calendar date boundaries now derive from Workspace time
  zone rather than assuming UTC.
- **Verification:** API and Web TypeScript checks passed. Elevated API check passed (9 files/27
  tests) and elevated Web check passed (11 files/51 tests). These existing suites do not yet prove
  the incomplete M4 operations.
- **Known issue:** Series reconciliation, M4-specific focused tests, Student schedule projection,
  complete mutation bindings, and all Sol/CI work remain. Availability replacement now has its
  initial transaction path, but still needs its focused conflict/override tests.
- **Next:** complete the remaining frozen Terra operations and focused tests before any Sol work.

### 2026-09-14 — LOG-059 — M4 Scheduling Contract frozen

- **Scope:** Product Owner authorized the move from completed M3.5 into M4's Contract gate. The
  contract defines the replacement Scheduling model, routes, authority boundaries, interactions,
  state recovery, migration treatment, and delivery evidence without changing code or schema.
- **Outcome:** [`M4-CONTRACT.md`](M4-CONTRACT.md) freezes temporal Course Sessions, Schedule Series,
  Availability Rules/Overrides, finite recurring Calendar Blocks, warning-only conflicts,
  versioned concurrency, Calendar/Today/Student projections, exact interaction/mobile behaviour,
  and M3/M4 Today authority separation. Existing date-less M3 Course Sessions remain preserved
  legacy entitlement rows—no timestamp or location will be invented.
- **Verification:** Roadmap, Status, Architecture, M3 data seam, Demo Calendar/domain interactions,
  and the prior M4 rollback boundary were reviewed. This is a documentation-only Contract gate;
  no implementation, migration, browser, live, push, or remote CI result is claimed.
- **Next:** execute M4 Terra only as frozen; return any required product/visual/copy decision to a
  new Contract amendment.

### 2026-09-13 — LOG-058 — M3.5-A5 delivered; M3.5 complete

- **Scope:** pushed the A5 product-convergence commit and checked its exact GitHub Actions run.
- **Outcome:** commit `e403170` is on `origin/main`; M3.5 is complete. All currently supported
  M0–M3 Web surfaces have passed their A5 product/interaction convergence and CI delivery without
  adding a Scheduling model, Course Session calendar operation, or fake unavailable feature.
- **Verification:** GitHub Actions CI #14 / run `34766425884` completed successfully. `verify`
  succeeded (API 9 files/27 tests; Web 11 files/51 tests), and `migration-dry-run` succeeded.
- **Next:** freeze M4's complete Scheduling Contract; do not implement M4 before it defines the
  replacement model, projections, interactions, concurrency, and migration boundary.

### 2026-09-13 — LOG-057 — M3.5-A5 Sol and local integration complete

- **Scope:** converged the supported-data Auth, Shell, Today, Student, Student Detail, and Settings
  surfaces without changing the API, database, authorization, query contract, or M4 boundary.
- **Outcome:** unavailable Calendar, lesson, and Exercise routes now state only `此功能尚未提供。`;
  Today and Settings remove implementation-facing labels; the Create-Student and Purchase editor
  now preserve the existing modal scroll lock, Escape dismissal, and opener-focus return. The
  existing reduced-motion rule and destructive-confirmation focus were revalidated.
- **Verification:** focused elevated Web check passed (11 files/51 tests). Full root check passed
  (API 9 files/27 tests; Web 11 files/51 tests); root build passed with only the existing Vite
  over-500-kB advisory; `git diff --check` passed; migration dry-run is up to date; linked advisors
  report only the accepted development `auth_leaked_password_protection` warning. Live M3 E2E
  passed two-Coach isolation/Today allowlist and deleted its isolated Student. Browser acceptance
  passed at 1440×675 and exact 390×844 with no console errors: Auth, Today, Settings, Students,
  unavailable-route boundary, mobile Settings/navigation, modal Escape/focus restoration, and
  destructive-confirmation initial focus all passed.
- **Next:** create/push the cohesive A5 commit and confirm remote Verify plus migration-dry-run.

### 2026-09-13 — LOG-056 — M3.5-A5 Contract frozen

- **Scope:** Product Owner authorized the final M3.5 package. The Contract inventories Auth, Shell,
  Today signals, Students, Student Detail, Settings, and unavailable-route boundaries against the
  archived Demo without changing production code, API, schema, or Scheduling ownership.
- **Outcome:** A5 is strictly a Sol presentation/interaction convergence followed by CI delivery;
  its exact copy, focus, modal, cached-refresh, reduced-motion, desktop, and 390×844 acceptance
  rules are frozen in [`M3.5-A5-CONTRACT.md`](M3.5-A5-CONTRACT.md). Calendar, lesson, Exercise,
  and public-capability work remains M4–M6 and is represented only by the honest static boundary.
- **Verification:** documentation comparison against the Demo/formal supported-route boundary is
  complete. Formatting and Git whitespace checks are required before recording Contract evidence;
  no product implementation, browser, live, migration, commit, push, or remote CI evidence is
  claimed yet.
- **Next:** Sol implements only the frozen A5 Contract, then completes M3.5 CI delivery.

### 2026-09-13 — LOG-055 — M3.5-A4 delivered

- **Scope:** pushed the cohesive M3.5-A4 Today-signal implementation and checked the exact commit's
  GitHub Actions run.
- **Outcome:** commit `ae6b764` is on `origin/main`; A4 is delivered with no Scheduling schema,
  Course Session operation, calendar behaviour, or M4-dependent UI.
- **Verification:** GitHub Actions CI #13 / run `34764878712` completed successfully in 57 seconds;
  Verify reported API 27/27 and Web 51/51, and migration-dry-run completed successfully.
- **Next:** freeze the M3.5-A5 product-convergence Contract; keep all Scheduling-dependent work in
  M4 or later.

### 2026-09-13 — LOG-054 — M3.5-A4 Sol and local integration complete

- **Scope:** converged the M3-only Today signal surface on the existing FORM workbench language and
  completed its local integration matrix. Corrected amount display to preserve the existing
  minor-unit presentation and formatted the server-owned local date without a second time-zone
  conversion.
- **Outcome:** desktop presents a restrained three-signal strip and entitlement worklist; exact
  390×844 stacks the cards above the safe-area bottom navigation. Zero signals remain a Ready state,
  attention items are keyboard links, and no copy implies Course Session or Calendar facts.
- **Verification:** root check passed (API 9 files/27 tests; Web 11 files/51 tests); root build passed
  with only the existing over-500-kB Vite advisory; migration dry-run is up to date; linked
  `app_private` schema lint found no errors; live M3 E2E verified Today allowlist/two-Coach isolation
  and deleted its isolated Student. Desktop 1440×675 and exact 390×844 browser acceptance passed,
  with no horizontal overflow or console errors and keyboard focus reaching mobile Settings/nav.
- **Next:** create/push the cohesive A4 commit and confirm remote Verify plus migration-dry-run.

### 2026-09-13 — LOG-053 — M3.5-A4 Today signals Terra locally complete

- **Scope:** implemented the frozen M3-only Today projection without a migration or Scheduling
  interface. The server derives Workspace time zone/current local month and returns only active
  Student count, per-currency recorded income, and active Student low/negative-balance attention.
- **Outcome:** `/today` now uses a Coach-scoped, memory-only TanStack Query with Loading, Error,
  Ready, and cached Refreshing boundaries. Student, Purchase, and Workspace-time-zone changes
  invalidate it. The screen contains no Course Session, Calendar, location, conflict, availability,
  Training, or no-sessions assertion.
- **Verification:** API typecheck passed; elevated API tests passed (9 files, 25 tests); elevated Web
  check passed (9 files, 45 tests); `git diff --check` passed. No root build, live/browser,
  migration dry-run, commit, push, or remote CI evidence is claimed yet.
- **Next:** Sol performs desktop/exact-390×844 acceptance, then run the A4 CI delivery gate.

### 2026-09-13 — LOG-052 — M3.5-A4 scope corrected and Contract frozen

- **Scope:** Product Owner explicitly ruled that every capability requiring M4 must remain in M4 or
  later. The former A4 Today schedule projection therefore could not proceed against the preserved
  M3 entitlement-only Course Session schema.
- **Outcome:** A4 is now a server-owned M3 signal projection for active Students, local-calendar-
  month income by currency, and active Student low/negative lesson-balance attention only. It has no
  date/time-based Course Session facts, session counts/rows, location, conflicts, availability, or
  no-sessions assertion. M4 now owns the complete Today schedule projection after its Scheduling
  Contract freezes the required Course Session model.
- **Verification:** Demo/formal route and M3 schema boundary were rechecked. The Contract and
  Roadmap amendment require documentation formatting and whitespace verification; no Terra, Sol,
  API, schema, browser, migration, commit, push, or CI evidence is claimed.
- **Next:** Terra implements only [`M3.5-A4-CONTRACT.md`](M3.5-A4-CONTRACT.md).

### 2026-09-13 — LOG-051 — M3.5-A3 Student parity delivered

- **Scope:** delivered the approved existing-data Student roster/detail parity contract without
  adding Scheduling or Training data. Added server-owned roster entitlement summaries, versioned
  Purchase correction, active/archive/search states, and Demo-led Student detail composition.
- **Outcome:** desktop uses a restrained Coach workbench; exact 390×844 uses PWA-style sticky tools,
  compact tap-first Student rows, fixed safe-area bottom navigation, route scroll reset, and mobile
  bottom sheets. Dialogs lock background scroll, close with Escape, and return focus to their
  opener. Purchase corrections preserve recoverable conflict state and refresh affected
  projections.
- **Verification:** root check passed (API 24 tests; Web 45 tests), root build passed with only the
  existing over-500-kB Vite advisory, linked migration dry-run is up to date, M3 two-Coach live E2E
  passed and removed its isolated Student, database lint found no schema errors, and the Git
  whitespace check passed. Supabase advisors show the accepted leaked-password warning plus two existing
  development-only unused Workspace indexes. Fresh desktop and exact 390×844 browser acceptance
  passed with no horizontal overflow or console errors; Purchase editor focus/Escape restoration
  also passed.
- **Delivery:** commit `26bc036` pushed to `origin/main`; GitHub Actions CI #11 / run `34706580673`
  completed successfully with Verify and migration-dry-run jobs green. The run reported only the
  hosted Node 20 action compatibility warnings already tracked above.
- **Next:** freeze the M3.5-A4 Today projection Contract before implementation.

### 2026-09-13 — LOG-050 — M3.5-A3 Terra data boundary in progress

- **Scope:** implemented the frozen A3 Purchase version migration, server-owned roster entitlement
  projection, versioned Purchase update/delete Module, repository, HTTP, and typed query bindings.
- **Outcome:** `lesson_purchase.version` initializes historical rows to `1`; successful corrections
  increment only that Purchase; stale corrections return an authorized current Purchase under `409`.
  The roster derives each Student's lesson summary server-side. No scheduling fields or projections
  were added.
- **Verification:** elevated API check passed (22 tests), Web check passed (38 tests), and focused
  Student Module correction/summary test passed (5 tests). `git diff --check` passed.
- **Next:** finish the frozen semantic roster/detail state bindings and focused HTTP/Web evidence;
  do not begin Sol convergence or declare A3 Terra complete.

### 2026-09-13 — LOG-049 — M3.5-A3 Contract gate frozen

- **Scope:** froze the existing-data Student roster/detail and Lesson Purchase correction contract
  against the archived Demo, with explicit Product Owner approval to defer nearest future session
  and dated Course Session history to M4.
- **Outcome:** A3 adds only a roster entitlement summary, editable versioned Purchase ledger, and
  the corresponding tenant-safe route states. The preserved M3 `course_session` schema has only a
  Student reference and status, so no date/time-based session projection is invented or represented
  as available. No Scheduling, Training, schema, API, or product implementation changed at this
  gate.
- **Verification:** documentation consistency review and `git diff --check` remain required before
  the Contract documentation delivery is recorded. No Terra, Sol, browser, live, migration, commit,
  push, or CI evidence is claimed.
- **Next:** Terra implements only [`M3.5-A3-CONTRACT.md`](M3.5-A3-CONTRACT.md); Sol then performs
  the specified product convergence.

### 2026-09-12 — LOG-048 — M3.5-A2 App Shell, Auth, and Settings correction locally complete

- **Scope:** implemented the frozen A2 Contract without a schema, API, Auth-configuration, or M4+
  feature change.
- **Outcome:** mobile now has one masthead, Settings remains reachable from it, and the four primary
  workflows remain in the bottom navigation. Shell identity consistently uses Workspace display name
  with Email/Coach fallbacks and no longer claims a connection or sync state. Settings now isolates
  Workspace profile, account security, and deletion-lifecycle loading/error/retry states; destructive
  dialogs focus `DELETE`, close with Escape, and return focus to their trigger.
- **Verification:** focused Web check passed (38 tests); full root check passed (API 22 tests and
  Web 38 tests); root build passed with the existing over-500-kB Vite advisory; linked migration
  dry-run was up-to-date; advisors report only the accepted
  `auth_leaked_password_protection` warning. Live browser acceptance passed on desktop and exact
  390×844: one header, Settings header access, four-item bottom navigation, no horizontal overflow,
  and destructive-dialog focus/Escape behaviour.
- **Known issue:** the initial sandbox Web check/dev-server and advisors command hit the known
  Windows `spawn EPERM`/telemetry restriction; the approved elevated reruns passed.
- **Delivery:** commit `60a85c0` pushed to `origin/main`; GitHub Actions CI #9 / run
  `34690180698` completed successfully with Verify and migration dry-run jobs green.
- **Next:** freeze M3.5-A3 before implementation.

### 2026-09-12 — LOG-047 — M3.5-A2 Contract gate frozen

- **Scope:** froze App Shell, Auth, and Settings correction against the archived Demo without
  changing the approved Roadmap, API, schema, Auth configuration, or implementation.
- **Outcome:** the Contract removes the duplicate mobile masthead, fixes identity source/fallback,
  omits unprovable connection claims, isolates three Settings state boundaries, and preserves
  six-digit OTP plus account-lifecycle operations.
- **Verification:** documentation consistency review, targeted Prettier, and `git diff --check`
  passed; no product code, browser acceptance, commit, push, or CI has been run for A2.
- **Next:** Terra implements only [`M3.5-A2-CONTRACT.md`](M3.5-A2-CONTRACT.md), then hands the
  semantic states to Sol.

### 2026-09-12 — LOG-045 — M3.5-A1 route and state foundation implemented locally

- **Scope:** moved authenticated App Shell routing into `app-shell/`; introduced route entry/query
  modules for Students and Settings; extracted shared primitives, Coach-scoped key factory, and
  tested route-state selectors without changing API operations or cache semantics.
- **Outcome:** first-load, cached-refresh, Error, Empty, Not Found, and Ready state selection is
  explicit for the currently supported Student surfaces. Students and Settings retain their existing
  query/mutation invalidation and recoverable input behaviour.
- **Verification:** root format/API check, focused Web check (31 tests), Web production build, and
  `git diff --check` passed. Vite emitted its existing over-500-kB single-chunk advisory only.
- **Delivery:** commit `4fce971` pushed to `origin/main`; GitHub Actions CI #7 / run `34689160129`
  completed successfully. M3.5-A1 is Done.
- **Next:** freeze and execute M3.5-A2.

### 2026-09-12 — LOG-046 — Abandoned M4 starter removed

- **Scope:** remove the unstarted M4 Scheduling adapter, Module, HTTP operations/tests, and original
  migration; preserve M3 entitlement behaviour.
- **Outcome:** remote migration history marked `20260911053840` reverted and development rollback
  `20260912103452_remove_unstarted_m4_scheduling_core` applied. M4 now correctly remains Not started.
- **Verification:** migration list aligns local/remote; dry-run is up-to-date; advisors show only the
  pre-existing leaked-password-protection warning.
- **Next:** deliver M3.5-A1 as one cohesive non-M4 commit.

### 2026-09-12 — LOG-044 — Product-led Roadmap and architecture reset

- **Scope:** encode the approved frontend gap analysis and four-gate delivery model without changing
  application code, schema, Demo data, or completed M0–M3 evidence.
- **Outcome:** Roadmap rebuilt around M3.5 Stage A and redesigned M4–M8 gates; Architecture now
  defines route projections/state boundaries and protected Module seams; Agent rules now enforce
  the Terra/Sol boundary; Status compressed and aligned to M3.5-A1.
- **Verification:** targeted Prettier check and repository-wide `git diff --check` passed; only
  Git's existing LF-to-CRLF notices were emitted.
- **Next:** execute M3.5-A1 from the handoff above.

### Recent delivery ledger

| Date          | Log         | Durable result                                                                                                                               |
| ------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-12    | LOG-043     | Settings information architecture and account-safety correction added in worktree; independent panel recovery remains a documented M3.5 need |
| 2026-09-12    | LOG-042     | M3.5 query-cache cleanup completed; Coach-scoped memory/cache-clearing rules retained                                                        |
| 2026-09-11    | LOG-041     | TanStack Query route-cache baseline added in worktree with 30-second freshness, revalidation, prefetch, and invalidation                     |
| 2026-09-11    | LOG-040     | Formal App Shell and M0–M3 route alignment added; responsive/product gaps carried into M3.5                                                  |
| 2026-09-11    | LOG-039     | Demo-aligned formal Web delivery rule established                                                                                            |
| 2026-09-11    | LOG-038     | Double-click Windows launcher added; runtime launch remained unverified                                                                      |
| 2026-09-11    | LOG-037     | Scheduling core migration/API delivered to development; 26 API tests/build and advisors passed; M4 remained incomplete                       |
| 2026-09-11    | LOG-036     | M3 commit `c55a95d` pushed; Actions run `34565338417` succeeded                                                                              |
| 2026-09-10–11 | LOG-031–035 | M3 Student/Lesson slice, manual income, Demo preview, live isolation, desktop and 390px acceptance completed                                 |
| 2026-09-10    | LOG-030     | Remote GitHub Actions evidence made mandatory for milestone completion                                                                       |
| 2026-09-09–10 | LOG-013–029 | M2 identity, settings, account lifecycle, six-digit OTP, Edge Function/cron, live acceptance, commit and CI completed                        |
| 2026-09-08–09 | LOG-005–012 | M1 runtime, tenant-isolation E2E, private schema/migration workflow, remote baseline and CI completed                                        |
| 2026-09-08    | LOG-001–004 | Demo archive, formal repository/bootstrap, architecture and clean M0 baseline established                                                    |

Historical detail remains available in Git history. The ledger preserves delivery dates, decisions,
evidence, and unresolved risks without using this status file as a second Roadmap.

## Status update protocol

After an authorized package:

1. Update Last verified, Current snapshot, milestone state, risks, and exact evidence.
2. Replace Next handoff with one executable package from the approved Roadmap.
3. Prepend one Engineering log entry containing Scope, Outcome, Verification, Known issue if any,
   and Next.
4. Record remote run/commit identifiers only after observing successful completion.
5. Keep historical facts while compressing resolved repetition; never rewrite an incomplete check as
   passed.
