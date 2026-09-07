# Architecture

## Runtime shape

The application is a client-side React SPA. `src/main.tsx` installs the router and store provider; `src/App.tsx` only composes routes. Feature pages read and mutate application data through `useStore()`.

```text
src/
├── App.tsx                  route composition only
├── main.tsx                 browser bootstrap
├── pages/                   one module per user-facing feature
├── components/              reusable UI and feature-shared controls
├── utils/                   presentation-only helpers
├── store.tsx                persistence and application actions
├── domain.ts                pure business and scheduling rules
├── types.ts                 shared data contracts
├── seed.ts                  demo application data
├── exerciseCatalog.ts       built-in exercise definitions
└── styles.css               current global design system and responsive rules
```

## Ownership rules

| Change                       | Primary owner                     | Typical supporting files    |
| ---------------------------- | --------------------------------- | --------------------------- |
| Route or navigation          | `App.tsx`, `components/index.tsx` | target page                 |
| Page layout or interaction   | matching file in `pages/`         | `styles.css`                |
| Reusable control             | `components/`                     | consuming pages             |
| Lesson balance or scheduling | `domain.ts`                       | `domain.test.ts`            |
| Exercise search semantics    | `exerciseFilters.ts`              | `exerciseFilters.test.ts`   |
| Exercise performance history | `domain.ts`                       | `domain.test.ts`            |
| Mutation or persistence      | `store.tsx`                       | `types.ts`, migration tests |
| Data contract                | `types.ts`                        | store migration, seed, docs |
| Demo content                 | `seed.ts`, `exerciseCatalog.ts`   | relevant tests              |

Form dropdowns are owned by `components/FormSelect.tsx`. New single-select fields should use this
control so keyboard behaviour, form-value submission, and the shared scrollable menu treatment do
not drift between pages.

Calendar and lesson date/time editing are owned by `components/TimeRangeFields.tsx`. Both entry
points use the same date, start-time, and end-time controls.

Public training-image export is owned by `trainingRecordImage.ts`; the public page supplies only
the already-authorized training projection and optional shared Note.

The lesson and student-detail pages render performance summaries from pure selectors in `domain.ts`.
Both entry points reuse `components/PerformanceTrendModal.tsx` and its responsive SVG chart instead
of maintaining separate trend interfaces. The chart does not own or persist a second copy of
performance data.

## Dependency direction

Pages may depend on components, store hooks, domain selectors, utilities, and types. The store may depend on domain rules and types. Domain functions depend only on types and date utilities. Domain code must not import React, browser APIs, pages, or components.

## Local-change rule

A feature request should normally touch one page plus its owning logic/test. Moving unrelated pages, rewriting the full stylesheet, or replacing the store is an architectural change and requires an explicit reason in `CHANGELOG.md`.
