# M8-D status — Open real-Coach Beta

> State: active. Last verified: 2026-10-10. This is the working brief for M8-D; approved scope and
> completion criteria remain in `docs/ROADMAP.md` and the frozen Contract documents.

## Package position

| Gate      | State                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------- |
| Contract  | Beta plan-access correction is frozen; broader admission, backup and restore gates remain binding |
| Sol       | Settings correction and stopped-machine recovery reached Main at `6073cf1`                        |
| CI        | Settings CI #139, release #4 and recovery CI #144 complete; admission checks remain open          |
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

- Delivered release-workflow hardening separates actual schema migrations from release-gate/Fly
  configuration changes. It validates declared Fly secret names before ordinary deploy and before
  Production migration apply, fails before SQL for missing startup-required values, warns for
  feature-required degradation, captures redacted bounded Fly logs plus machine state on failure,
  and prevents empty commits from deploying. Migration changes retain the preview and literal
  `APPLY` hold. Focused safeguard tests pass; Product Owner review and the broader delivery gate are
  complete locally: root check passes 33 release tests, API 43 files / 209 tests and Web 78 files /
  349 tests; production build and development migration dry-run pass. Exact SHA `8f8c480` is on
  Main; CI #146 passed every required job, deployed it to Fly and passed readiness. Independent
  external checks returned 200 for readiness, root and `/login`.
- GitHub job evidence corrects the incident interpretation: CI #143 for `e2e275f` successfully ran
  `deploy-production` and readiness. The empty `6073cf1` commit began while that workflow was still
  running, so it was not required by the safeguard. Release handling must wait for the exact-SHA job
  to reach a terminal state before deciding on a rerun or new commit.

- The Product Owner's calendar-integration review replaces the stacked collapsibles with two tabs,
  makes labels and all controls directly interactive, keeps the active private URL copyable across
  dialog sessions, uses Toast feedback and requires a destructive reset confirmation. The retained
  Google／Apple guide gives short device-specific steps, explains Google's desktop-only URL setup,
  sets honest refresh expectations and is now default-collapsed below the interactive management
  controls. Local Sol
  adds an HMAC-derived URL contract that stores only a random salt plus token hash, and migration
  `20261010054011_calendar_subscription_recoverable_url.sql`. It is applied to development and
  Production. Exact-SHA CI #139 passed the full gate, release #4 applied this migration, and
  recovery CI #144 deployed the corrected Fly auto-start configuration.
  Isolated Chromium review at desktop and 390×844 confirms Tabs, the portalled quick-range menu,
  date picker and checkboxes remain visible and interactive. Product Owner review and the broader
  CI gate passed. The development-only Calendar subscription secret remains configured in the
  ignored API environment; the normal Windows launcher passes API readiness and serves `/today`.
  Production still needs its own stable Calendar application secret. Until then, existing feeds
  remain readable while create/reset/recovery URL operations fail closed with 503.
- The shared setting-dialog continuation cue now applies at desktop as well as mobile widths. It
  measures each declared scroll owner, adds a shallow bottom fade / `向下滑看更多 ↓` affordance only
  while content remains, and clears it at the lower boundary or whenever the content fits. The
  Product Owner rejected the added scrollbar rail, so the established thin transparent-track style
  is restored. A higher-specificity inherited form margin was the real blank strip below the fixed
  header; the export form now starts exactly at the header boundary. Calendar sharing choices now
  persist without exposing implementation-status copy, and the unsupported reserved-time choice is
  removed from both subscription and one-time export. Changing Calendar tabs now resets the shared
  scroll owner to its true top. The collapsed guide follows URL and advanced management, and
  single-export options use a compact row with dark CTA. Redundant student-name explanation copy is
  removed; the mobile subscription URL and its accessible icon-only copy action remain on one row.
  The Product Owner approved this presentation correction for the combined Main delivery.
- Development migration `20261010054011` was applied after the local Calendar dialog reproducibly
  failed while the API remained ready. A read-only schema probe proved `token_salt` was absent before
  apply and present afterward; retrying the same authenticated Chrome flow then loaded both Calendar
  tabs. Production release #4 later applied the same migration.
