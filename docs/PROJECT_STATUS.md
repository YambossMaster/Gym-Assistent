# Gym Assistant project status

> Last verified: 2026-10-10. This is the always-read current-state dashboard. Approved scope and
> gates live in [`ROADMAP.md`](ROADMAP.md); package detail and history are loaded only through the
> pointers below.

## Current snapshot

| Field                         | Current value                                                                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Active phase                  | **M8 — Taiwan Web/PWA commercial Beta release**                                                                                                                     |
| Current package               | **M8-D — Open real-Coach Beta / Beta plan-access correction**                                                                                                       |
| Current gate                  | **Two-code correction is on Main and exact-SHA CI #148 is green; Production migration release remains pending explicit `APPLY`**                                    |
| Active detail                 | [`status/M8/M8-D.md`](status/M8/M8-D.md)                                                                                                                            |
| Direct carry-over             | [`status/M8/M8-C.md`](status/M8/M8-C.md)                                                                                                                            |
| Completed baseline            | M0–M7.5, M8-A, M8-B, M8-B-Export and M8-B-Plan-Choice                                                                                                               |
| Release candidate             | `d12edc70942a96e7c73e8c7d86e3135de2b66ba0`; [CI #148](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38060217906) green and held for migration release |
| Worktree                      | Clean; two-code local/development gates and pre-release Production two-account redemption matrix pass, with all fixtures removed                                    |
| Production                    | Healthy internal Alpha; root and `/login` 200 with browser Accept, `/api/ready` returns `ready`; no real Coach admitted                                             |
| Production release            | Release #4 applied `20261010054011`; CI #146 deployed release hardening at exact SHA `8f8c480`                                                                      |
| Pending Production migrations | `20261010110051_remove_plan_tester_entitlement.sql` is on Main, verified by CI #148 and pending Production `APPLY`                                                  |

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

Obtain literal `APPLY` for exact SHA `d12edc70942a96e7c73e8c7d86e3135de2b66ba0`. CI #148 passed
verify/build, Browser UI, development migration dry-run and Production preview; the preview lists
only `20261010110051_remove_plan_tester_entitlement.sql`, and automatic deployment was correctly
held. The pre-release Production two-account matrix passed permanent single-use, shared promotional,
repeat, cross-code and exact 60-day rules; both accounts, both codes and all related fixture rows
were deleted and read back as zero. After literal `APPLY`, re-preview, apply only that migration,
deploy the same SHA and run a bounded post-deploy two-code smoke/readiness check.

Release-workflow hardening is delivered at exact SHA `8f8c480`. [CI #146](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38047027072)
passed verify/build, browser UI, development migration dry-run, a fresh no-pending Production
preview, runtime-secret preflight, Fly deployment and readiness. Independent external checks then
returned 200 for `/api/ready`, root and `/login`; readiness returned `{"status":"ready"}`. The new
flow keeps literal `APPLY` for schema migrations, permits checked release-gate/Fly configuration
changes to deploy their own exact SHA, captures redacted Fly diagnostics on failure and prevents
empty commits from deploying.

GitHub's job record corrects the incident narrative: CI #143 for `e2e275f` did run and pass
`deploy-production` plus readiness. The empty `6073cf1` commit was pushed while CI #143 was still in
progress and was not required by the safeguard. Future release handling must wait for the exact-SHA
job to complete before deciding whether a new commit or rerun is needed.

Configure one stable, independently generated 256-bit `CALENDAR_SUBSCRIPTION_SECRET` in Fly
Production. This is an application secret, not a Supabase access token. The resulting Fly restart
must retain `/api/ready`, root and `/login` availability; then verify authenticated Calendar
subscription create, recover and reset behavior without exposing the secret or private URLs.

Release #4 applied only `20261010054011` but its first Fly deploy left the existing machine stopped.
CI #142 diagnostics proved the machine had not started because `auto_start_machines` was false. The
deployment config now enables auto-start, and exact-SHA CI #144 deployed `6073cf1` successfully.
Independent browser-equivalent checks returned 200 for root and `/login`; `/api/ready` returned
`{"status":"ready"}`. Missing `CALENDAR_SUBSCRIPTION_SECRET` was not the outage cause: the API now
starts fail-closed without it, preserves existing feed reads, and returns 503 only for secret-
dependent create/reset/recovery operations.

PO approved the Google-compatible 256-bit private subscription path and accepted Fly upstream
request-path log residual risk. Google fetched the synthetic private path and displayed its event;
Apple initial ICS compatibility was also observed. Prime expiry returns one notice, not schedules.
See [security design](CALENDAR-SUBSCRIPTION-SECURITY.md). Exact-SHA CI #137 and joint Production
Release #3 passed; only `20261009171747` was applied, and the same `ef347c4` was deployed. Public
readiness is 200; an invalid private feed is 404 with `no-store, private`. Production security advisor
has no new calendar-table finding; its existing leaked-password-protection warning is separate.
The three disposable Google subscriptions were removed and the synthetic probe/tunnel stopped.
Next: PO tests Finance export and Calendar download/subscription on installed PWA, including Prime
expiry behavior. External subscription refresh cadence remains client-controlled and unverified.
See [engineering contract](SETTINGS-DATA-IMPLEMENTATION.md) for scope.
The prior M8-D admission/recovery/provenance/device gates and old-PAT authorization remain separate.

## Status system

- Structure and update protocol: [`status/README.md`](status/README.md)
- Active package: [`status/M8/M8-D.md`](status/M8/M8-D.md)
- Demo baseline: [`status/DEMO.md`](status/DEMO.md)
- New engineering log: [`status/log/2026-10.md`](status/log/2026-10.md)
- Complete pre-split record:
  [`status/archive/PROJECT_STATUS-legacy-through-2026-10-09.md`](status/archive/PROJECT_STATUS-legacy-through-2026-10-09.md)
