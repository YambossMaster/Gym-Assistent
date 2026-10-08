# Project Status system

This directory preserves milestone evidence without loading the entire project history into every
agent run. `docs/PROJECT_STATUS.md` is the short router; Roadmap work-package files hold current or
frozen package state; logs and the legacy archive are conditional evidence.

## Loading contract

1. Always read `docs/PROJECT_STATUS.md`.
2. Read its active package file and the named Roadmap sections.
3. Read a predecessor only when the dashboard or active package declares it as a direct dependency.
4. Read an older milestone when changing its delivered baseline, investigating a regression or
   decision, or retrieving exact migration, commit, CI, or acceptance evidence.
5. Read `DEMO.md` only for direct Demo work or formal-Web convergence against the Demo.
6. Search logs or the legacy archive for historical evidence; never load them as routine startup
   context.

## Layout

- `../PROJECT_STATUS.md`: current package, blockers, required context and one executable handoff.
- `M8/M8-D.md`: active package detail. Its permanent milestone path also becomes its frozen record.
- `M8/M8-C.md`: direct release/admission carry-over needed by M8-D.
- `DEMO.md`: Demo reference boundary and conditional reading route.
- `log/YYYY-MM.md`: chronological engineering entries created after this split.
- `archive/PROJECT_STATUS-legacy-through-2026-10-09.md`: complete LOG-001–LOG-462 and pre-split
  milestone evidence.

Older milestones remain in the legacy archive until a current task needs them. Extract one faithful,
compact milestone summary at that time instead of eagerly rewriting every historical record.

## Package-file contract

An active package file contains only:

- state of its Contract, Sol and CI gates;
- decisions and invariants still binding on that package;
- current implementation, environment and verification facts;
- direct dependencies and conditional historical pointers;
- blockers, open acceptance and one next handoff.

When a package completes, replace transient iterations with final outcomes, exact delivery evidence
and unresolved carry-over, then freeze the file. Advance the dashboard pointer to the next Roadmap
package; do not move the completed file into an `active` or `archive` path.

## Update protocol

After code, schema, config, architecture, product-behaviour or blocker changes:

1. Update the active package file with current facts and exact evidence.
2. Update the dashboard only if its snapshot, blockers, required context or handoff changed.
3. Append one entry to the current monthly log with Scope, Outcome, Verification, Known issue and
   Next.
4. Record remote commit or run identifiers only after observing them.
5. Replace superseded active facts instead of retaining every intermediate version.
6. Preserve detailed historical evidence through the monthly log, milestone summary, Git history or
   legacy archive; never keep stale `Next` instructions in the dashboard.

Targets rather than content substitutes: keep the dashboard near 150 lines / 20 KB and each active
package compact enough to read as one working brief. If a file grows because it contains resolved
iterations, move those iterations down the information hierarchy before adding more.
