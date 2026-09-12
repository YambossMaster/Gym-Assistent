# Gym Assistant project status

> Last verified: 2026-09-12. This file records live engineering state; scope and completion rules
> live in [`ROADMAP.md`](ROADMAP.md).

## Current snapshot

| Field              | Current value                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------- |
| Active phase       | **M3.5 — Stage A: frontend gap filling**                                                    |
| Current package    | **M3.5-A2 — App Shell, Auth, and Settings correction**                                      |
| Package state      | **Done** — commit `60a85c0`, GitHub Actions CI #9 / run `34690180698` successful            |
| Completed baseline | M0–M3 Done; M3 delivery commit `c55a95d`, GitHub Actions run `34565338417` successful       |
| Branch baseline    | `main`; `origin/main` at documentation commit `a97d2e5` when this rewrite began             |
| Worktree           | Contains approved M0–M3/M3.5 App Shell/query baseline plus A1; abandoned M4 starter removed |
| Linked database    | Development only; abandoned M4 migration reverted and rollback `20260912103452` applied     |
| Production         | Not configured; no real customer data                                                       |

## Next handoff

Start the **M3.5-A3 Contract gate**:

1. Freeze the existing-data Student roster/detail projection and Lesson Purchase correction contract
   against the archived Demo for desktop and exact 390×844 behaviour.
2. Define additive API projection fields, versioned Purchase correction operations, tenant and stale
   version behaviour, state boundaries, copy slots, and required live/browser evidence.
3. Do not begin A3 Terra implementation until that Contract is frozen; do not add Scheduling or
   Training rules as a browser workaround.

Terra owns data flow and semantic skeletons only. No visual, responsive, interaction-styling, or
end-user-copy decisions are authorized in this package. Do not continue general M4 feature work.

## Milestone status

| Milestone                              | State       | Evidence or remaining boundary                                                                                                  |
| -------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| M0 Repository and product contract     | Done        | Demo archived separately; formal workspaces, vocabulary, ADR/Roadmap/Status discipline established                              |
| M1 Cloud foundation tracer             | Done        | Supabase private schema, verified identity/Workspace derivation, two-Coach isolation, migration workflow, remote CI             |
| M2 Coach account operations            | Done        | Registration, six-digit OTP, Email/Google/recovery, settings, sessions, deletion lifecycle, Edge Function/cron, live acceptance |
| M3 Student and Lesson entitlement      | Done        | Student lifecycle, purchases/manual income, derived balances, two-Coach E2E, 390px acceptance, CI run `34565338417`             |
| M3.5 Frontend gap filling              | In progress | A0 audit/contract complete; A1–A5 remain                                                                                        |
| M4 Scheduling                          | Not started | Previous starter code and development schema were removed by approved rollback; awaits a future Contract gate                   |
| M5 Training and Exercise Library       | Not started | Await M4 Course Session read contract                                                                                           |
| M6 Public Capability Links             | Not started | Await M4 rescheduling and M5 Training Result contracts                                                                          |
| M7 Local resilience and Demo migration | Not started | Await stable target schemas                                                                                                     |
| M8 Deployment and Beta readiness       | Not started | No staging/production environment                                                                                               |
| M9 Post-V1 options                     | Deferred    | Evaluate after Beta                                                                                                             |

## Preserved implementation inventory

### Formal runtime

- React/Vite PWA in `apps/web`, Fastify modular monolith in `apps/api`, Supabase Auth/PostgreSQL.
- Same-origin `/api` contract with Vite development proxy.
- Root `start-gym-assistant.cmd` opens API at `127.0.0.1:3000` and Web at
  `http://127.0.0.1:5173`; it has been inspected but not end-to-end launch-verified.
- Account lifecycle deletion uses a server-only Supabase Edge Function, `pg_cron`, `pg_net`, and a
  Vault-held function-specific token.

### M0–M3 product/data foundation

- Public Coach registration with six-digit Email OTP, Email/password, Google OAuth, recovery,
  Workspace settings, session management, reversible 14-day deletion, immediate deletion, and
  365-day inactivity deletion.
- Versioned Student create/update/archive/delete and tenant-isolated list/detail.
- Lesson Purchase entitlement plus Coach-entered manual income in integer minor units/ISO currency.
- Remaining lessons derived as purchases minus completed Course Sessions, including visible
  negative balances.
- Deterministic M3 Demo migration preview/checksum; archived `form-coach-mvp-v1` remains unchanged.
- TanStack Query Coach-scoped in-memory caching, background revalidation, prefetch/invalidation,
  and Auth cache clearing are present in the current worktree.
- Formal App Shell route separation exists, but route content still has the M3.5 gaps below.

### M4 reset

- The abandoned M4 Scheduling adapter, Module, HTTP routes/tests, and original migration were
  removed with Product Owner approval before formal M4 work began.
- Linked development database history marks the former `20260911053840` migration reverted; rollback
  migration `20260912103452_remove_unstarted_m4_scheduling_core` restored M3's entitlement-only
  `course_session` schema.

