# Verification workflow

After each change, use only the smallest focused check that reaches the changed behavior. Show the
current UI and behavior to the Product Owner, then apply feedback and repeat focused checks. Run
the package's full delivery gate once only after the Product Owner inspects the current version and
explicitly says it is ready for full verification. `docs/ROADMAP.md` and the active Contract
determine mandatory checks; this file controls their execution order and test-data setup, not
milestone scope. Until that gate starts, label broader checks unverified and do not claim package
completion.

Before checking a UI change, map the changed route, interaction, states, and viewport to existing
acceptance evidence in `PROJECT_STATUS.md` and the active Contract. Reuse a prior pass when its
behavior and relevant code or dependencies are unchanged; record the evidence being reused. Check
only affected states and adjacent layout boundaries when something changed. Repeat a passed check
only when a later change could affect its result, its evidence is missing or inconclusive, or a
required package gate calls for a fresh run. A completed milestone stays closed unless a later
approved package explicitly corrects it.

For a newly added Coach choice or date field, compare the component and computed type roles against
[`WEB_CONTROL_STANDARDS.md`](WEB_CONTROL_STANDARDS.md). Check the open choice/calendar state, not
only the closed control. When the control is entitlement-gated, use an authorized unlocked preview
before calling its presentation verified; record a locked-only check as incomplete.

## Before a browser journey

1. Confirm the browser's origin and the serving process's working directory. Do not compare a
   screenshot from one worktree with code served from another.
2. Start the local API and check `/ready`. For Training acceptance, prepare an isolated Student and
   Session through the API instead of clicking through Student, Venue and purchase setup screens:

   ```powershell
   $env:API_BASE_URL = 'http://127.0.0.1:3000'
   npm run fixture:training-browser --workspace @gym-assistant/api -- prepare
   ```

   The command prints the Session ID and a temporary manifest path. Set `API_BASE_URL` to the local
   production-mode API origin when testing that runtime. The fixture uses the ignored `.env.e2e`
   development Coach and never writes a credential to its manifest.

3. In the browser, test the requested interaction and its persisted or public result. Keep UI
   fixture creation in scope only when creation itself is the behavior under test.
4. Always clean up, including after a browser assertion fails:

   ```powershell
   npm run fixture:training-browser --workspace @gym-assistant/api -- cleanup '<manifest path>'
   ```

   Cleanup verifies the exact Student name and ID before deletion and then confirms it is gone.
   It refuses a different API origin or a manifest outside the temporary folder. Never point this
   fixture tool at a production API or a real Coach account.

For the M8-B expiry/downgrade browser path, use the synthetic Coach fixture on a local
production-mode site. Set `API_BASE_URL` to its local `/api` origin, then run
`npm run fixture:beta-browser --workspace @gym-assistant/api -- prepare`. The command prints a
temporary manifest path and synthetic Email. Sign in to that isolated Coach in the browser and
verify the Prime offer. Run `... -- expire '<manifest path>'` with the local test server stopped
if its session pool is full, restart the server, then verify Free, six retained Students and the
write lock. Archive exactly one fixture Student in the browser, then verify the lock lifts and an
existing Student edit persists after reload. Finally stop the test server and run
`... -- cleanup '<manifest path>'`. Cleanup checks the exact synthetic Auth identity, Student IDs,
names and Workspace before deletion and confirms the Auth user, Workspace and code are gone.
The manifest contains a generated test password and must stay in the temporary folder; do not
copy it into the repository or share it in logs.

## Local preflight versus remote regression

Use `npm run check:affected -- <base-ref>` (default `origin/main`) for local preflight. It checks
formatting of changed files, diff whitespace, the touched workspace's typecheck, and Vitest tests
statically related to changed TypeScript/JavaScript files. Changed test files are included directly.
Package/config/migration or unknown runtime inputs fail open to full workspace suites. A CSS-only
change has no statically related test guarantee: it still needs focused visual evidence. Record
the selected files and the command's final exit status; no selected test is **not** a pass for
browser behavior. If an external command returns a running session ID, poll that session until it
reports the final exit code; do not restart it merely because the first response lacks a code.
Untracked Markdown drafts are excluded until staged, so a concurrent Contract draft cannot block
an unrelated code preflight. Use `npm run check:affected -- --plan` to inspect the selected scope
without executing checks.
On restricted Windows hosts, run this Node/Vitest command through the approved elevated path if
child-process creation returns `spawn EPERM`; that environment error is not a test failure.

Once the Product Owner approves the reviewed version for full verification, run the package's
required live, migration, security and changed-flow browser checks. Do not repeat the entire
local unit suite solely to anticipate the identical remote `verify` job when the Contract does
not explicitly require it. GitHub remains the full check/build regression gate for every code
push. When Web or shared browser inputs change, the parallel `browser-ui` job runs a
credential-free Playwright Plan Choice journey at
1440px and 390px: selection, confirmation, reload and document overflow. Its mocked plan API
checks browser behavior only; it does not prove server persistence, tenant isolation, real Auth,
physical touch, or visual pixel parity. Keep the isolated API/database live case for those
boundaries and inspect newly changed UI with the Product Owner. Wait for all required exact-SHA
jobs before claiming delivery. A Contract or Roadmap requirement for a local root check/build
remains binding until that package is explicitly amended. Record wall
time by stage and separate active checks from queue/tool wait and retries.

## Choose checks from the changed files

| Change                                        | Local checks                                       | Browser or live evidence                                                                                 |
| --------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Markdown only                                 | Changed-file format; `git diff --check`            | None unless the document itself needs visual review                                                      |
| Web presentation                              | Affected tests, Web typecheck, changed-file format | Inspect affected desktop width and 390×844; add adjacent breakpoints only when layout boundaries changed |
| Web behavior                                  | Affected tests, Web typecheck                      | Exercise the changed interaction and save/reload if persistence is involved                              |
| API or domain                                 | Affected API tests and typecheck                   | Isolated live case only when an API/database boundary changed                                            |
| Schema, auth, entitlement or release boundary | Roadmap/Contract matrix; full local only if named  | Linked migration/security checks and exact-SHA remote CI where required                                  |

A release gate may require more than this table. Do not run migration or security checks solely
because a CSS or Markdown file changed. For visual changes, capture the affected desktop widths
and 390×844 preview; a single screenshot is not responsive acceptance. There is no automated
pixel-baseline suite yet, so do not claim visual regression coverage from a DOM/unit test.

## Commit and CI guardrails

`npm install` activates the repository's local Git pre-commit hook. The hook checks the **staged**
version of changed text files with Prettier and blocks unformatted commits. It does not rewrite or
stage files, which avoids accidentally including unstaged edits. Run `npm run prepare` to activate
the hook in an existing checkout. At the Product Owner-authorized package gate, run the
local checks required by the active Contract and Roadmap before a push; the hook is a format guard,
not a substitute for typecheck or tests.

On GitHub, every push and pull request still gets a `verify` result. Markdown-only changes run
root formatting only; code or mixed changes run the full check/build. The browser job reports a
no-op when the change has no Web impact. The independent migration job reports a
documentation-only no-op for Markdown-only commits and performs the linked dry-run for other
commits. If Git cannot determine the diff, it defaults to the full gate. This avoids skipped
required workflow checks while reducing documentation-only work.

When a remote test fails intermittently, record the failing assertion, reproduce it at the
narrowest seam, and fix its synchronization before accepting a rerun as evidence. Use a bounded
wait for a specific state change; do not add an arbitrary sleep. Update `PROJECT_STATUS.md` with
the observed run result, then let the documentation-only CI path validate that evidence commit.
