# Gym Assistant formal architecture

## 1. Architectural intent

Gym Assistant is a server-authoritative coaching product with a route-complete React Web/PWA.
The archived [`demo/`](../demo/) is the product reference for information architecture,
interaction behaviour, responsive composition, visual hierarchy, and product language. It is not
the production persistence model.

The formal system preserves the completed M0–M3 assets: Supabase Auth, PostgreSQL schema and
migrations, Fastify API, account-lifecycle Edge Function, tenant authorization, Student/Lesson
Modules, App Shell routing, and TanStack Query cache. M3.5 closes product-surface gaps around those
assets; it does not replace them.

```text
Coach Web/PWA                          Public capability pages
presentation, forms, drafts            allowlisted read/redeem states
           |                                      |
           +-------------- HTTPS / JSON ----------+
                                  |
                                  v
                    TypeScript modular monolith
                 identity -> workspace -> operation
                  projections, transitions, policy
                                  |
                                  v
                     Supabase PostgreSQL/private
                  transactions, constraints, durable data

       Supabase Auth                           Edge Function
verified external identity              due account deletion only
```

## 2. Sources of authority

| Concern                                        | Authority                                           |
| ---------------------------------------------- | --------------------------------------------------- |
| Product behaviour and presentation target      | Demo plus the approved Roadmap Contract gate        |
| Scope, order, dependencies, and completion     | `docs/ROADMAP.md`                                   |
| Current work, evidence, risks, and next action | `docs/PROJECT_STATUS.md`                            |
| Domain vocabulary                              | `CONTEXT.md`                                        |
| Durable architectural decisions                | `docs/adr/`                                         |
| Current implementation fact                    | Git worktree, tests, linked development environment |

If these disagree, do not silently choose one. Preserve working assets, record the discrepancy in
Status, and return scope or interface changes to the Contract gate.

## 3. Authority boundary

The Web owns:

- route composition, visual presentation, accessibility, filters, and charts;
- recoverable form and modal state;
- in-memory server-data cache and explicitly approved local drafts;
- optimistic previews that are replaced by the server response.

The API Modules own:

- verified identity-to-Workspace resolution;
- official data projections and state transitions;
- authorization, validation, idempotency, and optimistic-concurrency decisions;
- calendar conflict calculation, entitlement derivation, and public field allowlists.

PostgreSQL owns durable records, foreign keys, uniqueness, transactions, and constraints. The
browser never supplies `workspaceId`, calls private application tables directly, or receives
database, service-role, Auth-admin, cron, or Vault credentials.

## 4. Delivery boundary: Contract -> Terra -> Sol -> CI

Every M3.5–M8 work package follows the four gates defined in the Roadmap:

1. **Contract:** Product Owner and Sol freeze the user job, route, data, operations, state
   boundaries, copy intent, and acceptance evidence.
2. **Terra:** implements schema, Modules, adapters, HTTP/Edge operations, queries, cache behaviour,
   tests, and semantic unstyled route skeletons. Terra makes no visual, interaction-styling, or
   end-user-copy decisions.
3. **Sol:** completes Demo-aligned layout, responsive behaviour, interactions, accessibility, and
   final product wording without moving business authority into the browser.
4. **CI:** integrates a cohesive package, verifies local/live/remote gates, updates Status, commits,
   pushes, and confirms GitHub Actions.

The contract is the seam between product decisions and engineering implementation. Missing
contract details block only the affected surface; they are not permission to invent a UI or data
model.

## 5. Frontend architecture

### 5.1 Route ownership

The target Web shape is route-oriented:

```text
apps/web/src/
  App.tsx                    auth bootstrap and public/private route composition
  app-shell/                 shared authenticated navigation and responsive shell
  pages/
    today/                   /today
    calendar/                /calendar
    students/                /students and /students/:id
    sessions/                /sessions/:id
    exercises/               /exercises
    settings/                /settings
    public/                  /t/:token and /r/:token
  components/                small reusable presentation/state primitives
  api/                       typed HTTP client and response normalization
  queries/                   Coach-scoped keys, query/mutation options, invalidation
  drafts/                    explicitly approved recoverable local state
```

