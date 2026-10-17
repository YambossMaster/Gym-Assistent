# M8-D — Open real-Coach Beta — Done

> The Product Owner accepted M8-D as complete on 2026-10-18. This is a frozen package record, not
> a current task list. The earlier long working brief remains in Git history at
> `aaa5a929a8e7e2b5543dd3ee93d3f20b18d729d0` and the monthly engineering log.

## Delivered

- The corrected Free, 60-day Prime promotional and permanent Prime grant policy is server-owned.
  Two-code Production release, User-JWT tenant and capacity checks, encrypted logical-backup
  artifact and isolated restore, and the PR/CI reviewer substitute were recorded before this close.
- The Product Owner accepted the single-lesson user flow. [PR #35](https://github.com/YambossMaster/Gym-Assistent/pull/35)
  merged as `8090bf80e6740043a5fb22dec1c252d53affba21`. Local root 36/36,
  API 297/297, Web 369/369 and builds passed. [Main CI](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39049692349)
  passed its required jobs; [migration release](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39049953196)
  applied only `20261017105438` and `20261017110659`, deployed the same SHA and passed readiness.
  Independent `/api/ready`, `/` and `/login` returned HTTP 200.
- The purchase-history and mobile-notice follow-up was also accepted. [PR #37](https://github.com/YambossMaster/Gym-Assistent/pull/37)
  merged as `aaa5a929a8e7e2b5543dd3ee93d3f20b18d729d0` after corrected PR CI.
  [Main CI #39058008147](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39058008147)
  passed verification, browser, migration no-op and Production history comparison, deployed that
  exact commit and passed readiness. Independent public `/api/ready`, `/` and `/login`
  returned HTTP 200. This follow-up added no schema migration.
- Production migration history was read back after the single-lesson release. The two M8-D
  versions were present; the recorded source/Workspace aggregates remained intact. No M8-E
  billing migration or payment activation was part of these releases.

After M8-D acceptance, the Product Owner approved a focused mobile Settings action correction.
[PR #39](https://github.com/YambossMaster/Gym-Assistent/pull/39) passed its three required checks
and merged as `d54658bbd438981a1afd8c43cec2777eacc85213`, restoring the 44 px dark button
on Calendar, Students, Settings and Exercise Library. The Product Owner inspected four corrected
previews; focused 390 px / 1440 px layout, Web typecheck and formatting passed. [Main CI #232](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39066095770)
passed verify/build, browser, migration no-op, Production preview and exact-SHA Fly deployment
with readiness. Independent `/api/ready`, `/` and `/login` returned HTTP 200; served CSS
`/assets/index-Cx1L0ozo.css` contained the corrected selector. Installed-PWA visual recheck
remains unverified. This follow-up does not reopen M8-D.

## Completion boundary

The Product Owner's 2026-10-18 decision closes M8-D and its previously reserved admission,
device and local-preview follow-ups as package gates. Historical observations, including the
then-reported absence of a real Coach and untested installed-device paths, are not retroactively
claimed as verified. Ongoing backups and Production health are operations, not a new M8-D Next.
The delivered [single-lesson Contract](../../M8-D-SINGLE-LESSON-CONTRACT.md) remains historical
product documentation.

M8-E owns paid checkout and its separate R01–R17 gates. Continue from the
[M8-E workstream](M8-E.md) in the payment checkout, not from an old M8-D
handoff. No Production billing authorization is implied by M8-D completion.
