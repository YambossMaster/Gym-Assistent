# M8-D status — Open real-Coach Beta

> State: active. Last verified: 2026-10-09. This is the working brief for M8-D; approved scope and
> completion criteria remain in `docs/ROADMAP.md` and the frozen Contract documents.

## Package position

| Gate      | State                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------- |
| Contract  | Beta plan-access correction is frozen; broader admission, backup and restore gates remain binding |
| Sol       | Accumulated plan-access, mobile and release safeguards reached Main at `fb75b7d`                  |
| CI        | #120 attempt 2 and exact-SHA Production migration release #2 green; admission checks remain open  |
| Admission | No real Coach admitted; Production contains two synthetic Coaches                                 |

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

- Exact deployed code release candidate on Main: `3afb5562ce82255239472a8a51ebef946435fc11`.
- Product Owner-retained M8-D corrections, release safeguards and Status split were committed
  together. Reconcile any subsequent work with `git status --short`.
- Production is a healthy Tokyo Fly internal Alpha with two synthetic Coaches and no real customer
  data.
- Production preview on CI #120 attempt 2 lists only plan-access migration `20261008063726` as
  pending. Legal acceptance `20261006145359` is no longer pending according to linked history and
  dry-run; its application provenance remains to be established.
- The new Production-scoped PAT has the four required Read scopes and passed the pooler/history
  pre-flight. It replaced only GitHub's Production access-token secret; the previous PAT remains
  valid pending separately authorized revocation.
- [Manual Production release #2](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37823400258)
  applied `20261008063726`, deployed exact SHA `fb75b7d878d8d50731e15fbcf1d771a451dbee30`,
  and returned `{"status":"ready"}` from `/api/ready` on 2026-10-09. The authenticated Web
  workspace loaded afterward. This is implementation delivery, not real-Coach admission.
- [CI #121](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37830139443) passed verify,
  browser UI, development migration dry-run and Production preview for `0632e04`, then automatically
  deployed the non-migration Coach-note correction. Public `/api/ready` and deployed JS/CSS marker
  checks passed afterward.
- [CI #126](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37833191147) passed verify
  (API 183 tests, Web 322 tests and build), browser UI, both migration gates and automatic Production
  deploy for `3afb556`. Public readiness returned `ready`; deployed JS/CSS markers confirm the shared
  header exit event and touch containment are present and the old viewport-top variable is absent.

## Current local review inventory

| Area                    | Current fact                                                                                                                                            | Remaining evidence                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Release safeguards      | CI #120 proved fail-fast 403 on attempt 1, passed pooler/history/dry-run on attempt 2, and release #2 applied/deployed                                  | Continue monitoring future releases; no current release blocker  |
| Plan access             | Free-first tester/permanent/promotional policy deployed with Production migration `20261008063726`                                                      | Live redemption and real-Coach admission checks                  |
| Mobile Training         | A local follow-up moves gesture containment from the note canvas to the complete focus surface and prevents caret placement from scrolling the document | Exact-SHA CI/deploy, then installed iOS/Android keyboard recheck |
| Mobile dialogs/settings | Capability sheets, Student field scroller, required labels and hidden-content cues passed focused and combined CI tests                                 | Authenticated/installed-phone rendering                          |
| Scheduling/Venue        | Fixed-schedule default/copy and Venue decision preview passed combined CI                                                                               | Combined browser/product review                                  |

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

1. Establish the legal acceptance migration's apply provenance; do not reapply an already-recorded
   migration. Revoke the old PAT only after separate authorization; the new PAT expires 2027-01-07.
2. Complete the Roadmap's backup/restore, Production reviewer, support/admission and real-Coach Beta
   gates before admitting the first real Coach.
3. Record installed-device coverage honestly; browser 390×844 evidence is not installed-PWA proof.

## Next handoff

Commit and deliver the preauthorized whole-surface Coach-note containment correction, verify its
exact-SHA CI/deploy and public assets, then recheck installed iOS/Android keyboards. Afterward,
finish the remaining M8-D recovery, reviewer-control and admission gates before inviting real
Coaches. Investigate legal migration provenance and arrange separately authorized old PAT
revocation.
