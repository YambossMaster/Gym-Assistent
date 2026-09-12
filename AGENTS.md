# Gym Assistant agent guide

## Objective

Build the formal Gym Assistant product through complete, reviewable vertical slices. Preserve the
completed engineering foundation and converge the Web toward the archived Demo's validated product
behaviour, route structure, visual language, and responsive experience.

## Start here

Before planning, changing, or reporting formal-product work:

1. Read `README.md`, `docs/ROADMAP.md`, and `docs/PROJECT_STATUS.md`.
2. Run `git status --short`; reconcile the worktree with Status and preserve unrelated changes.
3. Read `CONTEXT.md`, `docs/ARCHITECTURE.md`, and applicable `docs/adr/` files before changing domain
   language, Module interfaces, authorization, data ownership, or deployment shape.
4. Inspect the matching `demo/src/pages/` route and reusable Demo components before defining or
   implementing a formal Web route.
5. For direct Demo maintenance, also read `demo/README.md`, `demo/docs/ARCHITECTURE.md`,
   `demo/docs/DATA_MODEL.md`, and `demo/docs/TESTING.md`.

## Sources of truth

- `docs/ROADMAP.md`: approved scope, sequence, dependencies, four-gate contracts, and completion.
- `docs/PROJECT_STATUS.md`: current progress, evidence, risks, and one executable Next handoff.
- `docs/ARCHITECTURE.md`: authority, runtime, frontend, Module, projection, and deployment boundaries.
- `CONTEXT.md`: canonical product language.
- `docs/adr/`: durable decisions that need alternatives and consequences recorded.
- Worktree and passing tests: current implementation fact.

Roadmap scope, sequence, dependency, baseline, role ownership, or completion criteria change only
after explicit Product Owner approval. Progress and evidence update Status without changing the
Roadmap.

## Protected baseline

M0–M3 are complete. Preserve their backend logic, API, Edge Function, migrations, Supabase schema,
authorization, App Shell routing, TanStack Query behaviour, tests, and remote evidence. Corrections
belong to M3.5; do not reopen or relabel completed milestones.

M4 Scheduling is not started. Do not add Scheduling schema, Course Session operations, or calendar
behaviour until its Contract gate is frozen.

The Demo is the formal Web's product reference, not production persistence. Never copy Demo seed
facts into production UI, port its local-storage graph as the server model, or modify
`form-coach-mvp-v1` without an explicit Demo migration and changelog entry.

## Required delivery flow

Every M3.5–M8 work package follows `Contract -> Terra -> Sol -> CI`.

### 1. Contract gate — Product Owner + Sol

Freeze before implementation:

- user job, owning route, Demo behaviours, and deliberate deviations;
- data shape, Module interface, HTTP operation, authorization, and concurrency;
- Loading, Error, Empty, Ready, Refreshing, Mutating, Conflict, and other applicable states;
- product-copy intent and slots;
- desktop/390×844 acceptance path and required automated/live evidence.

The exit test is simple: Terra can implement the complete data flow without making a product,
visual, interaction-design, or wording decision.

### 2. Terra gate — engineering only

Terra may implement only the frozen contract:

- schema/migrations, Modules, adapters, HTTP/Edge operations, and tests;
- typed queries/mutations, query keys, cache invalidation, and authorized prefetch;
- semantic, unstyled skeleton components exposing every contracted data slot and route state;
- deterministic fixtures and acceptance hooks.

**Hard rule:** Terra must not choose layout, spacing, color, typography, animation, responsive
composition, interaction styling, or end-user copy. Terra may insert only wording supplied by the
Contract gate. When a necessary decision is absent, stop the affected surface and report the exact
missing contract; continue independent contracted work.

Terra's exit criterion is correct data flow, stable route states, and passing domain/adapter/HTTP/
authorization/focused-Web tests. A wired skeleton is not visually complete.

### 3. Sol gate — product convergence

Product Owner and Sol own:

- Demo comparison, information hierarchy, Tailwind/CSS, responsive composition, and shared visual
  primitives;
- keyboard/pointer/touch interaction, focus, scrolling, modal, transition, and reduced motion;
- final Coach-facing and Student-facing wording;
- accessibility and desktop plus exact 390×844 browser acceptance.

If product convergence exposes a missing projection or operation, return it to the Contract gate.
Do not move official rules into the browser as a workaround.

### 4. CI gate — integration

Run the Roadmap package's focused tests plus root `npm run check`, root `npm run build`,
`git diff --check`, applicable live E2E, migration preview/dry-run, and Supabase advisors. Update
Status and prepend an Engineering log entry. For a milestone/package delivery, make one cohesive
commit, push it, and confirm both GitHub Actions verify and migration-dry-run jobs for that commit.

## Current execution point

Begin at the exact `Next handoff` in `docs/PROJECT_STATUS.md`. The current approved phase is M3.5
Stage A. Do not begin M4 feature expansion until M3.5 is complete and its Contract gate is frozen.

## Implementation rules

### Formal Web

- Keep route implementation in route-owned modules; shared components stay small and presentation
  focused.
- Use TanStack Query for server data, never `useEffect` request state.
- Scope keys to verified Coach identity, keep private responses in memory, invalidate every affected
  projection, prefetch only authorized next views, and clear private cache on Auth subject change or
  sign-out.
- Render the smallest correct Loading/Error/Empty/Not Found/Ready/Refreshing/Mutating/Conflict
  boundary. Retain cached data and recoverable form input when safe.
- Mount `/t/:token` and `/r/:token` outside Coach Auth. Keep account/security/configuration in
  `/settings`; keep primary Coach workflows in the App Shell navigation.
- Product UI uses concise, calm, action-oriented language. Keep milestones, verification claims,
  schema/API vocabulary, and agent instructions out of rendered UI.
- Do not represent unavailable features with fake data, fake connectivity, or controls without an
  owning contract.

### API, domain, and Supabase

- Keep official data behind the Fastify API. Resolve Workspace only from verified identity.
- Expose complete business operations and route-shaped projections, not unrestricted table CRUD.
- Keep private Coach notes out of public projections and pages.
- Use version tokens for contested edits and return explicit conflicts without discarding current
  server state.
- Treat schedule overlaps as warnings unless an approved contract changes that invariant.
- Serialize migrations and shared Module-interface changes. Keep backend tables in the private
  schema and browser credentials out of server/administrative boundaries.
- Add focused tests for domain rules, state selection, authorization, persistence, migration,
  projection allowlists, and other non-trivial behaviour.

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

### Cohesive execution

Complete an authorized, safely bounded work package in one continuous run: implement every
contracted change, run its complete verification matrix, update Status, and where the package is
deliverable, commit, push, and confirm remote CI. Split work only when an unexpected blocker,
missing authority, or a concrete correctness risk makes a bounded stop necessary; record that
condition and resume from the exact remaining step.

After code, schema, config, architecture, product behaviour, or blocker changes:

1. Update Status facts, milestone state, risks, evidence, and Next handoff.
2. Prepend one concise Engineering log entry; older resolved entries may be faithfully compressed.
3. Name incomplete verification explicitly. Do not infer completion from local checks or push output.
4. Stop only for an unexpected blocker, required external change, or missing authorization/product
   decision. Otherwise finish the cohesive authorized package in the same run.

A formal package is complete only when its four Roadmap gates and remote CI evidence are complete.
A Demo-only change is complete when its affected flow is locally testable and Demo typecheck, tests,
and release-facing build pass.
