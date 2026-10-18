# Mobile PWA bottom navigation regression — local correction

> Owner: isolated `mobile-bottom-nav-stability` worktree, rebased onto Main `a38ca6f`.
> This correction is separate from M8-E payment work and does not reopen the completed M8-D package.

## User impact and evidence

The Product Owner's 2026-10-18 18:15 iPhone PWA recording shows the bottom navigation moving away
from the visible bottom edge on Today, Students and Calendar. Today and Calendar are `pinned` in
`mobile-chrome.ts`, so the symptom is distinct from their intended scroll-triggered hide behavior.

Git history places the shared `will-change: transform` on the fixed bottom navigation in `124bf77`
(2026-10-05). `8ef9f2a` restored iOS edge bounce on main Coach pages (2026-10-14). `76e081a`
then stopped the pinned header drifting during PWA edge bounce by removing its permanent transform
promotion, but did not include the bottom navigation. These are concrete risk factors, not proof of
the first affected deployment on this iPhone.

The latest Web deployment before the recording was Main `e7a20c7` at 17:00 Taipei (CI #241 finished
at 17:05); its Web diff changes only two purchase-hint strings. The 17:09 documentation commit
`3faee94` had `deploy-production` skipped. The PWA checks `app-version.json` and can reload after a
new build, so a newer deployment can reveal a pre-existing CSS issue later. No installed build ID
or before/after device trace is available to prove when the drift first appeared. Main PR #45 began
after the recording and is excluded as its cause.

## Local correction and checks

- Override the fixed bottom navigation to `will-change: auto` at mobile widths. Keep its transform
  transition for routes that intentionally hide it; disable the transition when the chrome is pinned.
- Add a focused CSS regression assertion for both invariants. It failed on the pre-fix CSS (1/9)
  and passes with the correction. The three focused CSS/scroll suites pass 15/15; Web typecheck,
  changed-file Prettier and `git diff --check` pass.
- In a 390×844 Chromium fixture using the real stylesheet, computed navigation style is
  `position: fixed`, `will-change: auto`, `transition: none` on Today; its bottom remains at 844px
  before and after 500px of document scrolling. This proves the desktop browser geometry, not iOS
  PWA edge-bounce behavior.
- Add a Playwright real-stylesheet geometry check for Today, Students and Calendar: 3/3 pass.
  Add their installed-PWA edge-scroll check and a general change-impact protocol to the
  verification workflow.
- On rebased Main `0318cb4`, root `npm run check` passes 38 script tests, API 372/372, Web
  416/416 and both typechecks. `npm run build` passes. The full browser run passes 7/7, including
  three new dock geometry cases. These checks do not include a physical iPhone.

## Current state and next action

The Product Owner explicitly authorized full verification and deployment on 2026-10-18. The local
correction is on current Main and local full checks have passed. Main `0318cb4` merged M8-E
payment code after the recording. A separately authorized release run 39119563394 applied its
foundation migration and deployed that exact commit. Main `a38ca6f` later changed only the
isolated backup workflow and payment Status; [Main CI #249](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39120996344)
found no pending Production migrations and deployed `a38ca6f` with readiness. This correction's
exact-SHA remote CI and installed iPhone PWA acceptance are still unverified. After deployment,
reload/reopen the installed PWA and test Today, Students and Calendar at both scroll edges; confirm
the visible bottom gap remains zero and the intended Students auto-hide still works. If it still
drifts, capture the installed build ID and a new short recording before changing the scroll owner.
