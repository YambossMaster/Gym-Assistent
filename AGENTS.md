# Gym Assistant agent guide

## Objective

Build the formal Gym Assistant product through complete, reviewable vertical slices. Preserve
delivered engineering assets and converge the Web toward the archived Demo's validated behaviour,
route structure, visual language, and responsive experience.

## Start here

Before planning, changing, or reporting formal-product work:

1. Read `README.md`, `docs/ROADMAP.md`, and `docs/PROJECT_STATUS.md`.
2. Run `git status --short`; reconcile the worktree with Status and preserve unrelated changes.
3. Take the active package and exact next action from `docs/PROJECT_STATUS.md`. Do not cache a
   current milestone or gate in this file.
4. Read `CONTEXT.md`, `docs/ARCHITECTURE.md`, and applicable `docs/adr/` files before changing domain
   language, Module interfaces, authorization, data ownership, or deployment shape.
5. Inspect the matching `demo/src/pages/` route and reusable Demo components before defining or
   implementing a formal Web route.
6. For direct Demo maintenance, also read `demo/README.md`, `demo/docs/ARCHITECTURE.md`,
   `demo/docs/DATA_MODEL.md`, and `demo/docs/TESTING.md`.

## Sources of truth

- `docs/ROADMAP.md`: approved scope, sequence, dependencies, gate contracts, and completion.
- `docs/PROJECT_STATUS.md`: current progress, evidence, risks, and one executable Next handoff.
- `docs/ARCHITECTURE.md`: authority, runtime, frontend, Module, projection, and deployment boundaries.
- `CONTEXT.md`: canonical product language.
- `docs/adr/`: durable decisions that need alternatives and consequences recorded.
- Worktree and passing checks: current implementation fact.

Roadmap scope, sequence, dependency, baseline, role ownership, or completion criteria change only
after explicit Product Owner approval. Record progress and evidence in Status without changing the
Roadmap.

## Product and engineering boundaries

- Treat milestones marked Done in the Roadmap and Status as a protected baseline. Put corrections in
  an approved later package; do not reopen, relabel, or replace delivered assets implicitly.
- The Demo is the formal Web's product reference, not production persistence. Do not copy Demo seed
  facts into production UI or port its local-storage graph as the server model. Modify
  `form-coach-mvp-v1` only through an explicit Demo migration with a changelog entry.
- Keep official data and business rules behind the Fastify API. Resolve Workspace only from verified
  identity and expose complete operations or route-shaped projections rather than unrestricted table
  CRUD.
- Keep private Coach notes out of public projections. Keep backend tables in the private schema and
  browser credentials out of server or administrative boundaries.
- Use version tokens for contested edits and return explicit conflicts without discarding current
  server state. Treat schedule overlaps as warnings unless an approved contract changes that rule.
- Serialize migrations and shared Module-interface changes.

## Delivery flow

Follow the Roadmap's `Contract -> Terra -> Sol -> CI` gates in order for every governed work package.
Before implementation, confirm that the active Contract is frozen and that its prior gates are
complete.

- **Contract:** freeze product behaviour, data and authorization contracts, route states, wording
  intent, responsive acceptance, and required evidence so implementation needs no new product
  decision.
- **Terra:** implement only the frozen engineering contract. Use semantic, unstyled UI slots and
  supplied wording; return missing product, visual, interaction, or copy decisions to Contract while
  continuing independent contracted work.
- **Sol:** converge the working feature with the Demo, including final presentation, responsive and
  accessible interaction, and Coach- or Student-facing wording. Return missing server authority to
  Contract rather than reproducing it in the browser.
- **CI:** run the exact local, live, migration, browser, and remote checks required by the Roadmap and
  Contract. A push is not completion evidence; confirm the GitHub Actions jobs for the delivered
  commit.

## Project tools and external services

Agents may proactively use available project-relevant Skills, plugins, apps, connectors, MCP tools,
CLIs, and browser surfaces. The user does not need to mention or invoke them again when their use is
within the active task and materially improves accuracy, verification, or completion.

Chrome, Supabase, and GitHub may appear through different capability types in different sessions; use
the best available mechanism and fall back cleanly when one is unavailable.

