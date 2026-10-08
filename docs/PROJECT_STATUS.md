# Gym Assistant project status

> Last verified: 2026-10-09. This is the always-read current-state dashboard. Approved scope and
> gates live in [`ROADMAP.md`](ROADMAP.md); package detail and history are loaded only through the
> pointers below.

## Current snapshot

| Field                         | Current value                                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Active phase                  | **M8 — Taiwan Web/PWA commercial Beta release**                                                                                        |
| Current package               | **M8-D — Open real-Coach Beta / Beta plan-access correction**                                                                          |
| Current gate                  | **Exact-SHA CI #121 and automatic Production deployment green; M8-D installed-device acceptance remains open**                         |
| Active detail                 | [`status/M8/M8-D.md`](status/M8/M8-D.md)                                                                                               |
| Direct carry-over             | [`status/M8/M8-C.md`](status/M8/M8-C.md)                                                                                               |
| Completed baseline            | M0–M7.5, M8-A, M8-B, M8-B-Export and M8-B-Plan-Choice                                                                                  |
| Release candidate             | `0632e044507c2e3b584b7e3f90192464c9c457a8` on Main; [CI #121](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37830139443) |
| Worktree                      | Product change committed and deployed; this Status evidence update remains to be committed                                             |
| Production                    | Healthy internal Alpha; two synthetic Coaches; no real Coach admitted                                                                  |
| Production release            | [CI #121](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37830139443) automatically deployed Web correction `0632e04`     |
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
  bundle-marker checks passed. Installed-device keyboard behavior remains unverified.
- Real-Coach admission, backup/restore evidence and required Production reviewer controls remain
  governed by the M8-D Contract and Roadmap gate.

## Next handoff

Recheck the deployed Coach-note focus correction on the installed iOS/Android keyboard path, then
continue the remaining M8-D backup/isolated-restore, Production reviewer, legal-migration provenance
and real-Coach admission gates. Ask separately before revoking the previous Production PAT; the
verified replacement expires 2027-01-07.

## Status system

- Structure and update protocol: [`status/README.md`](status/README.md)
- Active package: [`status/M8/M8-D.md`](status/M8/M8-D.md)
- Demo baseline: [`status/DEMO.md`](status/DEMO.md)
- New engineering log: [`status/log/2026-10.md`](status/log/2026-10.md)
- Complete pre-split record:
  [`status/archive/PROJECT_STATUS-legacy-through-2026-10-09.md`](status/archive/PROJECT_STATUS-legacy-through-2026-10-09.md)
