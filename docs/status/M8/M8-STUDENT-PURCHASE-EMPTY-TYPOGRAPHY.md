# Single Student purchase empty-state typography — released

> Owner: `codex/student-purchase-empty-typography`; scoped release record completed 2026-10-20 (Taipei).
> Base: Main `904fdbc`; [PR #70](https://github.com/YambossMaster/Gym-Assistent/pull/70) candidate `b44fb565aab7784d97adf995ed1e4d611a347977`, squash-merged as Main `d946b0e5790cd5929b042a690cfc0b5f651d2fde`.
> Scope: post-M8-D formal Web visual correction. No Roadmap scope, domain contract, migration or payment change.

## Result and impact

- On `/students/:id`, `尚無購課紀錄。` now uses the same 13px size, `#646a60` color and 1.55 line-height as `尚未建立固定課表。`.
- The new CSS selector applies only to the purchase empty paragraph. The original fixed-series rule, populated purchase rows and other paragraphs remain unchanged.
- The Product Owner authorized direct deployment on 2026-10-20. No Production data, provider or migration mutation was performed.

## Verification and release

- Focused preflight passed Web typecheck and related tests 16/16. The first full Web run exposed an existing selector-shape assertion after the fixed-series rule was rearranged; restoring that rule and adding a separate purchase rule resolved it.
- Final root `npm run check` passed: engineering scripts 39/39, API 384/384, Web 428/428, formatting and typechecks. Root `npm run build` and `git diff --check` passed. The build retained its existing large-chunk advisory.
- Playwright loaded a scoped two-card preview with a copy of the actual Web stylesheet. At 1280px and 390px the empty messages computed to 13px, 20.15px line-height and `rgb(100, 106, 96)`; the 390px document had no horizontal overflow. Ignored images are under `output/playwright/`. This preview did not establish authenticated-route behavior.
- PR #70 required `verify`, browser UI and Development migration jobs passed; Production preview was skipped on the PR as expected. [Main CI #300](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39440052242) passed `verify`, browser UI, Development migration, Production migration preview and `deploy-production` for `d946b0e`. The deployment job checked out that exact SHA, rejected superseding Main changes, deployed to Fly and reported machine `874ddec06064d8` healthy. No migration was pending.
- Independent Production `/api/ready`, `/` and `/login` reads returned HTTP 200. The already-open authenticated synthetic Student page was refreshed after deployment; both real DOM empty messages computed to 13px, 20.15px line-height and `rgb(100, 106, 96)`. The page remained 1583px wide with no overflow. The 390px authenticated route and installed PWA were not separately inspected; no fixed chrome or touch behavior changed.

This correction is released. No executable Next remains in this workstream.
