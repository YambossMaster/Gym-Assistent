# M4 Contract — Scheduling

> Frozen 2026-09-14. Product Owner authorized M4 after M3.5 completion. This Contract is the
> complete authority for M4 and does not reuse the deliberately removed Scheduling starter.

## 1. Coach job and scope

A signed-in Coach needs to place, inspect, move, complete, cancel, and maintain a Course Session;
set regular availability and private blocked time; and establish a student's fixed rhythm without
silently repairing conflicts or inventing historical dates.

| Surface         | Frozen responsibility                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `/calendar`     | Read a bounded date range in agenda, day, week, or month form; operate sessions, availability, and blocks.                            |
| `/students/:id` | Show nearest future scheduled Course Session and dated Course Session history; maintain fixed Schedule Series.                        |
| `/today`        | Add only the local-day schedule projection to preserved M3 signals.                                                                   |
| `/sessions/:id` | Supply scheduled-session identity/context only. Training Records, exercises, autosave, offline drafts, and Training Result remain M5. |

M4 excludes exercises and Training Records, public rescheduling/capability links, reminders,
notifications, payments, external-calendar sync, collaboration, persistent offline queues, and
recurring Sessions other than the fixed weekly/biweekly Schedule Series below.

## 2. Authority and replacement model

The API derives Workspace and IANA time zone from verified identity. All instants are stored as UTC;
Calendar display, date-only inputs, and local-day boundaries use the returned Workspace time zone.
The browser never supplies a Workspace or time zone.

| Record                | Frozen fields and meaning                                                                                                                                                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Course Session        | `id`, `studentId`, nullable `seriesId`, `startsAt`, `endsAt`, `location`, `status`, nullable `completedAt`, `version`, timestamps. New scheduled Sessions require end strictly after start; location is trimmed and at most 160 characters.  |
| Schedule Series       | `id`, `studentId`, `anchorStartsAt`, `localWeekday`, `localStartTime`, `durationMinutes`, `intervalWeeks` (1 or 2), `autoScheduleHorizon`, `location`, `active`, `version`, timestamps. It owns future generated scheduled occurrences only. |
| Availability Rule     | `id`, weekday, start/end local times, `active`, `version`, timestamps. Multiple non-overlapping windows per weekday are allowed.                                                                                                             |
| Availability Override | `id`, local date, ordered non-overlapping windows, `version`, timestamps. It replaces the baseline for that date; an empty list means unavailable.                                                                                           |
| Calendar Block        | `id`, nullable `recurrenceId`, start/end instants, optional note, `version`, timestamps. A recurrence is finite concrete weekly occurrences sharing its ID, never an unbounded rule.                                                         |

Existing M3 `course_session` rows have no date/version. The M4 migration preserves IDs, Student
relationships, and status as **legacy entitlement rows**. It does not fabricate timestamps,
locations, or Series membership. A legacy row counts only when completed, is absent from Calendar,
Today schedule, nearest-session, and dated-history projections, and cannot be edited or completed
by M4. Migration preview reports its count by Workspace and status. New M4 Course Sessions are
temporal and participate in the unchanged M3 completed-session entitlement derivation.

## 3. Course Session operations

All operations resolve the verified Coach's Workspace and return `404` for missing or
cross-Workspace private resources.

| Operation      | HTTP operation                                     | Frozen behaviour                                                                                                                                             |
| -------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Calendar read  | `GET /v1/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD` | Local start inclusive/end exclusive, maximum 42 days. Return intersecting Sessions/Blocks and effective availability for each local date.                    |
| Session detail | `GET /v1/sessions/:sessionId`                      | Return Session, Student name/lesson summary, conflict summary, and M5-unavailable boundary only.                                                             |
| Create         | `POST /v1/sessions`                                | Accept Student, start/end instants, location; create `scheduled`, calculate warnings transactionally, and return accepted Session plus warnings.             |
| Edit/move      | `PATCH /v1/sessions/:sessionId`                    | Require `version`; change timing/location while scheduled and recalculate warnings transactionally.                                                          |
| Transition     | `POST /v1/sessions/:sessionId/transition`          | Require `version`; `scheduled -> completed`, `completed -> scheduled`, or `scheduled -> cancelled` only. Completion writes server time; reopening clears it. |
| Delete         | `DELETE /v1/sessions/:sessionId`                   | Require `version` and `DELETE`; only a new M4 scheduled Session without a future-owned relation may be deleted. Completed/cancelled rows remain history.     |