- The Product Owner's installed-PWA review found the finance export form lacked scannable field
  hierarchy and that all three custom selects appeared inert. The local correction groups controls
  into Time, Filter and Export sections, exposes persistent labels and the private-note checkbox,
  de-emphasizes the footer summary, and raises portalled select menus above the dialog backdrop.
  Focused Web tests pass 3 files / 11 tests; isolated desktop and 390×844 browser review confirms
  the middle scroller, fixed footer and visible select menus. The Product Owner approved the
  accumulated correction for commit, Main push, CI and deployment; it is now deployed.
- On 2026-10-10 the Product Owner reported the first Alpha PWA test round finished and requested
  export redesign discussion, then approved local implementation of the two Settings specifications.
  This is not blanket acceptance of the remaining admission gates. The follow-up explicitly
  authorizes commit, push Main, CI and deployment after checks. On 2026-10-10 the Product Owner also
  stated `APPLY`; the release workflow still requires the final literal confirmation after its
  exact-SHA Production preview.
- The explicitly authorized owner-account Prime grant was applied to Production Workspace
  `0c541f3a-257f-49f6-8318-49611435bfe9`. A read-back confirmed `permanent`, no expiry and effective
  `advanced`; operator event `44c82ae1-aa27-4b9c-9a22-57c707ffa242` records the request. No code was
  consumed, payment created or subscription changed. Authenticated PWA display was not checked.
- The same verified owner Email was explicitly granted revocable, no-expiry Prime in the separate
  development project for local feature testing. Development read-back confirms Workspace
  `4ba6de2b-520d-4c65-88d0-1fd7d529ae0b` is `permanent` / effective `advanced`; its existing
  zero-price subscription row remains intact. Operator event
  `802e0c30-805d-45c8-8293-155be3272f78` records the request. Production was not touched.

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
  unstarted at that checkpoint, pending fresh exact-SHA CI and preview for the private-path
  correction. Release #3 later completed; see the Next handoff for current state and the engineering
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

Release-workflow hardening is complete: exact SHA `8f8c480` passed CI #146 verify/build, browser,
development migration dry-run, fresh no-pending Production preview, runtime-secret preflight, Fly
deployment and readiness. Independent external checks returned 200 for `/api/ready`, root and
`/login`. Do not create a new commit merely to retrigger a still-running exact-SHA workflow.

Configure one stable, independently generated 256-bit `CALENDAR_SUBSCRIPTION_SECRET` in Fly
Production. It is an application cryptographic secret, not a Supabase access token. Fly will restart
the machine after the secret change; recheck `/api/ready`, root and `/login`, then verify an
authenticated Calendar subscription create, recover and reset flow. Never print the secret or a
private subscription URL in evidence.

Exact-SHA CI #139 passed for the approved Settings correction (API 208 / Web 349), and release #4
applied only `20261010054011`. The following deploy failure was unrelated to the missing Calendar
secret: CI #142 diagnostics proved the existing Fly machine was stopped while
`auto_start_machines = false`. The API was also changed to start fail-closed without the optional
secret, preserving existing feed reads and limiting only create/reset/recovery URL operations.
After enabling Fly auto-start, CI #144 deployed exact SHA `6073cf1` and passed readiness;
independent browser-equivalent checks returned 200 for root and `/login`, and `/api/ready` returned
`{"status":"ready"}`.

PO approved the 256-bit private path after the bounded Basic Auth Google test failed and explicitly
accepted Fly upstream path-log residual risk. The synthetic Google private feed returned 200 to
Google and its event appeared in the Chrome calendar. Apple initial ICS subscription passed;
third-party refresh timing remains unverified. See `docs/CALENDAR-SUBSCRIPTION-SECURITY.md`.
CI #137 passed for `ef347c4` (API 208 / Web 343, browser UI, migration dry-run and Production
preview). Release #3 re-previewed and applied only `20261009171747`, deployed the same commit,
and passed `/api/ready`; separate public readback returned 200. An invalid private feed returned
404 and `no-store, private`. Production migration history and RLS/private grants were read back;
security advisor has only the pre-existing Auth leaked-password-protection warning. The temporary
probe was stopped and all three disposable Google subscriptions were removed. Next is PO installed-
PWA acceptance of the two Settings tools; external subscription refresh cadence is unverified.
The prior installed-device detail, recovery, reviewer-control, legal-migration provenance and
real-Coach admission gates remain open; the completed first Alpha round is not blanket evidence
for those gates. Old PAT revocation remains separately authorized work.
