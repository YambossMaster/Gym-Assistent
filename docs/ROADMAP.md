# Gym Assistant engineering roadmap

> Baseline: v2 — approved 2026-09-12. M0–M3 remain complete; corrective work belongs to M3.5.

This document is the sole source of truth for product scope, delivery order, Module interfaces, and
completion criteria. Live progress and evidence belong in [`PROJECT_STATUS.md`](PROJECT_STATUS.md).

## 1. Product direction

Gym Assistant gives an independent private Coach a calm, complete operating surface for students,
lesson entitlement, scheduling, training records, and narrowly scoped Student access.

The archived [`demo/`](../demo/) is the validated product reference for information architecture,
interaction behaviour, visual hierarchy, responsive composition, and product tone. It is not the
production persistence implementation. Formal data remains server-authoritative.

Priorities, in order:

1. Preserve completed Auth, API, Edge Function, database, authorization, App Shell, and query-cache
   assets.
2. Make each Coach workflow complete and understandable at its route before expanding infrastructure.
3. Derive official data and transitions in backend Modules; expose screen-shaped projections instead
   of table-shaped CRUD.
4. Preserve tenant isolation, private-note safety, concurrency correctness, and recoverability.
5. Finish visual and language quality before declaring a feature complete.

## 2. Non-negotiable decisions

- One authenticated Coach owns one private Workspace. V1 has no multi-Coach Workspace.
- A Student has no account. Public access uses an expiring, resource-scoped Capability Link.
- V1 excludes injury history, medical information, body fat, and body weight.
- Lesson Purchase grants entitlement and may record Coach-entered received income. It is not online
  payment. Amounts use integer minor units plus ISO currency.
- Remaining lessons are `purchased lessons - completed Course Sessions`. Low and negative balances
  remain visible and are never silently repaired.
- Schedule conflicts are warnings. The system does not silently block, move, cancel, or repair a
  Coach decision unless a later approved rule explicitly requires it.
- PostgreSQL is the system of record. Browser storage is limited to Auth session, in-memory query
  cache, recoverable drafts, pending operations, and UI preferences.
- The browser never supplies `workspaceId` and never receives database, service-role, or Auth-admin
  credentials.
- Private Coach notes never enter a public projection. A Training Result link may include one
  session note only through an explicit per-link opt-in.
- Web/PWA ships first for Taiwan. Default time zone is `Asia/Taipei`; stored instants are UTC.
- Microservices, Kubernetes, Kafka, CQRS, Event Sourcing, multi-region deployment, native packaging,
  and online payments are outside V1.

## 3. Delivery model: four gates

Every M3.5–M8 work package passes four gates in order. A later gate may return the package to an
earlier gate; no gate may be skipped.

### Gate 1 — Contract

**Owners:** Product Owner + Sol.

Before implementation, freeze:

- the Coach or Student job-to-be-done and owning route;
- Demo behaviours to preserve and deliberate deviations;
- data model, Module interface, HTTP operation, authorization, and concurrency rules;
- Loading, Error, Empty, Ready, Refreshing, Mutating, and Conflict states where applicable;
- approved product-copy intent and the UI slots that must display it;
- desktop and 390px acceptance path;
- automated, database, migration, and E2E evidence required for completion.

**Exit criterion:** a Terra agent can implement data flow without making a product, visual, or copy
decision.

### Gate 2 — Terra engineering

**Owner:** Terra.

Terra implements only the frozen contract:

- schema, migration, Module implementation, adapters, HTTP operations, Edge Functions, and tests;
- query keys, typed route loaders, mutations, cache invalidation, and authorization-safe prefetch;
- semantic, unstyled route skeletons that expose every contracted state and data slot;
- deterministic test fixtures and acceptance hooks.

**Hard limit:** Terra does not choose layout, spacing, color, typography, motion, responsive
composition, interaction styling, or end-user wording. Terra inserts only copy explicitly supplied
by the Contract gate. If a required decision is missing, Terra stops that affected surface and
reports the missing contract instead of inventing one.

**Exit criterion:** all data reaches the correct route state through typed interfaces; domain,
adapter, HTTP, authorization, and focused Web tests pass.

### Gate 3 — Sol product convergence

**Owners:** Product Owner + Sol.

Sol compares the working feature with the Demo and completes:

- visual hierarchy, layout, responsive composition, Tailwind/CSS implementation, and shared UI
  primitives;
