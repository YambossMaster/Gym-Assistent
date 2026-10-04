# Gym Assistant engineering roadmap

> Baseline: v3 — approved 2026-09-30. M0–M7 remain complete; M7.5 Stage 2 precedes M8.
> Current progress and the active handoff are recorded in [PROJECT_STATUS.md](PROJECT_STATUS.md).

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
- Microservices, Kubernetes, Kafka, CQRS, Event Sourcing, and multi-region deployment are outside
  the Taiwan Web/PWA launch baseline. Native packaging and full international rollout require M10
  decisions. Paid checkout follows real-Coach Beta admission in M8, with development starting at
  Beta launch and activation before the first 60-day offer expires.

## 3. Delivery model: three gates

For active and future governed work packages from 2026-09-30 onward, follow Contract → Sol → CI in
order. Sol is the single owner of contracted engineering and product convergence. A later gate may
return the package to Contract when a decision is missing; no gate may be skipped. M3.5–M7 and
earlier M7.5 work retain their historical four-gate records without governing new work.

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

**Exit criterion:** Sol can implement the complete server and product slice without inventing a
product, visual, authorization, or copy decision.

### Gate 2 — Sol implementation and product convergence

**Owner:** Sol, with Product Owner acceptance of product-facing outcomes.

Sol implements the complete frozen contract:

- schema, migration, Module implementation, adapters, HTTP operations, Edge Functions, and tests;
- query keys, typed route loaders, mutations, cache invalidation, and authorization-safe prefetch;
- deterministic test fixtures and acceptance hooks;
- complete route states, visual hierarchy, layout, responsive composition, Tailwind/CSS, and shared
  UI primitives;
- Demo comparison and deliberate formal-product deviations;
- keyboard, pointer, touch, focus, modal, scroll, and transition details;
- exact Coach-facing or Student-facing copy;
- accessible names, announcements, reduced-motion behaviour, and destructive-action emphasis;
- desktop and exact 390×844 manual acceptance, plus installed-device checks when contracted.

Sol returns missing product or server-authority decisions to Contract while continuing independent
contracted work. Business rules and official data remain behind backend Modules.

**Exit criterion:** server authority, tests, complete route states, interaction, accessibility,
responsive experience, and Product Owner acceptance satisfy the frozen Contract.

### Gate 3 — CI delivery

**Owner:** integrating engineering agent.

- Run root `npm run check` and `npm run build`.
- Run milestone-specific live E2E and migration preview/dry-run.
- Run `git diff --check` and relevant Supabase advisors.
- Update `PROJECT_STATUS.md` and prepend an Engineering log entry.
- Create a cohesive milestone or work-package commit, push it to the shared branch, and confirm the
  GitHub Actions verify and migration-dry-run jobs for that commit.

**Exit criterion:** local evidence, remote evidence, documentation, and next handoff all agree.

### Historical stage labels

M3.5 Stage A and the delivered M4–M7 milestones retain their original scope and evidence. M7.5
Stage 1/Stage 2 describe its review and correction phases, not additional delivery gates. The
current Contract → Sol → CI sequence applies to the remainder of M7.5 and to M8 onward.

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

M0–M7 are delivered history. Their original Terra/Sol gate headings record how those packages were
delivered; active work follows the three-gate model in Section 3.

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

### M3.5 — Stage A: frontend gap filling — Done

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

### M4 — Scheduling — Done

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

### M5 — Training and Exercise Library — Done

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

### M6 — Public Capability Links — Done

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

### M7 — Local resilience and Demo migration — Done

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

**Stage 1 — Product Owner review and iterative correction (closed 2026-09-30):** the Product Owner
identifies concrete problems. Reproduce each problem, correct the items requested for immediate work,
and run only the focused local and browser evidence needed to keep the next review trustworthy. Keep
Stage 1 work local; commits are optional checkpoints, while push and remote CI wait for Stage 2 unless
the Product Owner explicitly requests an earlier delivery.

When Stage 1 exposes a valid issue that is safer or more efficient to solve as one later batch, append
it to the `M7.5 Stage 2 backlog` in `PROJECT_STATUS.md` with its observed symptom, owning surface,
required outcome, and acceptance evidence. Recording a deferred item is the Stage 1 completion
criterion for that item; do not implement it early merely to clear the list. The Product Owner closed
Stage 1 on 2026-09-30. Remaining device, workflow, and browser acceptance belongs to Stage 2;
closure does not turn an unrun test into passing evidence.

