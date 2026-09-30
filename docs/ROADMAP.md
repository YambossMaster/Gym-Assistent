# Gym Assistant engineering roadmap

> Baseline: v3 — approved 2026-09-30. M0–M7 remain complete; M7.5 Stage 1 is closed and
> Stage 2 is the active pre-deployment handoff.

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
  decisions. Online payment is not required for the free closed Beta; charging Coaches requires the
  separate M9 contract and release gate.

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

**Stage 2 — Consolidated correction and delivery (current):** freeze the
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

### M8 — Taiwan Web/PWA release and free closed Beta

**Dependency:** M7.5 Stage 2 is delivered, has no known release-blocking defect, and the Product
Owner authorizes the M8 Contract handoff. M8-A through M8-D are sequential governed packages; each
passes Contract → Sol → CI before the next starts. Production deployment, internal Alpha,
and real-Coach Beta are separate release decisions. A green build or deployment is not Beta acceptance.

**Product Owner decision — 2026-09-30:** begin with a small, invited, free Beta in Taiwan. The
Product Owner will issue several promotion-code groups. A designated **Beta code** grants an
eligible Coach **one year of free use from successful redemption**; at expiry the Coach must choose
a new account plan. There is no automatic charge or silent renewal, and an expired grant must not
delete Coach data. Ending the Beta does not shorten the redeemed year. If paid plans are not ready
at expiry, the Contract must define a safe interim account state. A separate, limited
**permanent free code** may be given by the Product Owner to friends; its redeemed free-use
entitlement has no scheduled expiry and later paid plans must not
silently remove or bill it. Both grants are application-owned access records, not merely
payment-provider 100% discounts. The M8 Contract must freeze each code class's feature scope,
eligibility, issuance/redemption limits, start and end instants, expiry reminders, post-expiry
read/write and data-export behavior, transfer/account-deletion handling, abuse and exceptional
revocation rules, and exact Coach-facing promises before distribution. M8 requires no online
payment; M9 owns charging and ordinary paid-plan discounts.

#### M8-A — Release contract and isolated staging

**Contract gate:** select hosting/domain and deployment topology, separate local/staging/production
Auth/database/secrets, migration release order, backup and restore targets, rollback, observability,
incident owner, support, privacy, data export/deletion, and measurable Alpha/Beta entry and exit
criteria. Freeze the one-year Beta and limited permanent-grant promises and a path to obtain help,
report a problem, and submit product feedback. Define the submission channel, triage owner,
response expectations, and privacy-safe diagnostic handling; a general-purpose ticketing system is
not required. Set explicit performance, capacity, recovery, and security acceptance thresholds in
this Contract rather than claiming readiness from an arbitrary test count.

**Sol gate:** provision isolated staging and a repeatable Web/API/Auth/database migration pipeline
with separate credentials, same-origin `/api`, TLS, controlled configuration, logs, request IDs,
metrics, alerts, and backup/restore hooks. No real-customer data enters staging.

Verify staging Auth, primary Coach and public-link journeys, error/recovery copy,
installation affordance, and desktop/mobile layout against the frozen release contract.

**CI gate:** prove clean-environment rebuild, staging migration and smoke, environment/secret
separation, repeatable deployment, and exact-SHA remote CI. Record the release candidate and its
rollback path. This gate does not expose the product to real Coaches.

#### Product Owner-approved M8 feedback planning input — 2026-09-30

The following decisions enter M8-A Contract and M8-B implementation; they do not close M7.5
Stage 2 or count as working feedback delivery.

- Add an **協助與回饋** entry in Settings with three clear intents: report a problem, suggest an
  improvement, or ask for help. Use a short, type-aware form with a title and explanation. Keep
  optional reproduction detail from becoming a submission barrier. Preserve the originating route
  when the Coach opens Settings to report an issue.
- Submit through the authenticated application API into private, durable, Coach/Workspace-associated
  records. Derive identity and Workspace from verified Auth, not browser-supplied identifiers. Record
  only necessary diagnostic context, exclude capability tokens and URL query secrets, and explain
  collection to the Coach. Show a receipt only after durable acceptance; preserve the draft and offer
  retry on failure without creating duplicate submissions.
- Send the Product Owner one **email digest every two days only when new feedback exists**. The email
  must contain an authenticated link to a prepared, organized review of those records. Do not put
  sensitive feedback bodies or permanent access tokens in the email. Record digest coverage and
  delivery attempts so failures can be retried and records are not silently skipped or resent as
  new. The Contract must select the sender, destination, schedule/time zone, and safe review surface.
- Keep an optional reply path. The Product Owner may decide to answer a specific Coach question or
  report; no individual reply is promised for every submission. Persist each reply against the
  feedback record and deliver a Coach-scoped notice through the existing Today notification entry
  point. The reply remains readable from an authenticated durable detail view after the notice is
  read, dismissed, or displaced by the Today list limit. Define reply authorship, delivery/read
  state, and whether the Coach can answer back in the Contract.
- Retain feedback indefinitely for now. Group it into weekly review batches and support reversible
  archive/unarchive of a batch or record. Archive changes review visibility, not retention or the
  Coach's access to a reply. Define week boundaries, inclusion of late submissions, deletion/privacy
  controls, and backup/export behavior before Beta.
- Keep triage status, duplicate grouping, and urgency assessment internal. A weekly organized review
  may be prepared by an agent, but the Product Owner owns prioritization and replies. The Contract
  must define the exact review surface and operating procedure; an in-app Kanban board is not a
  prerequisite.

#### M8-B — Pre-release product, PWA, security, and operations gate