- keyboard, pointer, touch, focus, modal, scroll, and transition details;
- exact Coach-facing or Student-facing copy;
- accessible names, announcements, reduced-motion behaviour, and destructive-action emphasis;
- desktop and exact 390×844 manual acceptance.

Sol may request a Contract correction when the intended experience exposes a missing projection or
operation. Sol does not move official business rules into the browser to work around a backend gap.

**Exit criterion:** the complete route is product-ready, not merely wired.

### Gate 4 — CI delivery

**Owner:** integrating engineering agent.

- Run root `npm run check` and `npm run build`.
- Run milestone-specific live E2E and migration preview/dry-run.
- Run `git diff --check` and relevant Supabase advisors.
- Update `PROJECT_STATUS.md` and prepend an Engineering log entry.
- Create a cohesive milestone or work-package commit, push it to the shared branch, and confirm the
  GitHub Actions verify and migration-dry-run jobs for that commit.

**Exit criterion:** local evidence, remote evidence, documentation, and next handoff all agree.

### How the gates map to the three development stages

- **Stage A — Gap Filling:** M3.5 repairs the audited M0–M3 product-surface gaps while preserving
  the completed foundation. Its individual packages still pass Contract, Terra, Sol, and CI.
- **Stage B — Future Features:** M4–M8 begin only from a frozen Contract. Terra builds the required
  backend, Edge Function, migration, tests, query binding, and semantic unstyled frontend skeleton.
- **Stage C — Visual and experience convergence:** Product Owner and Sol take each Stage B skeleton
  through final Tailwind/CSS, interaction detail, responsive behaviour, accessibility, and exact
  end-user wording. This happens per feature before its CI gate, not as one risky redesign at the end
  of the project.

Stage labels describe responsibility and intent; the four gates are the mandatory delivery order.

## 4. Frontend route contract

Authenticated Coach routes retain the Demo's separation:

| Route           | Product responsibility                                                                        | Required primary states                                                         |
| --------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `/today`        | Daily overview, session flow, lesson/income signals, actionable attention                     | Loading, partial Error, no-sessions Empty, Ready, Refreshing                    |
| `/calendar`     | Agenda/day/week/month scheduling, availability, blocks, conflicts                             | Loading, Error, no-items Empty, Ready, Mutating, Conflict                       |
| `/students`     | Active/archive roster, search, entitlement and next-session summary                           | Loading, Error, first-student Empty, filter Empty, search Empty, Ready          |
| `/students/:id` | Student identity, entitlement, private context, fixed rhythm, history, performance, purchases | Loading, Not Found, Error, section Empty, Ready, Mutating, Conflict             |
| `/sessions/:id` | One Course Session and its Training Record                                                    | Loading, Not Found, Error, no-exercises Empty, Ready, Saving, Offline, Conflict |
| `/exercises`    | Exercise library, filters, favourites, custom definitions                                     | Loading, Error, library Empty, filter Empty, Ready, Mutating                    |
| `/settings`     | Coach profile, workflow defaults, account security, data lifecycle                            | Panel Loading, panel Error, Ready, Mutating, destructive confirmation           |

Unauthenticated public routes live outside the Coach Auth gate:

| Route       | Product responsibility                          | Required primary states                                                                                  |
| ----------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `/t/:token` | Read one allowlisted Training Result projection | Loading, network Error, invalid/expired/revoked, Ready                                                   |
| `/r/:token` | Select and redeem one reschedule capability     | Loading, network Error, invalid/expired/revoked/used, no-slots Empty, Ready, Mutating, Conflict, Success |

Every server-data route uses Coach-scoped TanStack Query keys. A first load may use a skeleton;
background refresh keeps readable cached data visible. A section with no records is Empty, not Error.
Not Found/unauthorized terminal states are distinct from recoverable transport failures. Mutations
expose pending, success, validation failure, and version conflict without discarding recoverable
form state.

## 5. Milestone plan

### M0 — Repository and product contract — Done

Preserved the complete Demo in `demo/`, established formal workspaces and vocabulary, froze
`form-coach-mvp-v1`, and created Roadmap/Status/ADR handoff discipline.

### M1 — Cloud foundation tracer — Done

Established Supabase Auth/PostgreSQL, private-schema access, verified identity-to-Workspace
derivation, tenant-isolated Student tracer operations, real two-Coach E2E, migration workflow, and
remote CI.

### M2 — Coach account operations — Done

Delivered public self-registration, six-digit Email OTP, Email/password and Google Auth, recovery,
Workspace settings, session handling, reversible 14-day deletion, immediate deletion, 365-day
inactivity deletion, Edge Function/cron execution, and live acceptance.

