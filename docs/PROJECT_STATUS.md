# Gym Assistant project status

> Integrated Main router, reconciled 2026-10-19 against deployed Main
> `a12e5a5b6e1c26e363f3c2fb42835ff48bff15db` and the Product Owner's M8-E acceptance decision.
> Main code and confirmed Production deployment are recorded separately below. Branch-local work
> and its next action belong to that branch's workstream Status, not this page.

## Released baseline

| Area         | Integrated fact                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M8-D         | **Done by Product Owner acceptance on 2026-10-18.** Single-lesson scheduling and purchase-history corrections are included. No M8-D implementation or acceptance item is an M8-E prerequisite.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Main code    | PR #35 merged as `8090bf80`; PR #37 as `aaa5a929`; purchase-history documentation PR #38 as `9176956`; mobile Settings action PR #39 as `d54658b`; release documentation PR #40 as `1965d33`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Migration    | Production release applied M8-D versions `20261017105438` and `20261017110659`. Later purchase-history and mobile Settings releases had no new migration; Production preview reports none pending.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Verification | PR #37 corrected PR CI and Main CI #39058008147 passed for `aaa5a929`. PR #39 required checks passed; [Main CI #232](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39066095770) deployed `d54658b` with readiness. Independent `/api/ready`, `/` and `/login` returned HTTP 200; served CSS contained the corrected mobile selector. Installed-PWA visual recheck remains unverified.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Beta ops     | Latest Main Status recorded 0 real Coaches, 3 test accounts and two unused Beta codes. This is a historical snapshot, not a fresh Production count.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Payment      | M8-E Live worker TLS repair [PR #58](https://github.com/YambossMaster/Gym-Assistent/pull/58) deployed as d3e215b; [Main CI #274](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39142971519) passed. Documentation [PR #59](https://github.com/YambossMaster/Gym-Assistent/pull/59) merged as 66caf69 and [Main CI #276](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39144603411) passed with deployment skipped. The isolated Live Pro annual trial has one confirmed intent, owner-bound subscription 2617697, paid TWD 0 invoice 8757694 and verified trial period. Lemon, Production ledger and Coach page confirm renewal cancelled with original 2026-11-18 end. The original webhook TLS failure was repaired and signed events reconciled. Natural paid collection remains R09; no second transaction is needed for cancellation. |

M8-E acceptance corrections [PR #61](https://github.com/YambossMaster/Gym-Assistent/pull/61) merged
as `a12e5a5`; [Main CI #280](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39236640713)
passed verify, browser UI, migration checks, Production preview and Fly deployment. Fly's running
image label matches the Main SHA; readiness and independent `/api/ready`, `/`, `/login`, `/plans`
readbacks returned 200. The released payment notice shows the approved wording and one-month trial,
without a discount-code section. No new migration or Live transaction was made for this correction.

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

| Workstream   | Owns                                                                         | State and entry                                                                                                                                                         |
| ------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M8-E payment | R01–R17 checkout, entitlement, Live/Test isolation, backup and release gates | [M8-E workstream](status/M8/M8-E.md). Fifteen items passed and released, R08 conditionally closed; only R09 awaits its natural charge/renewal event and later evidence. |

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
passed exact-SHA verification, Fly deployment and readiness. At that historical checkpoint, public
config reported `billingLiveEnabled:false`; the current Live release is recorded above.

The workstream has fifteen R items passed (R01–R07, R10–R17) and R08 conditionally closed.
The PO accepted the final 390px R14 flow, and the exact-SHA release above is deployed. R09 remains
the approved natural-event follow-up; do not create a new transaction merely to close it. The
original Production Coach Live trial has a verified subscription, NT$0 paid invoice, trial period,
confirmed intent and cancelled renewal. Lemon, Production ledger and Coach page agree on the
original 2026-11-18 end. See [M8-E Status](status/M8/M8-E.md).

## Handoff rule

Before acting, record the current branch, HEAD, worktree changes and intended workstream. If the
checkout differs from Main or another workstream, its Status is branch-local evidence. Continue only
the selected workstream. Integrate a completed branch through its own review, CI and release gates;
then update this router once from the integration checkout.

See [Status protocol](status/README.md), [Roadmap](ROADMAP.md) and the selected workstream Status.
