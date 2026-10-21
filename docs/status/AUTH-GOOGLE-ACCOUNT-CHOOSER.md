# Google account chooser correction

> Branch-owned Auth correction approved by the Product Owner on 2026-10-21. This is a later correction to delivered M2 login behavior; it does not reopen M2 or alter the Roadmap. No new Roadmap identifier has been assigned.

## Contract and bounded inventory

- Problem: after signing out of Form Coach Desk, Google may silently reuse the browser's prior account. A Coach who chose the wrong account needs a visible way to select another.
- Frozen behavior: every click on `使用 Google 繼續` requests Google's account chooser. Preserve the app return origin and top-level redirect for an embedded login. Site sign-out still ends the selected Supabase session; Google controls its own sessions and chooser UI.
- Affected entry: Web login Google OAuth. No API, schema, provider configuration, payment or other login-method change.
- Known work (3): baseline and impact (done), implementation and focused checks (done), Product Owner review and full verification (done to the available evidence boundary). Actual A-to-B Workspace switching remains unverified because no Development Google test accounts exist.

## Sol and verification evidence

- Isolated worktree: `C:\Users\User\.codex\worktrees\google-account-chooser\Gym Assistent`; initial local Main base `83d81dc6dd9f1d111620a6bfb37351677f38d33b`.
- `apps/web/src/account-auth.ts` sends `queryParams: { prompt: 'select_account' }` in the existing Google OAuth request. `apps/web/src/account-auth.test.ts` checks ordinary and embedded navigation.
- Direct consumer: `apps/web/src/App.tsx` login button. Preserve callback origin, embedded top-level navigation, OAuth errors and existing sign-out scopes. Recorded deployed app commit `d946b0e` had the same OAuth call without `queryParams`.
- Focused check: `npm run check:affected -- origin/main` passed formatting, whitespace, Web typecheck and 13 files / 40 tests.
- Product Owner explicitly approved full verification. `npm run check --workspace @gym-assistant/web` passed formatting, typecheck and 94 files / 429 tests. `npm run build --workspace @gym-assistant/web` and `git diff --check` passed.
- Candidate Web served on IPv6 `localhost:5173`; unrelated IPv4 `127.0.0.1:5173` from an M11 worktree was left untouched. Local source read confirmed the candidate served `select_account`.
- Chrome reached Google's actual `選擇帳戶` page with `使用其他帳戶` on two fresh clicks. The provider URL contained `prompt=select_account` and the Development callback/localhost return.

## Release evidence and remaining limit

- No Google account was selected. Browser choices were pre-existing personal accounts, and the Product Owner confirmed there are no Development Google test accounts. Actual A-to-B Workspace switching, authenticated refresh/recovery and embedded-context live return remain unverified. Related unit tests do not replace provider/browser proof.
- Product Owner authorized branch push, PR merge and Production deployment on 2026-10-21. Candidate `f134ef6a97687057aaf52a4cdc77403ce4d3deb8` was delivered through [PR #75](https://github.com/YambossMaster/Gym-Assistent/pull/75); PR CI #319 passed verify, browser UI and migration dry-run. The PR was squash merged as Main `e46c686e64cda6968e1a68619a9eafb88196867d`.
- [Main CI #320](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39578842261) passed verify, browser UI, Development migration dry-run, no-pending Production migration preview and Fly deployment/readiness. Fly release 64 has a passing service check; its running image has `GH_SHA=e46c686e64cda6968e1a68619a9eafb88196867d`.
- Independent Production readback: `/api/ready`, `/` and `/login` each returned HTTP 200 (HTML routes requested with `Accept: text/html`). The public entry JavaScript contains `select_account`. This establishes that the updated Web bundle is served, but does not establish an authenticated account switch.
- Delivery is complete for the approved correction. If two isolated Development Google test accounts become available, verify A-to-B selection, Workspace identity and authenticated refresh/recovery before claiming those scenarios; no current release gate remains open.