### M3 — Student and Lesson entitlement — Done

Delivered versioned Student create/update/archive/delete, Lesson Purchase creation, derived lesson
balance, manual-income summary, Demo migration preview/checksum, tenant isolation, responsive
acceptance, and remote CI.

M0–M3 remain closed. Product-surface corrections discovered after delivery belong to M3.5; their
completed implementation and evidence are not discarded or rerun without cause.

### M3.5 — Stage A: frontend gap filling — In progress

**Purpose:** make all currently supported M0–M3 capabilities feel like one intentional product and
establish the frontend contracts that M4+ must follow.

**Preserved inputs:** existing Auth and account lifecycle, Student/Lesson Modules, App Shell routes,
TanStack Query cache, PWA shell, and completed tests. M4 Scheduling begins only from a future frozen
Contract; no Scheduling starter is retained.

#### M3.5-A0 — Audit and contract calibration — Done

- Audited every Demo route against the formal Web at desktop and 390px.
- Classified gaps by M3.5 versus M4–M7 ownership.
- Approved this Roadmap, Architecture, Status, and Agent-rule reset.

#### M3.5-A1 — Route modules and state foundation

- Split formal `coach-workspace.tsx` route implementations into route-owned modules without changing
  current HTTP behaviour or query semantics.
- Keep shared App Shell, route-state primitives, modal primitives, formatters, and query-key factory
  behind small interfaces.
- Preserve Coach-scoped in-memory cache, 30-second fresh window, background revalidation,
  authorized detail prefetch, mutation invalidation, and Auth-session cache clearing.
- Add focused tests for each route's first-load, cached-refresh, Error, Empty/Not Found, and Ready
  selection logic.

**Acceptance:** no `useEffect`-managed server request state; no private response persistence; current
M0–M3 operations behave identically after the split.

#### M3.5-A2 — App Shell, Auth, and Settings correction

- Remove the duplicated mobile masthead and keep Settings reachable from the mobile header while the
  bottom navigation remains focused on primary Coach workflows.
- Derive Coach name and avatar consistently from Workspace settings with an Email fallback.
- Replace static connection/sync claims with truthful query/network state or omit them.
- Keep existing Auth and account-lifecycle operations; give Workspace settings and account lifecycle
  independent panel Loading/Error/Ready states so one failure does not blank the whole route.
- Keep M4/M5/notification settings out until their owning data contracts exist.

**Acceptance:** Auth remains six-digit and functional; Settings and App Shell pass desktop and
390×844 navigation, focus, destructive-confirmation, and no-overflow checks.

#### M3.5-A3 — Student roster and detail parity for existing data

**Data additions**

- Extend `GET /v1/students` additively with `lessonSummary` for each Student; retain existing
  Student fields and tenant derivation. Nearest future `nextSession` is deferred to M4: the M3
  Course Session schema intentionally has no date/time fields.
- Keep `GET /v1/students/:studentId` to Student identity/private context, entitlement, and Purchase
  ledger. Dated Course Session history and nearest future session are deferred to M4 with its
  scheduling projection; do not add Training performance or Schedule Series here.
- Add versioned Lesson Purchase correction operations:
  - `PATCH /v1/students/:studentId/lesson-purchases/:purchaseId`
  - `DELETE /v1/students/:studentId/lesson-purchases/:purchaseId`
- Add Lesson Purchase `version` only through an explicit migration and optimistic-concurrency error
  contract. Preserve historical rows and derived balances.

**Route behaviour**

- Restore active/archive views, search-specific Empty state, lesson progress, and low/negative
  warning on `/students`; M4 will add the next-session summary.
- Recompose `/students/:id` around Student identity, entitlement, private context, and an editable
  Purchase ledger; M4 will add dated Course Session history.
- Preserve the existing create-Student operation. Initial Purchase may be offered after Student
  creation; fixed-rhythm onboarding waits for M4 rather than faking a cross-Module operation.
- Keep private notes Coach-only and retain explicit destructive confirmation.

**Acceptance:** two-Coach list/detail/purchase isolation, stale-version rejection, balance
recalculation, archive visibility, cache invalidation, first/filter/search Empty states, desktop, and
390×844 all pass.

#### M3.5-A4 — Today signals from supported M3 data

Add `GET /v1/today` returning one screen projection from existing M3 authority only:

```text
date, timeZone
summary: activeStudents, incomePeriod, incomeByCurrency, attentionCount
attention: lowLessonBalance items with target routes
```

