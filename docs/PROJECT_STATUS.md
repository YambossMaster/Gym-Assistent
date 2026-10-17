# Gym Assistant project status

> Last verified: 2026-10-18. This is the always-read current-state dashboard. Approved scope and
> gates live in [`ROADMAP.md`](ROADMAP.md); package detail and history are loaded only through the
> pointers below.

## Current snapshot

| Field                         | Current value                                                                                                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Active phase                  | **M8 — Taiwan Web/PWA commercial Beta release**                                                                                                      |
| Current package               | **M8-D — Open real-Coach Beta / Beta plan-access correction**                                                                                        |
| Current gate                  | **M8-D Beta opening active; single-lesson Sol accepted by PO, CI delivery in progress**                                                              |
| Active detail                 | [`status/M8/M8-D.md`](status/M8/M8-D.md)                                                                                                             |
| Direct carry-over             | [`status/M8/M8-C.md`](status/M8/M8-C.md)                                                                                                             |
| Completed baseline            | M0–M7.5, M8-A, M8-B, M8-B-Export, M8-B-Plan-Choice and M8-C internal Alpha                                                                           |
| Released code                 | `4f49ca666914d2b8e9cefe30a4cf72e65dbff2ad`; [Main CI #218](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38698764401) passed           |
| Worktree                      | Landing return-to-top deployed; payment work remains separate                                                                                        |
| Production                    | 0 real Coaches, 3 test (owner 1, manual 2); classification integrity healthy; two issued Beta codes unused; no real Coach admitted                   |
| Production release            | [Main CI #218](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38698764401) deployed `4f49ca6` and passed readiness; no migration needed |
| Pending Production migrations | None after release #8; three pre-existing Workspaces remain unmarked                                                                                 |

## Required context

**M8-D single-lesson correction:** the Product Owner froze
[`M8-D-SINGLE-LESSON-CONTRACT.md`](M8-D-SINGLE-LESSON-CONTRACT.md) on 2026-10-17.
The isolated `codex/m8d-single-lesson` branch now has locally verified Student price, unrestricted
active-Venue scheduling, bounded no-package Series, fixed completion sources, zero-income ledger correction,
Finance and purchase-history correction, and explicit package re-evaluation. Local 5173 serves this
branch's Web with API 3001; the unrelated primary checkout and API 3000 remain separate. Only
the two M8-D migrations were applied to Development after an exact two-file official dry-run;
Production and M8-E were untouched. Authenticated Development and browser flows passed, and the
earlier local check passed root 36, API 295, Web 367 plus API/Web build. The PO confirmed that Free
can complete single lessons while after-the-fact correction waits for Pro or Prime. The PO then
corrected the missing-price flow: ordinary Finance shows `+$0` with a missing-price note; the Coach
edits that row and independently sets Student price for future lessons. The separate pending card
has been removed. Development API and desktop/390px browser checks passed this revised flow;
Root 36/36, Web 368/368, full API 295/295 with a 120-second local test limit and API/Web build
passed. The default API run had a PDF export timeout; its isolated file passed 5/5. Synthetic data
were removed. A subsequent PO correction separated Finance overrides from single-lesson sources,
added simultaneous zero commission, independent expense reset, same-time income-first ordering,
Venue cost labels and compact source links. Focused API/Web tests and an isolated Development API
journey passed; the synthetic Coach and records were removed. The Venue-record follow-up displays
zero commission and effective single-lesson Finance amounts, identifies no-purchase Sessions as
`單堂計費`, and uses `不計` as the short untracked label. The PO's 2026-10-18 local happy-path review
accepted this version and authorized Main, CI and deploy. Root 36/36, API 297/297, Web 369/369
and API/Web builds pass. Production has not yet applied the two M8-D migrations; the exact-SHA
CI preview and migration release remain pending. A separate pre-existing
Development Auth-delete trigger defect is recorded in the active [M8-D
status](status/M8/M8-D.md).
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

Deliver the accepted single-lesson correction from isolated `codex/m8d-single-lesson` through a
protected PR into `main`. Confirm exact-SHA CI including the Production migration preview, then
use the manual migration-release workflow for the same commit and verify readiness and migration
read-back. The PO authorized Main/CI/deploy on 2026-10-18; the release workflow still requires its
literal `APPLY` confirmation at dispatch. Do not include M8-E payment work.

The real-Coach Beta admission and installed-device gates remain open in
[`status/M8/M8-D.md`](status/M8/M8-D.md). Keep payment work and the primary checkout isolated.

## Status system

- Structure and update protocol: [`status/README.md`](status/README.md)
- Active package: [`status/M8/M8-D.md`](status/M8/M8-D.md)
- Demo baseline: [`status/DEMO.md`](status/DEMO.md)
- New engineering log: [`status/log/2026-10.md`](status/log/2026-10.md)
- Complete pre-split record:
  [`status/archive/PROJECT_STATUS-legacy-through-2026-10-09.md`](status/archive/PROJECT_STATUS-legacy-through-2026-10-09.md)
