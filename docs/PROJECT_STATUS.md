# Gym Assistant project status

> Last verified: 2026-10-09. This is the always-read current-state dashboard. Approved scope and
> gates live in [`ROADMAP.md`](ROADMAP.md); package detail and history are loaded only through the
> pointers below.

## Current snapshot

| Field                         | Current value                                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Active phase                  | **M8 — Taiwan Web/PWA commercial Beta release**                                                                                        |
| Current package               | **M8-D — Open real-Coach Beta / Beta plan-access correction**                                                                          |
| Current gate                  | **Completed-tap note entry and viewport alignment pass local checks; authorized delivery is next**                                     |
| Active detail                 | [`status/M8/M8-D.md`](status/M8/M8-D.md)                                                                                               |
| Direct carry-over             | [`status/M8/M8-C.md`](status/M8/M8-C.md)                                                                                               |
| Completed baseline            | M0–M7.5, M8-A, M8-B, M8-B-Export and M8-B-Plan-Choice                                                                                  |
| Release candidate             | `cd34fccd9c041fa0363a02b6d9966352cd4742f3` on Main; [CI #130](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37895583759) |
| Worktree                      | Local note correction passes 66 related tests and a desktop/mobile browser gesture and viewport matrix                                 |
| Production                    | Healthy internal Alpha; two synthetic Coaches; no real Coach admitted                                                                  |
| Production release            | [CI #130](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37895583759) automatically deployed Web correction `cd34fcc`     |
| Pending Production migrations | None from this exact release; legal acceptance was already absent from the pending list                                                |

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
  header/canvas/dock. Related tests and the synthetic browser matrix pass; device recheck stays open.
- Real-Coach admission, backup/restore evidence and required Production reviewer controls remain
  governed by the M8-D Contract and Roadmap gate.

## Next handoff

Deliver the preauthorized completed-tap/viewport correction through exact-SHA CI and Production,
verify readiness/assets, then recheck first-tap keyboard entry, reading gestures and lower-paragraph
focus on the installed PWA. Continue the remaining M8-D backup/isolated-restore, Production reviewer,
legal-migration provenance and real-Coach admission gates afterward. Ask separately before revoking
the previous Production PAT; the verified replacement expires 2027-01-07.

## Status system

- Structure and update protocol: [`status/README.md`](status/README.md)
- Active package: [`status/M8/M8-D.md`](status/M8/M8-D.md)
- Demo baseline: [`status/DEMO.md`](status/DEMO.md)
- New engineering log: [`status/log/2026-10.md`](status/log/2026-10.md)
- Complete pre-split record:
  [`status/archive/PROJECT_STATUS-legacy-through-2026-10-09.md`](status/archive/PROJECT_STATUS-legacy-through-2026-10-09.md)