- The backend derives Workspace, the current local date, and the local calendar-month income period
  from verified identity and Workspace time zone. The browser supplies neither a Workspace nor a
  date, so it cannot turn the current overview into an unverified historical report.
- The projection contains no Course Session, `scheduled`/`completed` count, start/end time,
  location, training-plan state, schedule conflict, availability, block, or no-sessions claim.
  Those facts need M4's Course Session calendar contract and remain M4-owned.
- Active-student count and low/negative lesson-balance attention use the existing Student/Lesson
  authority. Income is explicitly local-calendar-month scoped and grouped by ISO currency; no Demo
  seed count or amount becomes production data.
- `/today` becomes a calm current-workspace signal surface. It must not imply that the absence of a
  schedule projection means the Coach has no lessons today.

**Acceptance:** Workspace time-zone month edges, multi-currency income, active-only low/negative
balances, tenant isolation, cached refresh, desktop, and 390×844 pass. Course-session and conflict
acceptance belongs to M4.

#### M3.5-A5 — Product convergence and delivery

- Sol performs the complete supported-data comparison for Auth, Shell, Today signals, Students,
  Student Detail, and Settings. The Demo's schedule flow on Today remains an M4 input, not an M3.5
  imitation.
- Remove developer/roadmap language from rendered UI.
- Verify keyboard, focus, modal dismissal, reduced motion, destructive actions, cached navigation,
  and exact 390×844 width.
- Run the complete Gate 4 delivery and remote CI.

**M3.5 completion criterion:** all supported M0–M3 surfaces pass the four gates; deferred M4–M7
features are absent or honestly unavailable, never represented by fake controls or fake data.

### M4 — Scheduling

**Dependency:** M3.5 complete.

**Starting point:** M3 retains only entitlement-relevant `course_session` ownership and status.
The abandoned Scheduling schema, adapters, operations, and projections were intentionally removed.
M4 begins only after its Contract freezes the complete replacement; it does not reuse a discarded
starter or invent dates for historical entitlement rows.

#### Contract gate

- Freeze Calendar agenda/day/week/month behaviours, visible time range, click/drag thresholds,
  mobile alternatives, session status language, conflict presentation, and header-scroll behaviour.
- Freeze Schedule Series reconciliation: generate only future scheduled sessions needed to cover
  remaining entitlement, never backfill the past, preserve a calendar-drawn first occurrence, and
  remain idempotent.
- Freeze availability add/remove semantics, date override, recurring Calendar Block edit scope, and
  version-conflict recovery choices.
- Freeze the complete Today schedule projection: local-day range, ordered Course Sessions,
  scheduled/completed counts, locations, conflict attention, no-sessions state, and the interaction
  between that projection and the M3.5-A4 supported-data signals. Training-plan state remains M5.

#### Terra gate

- Complete read projections and CRUD/transition operations for Calendar, Schedule Series,
  Availability Rule/Override, and Calendar Block.
- Implement reconciliation and recurring-block scope transactionally.
- Bind `/calendar` and fixed-rhythm sections to typed state skeletons with no visual or copy choices.
- Add the M4-owned `GET /v1/today?date=YYYY-MM-DD` schedule projection and merge it with the
  M3.5-A4 signals without duplicating Student/Lesson authority.
- Provide Demo migration preview with counts, conflicts, rejected items, and checksum.

#### Sol gate

- Reproduce and refine the Demo calendar interaction, density, statuses, warnings, responsive
  behaviour, and fixed-rhythm experience.
- Converge Today on the Demo's daily-flow hierarchy only after the M4 schedule data is available.
- Validate pointer, touch, keyboard, scrolling, direct manipulation, modal, and conflict recovery.

#### CI gate

- Prove all Demo scheduling invariants, two-device conflicts, tenant isolation, idempotent
  reconciliation, migration dry-run, desktop, 390×844, and remote CI.

### M5 — Training and Exercise Library

**Dependency:** M4 Course Session read contract; schema changes remain serialized with M4.

#### Contract gate

- Freeze `exercise_definition`, `training_record`, `training_exercise`, and `training_set`
  contracts.
- Preserve stable definition identity plus exercise snapshots, weight/reps metric, kg/lb conversion,
  completed-set qualification, previous/personal-best semantics, and no-history defaults.
- Freeze Session autosave, offline draft, leave-page flush, completion/reopen, performance trend,
  exercise picker, and Exercise Library interactions.

#### Terra gate

