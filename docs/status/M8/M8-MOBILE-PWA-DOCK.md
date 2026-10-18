# Mobile PWA bottom navigation regression — deployed, device follow-up received

> Owner: Main `d4b9a49af18cba04ca6d706c572c05e9469e99d0` via PR #47.
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

The Product Owner authorized full verification and deployment on 2026-10-18. PR #47 passed its
three required CI checks at `c461667`, then squash-merged as Main `d4b9a49`. [Main CI](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39121728371)
passed verify/build, browser UI, development migration selection, Production migration preview,
and the same-SHA Fly deployment and readiness. Independent public read-back returned HTTP 200 for
`/api/ready`, `/` and `/login` (SPA routes requested with `Accept: text/html`). The served CSS
asset `index-CR4K_Dcw.css` contains both the mobile dock `will-change:auto` and pinned dock
`transition:none` rules. `app-version.json` returned HTTP 200 with build ID
`local-1792321674482`, so the public build ID alone does not prove the Git SHA; the release
workflow's same-SHA deploy and served CSS establish the current release evidence.

The Product Owner's 2026-10-18 follow-up says the installed PWA appears fixed. The supplied 19:18
recording shows the bottom dock aligned with the visible edge while navigating through Finance,
Exercise Library, Calendar and Today. It does not separately demonstrate every route at both
elastic-scroll edges or the Students auto-hide transition; keep those cases in the ongoing PWA
release check rather than claiming they were shown in this recording. The incident has no further
reported symptom. The general existing-behavior impact check now has an entry in `AGENTS.md`, with
its detailed matrix in `docs/VERIFICATION_WORKFLOW.md`. Aligning public build IDs with deployment
SHA is a separate release-traceability improvement.
