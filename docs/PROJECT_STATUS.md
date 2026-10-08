# Gym Assistant project status

> Last verified: 2026-10-09. This is the always-read current-state dashboard. Approved scope and
> gates live in [`ROADMAP.md`](ROADMAP.md); package detail and history are loaded only through the
> pointers below.

## Current snapshot

| Field                         | Current value                                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Active phase                  | **M8 — Taiwan Web/PWA commercial Beta release**                                                                                        |
| Current package               | **M8-D — Open real-Coach Beta / Beta plan-access correction**                                                                          |
| Current gate                  | **CI #120 failed closed on Production PAT 403; deployment held**                                                                       |
| Active detail                 | [`status/M8/M8-D.md`](status/M8/M8-D.md)                                                                                               |
| Direct carry-over             | [`status/M8/M8-C.md`](status/M8/M8-C.md)                                                                                               |
| Completed baseline            | M0–M7.5, M8-A, M8-B, M8-B-Export and M8-B-Plan-Choice                                                                                  |
| Release candidate             | `fb75b7d878d8d50731e15fbcf1d771a451dbee30` on Main; [CI #120](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37819308629) |
| Worktree                      | Product and release-safeguard changes committed; inspect `git status --short` for new work                                             |
| Production                    | Healthy internal Alpha; two synthetic Coaches; no real Coach admitted                                                                  |
| Release hold                  | Production PAT lacks `Connection Pooling: Read`; Production migration history is unverified                                            |
| Pending Production migrations | Legal acceptance `20261006145359`; M8-D plan access `20261008063726`                                                                   |

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

- The current scoped Production Supabase PAT cannot read Connection Pooling metadata. Do not claim a
  Production preview, migration apply, or complete release gate until a replacement token is verified.
- The two pending Production migrations have not been applied.
- Exact-SHA CI #120 passed verify, browser UI and development migration dry-run. The Production
  preview failed on pooler metadata HTTP 403 before dependency installation; deployment was skipped.
  This SHA has no successful Production dry-run or migration apply evidence.
- Installed iOS/Android review of the current mobile corrections remains separate M8-D acceptance
  evidence.
- Real-Coach admission, backup/restore evidence and required Production reviewer controls remain
  governed by the M8-D Contract and Roadmap gate.

## Next handoff

Obtain separately authorized replacement of only GitHub secret `SUPABASE_PRODUCTION_ACCESS_TOKEN`
with a Production-project-scoped PAT that includes `Connection Pooling: Read` alongside its existing
read permissions. Re-run [CI #120](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37819308629)
for exact SHA `fb75b7d878d8d50731e15fbcf1d771a451dbee30`; require Production migration history
and dry-run green. Then obtain literal `APPLY` for that same SHA's manual migration-release workflow,
confirm both migrations, same-SHA Fly deployment and `/api/ready`, and only then revoke the old PAT.
No migration apply, deploy or real-Coach admission while the 403 remains.

## Status system

- Structure and update protocol: [`status/README.md`](status/README.md)
- Active package: [`status/M8/M8-D.md`](status/M8/M8-D.md)
- Demo baseline: [`status/DEMO.md`](status/DEMO.md)
- New engineering log: [`status/log/2026-10.md`](status/log/2026-10.md)
- Complete pre-split record:
  [`status/archive/PROJECT_STATUS-legacy-through-2026-10-09.md`](status/archive/PROJECT_STATUS-legacy-through-2026-10-09.md)
