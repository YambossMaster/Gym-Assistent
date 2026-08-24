# Gym Assistant agent guide

## Objective

Maintain the existing React application through small, reviewable changes. Preserve working behaviour, stored user data compatibility, and the current visual language unless the task explicitly changes them.

## Start here

1. Read `README.md` for the product boundary and supported commands.
2. Read `docs/ARCHITECTURE.md` before changing routes, page ownership, shared UI, or directory structure.
3. Read `docs/DATA_MODEL.md` before changing `types.ts`, `store.tsx`, `domain.ts`, seed data, persistence, scheduling, or public-link behaviour.
4. Read `docs/TESTING.md` before implementation and run the checks it assigns to every touched area.

## Change discipline

- Make the smallest complete change in the owning module; avoid replacing an entire page for a local request.
- Keep page-specific UI in `src/pages/<Feature>Page.tsx`, reusable UI in `src/components/`, pure rules in `src/domain.ts`, persistence/actions in `src/store.tsx`, and shared types in `src/types.ts`.
- Preserve the `form-coach-mvp-v1` local-storage schema. When a schema change is necessary, add an explicit migration in `load()` and document it in `CHANGELOG.md`.
- Keep private coach notes out of public projections and public pages.
- Treat schedule conflicts as warnings unless the requested product rule explicitly changes that policy.
- Add or update focused tests for domain, filtering, persistence migration, or other non-trivial logic.
- Update the relevant Markdown source of truth whenever architecture, data contracts, workflow, or user-visible behaviour changes.

## Completion gate

A change is complete when the affected flow is locally testable, `npm run typecheck` and `npm test` pass, `npm run build` passes for release-facing work, and the change can be explained by naming only the files that own it.