## Confirmed M3.5 gaps

- Mobile 390px App Shell duplicates the masthead/top-row hierarchy.
- `/today` is a static empty placeholder without its route projection or query.
- `/calendar`, `/sessions/:id`, and `/exercises` are placeholders; they belong to M4/M5.
- `/students` lacks active/archive parity, entitlement/next-session summaries, and distinct
  first/filter/search Empty states.
- `/students/:id` lacks the complete identity/private-context composition, Course Session history,
  performance surface, and Purchase correction operations. Training performance belongs to M5;
  fixed rhythm belongs to M4.
- `/settings` has working account-security operations, but one query failure can currently blank the
  whole route; unsupported future settings must remain absent.
- `/t/:token` and `/r/:token` are absent and currently fall through the authenticated route path;
  they belong to M6 and must eventually mount outside Auth.
- Some rendered copy describes implementation state rather than helping a Coach complete a task.

## Open risks and constraints

| Risk/constraint                                                   | Current handling                                                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| M4 starter had been applied to development schema                 | Approved rollback migration restored M3 entitlement schema; local/remote migration list aligned  |
| Linked Scheduling migration is ahead of `origin/main`             | Treat it as a protected development seam; serialize future migrations and document exact history |
| Frontend monolith increases accidental cross-route regressions    | M3.5-A1 decomposes by route while freezing behaviour                                             |
| Product UI can drift when engineering invents presentation/copy   | Four mandatory gates; Terra hard limit; Sol owns product convergence                             |
| Auth leaked-password-protection warning remains                   | Accepted development warning; resolve in M8 production security gate                             |
| Previously exposed development credentials require final rotation | No production use; rotate all deployment secrets during M8 before Beta                           |
| Demo seed/local data can be mistaken for production truth         | Use Demo only for behaviour/presentation; all official data comes from route projections         |

## Verification baseline

- M3 local: root check/build, live two-Coach isolation, migration preview, desktop and 390×844
  acceptance passed.
- M3 remote: commit `c55a95d`, GitHub Actions run `34565338417`, verify and migration-dry-run jobs
  successful.
- After M4 reset: linked rollback migration applied, migration dry-run is up-to-date, and Supabase
  advisors report only the pre-existing leaked-password-protection warning.
- M3.5 documentation reset: targeted Prettier check and repository-wide `git diff --check` passed
  on 2026-09-12; only Git's existing LF-to-CRLF notices were emitted.

Current development validation commands:

```powershell
npm run check
npm run build
npm run db:push:dry
npm run e2e:m3 --workspace @gym-assistant/api
git diff --check
```

Run only the checks required by the current Roadmap package, then retain exact results here. A
local pass or successful push is not a remote CI completion claim.

## Engineering log

### 2026-09-12 — LOG-048 — M3.5-A2 App Shell, Auth, and Settings correction locally complete

- **Scope:** implemented the frozen A2 Contract without a schema, API, Auth-configuration, or M4+
  feature change.
- **Outcome:** mobile now has one masthead, Settings remains reachable from it, and the four primary
  workflows remain in the bottom navigation. Shell identity consistently uses Workspace display name
  with Email/Coach fallbacks and no longer claims a connection or sync state. Settings now isolates
  Workspace profile, account security, and deletion-lifecycle loading/error/retry states; destructive
  dialogs focus `DELETE`, close with Escape, and return focus to their trigger.
- **Verification:** focused Web check passed (38 tests); full root check passed (API 22 tests and
  Web 38 tests); root build passed with the existing over-500-kB Vite advisory; linked migration
  dry-run was up-to-date; advisors report only the accepted
  `auth_leaked_password_protection` warning. Live browser acceptance passed on desktop and exact
  390×844: one header, Settings header access, four-item bottom navigation, no horizontal overflow,
  and destructive-dialog focus/Escape behaviour.
- **Known issue:** the initial sandbox Web check/dev-server and advisors command hit the known
  Windows `spawn EPERM`/telemetry restriction; the approved elevated reruns passed.
- **Delivery:** commit `60a85c0` pushed to `origin/main`; GitHub Actions CI #9 / run
  `34690180698` completed successfully with Verify and migration dry-run jobs green.
- **Next:** freeze M3.5-A3 before implementation.

### 2026-09-12 — LOG-047 — M3.5-A2 Contract gate frozen

- **Scope:** froze App Shell, Auth, and Settings correction against the archived Demo without
  changing the approved Roadmap, API, schema, Auth configuration, or implementation.
- **Outcome:** the Contract removes the duplicate mobile masthead, fixes identity source/fallback,
  omits unprovable connection claims, isolates three Settings state boundaries, and preserves
  six-digit OTP plus account-lifecycle operations.
- **Verification:** documentation consistency review, targeted Prettier, and `git diff --check`
  passed; no product code, browser acceptance, commit, push, or CI has been run for A2.
