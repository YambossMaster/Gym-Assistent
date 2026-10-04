# Verification workflow

Use the smallest check that reaches the changed behavior, then run the package's required delivery
gate once. `docs/ROADMAP.md` and the active Contract determine mandatory checks; this file controls
their execution order and test-data setup, not milestone scope.

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

## Choose checks from the changed files

| Change                                        | Local checks                                           | Browser or live evidence                                                                                  |
| --------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Markdown only                                 | Root `npm run format:check`; `git diff --check`        | None unless the document itself needs visual review                                                       |
| Web presentation                              | Affected tests, Web typecheck/build, root format check | Inspect affected desktop width, adjacent 901px/1040px widths, and 390×844; record overflow and wrap state |
| Web behavior                                  | Affected tests, Web check/build                        | Exercise the changed interaction and save/reload if persistence is involved                               |
| API or domain                                 | Focused API tests, API check/build                     | Isolated live case only when an API/database boundary changed                                             |
| Schema, auth, entitlement or release boundary | Roadmap/Contract matrix, root check/build              | Linked migration/security checks and exact-SHA remote CI where required                                   |

A release gate may require more than this table. Do not run migration or security checks solely
because a CSS or Markdown file changed. For visual changes, capture the affected desktop widths
and 390×844 preview; a single screenshot is not responsive acceptance. There is no automated
pixel-baseline suite yet, so do not claim visual regression coverage from a DOM/unit test.

## Commit and CI guardrails

`npm install` activates the repository's local Git pre-commit hook. The hook checks the **staged**
version of changed text files with Prettier and blocks unformatted commits. It does not rewrite or
stage files, which avoids accidentally including unstaged edits. Run `npm run prepare` to activate
the hook in an existing checkout. Before a push, run the required root checks once; the hook is a
format guard, not a substitute for typecheck or tests.

On GitHub, every push and pull request still gets a `verify` result. Markdown-only changes run
root formatting only; code or mixed changes run the full check/build. The migration job reports a
documentation-only no-op for Markdown-only commits and performs the linked dry-run for other
commits. If Git cannot determine the diff, it defaults to the full gate. This avoids skipped
required workflow checks while reducing documentation-only work.

When a remote test fails intermittently, record the failing assertion, reproduce it at the
narrowest seam, and fix its synchronization before accepting a rerun as evidence. Use a bounded
wait for a specific state change; do not add an arbitrary sleep. Update `PROJECT_STATUS.md` with
the observed run result, then let the documentation-only CI path validate that evidence commit.