**Stage 2 — Consolidated correction and delivery (delivered 2026-10-01):** freeze the
complete deferred backlog, resolve every listed item as one coordinated hardening package, run the
full M7.5 regression and release-readiness matrix, then commit, push, and confirm exact-SHA remote CI.
Stage 2 may return a newly discovered product decision to the Product Owner, but it does not enter M8
deployment scope.

Both stages preserve completed milestone scope, server authority, tenant isolation, privacy,
concurrency, and recovery. Historical Stage 1 corrections followed their then-current handoff;
Stage 2 uses Contract → Sol → CI, with the consolidated CI gate after correction and acceptance.
Record current work, local evidence, the
Stage 2 backlog, and one executable next handoff in `PROJECT_STATUS.md`.

#### Product Owner-approved Stage 1 addition — Monthly finances and venues

The Product Owner added the Student-area **本月收支** route as a bounded M7.5 Stage 1 package on
2026-09-24. It preserves name-only Venue use and adds opt-in venue-cost rules,
prepaid Venue lesson balance/low-balance notification, current-month income and expenses,
and access to historical months. On 2026-09-27, the Product Owner placed year/month
selection in the overview card and removed the separate **各月收支紀錄** card; selecting a
month changes the overview and the ledger together. A prepaid Venue batch is expensed once
when purchased; Session completion consumes one credit without another expense. The
2026-09-25 Product Owner correction makes every newly entered scheduling place a Venue,
deduplicates names within a Workspace, and moves Venue management to its own Student-area route.
The later 2026-09-25 correction makes Student purchases the source of scheduling Venue
eligibility: general purchases allow any Venue, Venue-bound purchases allow their selected
Venue, and completion deducts one applicable lesson. Venue-bound commission is calculated
at Student purchase; general-purchase Venue expenses arise per completed Session.
Venue-supplied is the default for dual-rate commission, with Coach-supplied Students
marked in Venue management. A Venue may also record monthly base salary with a
configured pay day; that day's income appears in **收支明細**. Venue settings expose
controls specific to their expense type and do not offer a normal **確認影響範圍** step.
The 2026-09-26 Product Owner correction adds **場地課程紀錄** and dated-time effective
boundaries, with the Course Session end time selecting each Venue rule. Prepaid batches
have their own deduction start time and explicit per-Session allocation; later batches
automatically cover earlier unassigned Sessions only when the start time permits it,
and the Coach may manually assign a Session to an available batch. Venue-bound
Student-purchase commission remains a purchase-month expense; later rate changes
create only per-Session differences, while a change to a different expense mode
retains the original purchase expense. Finance detail may have a separate manual
amount override that does not change its source. See the frozen
[`M7.5-VENUE-SESSION-RECORDS-CONTRACT.md`](M7.5-VENUE-SESSION-RECORDS-CONTRACT.md).
The Product Owner then approved single-row ledger edits to amount, date/time, and name;
manual add, hide, restore, and cancel-edit operations; original-source preservation;
and chronological sorting by each row's displayed date/time. Active rows alone form
the adjusted monthly totals, and the income headline identifies manual adjustments.
See [`M7.5-FINANCE-LEDGER-MANAGEMENT-CONTRACT.md`](M7.5-FINANCE-LEDGER-MANAGEMENT-CONTRACT.md).
For these two frozen 2026-09-26 Contracts, the Product Owner directed direct Sol delivery
without a separate Terra handoff. Sol owned the contracted server, migration, and Web slice
together; Stage 1 evidence belongs in `PROJECT_STATUS.md`.
The product and evidence contract being revised is
[`M7.5-MONTHLY-FINANCE-CONTRACT.md`](M7.5-MONTHLY-FINANCE-CONTRACT.md). This addition does not
reopen M3/M4 delivery or change the Stage 1/Stage 2 and M8 boundaries above.

#### Product Owner-approved Stage 1 addition — Calendar preferences

