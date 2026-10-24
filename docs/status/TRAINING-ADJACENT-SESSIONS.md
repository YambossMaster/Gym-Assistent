# Training adjacent lessons — released 2026-10-24

> Product Owner accepted the final 5173/5174 design and authorized merge and deployment. [PR #108](https://github.com/YambossMaster/Gym-Assistent/pull/108) is merged; application Main `5ad0d3171174503635ce0e9e9729d9bf56ca7189` is deployed as Fly release 81. This workstream has no executable Next.

## Delivered behavior

- The Training Record shows the immediately previous and next non-cancelled, dated Session for the same Session owner, ordered by start time and ID. A future scheduled Session can be next; a missing direction is hidden. The verified Coach's Session detail projection supplies adjacency without another Student detail read.
- Desktop uses full-field `前次課堂` and `下次課堂` controls, subdued relative to the student identity, with date and time. Mobile uses accessible arrow controls around the identity, with narrow-width action labels condensed.
- Adjacent Session and Training data prefetch into Coach-scoped TanStack Query cache. Switching flushes pending edits, prepares the target, then shows one centered direction-aware transition until the destination is ready. Save/read failure keeps the current lesson visible. The editor lease and cached-training fallback remain usable.
- Main's result-sharing action and Coach note behavior were preserved during branch integration. No table, migration, public capability, or Roadmap contract changed.

## Verification and release

- Original feature commit `11d00b1`; integrated Main `136018e` with the sharing work in branch head `12fe45f9901a94e9aab0cf1ce04706bce0084cfa`. The only content conflict was in `TrainingWorkspace`: the sharing `beforeShare` drain and adjacent-switch `beforeLeave` flush both remain.
- After integration, API and Web typechecks passed; Scheduling Module tests passed 13/13; focused Web SessionPage, transition, TrainingWorkspace gesture and CapabilityLinkManager suites passed 126/126. Authenticated 5173 desktop and 5174 mobile preview switched between lessons with the sharing control and Coach note present.
- [PR CI #392](https://github.com/YambossMaster/Gym-Assistent/actions/runs/40080457816) passed verify, browser UI and migration dry run; production migration preview was skipped because no migration changed. [Main CI #393](https://github.com/YambossMaster/Gym-Assistent/actions/runs/40080700092) passed all five jobs, including Production migration preview and Fly deployment/readiness.
- Fly release 81 has one started machine, a passing service check and image label `GH_SHA=5ad0d3171174503635ce0e9e9729d9bf56ca7189`. Independent public `/api/ready`, `/` and `/login` returned 200; the Fly origin also returned 200 for both HTML routes. The public JS `/assets/index-D2lF4S8-.js` returned 200 and contains both adjacent control labels. An authenticated Chrome visit loaded the Production Coach home page.

## Evidence boundary

- The authenticated lesson-switch flow was inspected in local Development on desktop and mobile preview. No installed-iPhone PWA or Production lesson-to-lesson interaction was claimed from the browser preview or public readiness checks.
- The site server serves SPA routes only to requests accepting `text/html`; generic command-line requests with `Accept: */*` receive 404 by contract. HTML navigation requests returned 200 after release.
