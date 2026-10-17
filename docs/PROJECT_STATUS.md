# Gym Assistant project status

> Integrated Main router, reconciled 2026-10-18 against remote `origin/main` at
> `d54658bbd438981a1afd8c43cec2777eacc85213` and the Product Owner's M8-D completion decision.
> Main code and confirmed Production deployment are recorded separately below. Branch-local work
> and its next action belong to that branch's workstream Status, not this page.

## Released baseline

| Area         | Integrated fact                                                                                                                                                                                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M8-D         | **Done by Product Owner acceptance on 2026-10-18.** The single-lesson scheduling and purchase-history corrections are included. No M8-D implementation or acceptance item is an M8-E prerequisite.                                                                      |
| Main code    | PR #35 merged as `8090bf80`; PR #37 as `aaa5a929`; purchase-history documentation PR #38 as `9176956`; mobile Settings action PR #39 as `d54658b`.                                                                                                                      |
| Migration    | Production release applied M8-D versions `20261017105438` and `20261017110659`; the later purchase-history release had no new migration.                                                                                                                                |
| Verification | PR #35 exact-SHA Main CI and migration release passed. PR #37 corrected PR CI and Main CI #39058008147 passed; that Main run deployed `aaa5a929` and recorded readiness. Independent `/api/ready`, `/` and `/login` returned HTTP 200 in the branch's release evidence. |
| Later Main   | PR #39's 44 px mobile Settings action correction is in Main code. Its original Status records focused local checks and PO preview approval; exact-SHA CI and Production PWA read-back for `d54658b` are not established by this router.                                 |
| Payment      | Production billing remains hard-off. No M8-E payment code or draft billing migration is established as released by the M8-D evidence above.                                                                                                                             |

The Product Owner closed the remaining M8-D package reservations. Historical limitations and
operational observations in [M8-D Status](status/M8/M8-D.md) are evidence, not an open M8-D Next.
The frozen single-lesson Contract describes the delivered change; its old local preview is not a
separate task.

## Active workstreams

| Workstream   | Owns                                                                         | State and entry                                                                                                                                       |
| ------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| M8-E payment | R01–R17 checkout, entitlement, Live/Test isolation, backup and release gates | [M8-E workstream](status/M8/M8-E.md). Its local R15 evidence has not been merged into this Main baseline. Resume only in a verified payment checkout. |

This router records integrated facts and points to workstreams. It does not assign a global Next
across parallel branches. Select the user-requested workstream first; then read that workstream's
Status and the applicable Roadmap and Contract. A predecessor is background unless the chosen
workstream explicitly names an unmet dependency.

## M8-E boundary at this snapshot

The payment workstream reports eight R items passed (R04–R07, R10–R13), R08 conditionally closed,
and R01–R03, R09, R14–R17 partial or unverified. Its R15 candidate migration passed isolated
PostgreSQL/RLS checks and an exact Supabase CLI **dry-run**; an actual encrypted backup artifact
restore and a measured Production recovery point remain unverified. These are local workstream
claims, not Main release evidence. Production migration, secret changes, remote delivery and Live
payment each retain their separate authorization gate.

## Handoff rule

Before acting, record the current branch, HEAD, worktree changes and intended workstream. If the
checkout differs from Main or another workstream, its Status is branch-local evidence. Continue only
the selected workstream. Integrate a completed branch through its own review, CI and release gates;
then update this router once from the integration checkout.

See [Status protocol](status/README.md), [Roadmap](ROADMAP.md) and the selected workstream Status.