On 2026-09-29, the Product Owner added Workspace-owned Calendar display hours, Monday/Sunday
week start, and default Course Session length to the current Settings review. The approved
lengths are 30/45/60/90/120 minutes with 60 as the initial value; existing arrangements outside
the chosen display hours remain visible. The bounded behavior, authority, and acceptance path
are in [`M7.5-CALENDAR-PREFERENCES-CONTRACT.md`](M7.5-CALENDAR-PREFERENCES-CONTRACT.md).
This Stage 1 correction stays local for review under the operating model above.

#### Contract gate

- Reproduce each reported problem and freeze the expected Coach or Student outcome, affected route,
  data authority, responsive states, and acceptance evidence before implementation.
- Compare the formal product with the Demo where the Demo owns validated behaviour or presentation;
  preserve deliberate formal-product deviations and completed API/Auth/schema/cache assets.
- Classify deployment-provider, production-secret, domain, observability, recovery-policy, and Beta
  operations decisions as M8 inputs rather than making them implicitly during product hardening.

#### Sol gate

- Correct confirmed functional, projection, mutation, Auth-session, cache, persistence, error-state,
  and local-testability defects in their owning modules with focused regression coverage.
- Make the Windows local entrypoint deterministic: start both API and Web, wait for API health before
  opening the product, surface startup failure clearly, and prevent a Web-only half-started state.
  During M7.5, separately running `npm run dev:api` and `npm run dev:web` remains an accepted temporary
  test procedure, not completion evidence for the entrypoint.
- Keep retry and recovery truthful: distinguish an unavailable local/API service from authorization,
  server, validation, conflict, offline, and empty-data states.

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

### M8 — Taiwan Web/PWA release and open Beta

**Dependency:** M7.5 Stage 2 is delivered and the Product Owner authorizes M8. M8-A, M8-B,
M8-B-Export, M8-C and M8-D are sequential Contract → Sol → CI packages. M8-A prepares the release
path, M8-B finishes the Beta plan policy, M8-B-Export adds Coach data export, M8-C deploys
production for internal Alpha, and M8-D admits real Coaches. An internet deployment alone does not
authorize real-Coach admission.

**Product Owner decisions — 2026-09-30 to 2026-10-03:** launch a small, open Taiwan Beta of the
formal product. Every verified Coach can sign in and use the Free Workspace. Basic and Advanced
checkout development starts at Beta launch and must reach production before the first redeemed
60-day offer expires. An optional shareable Beta offer code grants Advanced access at 100% off
for 60 days (fixed 60 × 24 hours) without requiring a payment method at redemption. M8-B
introduces server-owned plan limits: Free permits five active Students
and one active Venue, retains lesson-count, scheduling, Training Record and Venue expense settings,
but locks the entire `本月收支` page, the Student `個人運動表現` directory and all `成長軌跡`
views. Basic is planned at NT$199/month with 15 active Students; Advanced is planned at
NT$259/month with unlimited Students. Both paid tiers remove the Venue and feature locks. During
the initial Beta, Coaches use Free or the Advanced offer; they can subscribe after checkout opens.
At most ten permanent free grants provide Advanced access while the service operates. On
promotional expiry, no charge
occurs without an active paid subscription; the Coach otherwise returns to Free. Existing records
remain visible and preserved. If the active Student/Venue count exceeds Free capacity, new Training
and other record writes are locked until the Coach pays or reduces usage below Free limits. Both
grant classes and paid access are server-owned entitlements. M8-E owns the first paid checkout and
subscription lifecycle; M9 owns post-Beta commercial refinement. If checkout misses the first
offer expiry, affected Coaches must retain usable Advanced access until a payable path exists;
the exact extension and notice rule must be frozen before Beta admission.