This is an ownership target, not authority to rename files mechanically. M3.5 first decomposes the
existing `coach-workspace.tsx` without changing its working routes, HTTP behaviour, or cache
semantics.

Authenticated Coach routes are `/today`, `/calendar`, `/students`, `/students/:id`,
`/sessions/:id`, `/exercises`, and `/settings`. `/t/:token` and `/r/:token` are standalone public
routes mounted outside the Coach Auth gate. Unknown private routes may fall back inside the App
Shell; public capability routes must never be redirected through Coach sign-in.

### 5.2 Route-state model

Every server-data section selects an explicit state:

```text
initial loading -> ready with data | empty | not found | recoverable error
ready           -> refreshing while cached data remains readable
ready/form      -> mutating -> success | validation error | conflict | transport error
session draft   -> saving | offline/recoverable | conflict
```

- **Loading** is reserved for a first request with no usable data.
- **Refreshing** preserves readable cached data and marks only the updating surface.
- **Empty** is a successful response with no applicable records. First-use, filter-empty, and
  search-empty states may require different actions.
- **Not Found** is a terminal missing/inaccessible resource, distinct from a network failure.
- **Error** is recoverable at the smallest failed boundary; one Settings panel must not blank
  another successful panel.
- **Mutating/Saving** prevents accidental duplicate submission while retaining recoverable input.
- **Conflict** presents the current server state and an approved recovery action for stale versions
  or scheduling races.
- **Offline** exists only for routes whose Contract gate defines a durable draft/retry policy.

Rendered UI never exposes implementation milestones, cache internals, schema names, or agent
instructions. Connection and synchronization claims must be derived from actual state.

### 5.3 Query and cache rules

Formal server data uses TanStack Query rather than `useEffect`-managed request state.

- Query keys include the verified Coach identity and route parameters.
- Private responses remain in memory; persisted query caches require an explicit later contract.
- Navigation may reuse fresh cached data and revalidate in the background.
- Prefetch only data that the authenticated Coach is authorized to open next.
- Mutations invalidate or update every affected projection: detail, roster, Today, Calendar, and
  summaries as applicable.
- Auth subject change or sign-out cancels requests and clears the complete private query cache.
- PWA caching excludes `/api`, Auth callbacks, and capability responses unless a later contract
  explicitly defines safe behaviour.

### 5.4 Projection rule

The API returns route-shaped projections so the browser does not reconstruct official truth by
joining multiple table-like endpoints.

| Projection             | Primary contents                                                           |
| ---------------------- | -------------------------------------------------------------------------- |
| Today                  | local date/time zone, summary, ordered sessions, actionable attention      |
| Student roster         | identity/status, entitlement summary, nearest future session               |
| Student detail         | identity/private context, entitlement, purchases, relevant session history |
| Calendar               | visible range, sessions, blocks, availability, conflicts                   |
| Session workspace      | Course Session, Student context, Training Record and exercise snapshots    |
| Exercise library       | definitions, filters/favourites metadata, usage-safe summaries             |
| Public training result | one explicit, allowlisted Training Result projection                       |
| Public reschedule      | one capability, eligible slots, redemption state                           |

An additive projection may reuse existing Module operations. A new write or invariant requires a
versioned Module interface and HTTP contract before UI binding.

## 6. Backend module boundaries

The API is one deployable TypeScript modular monolith. HTTP adapters translate transport concerns;
Modules execute complete business operations; repository interfaces isolate persistence.

```text
HTTP adapter -> application Module -> repository interface -> PostgreSQL adapter
      |                  ^                     |
      v                  |                     v
identity verifier -------+               in-memory test adapter
```

| Module             | Owns                                                               | Does not own                                   |
| ------------------ | ------------------------------------------------------------------ | ---------------------------------------------- |
| Identity/Workspace | token verification, Workspace bootstrap/resolution                 | Coach-chosen Workspace IDs                     |
| Account Lifecycle  | profile/settings, sessions, recovery, deletion lifecycle           | feature navigation or Coach workflows          |
| Student/Lesson     | Student lifecycle, purchases, derived balance/manual income        | scheduling or payment processing               |
| Scheduling         | Course Sessions, Series, availability, blocks, conflict projection | training-set details or silent repair          |
| Training           | exercise definitions, records, exercise/set snapshots, performance | schedule placement                             |
| Public Access      | capability issuance/redemption, expiry/revocation, allowlists      | reuse of private Coach responses               |
| Notification       | later outbox/delivery policy                                       | direct coupling from core Modules to providers |

