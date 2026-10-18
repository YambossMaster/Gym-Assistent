# Gym Assistant project status

> Integrated Main router, reconciled 2026-10-18 against remote `origin/main` at
> `d9e17778a12ddd5a1dc0ddaff456e754caba0e8c` and the Product Owner's M8-D completion decision.
> Main code and confirmed Production deployment are recorded separately below. Branch-local work
> and its next action belong to that branch's workstream Status, not this page.

## Released baseline

| Area         | Integrated fact                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M8-D         | **Done by Product Owner acceptance on 2026-10-18.** Single-lesson scheduling and purchase-history corrections are included. No M8-D implementation or acceptance item is an M8-E prerequisite.                                                                                                                                                                                                                                                                                                                                                                                                              |
| Main code    | PR #35 merged as `8090bf80`; PR #37 as `aaa5a929`; purchase-history documentation PR #38 as `9176956`; mobile Settings action PR #39 as `d54658b`; release documentation PR #40 as `1965d33`.                                                                                                                                                                                                                                                                                                                                                                                                               |
| Migration    | Production release applied M8-D versions `20261017105438` and `20261017110659`. Later purchase-history and mobile Settings releases had no new migration; Production preview reports none pending.                                                                                                                                                                                                                                                                                                                                                                                                          |
| Verification | PR #37 corrected PR CI and Main CI #39058008147 passed for `aaa5a929`. PR #39 required checks passed; [Main CI #232](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39066095770) deployed `d54658b` with readiness. Independent `/api/ready`, `/` and `/login` returned HTTP 200; served CSS contained the corrected mobile selector. Installed-PWA visual recheck remains unverified.                                                                                                                                                                                                         |
| Beta ops     | Latest Main Status recorded 0 real Coaches, 3 test accounts and two unused Beta codes. This is a historical snapshot, not a fresh Production count.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Payment      | M8-E schema and recovery code were deployed as Main `206e115`; encrypted Production backup and isolated restore passed. Live product, webhook and dedicated worker are configured; nine billing settings are staged on Fly. [PR #57](https://github.com/YambossMaster/Gym-Assistent/pull/57) merged as `d9e1777` and [Main CI #272](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39135528857) passed, with deployment skipped for docs only. Billing remains hard-off. PO approved progress without waiting for R09; controlled Live charge, billing-on release and observation remain open. |

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

| Workstream   | Owns                                                                         | State and entry                                                                                                                                                                                  |
| ------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M8-E payment | R01–R17 checkout, entitlement, Live/Test isolation, backup and release gates | [M8-E workstream](status/M8/M8-E.md). Nine items passed, R08 conditionally closed, seven remain partial or unverified. R09 natural-event evidence follows release; other Live gates remain open. |

The separate [mobile PWA bottom-navigation correction](status/M8/M8-MOBILE-PWA-DOCK.md) merged as
PR #47 / `d4b9a49`. [Main CI](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39121728371)
passed and deployed the same commit with readiness; public CSS contains the fix. The Product Owner
tested the installed iPhone PWA, provided the 19:18 recording, and accepted the correction as fixed.
The cross-cutting release check is now routed from `AGENTS.md`.

The [mobile PWA Coach Note and Help correction](status/M8/M8-MOBILE-PWA-NOTES-HELP.md) merged as PR #52 / `26c9cca6`. [Main CI #262](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39128029725) passed and deployed the same commit with readiness. Public API and HTML routes, plus new guide images, returned HTTP 200. The Product Owner confirmed the installed mobile PWA looked correct after deployment; this correction is accepted.

This router records integrated facts and points to workstreams. It does not assign a global Next
across parallel branches. Select the user-requested workstream first; then read that workstream's
Status and the applicable Roadmap and Contract. A predecessor is background unless the chosen
workstream explicitly names an unmet dependency.

## M8-E boundary at this snapshot

PR #45 released the payment schema with billing closed; PR #46 fixed the isolated CSV restore.
The [encrypted Production backup and isolated restore](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39121153840)
passed with the payment schema and synthetic paid round-trip. PR #51's Test Mode missed-event
recovery fix merged as `206e115`; [Main CI #260](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39126354923)
passed exact-SHA verification, Fly deployment and readiness. Independent Production checks returned
HTTP 200 for `/api/ready`, `/` and `/login`; public config reported `billingLiveEnabled:false`.

The workstream has nine R items passed (R04–R07, R10–R13, R15), R08 conditionally closed, and
seven partial or unverified (R01–R03, R09, R14, R16–R17). The PO approved continuing development
and Live release without waiting for R09's natural one-month event; its pass criterion and later
verification remain. Live product, prices, webhook and staged secrets have direct read-back, while
same-version confirmation/consent, controlled real charge, billing-on exact-commit release and online
observation retain their own gates. See [M8-E Status](status/M8/M8-E.md).

## Handoff rule

Before acting, record the current branch, HEAD, worktree changes and intended workstream. If the
checkout differs from Main or another workstream, its Status is branch-local evidence. Continue only
the selected workstream. Integrate a completed branch through its own review, CI and release gates;
then update this router once from the integration checkout.

See [Status protocol](status/README.md), [Roadmap](ROADMAP.md) and the selected workstream Status.