- **Next:** Terra implements only [`M3.5-A2-CONTRACT.md`](M3.5-A2-CONTRACT.md), then hands the
  semantic states to Sol.

### 2026-09-12 — LOG-045 — M3.5-A1 route and state foundation implemented locally

- **Scope:** moved authenticated App Shell routing into `app-shell/`; introduced route entry/query
  modules for Students and Settings; extracted shared primitives, Coach-scoped key factory, and
  tested route-state selectors without changing API operations or cache semantics.
- **Outcome:** first-load, cached-refresh, Error, Empty, Not Found, and Ready state selection is
  explicit for the currently supported Student surfaces. Students and Settings retain their existing
  query/mutation invalidation and recoverable input behaviour.
- **Verification:** root format/API check, focused Web check (31 tests), Web production build, and
  `git diff --check` passed. Vite emitted its existing over-500-kB single-chunk advisory only.
- **Delivery:** commit `4fce971` pushed to `origin/main`; GitHub Actions CI #7 / run `34689160129`
  completed successfully. M3.5-A1 is Done.
- **Next:** freeze and execute M3.5-A2.

### 2026-09-12 — LOG-046 — Abandoned M4 starter removed

- **Scope:** remove the unstarted M4 Scheduling adapter, Module, HTTP operations/tests, and original
  migration; preserve M3 entitlement behaviour.
- **Outcome:** remote migration history marked `20260911053840` reverted and development rollback
  `20260912103452_remove_unstarted_m4_scheduling_core` applied. M4 now correctly remains Not started.
- **Verification:** migration list aligns local/remote; dry-run is up-to-date; advisors show only the
  pre-existing leaked-password-protection warning.
- **Next:** deliver M3.5-A1 as one cohesive non-M4 commit.

### 2026-09-12 — LOG-044 — Product-led Roadmap and architecture reset

- **Scope:** encode the approved frontend gap analysis and four-gate delivery model without changing
  application code, schema, Demo data, or completed M0–M3 evidence.
- **Outcome:** Roadmap rebuilt around M3.5 Stage A and redesigned M4–M8 gates; Architecture now
  defines route projections/state boundaries and protected Module seams; Agent rules now enforce
  the Terra/Sol boundary; Status compressed and aligned to M3.5-A1.
- **Verification:** targeted Prettier check and repository-wide `git diff --check` passed; only
  Git's existing LF-to-CRLF notices were emitted.
- **Next:** execute M3.5-A1 from the handoff above.

### Recent delivery ledger

| Date          | Log         | Durable result                                                                                                                               |
| ------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-12    | LOG-043     | Settings information architecture and account-safety correction added in worktree; independent panel recovery remains a documented M3.5 need |
| 2026-09-12    | LOG-042     | M3.5 query-cache cleanup completed; Coach-scoped memory/cache-clearing rules retained                                                        |
| 2026-09-11    | LOG-041     | TanStack Query route-cache baseline added in worktree with 30-second freshness, revalidation, prefetch, and invalidation                     |
| 2026-09-11    | LOG-040     | Formal App Shell and M0–M3 route alignment added; responsive/product gaps carried into M3.5                                                  |
| 2026-09-11    | LOG-039     | Demo-aligned formal Web delivery rule established                                                                                            |
| 2026-09-11    | LOG-038     | Double-click Windows launcher added; runtime launch remained unverified                                                                      |
| 2026-09-11    | LOG-037     | Scheduling core migration/API delivered to development; 26 API tests/build and advisors passed; M4 remained incomplete                       |
| 2026-09-11    | LOG-036     | M3 commit `c55a95d` pushed; Actions run `34565338417` succeeded                                                                              |
| 2026-09-10–11 | LOG-031–035 | M3 Student/Lesson slice, manual income, Demo preview, live isolation, desktop and 390px acceptance completed                                 |
| 2026-09-10    | LOG-030     | Remote GitHub Actions evidence made mandatory for milestone completion                                                                       |
| 2026-09-09–10 | LOG-013–029 | M2 identity, settings, account lifecycle, six-digit OTP, Edge Function/cron, live acceptance, commit and CI completed                        |
| 2026-09-08–09 | LOG-005–012 | M1 runtime, tenant-isolation E2E, private schema/migration workflow, remote baseline and CI completed                                        |
| 2026-09-08    | LOG-001–004 | Demo archive, formal repository/bootstrap, architecture and clean M0 baseline established                                                    |

Historical detail remains available in Git history. The ledger preserves delivery dates, decisions,
evidence, and unresolved risks without using this status file as a second Roadmap.

## Status update protocol

After an authorized package:

1. Update Last verified, Current snapshot, milestone state, risks, and exact evidence.
2. Replace Next handoff with one executable package from the approved Roadmap.
3. Prepend one Engineering log entry containing Scope, Outcome, Verification, Known issue if any,
   and Next.
4. Record remote run/commit identifiers only after observing successful completion.
5. Keep historical facts while compressing resolved repetition; never rewrite an incomplete check as
   passed.