- Implement versioned Training operations, Exercise Library operations, history/performance
  projections, and conflict contracts.
- Bind `/sessions/:id`, `/exercises`, and the Student performance section to semantic state
  skeletons.
- Preserve recoverable drafts without making them official until the server accepts them.

#### Sol gate

- Complete Session Workspace, set-entry ergonomics, result controls, autosave feedback, performance
  charts, picker/filter experience, and responsive layout from the Demo.

#### CI gate

- Prove completed-set gating, unit conversion, identity matching, autosave/flush, offline recovery,
  multi-device conflict, private-note safety, desktop, 390×844, and remote CI.

### M6 — Public Capability Links

**Dependencies:** M4 for rescheduling; M5 for Training Result.

#### Contract gate

- Freeze `capability_link`: purpose, resource, token hash, expiry, revocation, use, and optional
  Training Note consent.
- Freeze allowlisted public projections and valid, invalid, expired, revoked, used, no-slot,
  conflict, and success experiences.

#### Terra gate

- Implement issuance, revocation, reissue, read projection, slot projection, and single-use
  redemption with rate limiting and transactional revalidation.
- Mount `/t/:token` and `/r/:token` outside Coach Auth with semantic state skeletons.
- Keep raw tokens out of storage, logs, analytics, and error reports.

#### Sol gate

- Complete the standalone Student-facing Training Result, image download, reschedule picker, terminal
  states, responsive layout, and final copy.

#### CI gate

- Prove valid/expired/revoked/used/tampered cases, parallel redemption, payload allowlists,
  private-note exclusion, Coach refresh after public mutation, mobile acceptance, and remote CI.

### M7 — Local resilience and Demo migration

**Dependency:** target schemas for M3–M6 are stable.

#### Contract gate

- Freeze which drafts, pending operations, query cache, and UI preferences may persist locally.
- Freeze idempotency, retry, cancel, partial-success, conflict, backup, preview, import, and rollback
  experiences.

#### Terra gate

- Implement IndexedDB adapters and operation queues without changing official server authority.
- Implement Demo export → validate → preview → import in this order: settings/exercises/students,
  purchases, training, scheduling, capability links.
- Preserve `form-coach-mvp-v1` and its backup until explicit user confirmation permits cleanup.

#### Sol gate

- Complete offline, retry, conflict, import-preview, progress, rejection, and recovery experiences.

#### CI gate

- Prove interruption/reconnection, duplicate submission, partial success, stale version, rerunnable
  import, backup recovery, desktop/mobile operation, and remote CI.

### M7.5 — Pre-deployment product hardening and acceptance

**Dependency:** M7 is complete. M8 deployment and Beta infrastructure have not started.

**Purpose:** run a Product Owner-led, route-by-route pre-deployment review of the complete M1–M7
product. Resolve reported functional, data-loading, reliability, visual, responsive, accessibility,
interaction, and product-language defects before committing to production infrastructure. When the
Product Owner identifies the current work as M7.5, take the active issue and exact next action from
`PROJECT_STATUS.md`; the Product Owner does not need to restate this milestone's purpose or workflow.

#### Two-stage operating model

**Stage 1 — Product Owner review and iterative correction (current):** the Product Owner continuously
identifies concrete problems. Reproduce each problem, correct the items requested for immediate work,
and run only the focused local and browser evidence needed to keep the next review trustworthy. Keep
Stage 1 work local; commits are optional checkpoints, while push and remote CI wait for Stage 2 unless
the Product Owner explicitly requests an earlier delivery.

When Stage 1 exposes a valid issue that is safer or more efficient to solve as one later batch, append
it to the `M7.5 Stage 2 backlog` in `PROJECT_STATUS.md` with its observed symptom, owning surface,
required outcome, and acceptance evidence. Recording a deferred item is the Stage 1 completion
criterion for that item; do not implement it early merely to clear the list. Stage 1 ends only when
the Product Owner explicitly says the review phase is complete.

**Stage 2 — Consolidated correction and delivery:** after the Product Owner ends Stage 1, freeze the
complete deferred backlog, resolve every listed item as one coordinated hardening package, run the
full M7.5 regression and release-readiness matrix, then commit, push, and confirm exact-SHA remote CI.
Stage 2 may return a newly discovered product decision to the Product Owner, but it does not enter M8
deployment scope.

