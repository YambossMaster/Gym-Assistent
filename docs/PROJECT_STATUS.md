# Gym Assistant project status

> Last verified: 2026-10-18. This is the always-read current-state dashboard. Approved scope and
> gates live in [`ROADMAP.md`](ROADMAP.md); package detail and history are loaded only through the
> pointers below.

## Current snapshot

| Field                         | Current value                                                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Active phase                  | **M8 — Taiwan Web/PWA commercial Beta release**                                                                                                        |
| Current package               | **M8-D — Open real-Coach Beta / Beta plan-access correction**                                                                                          |
| Current gate                  | **M8-D Beta opening active; purchase-history follow-up deployed; real-Coach admission open**                                                           |
| Active detail                 | [`status/M8/M8-D.md`](status/M8/M8-D.md)                                                                                                               |
| Direct carry-over             | [`status/M8/M8-C.md`](status/M8/M8-C.md)                                                                                                               |
| Completed baseline            | M0–M7.5, M8-A, M8-B, M8-B-Export, M8-B-Plan-Choice and M8-C internal Alpha                                                                             |
| Released code                 | `d54658bbd438981a1afd8c43cec2777eacc85213`; [Main CI #232](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39066095770) passed             |
| Worktree                      | M8-D single-lesson follow-up deployed; payment work remains separate                                                                                   |
| Production                    | 0 real Coaches, 3 test (owner 1, manual 2); classification integrity healthy; two issued Beta codes unused; no real Coach admitted                     |
| Production release            | [Main CI #232](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39066095770) deployed `d54658b` without new migrations and passed readiness |
| Pending Production migrations | None after M8-D release; both single-lesson migrations read back                                                                                       |

## Required context

The Product Owner approved the mobile Settings-button correction and reviewed four header previews.
PR #39 merged as `d54658bb`; Main CI #232 passed exact-SHA Fly deployment and readiness.
Independent Production HTTP checks and served-CSS read-back passed; installed-PWA visual recheck remains open.

**M8-D single-lesson correction:** the Product Owner froze
[`M8-D-SINGLE-LESSON-CONTRACT.md`](M8-D-SINGLE-LESSON-CONTRACT.md) on 2026-10-17.
The PO accepted the revised local happy path on 2026-10-18. [PR #35](https://github.com/YambossMaster/Gym-Assistent/pull/35)
merged as `8090bf80e6740043a5fb22dec1c252d53affba21`. Root 36/36, API 297/297,
Web 369/369 and API/Web builds passed locally. [Main CI #39049692349](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39049692349)
passed verify, browser UI, Development migration dry-run and a Production preview listing only
`20261017105438` and `20261017110659`. After the PO supplied literal `APPLY`,
[release #39049953196](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39049953196)
applied those two versions, deployed the same commit and passed readiness. Independent Production
`/api/ready`, `/` and `/login` checks returned HTTP 200. Migration history contains both versions;
4 Workspaces, 8 Students, 4 purchases and 4 Sessions remained, and all 3 completed Sessions have
a source. No orphan source or generated purchase was found. The separate pre-existing Development
Auth-delete trigger defect is recorded in the active [M8-D status](status/M8/M8-D.md).
The isolated branch's CI guard audited eight existing Development-only M8-E migration versions
without committing or applying them to Production.
The PO's 2026-10-18 post-release finding is now in an isolated follow-up branch: two unpriced
completed single lessons were missing from Student purchase history, while a later priced lesson
appeared. Focused API/Web tests now cover one purchase-history row per completed single lesson,
the effective Finance amount and the existing one-lesson purchase editor without a currency
selector. The PO inspected the three-row 5173 preview and authorized Main delivery. Local full
checks passed (root 36, API 298, Web 373) and both builds passed. PR #37's first verify run
`39057368440` exposed a new Web test's accidental dependency on local Vite Supabase values;
the test now mocks that client and passes with those values absent. Corrected [PR #37](https://github.com/YambossMaster/Gym-Assistent/pull/37)
passed all three required checks and merged as `aaa5a929`. [Main CI #39058008147](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39058008147)
passed verify, browser UI, migration no-op, Production history comparison and Fly deployment.
The Production migration history matched the commit with no pending versions. Independent
`https://formcoachdesk.com` requests to `/api/ready`, `/` and `/login` each returned HTTP 200.
Payment development/release hold: PO narrowed payment delivery to backend only. No payment frontend
changes were included in the welcome-notice release. API billing startup is hard-closed.
The planned NT$115/145 catalog and frontend integration remain local, not deployed by this release.
No paid access or merchant calls are enabled.
Development's applied `20261014100438` history is preserved separately; the ledger is an unapplied
draft. Production's migration sequence is unchanged. See [local handoff](M8-E-LOCAL-CHECKOUT.md),
[Contract](M8-E-IMPLEMENTATION-CONTRACT.md), and
[history isolation decision](adr/2026-10-14-development-billing-history.md).

For every formal-product task:

1. Read the active [`M8-D status`](status/M8/M8-D.md).
2. Read `ROADMAP.md` sections **Delivery model**, **M8-D**, **Sequencing and concurrency**, and
   **Roadmap change control**.
3. Read [`M8-C status`](status/M8/M8-C.md) only when the task touches Production, release workflows,
   Auth/legal admission, installed-PWA acceptance, or another M8-C carry-over.

Load older milestone Status only when the active file names it or the task investigates a delivered
baseline, regression, decision, migration, or exact historical evidence. For Demo work or formal-Web
convergence, follow [`status/DEMO.md`](status/DEMO.md). The preserved legacy Status is evidence, not
startup context.

## Blocking conditions and open gates

- CI #132 and #133 development migration linking both failed with `Invalid access token`.
  Read-only diagnosis confirms Supabase's `GitHub_Actions_CI` token is marked Expired; GitHub's
  development secret was last updated 2026-09-09. Yesterday's separate Production token remains valid.
  CI #133 verify/build, browser UI and Production preview passed, but deployment was skipped.
  Replacement was authorized and a scoped development token expiring 2027-10-08 was created.
  GitHub confirmed the development Secret update at 2026-10-09 23:41 Taipei; CI #133 attempt 2 passed
  every required job and deployed `c5db63f`. Public readiness and new JS/CSS markers passed.
- A new 90-day, Production-project-scoped Supabase PAT with Project Settings, API Keys, API Key
  Secrets and Connection Pooling Read permissions replaced only GitHub's
  `SUPABASE_PRODUCTION_ACCESS_TOKEN`. The previous PAT has not been revoked.
- Exact-SHA [CI #120 attempt 2](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37819308629)
  passed verify, browser UI, development migration dry-run and Production preview. The linked
  Production history and dry-run list only `20261008063726` as pending; the legal acceptance
  migration is no longer pending. Current Production schema/history and private grants were
  verified; its historical apply-run provenance remains an audit note, not an Alpha retest.
  Automatic deployment was deliberately skipped because a Production migration remained.
- The Product Owner supplied literal `APPLY`. [Manual release #2](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37823400258)
  re-previewed and applied `20261008063726_m8d_beta_plan_access_policy.sql`, deployed the exact
  `fb75b7d` commit, and returned `{"status":"ready"}` from `/api/ready`. An authenticated
  Production Web workspace loaded afterward; this does not satisfy installed-device or real-Coach
  admission acceptance.
- The Product Owner confirmed on 2026-10-11 that the current Production iPhone PWA Coach Notes
  short-tap, keyboard, drag and close-keyboard correction passes. The earlier Alpha core-path phone
  round stands; Android remains untested. Changed M8-D Settings and local PWA-update flows retain
  their own acceptance scope.
- Coach-note correction `0632e04` replaces the floating check with a fixed top bar and focus-only
  `返回`, and anchors the focus surface to Visual Viewport geometry without React rerenders during
  viewport panning. CI #121 passed every job and automatically deployed it; public readiness and
  bundle-marker checks passed. The Product Owner's follow-up videos disproved its installed-iOS
  behavior; the replacement now reuses the existing mobile header, contains empty/boundary drags,
  and never follows Visual Viewport scroll. CI #126 deployed exact SHA `3afb556`; readiness and live
  asset markers passed. The next installed-iOS recording showed header/toolbar gesture escape and
  initial browser caret panning; CI #128 deployed replacement `01423cd`, whose public assets contain
  whole-focus containment and caret `preventScroll`. CI #130 deployed `cd34fcc`; the next phone video
  showed premature entry, missing immediate keyboard focus and lower-caret viewport drift. The local
  replacement keeps notes read-only until a completed short tap, commits editing and focus within
  that click, compensates Visual Viewport position as well as height, and uses one flex layout for
  header/canvas/dock. Related tests, the synthetic browser matrix and CI #133 full verify pass;
  CI #133 attempt 2 delivered it after credential repair; the Product Owner's 2026-10-11 iPhone
  recheck passed.
- The Product Owner's first installed-PWA Alpha round covers the core paths already exercised;
  do not repeat those Happy Paths with autonomous DOM or visual E2E. First real-Coach observation
  belongs to M8-D Beta opening, not to internal-Alpha exit. Real-Coach admission remains open.
  The Product Owner approved Supabase Free logical backups without PITR and a PR plus required CI substitute for human
  Required Reviewers. The isolated backup/restore drill and PR pending-then-green behavior passed;
  `main` backup #10 passed encrypted artifact verification and isolated restore. The first automatic
  scheduled run is operational monitoring, not another M8-D acceptance gate.

## Next handoff

Continue M8-D's real-Coach Beta admission and installed-device checks from
[`status/M8/M8-D.md`](status/M8/M8-D.md). Keep payment work and the primary checkout isolated.

## Status system

- Structure and update protocol: [`status/README.md`](status/README.md)
- Active package: [`status/M8/M8-D.md`](status/M8/M8-D.md)
- Demo baseline: [`status/DEMO.md`](status/DEMO.md)
- New engineering log: [`status/log/2026-10.md`](status/log/2026-10.md)
- Complete pre-split record:
  [`status/archive/PROJECT_STATUS-legacy-through-2026-10-09.md`](status/archive/PROJECT_STATUS-legacy-through-2026-10-09.md)
