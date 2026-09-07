# Gym Assistant agent guide

## Objective

Build the formal Gym Assistant product through small, reviewable vertical slices while preserving the
archived Demo's validated behaviour, stored-data compatibility, and visual language.

## Start here

1. Always read `README.md`, `docs/ROADMAP.md`, and `docs/PROJECT_STATUS.md` before planning,
   implementing, or reporting formal-product status.
2. Run `git status --short` and reconcile it with `PROJECT_STATUS.md`; the worktree is current fact.
3. Read `CONTEXT.md`, `docs/ARCHITECTURE.md`, and applicable files under `docs/adr/` before changing
   domain language, module interfaces, authorization, data ownership, or deployment shape.
4. For archived Demo work, read `demo/README.md`, `demo/docs/ARCHITECTURE.md`,
   `demo/docs/DATA_MODEL.md`, and `demo/docs/TESTING.md` before implementation.

## Handoff discipline

- Treat `docs/ROADMAP.md` as the source for scope, order, dependencies, and completion criteria.
- Treat `docs/PROJECT_STATUS.md` as the source for live progress, blockers, evidence, and next action.
- After code, schema, config, architecture, or blocker changes, update `PROJECT_STATUS.md` and prepend
  one Engineering log entry before the final response.
- Keep `PROJECT_STATUS.md` concise. Older entries may be faithfully compressed when long, and resolved
  issue repetition may be pruned, while preserving dates, facts, decisions, verification, and resolution.
- Keep all status and next actions on the existing Roadmap. When scope, sequence, dependency, product
  baseline, or completion criteria need to change, stop affected work and ask the user. Modify
  `ROADMAP.md` only after explicit approval, then align `PROJECT_STATUS.md` and applicable ADRs.
- Begin from `Next handoff`; do not redo completed work whose evidence remains valid.
- Use separate Git worktrees/branches for concurrent tasks. Serialize Supabase migrations and shared
  module-interface changes; preserve every branch's Engineering log entry during integration.

## Change discipline

- Make the smallest complete change in the owning module; avoid replacing an entire page for a local request.
- Keep formal Web code in `apps/web`, HTTP/application code in `apps/api`, database migrations in
  `supabase/migrations`, and durable engineering state in `docs/`.
- Keep the backend as the only interface for official product data; the browser never selects a
  Workspace or receives database/service-role credentials.
- Keep demo page-specific UI in `demo/src/pages/<Feature>Page.tsx`, reusable UI in `demo/src/components/`, pure rules in `demo/src/domain.ts`, persistence/actions in `demo/src/store.tsx`, and shared types in `demo/src/types.ts`.
- Preserve the demo's `form-coach-mvp-v1` local-storage schema. When a schema change is necessary, add an explicit migration in `load()` and document it in `demo/CHANGELOG.md`.
- Keep private coach notes out of public projections and public pages.
- Treat schedule conflicts as warnings unless the requested product rule explicitly changes that policy.
- Add or update focused tests for domain, filtering, persistence migration, or other non-trivial logic.
- Update the relevant Markdown source of truth whenever architecture, data contracts, workflow, or user-visible behaviour changes.

## Completion gate

A formal-product change is complete when the Roadmap milestone criteria for its scope are met,
root `npm run check` and `npm run build` pass, relevant remote/schema/UI checks pass, and
`docs/PROJECT_STATUS.md` contains current evidence and the next handoff.

A Demo change is complete when the affected flow is locally testable, `npm run typecheck` and
`npm test` pass from `demo/`, `npm run build` passes for release-facing work, and the change can be
explained by naming only the files that own it.
