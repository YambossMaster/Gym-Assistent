# M8-D status — Open real-Coach Beta

> State: active. Last verified: 2026-10-09. This is the working brief for M8-D; approved scope and
> completion criteria remain in `docs/ROADMAP.md` and the frozen Contract documents.

## Package position

| Gate      | State                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------- |
| Contract  | Beta plan-access correction is frozen; broader admission, backup and restore gates remain binding           |
| Sol       | Plan-access implementation reached Main; accumulated mobile and release safeguards remain local review work |
| CI        | Combined exact-SHA gate authorized on 2026-10-09; Production preview remains unverified                     |
| Admission | No real Coach admitted; Production contains two synthetic Coaches                                           |

M0–M7.5, M8-A, M8-B, M8-B-Export and M8-B-Plan-Choice are protected delivered baselines. M8-C
created the Production internal-Alpha foundation but retains the carry-over listed in
[`M8-C.md`](M8-C.md). M8-E owns paid checkout and must not be pulled into this package.

## Binding Beta plan policy

- Ordinary verified Coaches start and remain on Free while checkout is unavailable.
- One single-use plan-tester code marks the Product Owner Workspace and permits self-switching among
  Free, Pro and Prime for plan-flow testing.
- One single-use permanent code grants Prime without an end date.
- One shared promotional code grants one 60-day Prime trial per verified Email and is not globally
  consumption-capped.
- Raw operational codes stay outside source control; PostgreSQL stores SHA-256 digests.
- API authorization and capacity enforcement own the policy. Hidden Web controls are never the only
  restriction.
- Historical zero-price plan choices do not grant ordinary Coaches paid-plan access.
- M8-E owns provider-backed paid activation; expiry never charges or deletes Coach data silently.

The detailed behavior and migration contract live in
`docs/M8-D-BETA-PLAN-ACCESS-CONTRACT.md` and
`supabase/migrations/20261008063726_m8d_beta_plan_access_policy.sql`.

## Current repository and environment state

- Local branch and `origin/main`: `ce57f826d83bd28f374854c660c083be6d2c2635`.
- M8-D implementation and earlier release corrections reached Main through
  `92519d0402ec87ded6a05aa438334775462909ea`.
- The worktree contains Product Owner-retained, uncommitted M8-D product corrections, CI release
  safeguards and documentation changes. Reconcile with `git status --short`; do not overwrite or
  detach them.
- Production is a healthy Tokyo Fly internal Alpha with two synthetic Coaches and no real customer
  data.
- Production has not applied legal acceptance migration `20261006145359` or plan-access migration
  `20261008063726`.
- The latest complete implementation release is not established: later green runs skipped a
  required Production preview, and the current scoped PAT returns HTTP 403 for Connection Pooling
  metadata.

## Current local review inventory

| Area                    | Current fact                                                                                                                        | Remaining evidence                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Release safeguards      | Production migration history now governs automatic deployment; docs-only, superseded and unverifiable releases are rejected locally | First remote CI execution; valid Production pooler/history read          |
| Plan access             | Free-first tester/permanent/promotional policy implemented and focused-tested                                                       | Production preview/apply, live redemption and complete exact-SHA release |
| Mobile Training         | Coach-note focus, keyboard inset, numeric progression and picker-space corrections have focused regression evidence                 | Corrected installed-iOS/Android acceptance and combined CI               |
| Mobile dialogs/settings | Capability sheets, Student field scroller, required labels and hidden-content cues were corrected in shared boundaries              | Authenticated/installed-phone rendering and combined CI                  |
| Scheduling/Venue        | Fixed-schedule default/copy and Venue decision preview have focused evidence                                                        | Combined browser/product review and CI                                   |

Exact pre-split local test counts and diagnostic narratives remain in LOG-450–LOG-462 of the
[legacy Status](../archive/PROJECT_STATUS-legacy-through-2026-10-09.md). Load those entries only
when reviewing the matching change or evidence claim.

## Direct dependencies and conditional context

Always read:

- `docs/ROADMAP.md`: Delivery model, M8-D, Sequencing and change control.
- `docs/M8-D-BETA-PLAN-ACCESS-CONTRACT.md` for plan-access implementation or review.

Read [`M8-C.md`](M8-C.md) for Production, release workflow, legal/Auth admission or installed-PWA
work. For entitlement regressions predating M8-D, search the legacy M8-B and M8-B-Plan-Choice
records. For formal-Web route convergence, follow [`../DEMO.md`](../DEMO.md) and inspect only the
matching Demo route/components.

## Blockers and open gates

1. Replace the scoped Production Supabase PAT with one that also has `Connection Pooling: Read`;
   verify the replacement before revoking the old token.
2. Run the now-authorized combined exact-SHA CI. Require verify, browser UI, development dry-run and
   Production preview green before any release apply.
3. Apply both pending Production migrations only through the exact-SHA workflow with literal
   `APPLY`, then confirm same-SHA Fly deployment and `/api/ready`.
4. Complete the Roadmap's backup/restore, Production reviewer, support/admission and real-Coach Beta
   gates before admitting the first real Coach.
5. Record installed-device coverage honestly; browser 390×844 evidence is not installed-PWA proof.

## Next handoff

Complete local preflight, commit and push the accumulated product and release-safeguard changes under
the Product Owner's 2026-10-09 authorization. Observe the exact-SHA gate. If Production PAT permission
still fails, retain the safe release hold and request separately authorized credential replacement;
otherwise review the preview and run the literal-`APPLY` exact-SHA migration release.
