# Gym Assistant project status

> Integrated Main router, reconciled 2026-10-21 against deployed application commit
> `e46c686e64cda6968e1a68619a9eafb88196867d` and the Google account chooser correction.
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

The paid Plans cards now show the PO-accepted first-subscription trial ribbon. [PR #73](https://github.com/YambossMaster/Gym-Assistent/pull/73) merged as Main `83d81dc`; [Main CI #315](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39485301501) passed verify, browser UI, migration checks, Production preview and Fly deployment. Independent `/api/ready`, `/`, `/login`, `/plans`, and public config returned 200; the served JS contains the new ribbon text. No billing rule, migration, or Live transaction changed. The [M8-E workstream](status/M8/M8-E.md) records the local screenshots, conditional-offer limitation and release evidence.

The Google login button now requests Google's account chooser on every click. [PR #75](https://github.com/YambossMaster/Gym-Assistent/pull/75) merged as `e46c686`; [Main CI #320](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39578842261) passed all five jobs and deployed the same SHA to Fly release 64. The running image label matches Main; independent `/api/ready`, `/` and `/login` returned HTTP 200, and served JavaScript contains `select_account`. Actual A-to-B Workspace switching remains unverified without two Development Google test accounts. See the [Auth correction record](status/AUTH-GOOGLE-ACCOUNT-CHOOSER.md).

M8-E abandoned-checkout recovery [PR #66](https://github.com/YambossMaster/Gym-Assistent/pull/66)
merged as `dae474fae96b3d6f08f6726b55e2ae69ad1c62cd`.
[Main CI #292](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39406922712)
passed verify, browser UI, Development migration dry-run and Production preview; only
`20261019111117_billing_abandoned_checkout.sql` was pending. Authorized
[Production release #12](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39407408898)
re-previewed and applied that migration, then deployed the same SHA. Production migration history,
status constraint, unresolved-intent index, owner inbox policy and restricted API column grants were
read back. Fly image label `GH_SHA` matches Main, service check passes, and independent `/api/ready`,
`/`, `/login` return HTTP 200; `billingLiveEnabled:true` remains. The
[checkout recovery record](status/M8/M8-E-CHECKOUT-RECOVERY.md) holds test evidence and limitations.
R09's isolated Test Mode daily renewal invoice became paid on 2026-10-19; its missed webhook,
owner-bound recovery and paid-after-cancellation correction are recorded in the M8-E workstream.
R09 remains partial: the recovery completed after the paid period ended, so in-period Coach access,
the original one-month trial first charge and Live positive collection remain unverified.
The correction was merged through [PR #68](https://github.com/YambossMaster/Gym-Assistent/pull/68)
as Main `00dff7f`; [Main CI #296](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39432337018)
passed and deployed the same SHA to Fly release 61 with passing service check. There was no new
migration; independent `/api/ready`, `/` and `/login` returned HTTP 200.

The latest M8-D copy follow-up is [PR #43](https://github.com/YambossMaster/Gym-Assistent/pull/43),
merged as `e7a20c7`. [Main CI #241](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39113661473)
passed all required jobs and deployed the same commit. Production returned HTTP 200 for
`/api/ready`, `/` and `/login`; its served JavaScript includes the revised unpriced purchase hint.
No migration was added. See the [frozen follow-up record](status/M8/M8-D-PURCHASE-PRICE-HINT.md).

The Product Owner closed the remaining M8-D package reservations. Historical limitations and
operational observations in [M8-D Status](status/M8/M8-D.md) are evidence, not an open M8-D Next.
The frozen single-lesson Contract describes the delivered change; its old local preview is not a
separate task.

The single-Student purchase empty-text correction [PR #70](https://github.com/YambossMaster/Gym-Assistent/pull/70)
merged as `d946b0e`; [Main CI #300](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39440052242)
passed required checks, Production preview and Fly deployment from the same SHA. Independent
`/api/ready`, `/` and `/login` returned 200. After refresh, the authenticated synthetic Student
page showed both empty messages at 13px with matching color and line-height. The
[release record](status/M8/M8-STUDENT-PURCHASE-EMPTY-TYPOGRAPHY.md) holds the scoped evidence and
remaining device limitation. No migration or payment change was made.

## Active workstreams

| Workstream   | Owns                                                                         | State and entry                                                                                                                                                                                                                               |
| ------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M8-E payment | R01–R17 checkout, entitlement, Live/Test isolation, backup and release gates | [M8-E workstream](status/M8/M8-E.md). Fifteen items passed and released, R08 conditionally closed; R09's Test Mode daily renewal was paid and recovered after expiry, with in-period access and original trial first charge still unverified. |

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
