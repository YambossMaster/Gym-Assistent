# Gym Assistant project status

> Last verified: 2026-10-10. This is the always-read current-state dashboard. Approved scope and
> gates live in [`ROADMAP.md`](ROADMAP.md); package detail and history are loaded only through the
> pointers below.

## Current snapshot

| Field                         | Current value                                                                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Active phase                  | **M8 — Taiwan Web/PWA commercial Beta release**                                                                                                    |
| Current package               | **M8-D — Open real-Coach Beta / Beta plan-access correction**                                                                                      |
| Current gate                  | **Settings correction: Google private-URL acceptance passed; fresh exact-SHA CI/release pending**                                                  |
| Active detail                 | [`status/M8/M8-D.md`](status/M8/M8-D.md)                                                                                                           |
| Direct carry-over             | [`status/M8/M8-C.md`](status/M8/M8-C.md)                                                                                                           |
| Completed baseline            | M0–M7.5, M8-A, M8-B, M8-B-Export and M8-B-Plan-Choice                                                                                              |
| Release candidate             | `13587f054e44ec370b89f6b9398b92cc199c2fea`; [CI #136](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37977614654) green, not deployed |
| Worktree                      | Private-path and Prime-expiry correction pending new commit; prior feature SHA passed API 201 / Web 342, builds, browser UI and migration previews |
| Production                    | Healthy internal Alpha; two synthetic Coaches; no real Coach admitted                                                                              |
| Production release            | CI #133 attempt 2 deployed `c5db63f`; public readiness and new JS/CSS marker checks passed                                                         |
| Pending Production migrations | Only `20261009171747` pending; preview passed and PO supplied APPLY; not applied                                                                   |

## Required context

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
  migration is no longer pending, but its application provenance has not been established here.
  Automatic deployment was deliberately skipped because a Production migration remained.
- The Product Owner supplied literal `APPLY`. [Manual release #2](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37823400258)
  re-previewed and applied `20261008063726_m8d_beta_plan_access_policy.sql`, deployed the exact
  `fb75b7d` commit, and returned `{"status":"ready"}` from `/api/ready`. An authenticated
  Production Web workspace loaded afterward; this does not satisfy installed-device or real-Coach
  admission acceptance.
- Installed iOS/Android review of the current mobile corrections remains separate M8-D acceptance
  evidence.
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
  CI #133 attempt 2 delivered it after credential repair; device recheck stays open.
- Real-Coach admission, backup/restore evidence and required Production reviewer controls remain
  governed by the M8-D Contract and Roadmap gate.

## Next handoff

PO approved the Google-compatible 256-bit private subscription path and accepted Fly upstream
request-path log residual risk. Google fetched the synthetic private path and displayed its event;
Apple initial ICS compatibility was also observed. Prime expiry returns one notice, not schedules.
See [security design](CALENDAR-SUBSCRIPTION-SECURITY.md). Proceed with fresh exact-SHA CI, Production
preview, authorized joint migration/deploy, readiness and PO installed-PWA acceptance. The three
disposable Google subscriptions were removed and the synthetic probe/tunnel stopped.
Main `13587f0` has green CI #136; Production preview lists only `20261009171747`, and literal APPLY
is already authorized for the previewed migration. New changes need fresh exact-SHA CI/preview; neither
migration nor deployment started. See
[engineering contract](SETTINGS-DATA-IMPLEMENTATION.md) for evidence and exact resume point.
External subscription refresh cadence and installed-PWA acceptance remain separate; PO tests the
phone after deploy.
The prior M8-D admission/recovery/provenance/device gates and old-PAT authorization remain separate.

## Status system

- Structure and update protocol: [`status/README.md`](status/README.md)
- Active package: [`status/M8/M8-D.md`](status/M8/M8-D.md)
- Demo baseline: [`status/DEMO.md`](status/DEMO.md)
- New engineering log: [`status/log/2026-10.md`](status/log/2026-10.md)
- Complete pre-split record:
  [`status/archive/PROJECT_STATUS-legacy-through-2026-10-09.md`](status/archive/PROJECT_STATUS-legacy-through-2026-10-09.md)