Complete/reopen changes the existing derived lesson balance and returns its accepted summary. A low or
negative balance never blocks the operation. Cancelling/deleting generates no replacement unless an
active Series reconciliation is explicitly triggered by the mutation creating a coverage deficit.

Conflicts are warnings, never admission controls: a Session may overlap a non-cancelled Session, a
Calendar Block, or availability. The server returns only own-Workspace conflict ID, range, kind, and
Student name. It never moves, cancels, or changes another record.

All writes are versioned. A stale target returns `409` with `version_conflict`, the current resource,
and no discarded draft. A concurrent write which creates a new warning succeeds; only stale version,
invalid transition/range, or invalid payload is rejected.

## 4. Fixed Schedule Series

Creating a rhythm creates a Series and its Coach-drawn first Session atomically. That Session is its
anchor and is never moved backwards. Weekly or biweekly interval, duration, and location are frozen
from the anchor.

`autoScheduleHorizon` is one of `NONE`, `1_WEEK`, `2_WEEKS`, or `MAX_WINDOW`. `NONE` creates no
automatic future occurrences; the weekly values cap generation at the named rolling duration; and
`MAX_WINDOW` caps it at the server's fixed six-month rolling window. It never makes an unbounded
write. Manual Sessions remain independent of this generation horizon.

Reconciliation runs transactionally after Series creation/edit/reactivation and after an active
Student's Purchase or Session transition/deletion changes remaining/future coverage. It:

1. uses M3 remaining entitlement and counts all future scheduled Sessions, including manual ones;
2. creates only future, chronological Series-linked occurrences needed for a positive deficit;
3. starts strictly after the latest occurrence for that Series and never backfills, moves, deletes,
   completes, or cancels existing occurrences;
4. stops at coverage equal to remaining entitlement or no active Series; and
5. is idempotent under retry and concurrent calls.

`PATCH /v1/schedule-series/:seriesId` accepts optional `effective_from_session_id` (UUID). When it
is supplied, the update begins at that own, future, scheduled linked Session and applies to that
Session plus later linked scheduled Sessions. When omitted, it begins at the first future scheduled
linked Session. Past, completed, cancelled, detached, and other-Series Sessions do not change.
The browser chooses and supplies the ID for a particular date or next-week action; it never supplies
a Workspace. Deactivation stops generation but preserves generated Sessions. Reconciliation returns
generated IDs and warnings.

| Series operation | HTTP operation                                           |
| ---------------- | -------------------------------------------------------- |
| List/create      | `GET` / `POST /v1/students/:studentId/schedule-series`   |
| Edit/deactivate  | `PATCH /v1/schedule-series/:seriesId` with version       |
| Reconcile now    | `POST /v1/students/:studentId/schedule-series/reconcile` |

## 5. Availability and Blocks

Availability is a Coach preference and M6 candidate-slot authority. It never invalidates, moves, or
blocks an existing Session. A baseline edit adds/removes a half-open window from one weekday; a
removal may split it, and results are sorted/non-overlapping. A date edit starts from effective
baseline/override, applies the same operation, then saves the complete Override; it affects no other
week.

`PUT /v1/availability/rules/:weekday` replaces a normalized baseline with version.
`PUT /v1/availability/overrides/:date` replaces a complete date window list with version. Terra may
offer add/remove commands only if these semantics remain exact.

`POST /v1/calendar-blocks` creates a one-off Block or 1–52 finite weekly occurrences atomically.
`PATCH`/`DELETE /v1/calendar-blocks/:blockId` requires version. For recurrence, scope is `single`,
`future`, or `all`: single changes one; future changes selected/later siblings; all changes all.
Future/all preserve each sibling's weekly offset while applying new duration/note.

Each successful Scheduling write invalidates affected Calendar ranges, Today schedule, Session
conflict summaries, Student schedule summaries, and lesson summary where transition changed it.

## 6. Read projections and Today merge

Calendar returns `timeZone`, `range`, sessions, blocks, `availabilityByDate`, and warnings. Session
rows expose only Student display name, timing, location, status/state, Series marker, version, and
warnings. Private notes and Purchase ledger fields are excluded.

`GET /v1/today` remains the one Today endpoint. Its optional `date=YYYY-MM-DD` selects Workspace
local date (default server local date). M4 adds only:

```text
today.schedule = {
  date, timeZone,
  sessions: ordered Sessions intersecting local day,
  counts: { scheduled, completed },
  conflictAttention,
  isEmpty
}
```

M3 `summary`/`attention` keep their meaning: Student/Lesson remains sole authority for active
Students, income, and low/negative balances. Scheduling owns `today.schedule` only. Cancelled and
legacy rows are excluded. `isEmpty` describes only this schedule range.