Both stages preserve completed milestone scope, server authority, tenant isolation, privacy,
concurrency, and recovery. Stage 1 applies the relevant Contract, Terra, and Sol work to each immediate
correction; the consolidated CI gate belongs to Stage 2. Record current work, local evidence, the
Stage 2 backlog, and one executable next handoff in `PROJECT_STATUS.md`.

#### Contract gate

- Reproduce each reported problem and freeze the expected Coach or Student outcome, affected route,
  data authority, responsive states, and acceptance evidence before implementation.
- Compare the formal product with the Demo where the Demo owns validated behaviour or presentation;
  preserve deliberate formal-product deviations and completed API/Auth/schema/cache assets.
- Classify deployment-provider, production-secret, domain, observability, recovery-policy, and Beta
  operations decisions as M8 inputs rather than making them implicitly during product hardening.

#### Terra gate

- Correct confirmed functional, projection, mutation, Auth-session, cache, persistence, error-state,
  and local-testability defects in their owning modules with focused regression coverage.
- Make the Windows local entrypoint deterministic: start both API and Web, wait for API health before
  opening the product, surface startup failure clearly, and prevent a Web-only half-started state.
  During M7.5, separately running `npm run dev:api` and `npm run dev:web` remains an accepted temporary
  test procedure, not completion evidence for the entrypoint.
- Keep retry and recovery truthful: distinguish an unavailable local/API service from authorization,
  server, validation, conflict, offline, and empty-data states.

#### Sol gate

- Converge each reviewed route with the approved visual hierarchy, interaction behaviour, responsive
  composition, accessibility, and calm user-facing language under direct Product Owner review.
- Verify desktop and exact 390×844 behaviour for every changed surface, including loading, failure,
  empty, ready, refreshing, mutating, conflict, focus, keyboard, touch, scroll, and recovery states
  that the correction can reach.

#### CI gate

- During Stage 1, use focused local tests and browser checks proportional to the current correction;
  reserve repeated full-suite, push, and remote-CI cycles for Stage 2 unless risk or the Product Owner
  requires them earlier.
- During Stage 2, run the complete applicable root check/build, live, migration, browser, and remote-CI
  evidence for the combined immediate corrections and deferred backlog.
- Before M7.5 completion, prove a clean Windows cold start, API health readiness, useful API-startup
  failure handling, authenticated reload/retry across every Coach route, public-route isolation,
  desktop and 390×844 critical journeys, migration dry-run/advisors, and exact-SHA GitHub Actions.
- M7.5 is complete only when every reported item is fixed or explicitly accepted/deferred by the
  Product Owner, no known release-blocking product defect remains, and the Product Owner authorizes
  the M8 Contract handoff.

### M8 — Deployment and Beta readiness

**Dependency:** the approved Beta scope from M1–M7 is complete.

#### Contract gate

- Select hosting, domains, environments, observability, support, privacy, export, retention, incident,
  rollback, restore, and Beta exit policies.

#### Terra gate

- Separate local/staging/production Supabase projects and secrets.
- Implement same-origin `/api`, TLS, deployment/rollback automation, migration release steps,
  structured logs, request IDs, metrics, alerts, backups, and security gates.

#### Sol gate

- Complete production onboarding, error surfaces, privacy/data controls, and one real-Coach Beta
  journey.

#### CI gate

- Prove clean-environment rebuild, staging/production smoke, rollback, restore drill, dependency and
  secret scan, zero unresolved Security Advisor errors/warnings, full secret rotation, and remote CI.

### M9 — Post-V1 options — Deferred

Evaluate only after Beta:

- LINE, Email, or Push notification worker/outbox;
- Capacitor, App Store, and Google Play packaging;
- subscriptions and online payment;
- studio membership, multiple Coaches, and roles;
- health or medical data after a separate privacy/compliance review.

## 6. Sequencing and concurrency

Work may proceed in parallel only after its Contract gate freezes shared interfaces. Separate
worktrees/branches are required for parallel work.

Always serialize:

- Supabase migrations and migration history;
- shared aggregate and Module interface changes;
- Demo import mappings with their target schema;
- `PROJECT_STATUS.md` integration;
- production deployments, backfills, destructive data operations, and secret rotation.

M4–M6 may overlap only where frozen interfaces do not share a migration or Course Session contract.
A UI skeleton is not authority to invent an adjacent milestone's model.

## 7. Roadmap change control

Changes to scope, sequence, dependency, product baseline, role ownership, gate criteria, or a domain
invariant require explicit Product Owner approval before editing this file. Ordinary progress,
evidence, blockers, and next actions update only `PROJECT_STATUS.md`.
