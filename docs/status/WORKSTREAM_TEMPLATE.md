# <Workstream name> — <active / blocked / done>

> Owner: `<branch>` in `<worktree>`; observed HEAD `<sha>` on `<date>`.
> Base: Main commit `<sha>` verified on `<date>`; integration state: branch-local / merged / released.
> Scope: `<Roadmap package and frozen Contract>`.

## Boundary and dependencies

- User outcome and owned modules: ...
- Exact upstream commit, interface or gate required: ... / none.
- Other branches' work remains outside this workstream unless explicitly integrated.

## Inventory and evidence

| Item | State                       | Evidence and environment                                    |
| ---- | --------------------------- | ----------------------------------------------------------- |
| ...  | Done / unverified / blocked | Commit, check or observed result; local / Test / Production |

Record authorization separately for local verification, remote push or merge, Production mutation,
and Live payment whenever applicable. A focused check does not imply a full gate has passed.

## One Next within this workstream

`<One concrete action, checkout and pass criterion>`.

Before pausing, refresh the observed HEAD and dirty-file inventory, record unresolved checks and
blockers, and name the exact user action needed, or say none. After release, replace this section
with a frozen completion record and remove the executable Next.