Student roster/detail gain only nearest future scheduled Session and dated Course Session history;
the API joins them without transferring M3 identity, notes, purchases, or lesson-summary authority.

## 7. Product and interaction decisions

Sol uses the archived Demo as reference; these behaviours are frozen for Terra.

| View   | Frozen behaviour                                                                         |
| ------ | ---------------------------------------------------------------------------------------- |
| Agenda | Chronological bounded list grouped by local date; no rows is successful Empty.           |
| Day    | One local-day time grid with availability, blocks, and Sessions.                         |
| Week   | Monday–Sunday time grid with Day semantics.                                              |
| Month  | Monday-first six-week grid; compact non-cancelled summaries; selecting a date opens Day. |

- Initial desktop Calendar is Week; previous/next changes the current unit and Today returns current
  local date. All views are selectable.
- The time grid snaps new/moved Sessions and Blocks to 15 minutes. Under 6 CSS pixels is click; at
  or over 6 pixels is drag. Drag preserves grab offset/duration, previews range, and opens editor
  before server write. Keyboard provides create/open/edit/move fields and Escape cancellation.
- Blank-grid click opens composer at Workspace default duration. It can create Session, edit
  availability, or create Block. Session quick view has edit/move, complete/reopen, cancel, allowed
  delete, and `/sessions/:id` link. Conflict warning needs explicit Coach acknowledgement to submit.
- Status language: `即將開始`, `待確認` (scheduled but ended), `已完成`, `已取消`. Cancelled rows are
  absent from density but remain Session/Student history.
- Desktop Day/Week: first deliberate down wheel/touch scroll collapses header; it reappears only
  after another upward gesture while timeline scroll is at top. Agenda/Month do not collapse header.
- Exact 390×844 defaults to compact Agenda; Day/Month remain selectable. Week is labelled horizontal
  scroll, never squeezed. Long-press/tap uses same composer/quick view; touch drag is not required.
  Modal/bottom sheet supports focus trap, Escape, Cancel, and opener focus restoration.

## 8. States, cache, and recovery

| Boundary                        | Required recovery                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Calendar/Today first load       | Semantic Loading; no records Empty; failed range recoverable Error; cached data remains readable while Refreshing.      |
| Session/Student schedule detail | Not Found is distinct from Error; legacy Session is truthful unavailable boundary.                                      |
| Create/edit/move/transition     | Keep input/preview during Mutating; field validation and warnings before confirmation; transport failure retains draft. |
| Conflict                        | Preserve draft, show returned current timing/status, offer reload/reapply or Cancel; never overwrite.                   |
| Reconciliation                  | Keep accepted Series visible, report generated count/warnings, and retry without duplicates.                            |

Terra adds memory-only Coach-scoped TanStack Query keys for Calendar range, Session, Series, and
completed Today projection. Auth subject change/sign-out retains full private-cache clear. No M4 data
is browser-persisted.

## 9. Terra evidence and exit

Terra implements only schema, Module/repository/HTTP adapters, typed query/mutation bindings,
semantic unstyled state boundaries, fixtures, and focused tests—no visual, responsive, interaction
styling, or end-user-copy decisions.

Required evidence before Sol:

1. migration/preview preserves date-less M3 rows and reports legacy, temporal, conflict, rejected,
   and per-entity counts with deterministic checksum;
2. two-Coach tests prove isolation and projection allowlists exclude private notes/Purchase ledger;
3. time-zone/range tests prove boundaries, ordering, counts, and M3/M4 Today authority split;
4. transaction tests prove transitions, balance effects, 15-minute validation, warning-only
   conflicts, versions, Overrides, and all Block scopes;
5. reconciliation tests prove anchor, future-only coverage cap, deactivation, idempotency, retry,
   and concurrent safety; and
6. Web state tests prove Loading, Empty, Error, Refreshing, Mutating, Not Found, legacy, Conflict,
   and complete affected-projection invalidation.

Sol then validates desktop/390×844 Calendar, Today, Student flows; pointer/touch/keyboard; header
scroll; modal focus; reduced motion; no overflow; and conflict recovery. CI then requires root
check/build, whitespace, migration preview/dry-run/advisors, live two-Coach/two-device evidence,
browser acceptance, commit/push, and observed remote Verify/migration-dry-run success.

## 10. Next gate

This Contract is frozen. The next authorized work is M4 Terra: implement exactly this replacement
model and semantic skeletons; return a missing product decision only through a Contract amendment.
