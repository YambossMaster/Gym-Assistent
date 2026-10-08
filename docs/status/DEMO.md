# Demo status and loading route

> State: preserved, independently runnable product reference. Read only for direct Demo maintenance
> or formal-Web convergence against a matching Demo flow.

## Role

The `demo/` React + TypeScript + Vite application preserves the validated pre-formal-product route
structure, interactions, visual language and responsive behavior. It is a reference for product
intent, not Production persistence or authority.

## Boundaries

- Demo data lives in browser `localStorage` under the preserved `form-coach-mvp-v1` format.
- Demo seed facts, local-storage relationships and client-side business authority must not be copied
  into Production UI or the Fastify/PostgreSQL model.
- Formal data and authorization remain behind the API; Workspace comes from verified identity.
- Modify the stored Demo schema only through an explicit Demo migration with a changelog entry.
- A formal-Web task inspects only the matching `demo/src/pages/` route and reusable components; it
  does not load every Demo document or page by default.

## Direct Demo maintenance reading

Before changing Demo code, read:

1. `demo/README.md`
2. `demo/docs/ARCHITECTURE.md`
3. `demo/docs/DATA_MODEL.md`
4. `demo/docs/TESTING.md`

Then use the owning files:

- pages and flows: `demo/src/pages/`
- reusable presentation: `demo/src/components/`
- pure rules: `demo/src/domain.ts`
- persistence/actions: `demo/src/store.tsx`
- shared types: `demo/src/types.ts`

## Completion

A Demo-only change is locally reviewable and passes the Demo typecheck, tests and release-facing
build. Formal-product package gates, migrations and remote evidence do not apply unless that same
task also changes the formal application.

Historical Demo-related records remain in the legacy Status and Git history; retrieve them only for
a named regression, decision or migration.