### 6.1 Preserved M3 seam

`lesson_purchase` is an entitlement grant and an optional Coach-entered receipt, not a mutable
balance or online payment. Money uses integer minor units and ISO currency. Remaining lessons are
derived as purchased lesson count minus completed Course Sessions; low and negative values remain
visible. Student and Purchase private notes remain Coach-only.

### 6.2 Delivered Scheduling and Training boundaries

M4 Scheduling owns temporal Course Session placement and status, range projections, Series
reconciliation, Availability, Blocks, schedule warnings, and Session versions. Preserved date-less
M3 rows remain legacy entitlement facts and never enter temporal or public projections.

M5 Training owns Exercise Definitions, accepted Training Records and snapshots, private Training
Notes, performance projections, and record versions. Scheduling remains authority for completing or
reopening a Session even when Training coordinates an atomic record-and-completion operation.

M6 Public Access may read only frozen purpose-specific interfaces from these Modules. It does not
duplicate their private projections or take ownership of placement, status, Training content, or
performance history.

### 6.3 HTTP and conflict contract

- `400` represents validated input/business preconditions the caller may correct.
- `401` represents missing or invalid authentication.
- `404` intentionally covers missing and cross-Workspace private resources.
- `409` represents stale version, already-used capability, or transactionally revalidated conflict.
- `429` represents public capability rate limiting.
- `5xx` responses are operational failures and expose no secret or private implementation detail.

Versioned mutation responses return the current accepted resource. Conflict responses contain only
the minimum current state and machine-readable reason required by the frozen recovery experience.

## 7. Authentication and public access

Supabase Auth is the external identity provider. The API validates asymmetric JWT signature,
issuer, audience, expiry, and subject before resolving the caller's one Workspace. User-editable
metadata is never authorization data.

V1 supports public Coach self-registration, six-digit Email OTP verification, Email/password,
Google sign-in/linking, recovery, global sign-out, and account deletion. Auth administration remains
server-only. Successful authenticated product operations may update activity; token refreshes,
heartbeats, and deletion-status reads do not.

Students have no accounts. Public access uses random, expiring, resource-scoped Capability Links.
Only token hashes are stored. Public responses are purpose-specific allowlists, omit private notes
by default, and never reuse authenticated detail projections. Redemption revalidates expiry,
revocation, use, authorization scope, slot validity, and scheduling conflicts transactionally.

## 8. Supabase and deployment

Backend-owned tables live in `app_private`, outside the browser Data API surface. Migrations revoke
access from browser roles; runtime access uses the dedicated API role. The account-lifecycle Edge
Function uses only server-provided secrets, while `pg_cron`/`pg_net` uses a Vault-held,
function-specific credential.

- Web and API are served under one site; `/api` is same-origin in production and Vite-proxied
  locally.
- The API is stateless and uses a PostgreSQL connection pool.
- Database migrations are serialized and run as an explicit release step.
- Local, staging, and production use separate databases, Auth configuration, and secrets.
- Persistent deployments use the supported direct/session-pool connection for their network shape.
- Demo import is always previewed, checksummed, and explicitly confirmed before writes; it never
  mutates `form-coach-mvp-v1`.

## 9. Verification at architectural seams

Tests concentrate where authority crosses a seam:

- pure domain rules and state selection;
- Module tests through in-memory repository adapters;
- PostgreSQL integration for transactions, constraints, and tenant scoping;
- HTTP tests for identity, payload, status, and response allowlists;
- two-Coach live tests for isolation and version conflicts;
- browser tests for route states, cache transitions, accessibility, and desktop/390×844 flows;
- migration preview/dry-run, Supabase advisors, root check/build, and remote CI.

Passing backend tests alone does not complete a product feature. Passing visual review alone does
not validate official data. Completion requires the four gates to agree.