- **Chrome:** use the normal browser session for live UI acceptance, responsive checks, authenticated
  project dashboards, and evidence that cannot be obtained reliably from code or a purpose-built
  connector. Reuse an existing relevant tab/session when practical and never expose credentials in
  output or source files.
- **Supabase:** use the Supabase Skill and available connector or CLI for current documentation,
  schema/Auth/security inspection, development-environment operations, migration checks, advisors,
  and live evidence. Discover CLI syntax with `--help`, create migrations through the official CLI,
  and verify changes. Treat production changes, secret rotation, destructive data operations, and
  broader administrative changes as separate scope unless the user has authorized them.
- **GitHub:** use the GitHub connector or CLI for repository and pull-request context, remote refs,
  Actions runs, checks, and delivery evidence. Use Chrome when the connector or CLI cannot expose the
  required authenticated view. Commit and push when the authorized delivery flow requires them;
  merging, releasing, changing secrets/settings, or destructive repository administration requires
  explicit scope.

Tool availability is environment-dependent. If a required capability is absent or disconnected,
continue with a safe available fallback and report only the evidence actually observed.

## Implementation rules

### Formal Web

- Keep route implementation in route-owned modules; shared components stay small and presentation
  focused.
- Use TanStack Query for server data rather than `useEffect` request state. Scope keys to verified
  Coach identity, keep private responses in memory, invalidate affected projections, prefetch only
  authorized next views, and clear private cache on Auth subject change or sign-out.
- Render the smallest correct Loading, Error, Empty, Not Found, Ready, Refreshing, Mutating, and
  Conflict boundary required by the active Contract. Retain cached data and recoverable input when
  safe.
- Mount `/t/:token` and `/r/:token` outside Coach Auth. Keep account, security, and configuration in
  `/settings`; keep primary Coach workflows in the App Shell navigation.
- Use concise, calm, action-oriented product language. Keep milestones, verification claims,
  schema/API vocabulary, and agent instructions out of rendered UI.
- Represent unavailable features honestly; add data and controls only under an owning Contract.

### API, domain, and Supabase

- Preserve tenant isolation at the Module, adapter, HTTP, and database boundaries.
- Browser configuration may contain only public/publishable values. Keep database passwords,
  secret keys, service-role credentials, and Auth-admin capabilities server-side and Git-ignored.
- Add focused tests for non-trivial domain rules, state selection, authorization, persistence,
  migrations, concurrency, and projection allowlists.

### File ownership

- Formal Web: `apps/web`
- HTTP/application Modules and adapters: `apps/api`
- Database migrations: `supabase/migrations`
- Durable engineering state: `docs/`
- Demo route UI: `demo/src/pages/<Feature>Page.tsx`
- Demo reusable UI: `demo/src/components/`
- Demo pure rules: `demo/src/domain.ts`
- Demo persistence/actions: `demo/src/store.tsx`
- Demo shared types: `demo/src/types.ts`

Make the smallest complete change in the owning module. Keep unrelated user changes intact.

## Handoff and completion

Complete an authorized, safely bounded work package in one continuous run: implement every
contracted change, run its verification matrix, update Status, and, where deliverable, commit, push,
and confirm remote CI. Split only for an unexpected blocker, missing authority, or concrete
correctness risk; record the condition and exact resume point.

After completing each Roadmap step, inspect the approved Next handoff and continue directly to the
next step when it is not a milestone boundary, its required Contract and prior gates are complete,
and it needs no new authorization, external permission, or Product Owner decision. Complete one
step and its applicable evidence before beginning the next; this automatic handoff never skips,
combines, or reorders the Contract -> Terra -> Sol -> CI gates. Stop at a milestone completion or
when an unexpected problem, missing authority, external dependency, or required decision makes
continuation unsafe; record the exact handoff and blocking condition in Status.

After code, schema, config, architecture, product behaviour, or blocker changes, follow the Status
update protocol in `docs/PROJECT_STATUS.md`. A formal package is complete only when its required
gates and remote evidence are complete. A Demo-only change is complete when its affected flow is
locally testable and the Demo typecheck, tests, and release-facing build pass.