**Contract gate:** freeze the staging test matrix and thresholds: realistic Coach journeys, dataset
sizes and concurrent users; two-Coach isolation and public-link abuse; Auth/session and permission
boundaries; recovery time/data-loss targets; device/browser coverage; expected load and latency;
and severity-based release blockers. Map security checks to a named, versioned verification baseline.
Freeze the Beta code issuance/redemption/grant model and the feedback decisions left open above.

**Sol gate:** implement the frozen private feedback submission, two-day digest with delivery
tracking/retry, weekly review/archive, authenticated reply and durable Coach notice. Implement
Beta-code issuance and atomic, idempotent, rate-limited redemption against verified Coach/Workspace
identity; store code secrets safely and make one-year and permanent free entitlements
server-authoritative. Preserve permanent grants when paid plans later appear; make Beta expiry and
plan-choice states explicit without automatic billing or data deletion. Add focused authorization,
concurrency, persistence, failure, and recovery tests. Complete PWA manifest, service-worker
update/cache, offline draft/retry, and deployment configuration needed by the frozen device
contract.

Run task-based desktop and installed Android/iOS PWA journeys for sign-in, Calendar,
Training Record, Student/Venue/Finance, public links, offline/reconnect, app update, and recovery.
Make help, feedback, code redemption, receipt/retry, reply discovery, one-year expiry/plan choice,
and permanent free status understandable. Preserve safe areas, touch targets, keyboard/caret
visibility, and no overflow.

**CI gate:** on isolated staging, run full regression, migration dry-run/advisors, dependency and
secret scans, tenant/authorization and code-abuse cases, realistic scenario and load tests, backup
restore and rollback drills, and feedback digest/reply E2E. Resolve release-blocking findings and
record measured results against the Contract thresholds. Do not stress production or reuse real
Coach data as test fixtures.

#### M8-C — Production deployment and controlled Alpha

**Contract gate:** freeze production release approval, internal Alpha participants, data policy,
smoke paths, alert/incident ownership, rollback triggers, and the Alpha exit criteria. An internet
reachable Web deployment is not an app-store listing or an invitation to the public.

**Sol gate:** provision production separately, rotate previously exposed development credentials,
apply reviewed migrations, deploy the exact release artifact, and enable production logging,
monitoring, backups, alerts, and support delivery. Keep internal Alpha accounts and fixtures scoped
and removable without affecting future Coaches.

Exercise onboarding, critical Coach flows, installed PWA and public links on the
deployed domain with internal Alpha accounts; inspect real-device update, offline, accessibility,
failure, and feedback experiences.

**CI gate:** confirm exact-SHA remote jobs, production migration and health smoke, external Auth and
email delivery, alert routing, rollback and restore capability, security-advisor findings, and Alpha
incident/defect disposition. Production availability alone does not close this gate.

#### M8-D — Invited, free, real-Coach Beta

**Contract gate:** freeze cohort size and recruitment, invitation versus account-creation order,
Beta-code distribution, consent/terms and privacy wording, support response, usage measures, data
handling, and exit/pause criteria. State the one-year Beta promise and the separate limited
permanent-free promise; show each Coach their grant and expiry, if any. Paid access remains outside
this package.

**Sol gate:** activate only the approved invitation/code and entitlement paths for the cohort;
provide code redemption state, support triage, privacy-safe usage/health signals, and a way to stop
new admissions without damaging existing Coach records or redeemed grants.

Observe invited Coaches completing real onboarding, scheduling, recording, and
recovery tasks; collect feedback and distinguish product friction from incidents. Check that the
one-year remaining time, plan-choice path, permanent free status, and reply path are clear on
desktop and installed PWA.

**CI gate:** verify real-account isolation, both code classes, one-year expiry and no-charge
transition, duplicate/expired/invalid redemption cases, support and feedback delivery,
production health, backup status, incident response, and measured
Beta outcomes. The Product Owner decides whether to extend Beta, correct the product, or authorize
the M9 paid-launch Contract. A Beta invite is not M8 completion by itself.

### M9 — Taiwan commercialization and paid launch

**Dependency:** M8-D Beta outcomes and Product Owner approval of a paid launch. Pricing and
positioning research may begin during M8; no Coach is charged before M9's full release gate.

**Contract gate:** freeze who pays, plan features/limits, price and currency, trial or paid discount
terms, upgrade/downgrade/cancellation/refund handling, failed-payment access, tax/invoice and legal
review, privacy/terms, customer support, one-year Beta expiry/plan selection, and continued M8
permanent free grants. Ordinary paid-plan discount codes are distinct from both free-grant classes.
Define a measurable paid-launch and support exit criterion.

**Sol gate:** implement provider-verified payment events and server-owned subscription/access
state with idempotent retries, reconciliation, and auditability; never derive access solely from a
browser success page. Keep redeemed M8 permanent grants effective without billing them; handle
expired one-year grants without data loss or automatic charges.

Make plan choice, price, payment, free-grant status, failures, cancellation, and help
clear on Web/PWA. Complete Taiwan launch onboarding and public-facing product/support materials.

**CI gate:** prove sandbox and limited live payment lifecycles, code/entitlement preservation,
refund/failure/cancel behavior, tenant isolation, recovery, security, deployment, and support
readiness before enabling general paid access.

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
M7.5 Stage 2 must close before M8-A. M8-A → M8-B → M8-C → M8-D are serial release gates; M9
requires Beta evidence and Product Owner approval, and M10 remains conditional. Production access,
code distribution, and any paid charging require their own completed gate and release decision.

## 7. Roadmap change control

Changes to scope, sequence, dependency, product baseline, role ownership, gate criteria, or a domain
invariant require explicit Product Owner approval before editing this file. Ordinary progress,
evidence, blockers, and next actions update only `PROJECT_STATUS.md`.
