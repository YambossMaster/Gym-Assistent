# Testing

## Required checks

Every code change runs:

```bash
npm run check
```

This checks formatting, TypeScript, and unit tests in a fixed order.

Also run `npm run build` when changing routes, imports, dependencies, Vite/PWA files, or anything intended for release.

## Focus areas

| Touched area            | Required evidence                                                   |
| ----------------------- | ------------------------------------------------------------------- |
| `domain.ts`             | focused unit test covering success and conflict/edge cases          |
| `exerciseFilters.ts`    | filter combination and reset expectations                           |
| Performance history     | successful-set gate, metrics, unit conversion, identity, list order |
| `store.tsx` persistence | old-shape migration plus current-shape load test                    |
| Page interaction        | manual desktop and narrow-screen pass of the affected route         |
| Public link pages       | valid, expired, used, and private-field exclusion checks            |
| Styling                 | affected route at desktop and mobile widths; no horizontal overflow |

## Manual smoke path

1. Open `/today` and navigate through every sidebar destination.
2. Create or edit a student and verify lesson balance.
3. Add or move a calendar session and confirm conflicts are warnings.
4. Click and drag on the calendar, drag an existing lesson, verify scrolling down collapses the
   title and that it returns only after an extra upward gesture at the top, use Enter/Escape in an
   editor and Delete in a deletable modal, then verify a one-day availability edit does not alter
   the next week.
5. Edit and save a training record.
6. Confirm failed and unmarked sets do not change any best value. Verify the compact lesson header,
   then open the growth trajectory at desktop and narrow widths.
7. From a student detail page, open personal performance, verify movement-count sorting, and confirm
   its trend summary shows only previous and personal best.
8. Filter, create, edit, favorite, and delete an exercise.
9. Generate both public link types and verify their limited data exposure.
10. Reload the page and confirm local data persists.

The reset-demo action is destructive to local browser data; use it only with disposable test data.
