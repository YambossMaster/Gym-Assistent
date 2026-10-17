# Status ownership for parallel workstreams

`docs/PROJECT_STATUS.md` is the **integrated Main router**: released baseline, known active
workstreams and their pointers. It is not a global task queue. `docs/ROADMAP.md` remains the
Product Owner-approved scope, dependency and release-gate contract; its order does not select the
next task in an unrelated branch.

## Start a task

1. Identify the requested workstream and current checkout with `git branch --show-current`,
   `git rev-parse HEAD`, `git status --short` and `git worktree list`. Check the current Main
   ref before claiming that a branch's Status describes Production.
2. Read `docs/PROJECT_STATUS.md` for the integrated baseline, then the selected workstream's
   Status and its named Roadmap/Contract sections. If the selected Status is absent in this
   checkout, find its owning branch or create a new uniquely named workstream file; do not take
   another workstream's `Next`.
3. Distinguish **released**, **merged but not deployed**, **branch-local**, **proposed** and
   **historical** evidence. State the commit and environment for every release claim. A workstream
   may depend on another only when it names the exact interface, commit or gate it needs.

## File ownership

- One workstream owns one uniquely named Status file, such as `M8/M8-E.md`. If two parallel
  branches share a Roadmap package, use distinct workstream names and files under its milestone
  folder. Start from [the workstream template](WORKSTREAM_TEMPLATE.md). Each file contains its own
  completed/remaining inventory, exact Next, environment, branch/HEAD and evidence. Only that
  branch edits its file until integration. A new Status filename does not allocate a Roadmap ID;
  use the approved [identifier convention](../ROADMAP.md#6-sequencing-and-concurrency) when a new
  package is proposed.
- A completed package Status becomes a short, frozen release record. Historical iteration detail
  stays in Git history and the engineering log. It has no executable `Next`.
- The integration owner alone edits `PROJECT_STATUS.md` after comparing the merged commit,
  exact-SHA CI, migration and deployment evidence. Branch authors may propose router changes
  in their branch, but their local snapshot is not Main fact.
- Parallel branches do not append to the shared monthly log during ordinary work. Keep the
  dated evidence in the owned workstream Status; the integration owner appends one release entry
  to `log/YYYY-MM.md` after merge or when an auditable cross-branch decision is made. This
  removes the shared append hotspot.

## Handoff and integration

Before pausing, update only the owned workstream file with current HEAD, worktree dirt,
completed and unverified checks, blockers, one exact next action and needed authorization.
A new conversation resumes that same workstream. It does not jump to an earlier Roadmap package
because another branch updated the router.

At integration, compare the workstream with current Main; serialize shared Module interfaces,
Supabase migrations and Production changes. Preserve unrelated changes. Merge or release through
the existing Product Owner and exact-SHA gates, then update the integrated router and freeze
completed workstream records. Never copy a stale branch's entire `PROJECT_STATUS.md` over Main.

Older milestone records and `archive/` are read only when the current work needs their evidence.
`DEMO.md` remains the route for direct Demo work.
