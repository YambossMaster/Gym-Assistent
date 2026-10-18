# Gym Assistant project status

> Integrated Main router, reconciled 2026-10-18 against merged Main
> `a38ca6fc2bad2cd92824be64c59bc553b7869fda` and verified Production evidence.
> Main code and confirmed Production deployment are recorded separately below. Branch-local work
> and its next action belong to that branch's workstream Status, not this page.

## Released baseline

| Area         | Integrated fact                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M8-D         | **Done by Product Owner acceptance on 2026-10-18.** Single-lesson scheduling and purchase-history corrections are included. No M8-D implementation or acceptance item is an M8-E prerequisite.                                                                                                                                                                                                      |
| Main code    | PR #35 merged as `8090bf80`; PR #37 as `aaa5a929`; purchase-history documentation PR #38 as `9176956`; mobile Settings action PR #39 as `d54658b`; release documentation PR #40 as `1965d33`.                                                                                                                                                                                                       |
| Migration    | Production release applied M8-D versions `20261017105438` and `20261017110659`. Later purchase-history and mobile Settings releases had no new migration; Production preview reports none pending.                                                                                                                                                                                                  |
| Verification | PR #37 corrected PR CI and Main CI #39058008147 passed for `aaa5a929`. PR #39 required checks passed; [Main CI #232](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39066095770) deployed `d54658b` with readiness. Independent `/api/ready`, `/` and `/login` returned HTTP 200; served CSS contained the corrected mobile selector. Installed-PWA visual recheck remains unverified. |
| Beta ops     | Latest Main Status recorded 0 real Coaches, 3 test accounts and two unused Beta codes. This is a historical snapshot, not a fresh Production count.                                                                                                                                                                                                                                                 |
| Payment      | M8-E payment code and `20261017181022` billing migration are released with Live billing hard-off. Main `a38ca6f` passed CI and same-SHA Fly deploy; encrypted backup artifact `12134830382` passed isolated paid-fixture restore and ≤48-hour recovery-point check. Live merchant setup, complete Test Mode scenario gate, controlled Live transaction and activation remain open.                  |

The latest M8-D copy follow-up is [PR #43](https://github.com/YambossMaster/Gym-Assistent/pull/43),
merged as `e7a20c7`. [Main CI #241](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39113661473)
passed all required jobs and deployed the same commit. Production returned HTTP 200 for
`/api/ready`, `/` and `/login`; its served JavaScript includes the revised unpriced purchase hint.
No migration was added. See the [frozen follow-up record](status/M8/M8-D-PURCHASE-PRICE-HINT.md).

The Product Owner closed the remaining M8-D package reservations. Historical limitations and
operational observations in [M8-D Status](status/M8/M8-D.md) are evidence, not an open M8-D Next.
The frozen single-lesson Contract describes the delivered change; its old local preview is not a
separate task.

## Active workstreams

| Workstream   | Owns                                                                         | State and entry                                                                                                                                                             |
| ------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M8-E payment | R01–R17 checkout, entitlement, Live/Test isolation, backup and release gates | [M8-E workstream](status/M8/M8-E.md). R15 schema and encrypted offline restore are released and verified. Resume Test Mode full-scenario acceptance before any Live charge. |

This router records integrated facts and points to workstreams. It does not assign a global Next
across parallel branches. Select the user-requested workstream first; then read that workstream's
Status and the applicable Roadmap and Contract. A predecessor is background unless the chosen
workstream explicitly names an unmet dependency.

## M8-E boundary at this snapshot

PR #45 merged payment code and the formal billing migration as `0318cb4`; the authorized
Production release applied `20261017181022` and deployed with billing closed. PR #46 merged
the isolated restore fix as `a38ca6f`. [Main CI #249](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39120996344)
passed exact-SHA checks and deployed the same SHA to Fly. Independent `/api/ready`, `/`
and `/login` returned HTTP 200; public billing flag remains false.
[Backup run](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39121153840)
downloaded its encrypted seven-day artifact, restored Production data into a network-isolated
database and passed the synthetic paid checkout/invoice/period owner round-trip and ≤48-hour
recovery-point check.

The Product Owner requires a complete Test Mode scenario review before any controlled Live
transaction. The Live product is still Draft; webhook, worker login and Live runtime secrets are
not configured. R09 natural first-charge/renewal authority also lacks owner-bound real-event
evidence. Follow the current [M8-E Status](status/M8/M8-E.md) for this workstream.

## Handoff rule

Before acting, record the current branch, HEAD, worktree changes and intended workstream. If the
checkout differs from Main or another workstream, its Status is branch-local evidence. Continue only
the selected workstream. Integrate a completed branch through its own review, CI and release gates;
then update this router once from the integration checkout.

See [Status protocol](status/README.md), [Roadmap](ROADMAP.md) and the selected workstream Status.
