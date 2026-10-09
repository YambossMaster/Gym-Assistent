# M8-D status — Open real-Coach Beta

> State: active. Last verified: 2026-10-10. This is the working brief for M8-D; approved scope and
> completion criteria remain in `docs/ROADMAP.md` and the frozen Contract documents.

## Package position

| Gate      | State                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------- |
| Contract  | Beta plan-access correction is frozen; broader admission, backup and restore gates remain binding |
| Sol       | Accumulated plan-access, mobile and release safeguards reached Main at `fb75b7d`                  |
| CI        | #120 attempt 2 and exact-SHA Production migration release #2 green; admission checks remain open  |
| Admission | No real Coach admitted; Production contains two synthetic Coaches                                 |

M0–M7.5, M8-A, M8-B, M8-B-Export and M8-B-Plan-Choice are protected delivered baselines. M8-C
created the Production internal-Alpha foundation but retains the carry-over listed in
[`M8-C.md`](M8-C.md). M8-E owns paid checkout and must not be pulled into this package.

## Binding Beta plan policy

- Ordinary verified Coaches start and remain on Free while checkout is unavailable.
- One single-use plan-tester code marks the Product Owner Workspace and permits self-switching among
  Free, Pro and Prime for plan-flow testing.
- One single-use permanent code grants Prime without an end date.
- One shared promotional code grants one 60-day Prime trial per verified Email and is not globally
  consumption-capped.
- Raw operational codes stay outside source control; PostgreSQL stores SHA-256 digests.
- API authorization and capacity enforcement own the policy. Hidden Web controls are never the only
  restriction.
- Historical zero-price plan choices do not grant ordinary Coaches paid-plan access.
- M8-E owns provider-backed paid activation; expiry never charges or deletes Coach data silently.

The detailed behavior and migration contract live in
`docs/M8-D-BETA-PLAN-ACCESS-CONTRACT.md` and
`supabase/migrations/20261008063726_m8d_beta_plan_access_policy.sql`.

## Current repository and environment state

- On 2026-10-10 the Product Owner reported the first Alpha PWA test round finished and requested
  export redesign discussion, then approved local implementation of the two Settings specifications.
  This is not blanket acceptance of the remaining admission gates. The follow-up explicitly
  authorizes commit, push Main, CI and deployment after checks; Production APPLY stays separate.
- The explicitly authorized owner-account Prime grant was applied to Production Workspace
  `0c541f3a-257f-49f6-8318-49611435bfe9`. A read-back confirmed `permanent`, no expiry and effective
  `advanced`; operator event `44c82ae1-aa27-4b9c-9a22-57c707ffa242` records the request. No code was
  consumed, payment created or subscription changed. Authenticated PWA display was not checked.

- The Product Owner narrowed the next design to finance exports and calendar integration, both
  under Settings as separate features, and deferred training/performance export options. Existing
  click-triggered Prime Upsell remains for Free/Pro; do not add entrances or banners to their daily
  Finance/Calendar paths. Review drafts: [finance](../../FINANCE-EXPORT-DRAFT.md) and
  [calendar](../../CALENDAR-INTEGRATION-DRAFT.md). On 2026-10-10 the PO approved both specifications
  with Coach-prefixed filenames and arbitrary historical ranges (up to 366 inclusive days).
  The Roadmap records this follow-on correction without reopening the M8-B-Export baseline.

- Settings-data Contract is frozen in those specifications and
  [engineering contract](../../SETTINGS-DATA-IMPLEMENTATION.md). Local Sol includes two separate
  panels, XLSX/CSV exports, ICS downloads, hashed-token subscriptions and minimal cancellation
  history. Legacy API returns 410 when both replacements are installed. No underlying records
  are deleted. The draft TWD cents example was corrected against existing whole-dollar storage.
- Focused API 7 files / 37 tests and Web 2 files / 5 tests pass; both typechecks pass. Offline sample
  generator produces revised files in ignored `output/settings-data-review-v2/`. Native Excel
  read-only rendering and visual inspection now pass; the summary puts totals before compact notes.
- Development preview and apply completed for calendar migration `20261009171747` and its two
  reviewed baseline dependencies. Actual runtime-role rollback-only RLS test passes 9 assertions;
  no fixture rows remain. Production was not changed. Full and production-only dependency audits
  report 0 findings; actual ExcelJS resolves patched uuid 11.1.1 and focused tests pass afterward.