**Plan naming decision — 2026-10-04:** the Coach-facing plan names are `Free 方案`, `Pro 方案`,
and `Prime 方案`. They map to the existing `free`, `basic`, and `advanced` tiers respectively;
the earlier Free/Basic/Advanced references in engineering contracts denote those stable tier
identifiers. This naming decision does not change prices, limits, grants, or checkout timing.
M8-B-Export delivers one-file-at-a-time PDF/CSV/JSON exports for Training Records, performance
trend data, Calendar and finance details from Settings before production Alpha. Growth-trajectory
PNG belongs at the Growth Trajectory view and is outside that package. M8-B does not show export
controls before M8-B-Export is delivered. The Beta uses **Local + Production** only: the existing
development project remains local
development's database/Auth service, and a separate
Supabase Free project holds production data. There is no persistent staging environment or
project-pause rotation. One Fly.io app is the proposed same-origin Web/Fastify host. The initial
planning target is about USD 30/month, informed by [the Product Owner's cost estimate](M8-OPERATING-COST-ESTIMATE.md);
it is not a guaranteed bill or an automatic spending authorization. Check actual provider pricing,
usage alerts and any available caps before enabling billing. Do not claim a hard cap where a
provider does not offer one.

The earlier Product Owner acceptance of **no scheduled database backup** and possible permanent
Coach/Student data loss applied to a free Beta. The Product Owner now requires a verifiable backup
and restore process before charging real Coaches. The initial no-charge Beta must disclose its
actual recovery limits. M8-E freezes and proves a concrete backup cadence, retention, secure
storage and isolated restore path before checkout goes live. The published Terms must state the
actual backup and restoration policy; Settings carries an accessible data notice during
development. Terms and privacy text must identify the actual operator, contact,
providers, data practices and a manual route for applicable rights requests before real Coaches
join. A template may start the drafting; a paid lawyer review is not an M8 gate. Disclosure does
not waive statutory rights or replace reasonable security measures. Supabase Free may pause for
low database activity; an external `/api/health` probe detects API availability but does not
prove database activity or prevent Supabase pausing. Watch provider warnings and resume manually
if needed. No daily login/write bot is required.

The Product Owner performs manual operational review in Fly.io and Supabase dashboards. There is
no custom `/ops` page, `/api/v1/ops/summary`, telemetry warehouse or alert-acknowledgment SLA.
Before Beta, verify billing/usage notifications, view the Supabase database size and Fly usage,
and keep a simple monthly expense review. Free's 500 MB **database-size** read-only threshold is
a reason to consider Pro before writes fail; no upgrade or purchase occurs automatically. Keep
tenant isolation, secret separation, public-link allowlists and tested migrations as baseline
engineering protections.

Settings offers a simple external **意見回饋** link using a dedicated support email (`mailto:`) or
an approved external form after the Product Owner chooses the address/provider. M8 does not
implement feedback tables, digests, internal review UI, replies, or Today reply notifications.
Do not claim an in-app receipt for an external submission. The channel should be discoverable on
desktop and mobile and ask Coaches not to send passwords, capability links or unnecessary Student
details. No individual reply time is promised.

The Product Owner may use agents and isolated synthetic accounts for internal Alpha. Manually
exercise the core path on an available installed phone during Alpha, and record any untested
platform honestly. M8-B-Export adds the bounded Coach-facing data export before Alpha; no
Coach-facing backup or individual-record deletion feature is added for Beta. Preserve delivered
account deletion and a manual process for applicable data-rights requests. The
development-only Demo import UI must be absent from production builds.

#### M8-A — Lean release contract and local deployment preparation

**Contract gate:** freeze the Local + Production topology, Fly/Supabase Free selection, same-origin
`/api` routing, build/release commands, migration order, secret boundaries, the honest no-backup
message and a short manual release checklist. Record the approximate monthly cost and where the
Product Owner will inspect billing/usage notifications. The public support address, final domain
and actual provider account details may remain pending until M8-C production setup; they are
required before inviting real Coaches. No staging or paid provisioning is required to freeze this
engineering package.

**Sol gate:** implement the production-capable Web/API serving path, `/api/ready` backed by a
database check, safe configuration, SPA/public-link routes, JSON API 404, static cache headers,
no-store private/public responses, and a repeatable local production-mode smoke. Keep the
development runtime and assets. Prepare a short Fly deployment configuration and migration
command path without activating a paid service or copying development data into production.

**CI gate:** pass root check/build, focused routing/readiness tests, migration dry-run where
credentials are available, and exact-SHA GitHub Actions jobs for the delivered commit. Record the
local smoke and unresolved production setup values. This gate does not create production or
admit Coaches.

#### M8-B — Beta plans and pre-release checks

**Contract gate:** freeze optional Beta-code issuance and the no-card 60-day Advanced offer;
Free/Basic/Advanced access, capacity counting, downgrade write lock and locked-surface behaviour.
Choose the external feedback channel and exact copy; define the data notice, later terms boundary,
desktop/390px checks and security cases. M8-D freezes the expiry contingency before admitting
real Coaches. Preserve physical installed-device acceptance for M8-C.

**Sol gate:** let every verified Coach use a Free Workspace; implement server-owned, atomic
Beta-code redemption, no-card 60-day Advanced access and permanent grants. Show Free, Advanced
offer and permanent states, planned Basic/Advanced prices and the current unavailability of paid
checkout in Settings `方案與帳單`. Enforce plan limits and the over-limit downgrade write lock at
API and Web boundaries; preserve every record. Add the external feedback link and necessary
PWA/update corrections. Test critical Coach flows and two-Coach isolation locally
with synthetic data. Keep development migration tools unavailable in a production build.

**CI gate:** run root check/build, migration and security checks, focused code/entitlement cases,
and a manual local production-mode path for sign-in, Session/Training save, expiry/downgrade and
one public link. Confirm exact-SHA remote CI. Do not run a large staging load fixture or rollback
drill.

#### M8-B-Export — Coach data export before production Alpha

**Dependency:** complete M8-B Contract, Sol and CI before starting this package. Finish this
package's Contract, Sol and CI before M8-C production deployment. It does not depend on paid
checkout or a production environment.

**Parallel feedback handoff — approved 2026-10-04:** the external feedback entry is already
implemented and locally verified on `codex/feedback-form-link` at `84a38f2`; this branch has not
been merged into `main` or pushed. During M8-B-Export Sol, merge that branch into the Export
integration branch and preserve both the Settings `匯出資料` flow and `協助與回饋` Form link when
resolving any overlap. Include the combined Settings desktop/390×844 behavior in CI evidence and
record the resulting merge and verification in Project Status. The feedback branch also carries
the bilingual Form links and their setup/verification log. This handoff does not add a feedback
backend or change the M8-B-Export data-export contract.

**Contract gate:** freeze the Settings `匯出資料` flow for one data type and one directly downloaded
file per request. The four types are Training Records, Growth Trajectory numeric data, Calendar,
and finance details. Freeze each type's date and entity filters, date/time-zone interpretation,
included rows, private-note opt-in, CSV/JSON/PDF field and layout contracts, single-request size
limits, empty/error states, file names, and current server-owned plan entitlement. Growth
Trajectory PNG is a separate in-view decision and is not part of this Settings export package.
Preserve the existing manual route for applicable data-rights requests.

**Sol gate:** add the Settings panel and a bounded authenticated API export operation. Derive
Workspace only from verified identity, check entitlement when generating the download, and reuse
the owning Modules' Training, performance, Scheduling and finance rules. Produce one CSV, JSON or
PDF directly without ZIP or durable server-side file storage. Do not silently truncate results or
include private notes by default. Keep private responses out of browser/PWA caches and prevent
spreadsheet formula execution from exported text.

**CI gate:** verify four data types and three formats against deterministic fixtures, date and
filter boundaries, private-note exclusion/opt-in, two-Coach isolation, plan changes, large/empty
results, desktop and 390×844 Settings/download behavior, root check/build, migration dry-run where
applicable, and exact-SHA remote CI. Do not treat export as a database backup.

#### M8-C — Production deployment and internal Alpha

**Contract gate:** choose the domain, public support/privacy contact, Auth mail sender, provider
accounts and realistic monthly cost; approve any purchase/deployment. Finish and publish accurate
Terms/Privacy text with the current no-backup disclosure and an integrated acceptance flow before
real Coaches are invited. Select the initial synthetic Alpha accounts and a short pass/fail
checklist.

**Sol gate:** provision the separate production Supabase Free project and Fly app, configure
separate secrets, apply reviewed migrations, deploy the exact release build and configure available
billing/usage notifications. Use Fly and Supabase dashboards for manual health/capacity review.
Agents and the Product Owner exercise synthetic Alpha accounts. Fix forward when an app defect is
found; stop unsafe writes or admissions if a migration or data failure makes continued use unsafe.
No automated rollback or database-loss rehearsal is required.

**CI gate:** confirm exact-SHA jobs and production migration evidence; manually smoke Auth,
Session/Training persistence,
a public capability link and sign-out. On an available installed
phone, check the core save path, touch, keyboard and safe-area behavior; record any untested
platform as a limitation without claiming it passed. Confirm support contact, disclosure, provider
alerts, database-size view, and no known release-blocking defect.

#### M8-D — Open real-Coach Beta

**Contract gate:** approve an open real-Coach Beta, optional code distribution, published
terms/privacy, external feedback channel and criteria to pause new signups. State the 60-day
Advanced offer, continuing Free limits, checkout launch timing and limited permanent Advanced
grants clearly. Identify the earliest offer expiry and start M8-E checkout work at Beta launch.

**Sol gate:** admit verified Coaches with or without an offer code, keep existing Coach data behind verified identity,
make expiry/grant state visible, and collect product feedback through the selected external channel.
The Product Owner reviews Fly usage and Supabase size/billing notices manually at a practical
cadence and adjusts admissions if service quality or capacity deteriorates. M8-E payment work
begins at Beta launch; no Coach is charged before its own release gate.

**CI gate:** spot-check a real Coach's onboarding, Session and Training save, public-link scope,
grant state, and support route without using real records as fixtures. Check the production health,
cost and database-size dashboards and resolve release-blocking defects. A Beta invite is not M8
completion by itself; the first offer expiry sets the M8-E deadline.

#### M8-E — Paid checkout before first offer expiry

**Contract gate:** freeze the named payment provider, merchant prerequisites, Basic/Advanced
monthly subscriptions, voluntary paid activation after a no-card offer, auto-renewal, cancellation,
failed-payment, refunds, invoices/tax, verified events and reconciliation. Freeze the exact
over-limit transition and extension rule if checkout deployment slips. Choose and document the
backup method, cadence, retention, protected storage and restore check before charging Coaches.

**Sol gate:** start payment implementation at real-Coach Beta launch. Implement working Basic and
Advanced checkout, provider-verified subscription authority, billing/management states and
monthly renewal until cancellation. Keep the 60-day offer card-free and never charge on expiry
without an active paid subscription. Deploy a verifiable backup process before enabling live
checkout; preserve all Coach data on downgrade.

**CI gate:** prove provider sandbox activation, renewal, cancellation, failed payment, refund and
reconciliation; exact-SHA remote CI; controlled live checkout and cancellation; backup plus an
isolated restore; and desktop/mobile plan flows. Enable live paid access before the earliest
redeemed offer expires. No missed payment or expired offer may silently delete Coach data.

### M9 — Post-Beta commercialization refinement

**Dependency:** M8-E checkout and Beta outcomes, plus Product Owner approval of further commercial
changes. The initial paid checkout and subscription lifecycle belong to M8-E.

**Contract gate:** use M8-D payment, support and Coach feedback evidence to choose bounded
pricing, packaging or onboarding improvements. Any later export expansion, including Growth
Trajectory PNG, needs its own scope and privacy contract. Preserve M8 permanent grants and
existing subscriptions when changing commercial terms.

**Sol gate:** implement only the approved post-Beta improvements with explicit migration and
existing-customer treatment. Keep provider-verified payment authority, auditability and the
non-destructive downgrade boundary established in M8.

**CI gate:** verify affected payment and entitlement lifecycles, tenant isolation, any newly
approved export expansion, local/browser behaviour and exact-SHA remote CI before releasing each
M9 change.

### M10 — Internationalization and native-app decision — Conditional

Preserve translation-ready copy boundaries and correct time-zone/currency handling during M8–M9,
but choose target locales, tax/privacy obligations, and Flutter or other native implementation only
from Beta/paid-launch evidence of demand or demonstrated PWA limits. A native app or app-store
listing is a separate Contract → Sol → CI package, not an automatic consequence of Web
deployment. LINE/Email/Push expansion, studio/multi-Coach roles, and health/medical data also need
their own approved contracts and privacy review.

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
M7.5 Stage 2 must close before M8-A. M8-A → M8-B → M8-B-Export → M8-C → M8-D → M8-E are ordered
release gates, with M8-E Sol beginning at M8-D Beta launch; M9
requires Beta evidence and Product Owner approval, and M10 remains conditional. Production access,
code distribution, and any paid charging require their own completed gate and release decision.

## 7. Roadmap change control

Changes to scope, sequence, dependency, product baseline, role ownership, gate criteria, or a domain
invariant require explicit Product Owner approval before editing this file. Ordinary progress,
evidence, blockers, and next actions update only `PROJECT_STATUS.md`.