- The initial serializer blocker is corrected with an isolated, terminable Worker and streaming
  XLSX rows. Compiled-JS 20,000-row rerun: 14,216 ms / peak 203 MiB / max main-loop delay 94 ms
  (formerly 20,919 ms / 514 MiB / 13,741 ms). This is local serializer, not production-host/DB load.
  Background status survives route changes; duplicate guarding, cancellation, elapsed time,
  ready/save action and five-minute in-memory expiry are implemented. No fake ETA or closed-App
  continuation promise. Desktop/390x844 synthetic Chrome flow passed through file-ready state;
  the connector disconnected during download-event observation, so device saving is unverified.
  Apple and Google initial subscription checks now passed with synthetic feeds; installed-PWA
  acceptance remains separate. The PO accepted Fly upstream private-path log residual risk.
- Release preflight: API full run 200 passed / one existing PDF timeout; isolated unchanged format
  rerun 5/5 passed. Web 77 files / 342 tests, both typechecks and production builds pass. Real
  development calendar adapter lifecycle passes under rollback-only savepoints; independent readback
  confirms no fixtures remain. Latest streaming workbook passed native Excel/PDF visual recheck.
  Exact-SHA remote CI remains mandatory; this is not a claim that the initial full run was green.
- Main `13587f054e44ec370b89f6b9398b92cc199c2fea` is pushed; [CI #136](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37977614654)
  passed API 201 / Web 342, builds, browser UI and both migration checks. Production preview lists
  only `20261009171747`; PO supplied literal APPLY for that preview. Migration/deploy remain
  unstarted pending fresh exact-SHA CI and preview for the private-path correction. See engineering
  contract for the accepted upstream path-log residual risk.

- Latest deployed correction: `c5db63f3b315aa84ca606aafd3269d7ed112e531`.
- Product Owner-retained M8-D corrections, release safeguards and Status split were committed
  together. Reconcile any subsequent work with `git status --short`.
- Production is a healthy Tokyo Fly internal Alpha with two synthetic Coaches and no real customer
  data.
- Production preview on CI #120 attempt 2 lists only plan-access migration `20261008063726` as
  pending. Legal acceptance `20261006145359` is no longer pending according to linked history and
  dry-run; its application provenance remains to be established.
- The new Production-scoped PAT has the four required Read scopes and passed the pooler/history
  pre-flight. It replaced only GitHub's Production access-token secret; the previous PAT remains
  valid pending separately authorized revocation.
- [Manual Production release #2](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37823400258)
  applied `20261008063726`, deployed exact SHA `fb75b7d878d8d50731e15fbcf1d771a451dbee30`,
  and returned `{"status":"ready"}` from `/api/ready` on 2026-10-09. The authenticated Web
  workspace loaded afterward. This is implementation delivery, not real-Coach admission.
- [CI #121](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37830139443) passed verify,
  browser UI, development migration dry-run and Production preview for `0632e04`, then automatically
  deployed the non-migration Coach-note correction. Public `/api/ready` and deployed JS/CSS marker
  checks passed afterward.
- [CI #126](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37833191147) passed verify
  (API 183 tests, Web 322 tests and build), browser UI, both migration gates and automatic Production
  deploy for `3afb556`. Public readiness returned `ready`; deployed JS/CSS markers confirm the shared
  header exit event and touch containment are present and the old viewport-top variable is absent.
- [CI #128](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37883138506) passed verify
  (API 183 tests, Web 325 tests and build), browser UI, both migration gates and automatic Production
  deploy for exact SHA `01423cd`. Public readiness returned `ready`; deployed JS/CSS markers confirm
  caret `preventScroll`, whole-focus touch containment and non-scrollable header/toolbar touch action.
- [CI #130](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37895583759) passed verify
  (API 183 tests, Web 326 tests and build), 2 browser UI cases, both migration gates and automatic
  Production deploy for exact SHA `cd34fcc`. Public readiness returned `ready`; deployed
  `/assets/index-DFzqqHzH.js` contains the focus root, viewport-height and mobile-note-canvas markers.

- [CI #133](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37949502049) for exact SHA
  `c5db63f` passed verify (API 183 tests, Web 334 tests and production builds), browser UI and
  Production migration preview. Development migration linking failed with `Invalid access token`,
  repeating CI #132's credential rejection on attempt 1. After the authorized development token
  replacement, attempt 2 passed migration dry-run and deploy-production. Public readiness returned
  ready; index-6I3S6YCI.js and index-Dh6z7Ukn.css contain the new viewport-top markers, and the JS
  contains read-only entry and caret preventScroll. No migration was applied during this correction.

## Current local review inventory

| Area                    | Current fact                                                                                                            | Remaining evidence                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Release safeguards      | CI #120 proved fail-fast 403 on attempt 1, passed pooler/history/dry-run on attempt 2, and release #2 applied/deployed  | Continue monitoring future releases; no current release blocker |
| Plan access             | Free-first tester/permanent/promotional policy deployed with Production migration `20261008063726`                      | Live redemption and real-Coach admission checks                 |
| Mobile Training         | Completed-tap entry and visual-position compensation passed related tests, browser matrix and CI #133; deployed c5db63f | Installed-phone keyboard and lower-paragraph recheck            |
| Mobile dialogs/settings | Capability sheets, Student field scroller, required labels and hidden-content cues passed focused and combined CI tests | Authenticated/installed-phone rendering                         |
| Scheduling/Venue        | Fixed-schedule default/copy and Venue decision preview passed combined CI                                               | Combined browser/product review                                 |

Exact pre-split local test counts and diagnostic narratives remain in LOG-450–LOG-462 of the
[legacy Status](../archive/PROJECT_STATUS-legacy-through-2026-10-09.md). Load those entries only
when reviewing the matching change or evidence claim.

## Direct dependencies and conditional context

Always read:

- `docs/ROADMAP.md`: Delivery model, M8-D, Sequencing and change control.
- `docs/M8-D-BETA-PLAN-ACCESS-CONTRACT.md` for plan-access implementation or review.

Read [`M8-C.md`](M8-C.md) for Production, release workflow, legal/Auth admission or installed-PWA
work. For entitlement regressions predating M8-D, search the legacy M8-B and M8-B-Plan-Choice
records. For formal-Web route convergence, follow [`../DEMO.md`](../DEMO.md) and inspect only the
matching Demo route/components.

## Blockers and open gates

The former Coach-note credential delivery hold is resolved.
Read-only diagnosis found `GitHub_Actions_CI` marked Expired in Supabase and the development
GitHub secret last updated 2026-09-09; the separate Production secret was updated 2026-10-08 and
its current token expires 2027-01-07. The workflow and CLI lockfile did not change between the
successful CI #130 and failed correction runs. No token or secret was mutated during diagnosis.
The Product Owner authorized the replacement. A new development-project-scoped PAT with only
Project Settings, API Keys, API Key Secrets and Connection Pooling Read was created, expiring
2027-10-08. After the owner completed Confirm access, GitHub displayed Secret updated at
2026-10-09 23:41 Taipei. The one-time token display was closed; CI #133 attempt 2 passed and deployed.
Do not bypass the required migration dry-run gate; the Production token/preview already passed.

1. Establish the legal acceptance migration's apply provenance; do not reapply an already-recorded
   migration. Revoke the old PAT only after separate authorization; the new PAT expires 2027-01-07.
2. Complete the Roadmap's backup/restore, Production reviewer, support/admission and real-Coach Beta
   gates before admitting the first real Coach.
3. Record installed-device coverage honestly; browser 390×844 evidence is not installed-PWA proof.

## Next handoff

PO approved the 256-bit private path after the bounded Basic Auth Google test failed and explicitly
accepted Fly upstream path-log residual risk. The synthetic Google private feed returned 200 to
Google and its event appeared in the Chrome calendar. Apple initial ICS subscription passed;
third-party refresh timing remains unverified. See `docs/CALENDAR-SUBSCRIPTION-SECURITY.md`.
CI #136 covers the earlier `13587f0` candidate; obtain fresh exact-SHA CI/preview for the local
changes. Literal APPLY and main/deploy permission are granted. No Production migration/deploy has
run. The temporary probe was stopped and all three disposable Google subscriptions were removed.
The prior installed-device detail, recovery, reviewer-control, legal-migration provenance and
real-Coach admission gates remain open; the completed first Alpha round is not blanket evidence
for those gates. Old PAT revocation remains separately authorized work.
