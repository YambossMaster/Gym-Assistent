# M5 Contract — Training and Exercise Library

> Frozen 2026-09-15. Product Owner approved this Contract and authorized M5 implementation with
> Sol executing the required Terra -> Sol -> CI gates. M4 is delivered at `dc83d92` (Status
> LOG-069). This document is the complete authority for M5 within the approved Roadmap.

## 1. Coach job, scope, and evidence sources

A Coach prepares a Course Session, records set outcomes with minimal interruption, recovers unsent
input, and reviews a Student's progress using stable Exercise identities. Official records and
performance come from the API; a local draft never changes entitlement or published history.

| Surface         | M5 responsibility                                                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `/sessions/:id` | Training workspace, ordered exercises/sets, private Training Note, autosave, draft recovery, previous defaults, performance, completion/reopen |
| `/exercises`    | Library, search/filters, favourites, create/edit/remove definitions                                                                            |
| `/students/:id` | Independent performance directory and per-exercise trend, preserving existing Student/Purchase/Scheduling sections                             |
| `/settings`     | One Training-owned default weight-unit preference; preserve existing account and Workspace operations                                          |

References inspected at the M4 baseline:

- `demo/src/pages/SessionPage.tsx`, `ExercisesPage.tsx`, and `StudentDetailPage.tsx`;
- `demo/src/components/ExerciseFilterShelf.tsx`, `PerformanceTrendModal.tsx`, and
  `PerformanceTrendChart.tsx`;
- `demo/src/types.ts`, `domain.ts`, `domain.test.ts`, `exerciseFilters.ts`, `exerciseCatalog.ts`,
  and the Training/Library operations in `store.tsx`;
- formal `apps/web/src/pages/sessions/SessionPage.tsx`, Scheduling Module/repository/HTTP seams,
  Workspace settings, `CONTEXT.md`, Architecture, ADR-0001/0002, Roadmap, and M4 Contract.

M6 retains public links, note-sharing consent, public Training Result pages, and image download.
M7 retains general pending-operation queues, offline replication, persisted query caches, and Demo
import. M5 adds only the narrowly scoped Training draft described below. No health/body metrics,
exercise videos, AI prescriptions, templates, timers, payments, or notifications are introduced.
Today/Calendar keep their delivered projections; Training editing is reached through Session links.

## 2. Deliberate formal-product decisions

Approval of this Contract includes these explicit choices; they are implementation requirements,
not claims about the current app before M5 delivery.

| Concern               | Proposed rule and Demo relationship                                                                                                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial library       | Copy only the generic definitions in the archived `exerciseCatalog.ts` into a versioned formal catalog manifest. Initialize a private copy per Workspace, once and idempotently. Never copy students, sessions, outcomes, favourites, or Demo settings. |
| Default definitions   | As in the Demo, a Coach may edit/remove even a default definition. Copies are Workspace-owned; no Coach can mutate another Coach's library. Removed defaults are never silently restored.                                                               |
| Stable history        | Match definition ID and snapshot metric, never name. Demo's name fallback is reserved for a future explicit M7 import mapping. Renaming retains history; a different metric gets a separate performance series.                                         |
| Previous set defaults | Preserve the Demo distinction between planning defaults and achievement: use the latest strictly earlier saved occurrence, including scheduled Sessions. Exclude cancelled Sessions in the formal app. Defaults do not count as achievements.           |
| Repeated exercise     | Allow multiple occurrences of the same definition in a Session, as the Demo does. Aggregate their qualified sets into one performance point; use the first ordered matching occurrence for previous-set defaults.                                       |
| Completed records     | Preserve Demo editing of completed Sessions; accepted corrections immediately update performance. Reopening retains the record and removes it from completed-Session history until completed again.                                                     |
| Units                 | Keep recorded numbers and units. A set's kg/lb selector changes the unit attached to its entered number, as in the Demo; it is not an automatic conversion. Performance comparisons convert units mathematically.                                       |
| Save reliability      | Retain the Demo's 650 ms idle autosave and leave-page flush intent; add versioned server acceptance and a durable, identity-scoped local draft. Never label a local write as server-saved.                                                              |

## 3. Ownership and persistence contract

Training owns definitions, Training Records, ordered exercise/set snapshots, preferences, and
performance projections. Scheduling continues to own placement, Session status, and its version.
Student/Lesson continues to derive entitlement from completed Course Sessions only.

All new tables live in `app_private`, with browser-role access revoked and the established API-role
boundary preserved. Derive Workspace exclusively from verified identity. Tenant-safe composite
foreign keys or equivalent constraints must cover every parent/child relationship, including
Exercise Definition references. Reject forged cross-Workspace IDs before returning content.

| Entity                    | Fields and invariants                                                                                                                                                                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exercise_definition`     | Workspace, stable UUID `id`, optional immutable `catalogKey`, `name`, `equipment`, ordered unique `bodyParts`, `movementType` (`系統動作`/`局部動作`), `performanceMetric` (`weight`/`reps`), `isSystem`, `favorite`, nullable `deletedAt`, positive `version`, server timestamps |
| `training_record`         | Workspace, UUID `id`, unique Course Session ID, `privateNote`, positive `version`, server timestamps. No independent completed flag. Missing record reads as empty with record version `0`; reads do not create records.                                                          |
| `training_exercise`       | Workspace, Record ID, stable occurrence UUID, position, Definition ID, and immutable-at-insertion snapshots of name/equipment/bodyParts/movementType/metric. Exercise order is explicit and unique per record.                                                                    |
| `training_set`            | Workspace, Exercise occurrence ID, stable UUID, position, nullable `plannedWeight`, `plannedReps`, `actualReps`, `rpe`, `result` (`completed`/`incomplete`/null), and `unit` (`kg`/`lb`)                                                                                          |
| Training preference       | One Workspace-owned versioned `defaultWeightUnit`, initially `kg`; do not overload the existing Workspace profile version.                                                                                                                                                        |
| Training mutation receipt | Workspace, operation ID, target, canonical payload hash, accepted response/version, server time; retain for 7 days to recover ambiguous writes without duplication.                                                                                                               |

Private Training Notes are Coach-only. Performance, Library, list, Calendar, and Today projections
exclude all private notes. Public projection design remains M6; M5 creates no public read endpoint.

New occurrences require a live authorized Definition and its expected version. The server derives
snapshots, rather than trusting client-authored definition text. A definition changed/deleted while
being picked yields a recoverable conflict. Existing occurrence snapshots remain unchanged when
their definition is edited or soft-deleted; saving other fields remains allowed. Replacing an
exercise means removing its occurrence and adding a new one. No endpoint rewrites old snapshots.

Soft deletion removes a definition from lists/pickers but retains its stable identity for history.
Initialize catalog copies for existing Workspaces in the serialized migration and for future
Workspaces in server-side bootstrap. Use a unique Workspace/catalog-key constraint; UUIDs are
per-Workspace and stable after creation. The frozen manifest is a formal asset, not a runtime import
from `demo/`. New catalog releases or resetting a Coach's library require a later explicit contract.
Training children cascade with an explicitly deleted owning Session/Student/Workspace, following
existing lifecycle operations. The Session delete confirmation must state that its Training Record
will also be deleted. No new bulk-delete or catalog-reset operation is added.

Validation is identical at HTTP, Module, and durable constraints where applicable:

- Name/equipment: trimmed, 1–120 characters each; 1–12 body-part tags, trimmed and unique,
  1–40 characters each. Duplicate names are allowed; they do not imply identical definitions.
- Private note: at most 5,000 characters. At most 100 exercise occurrences per record and 100 sets
  per occurrence; HTTP write body at most 1 MiB. UUIDs must be unique within their owning aggregate.
- Weight: finite decimal, 0–10,000, at most 3 decimal places; reps: integer 0–10,000;
  RPE: 1–10 in increments of 0.5. Empty is null, never coerced to zero. RPE is optional.
- Persist weight as decimal plus original unit; do not round stored inputs for chart presentation.
  Intermediate invalid text may remain in a local draft, but cannot be accepted by the server.
- All new records belong to temporal M4 Sessions. Legacy entitlement rows retain their existing
  read-only boundary. Cancelled Sessions expose preserved records read-only; no new Training save.

## 4. Set entry and performance semantics

### 4.1 Set-entry transformations

Adding an exercise appends an occurrence with no sets. Adding a set takes weight/reps/unit from the
same ordinal previous default, falling back to the last previous default, then the preceding set in
this occurrence, then null weight/reps and the Workspace default unit. Fallback is per field, as in
the Demo. Never carry `actualReps`, `result`, or RPE into a new set.

Previous defaults use the most recent strictly earlier non-cancelled temporal Session for the same
Student, definition ID, and snapshot metric. Order by `startsAt DESC, id DESC`; select the first
ordered matching occurrence. Copy `actualReps ?? plannedReps`, original weight, and original unit
from its ordered sets. An empty occurrence yields no historical defaults. There is no invented
weight, repetition target, success, or previous date when history is absent.

- Editing actual reps derives null result when actual or planned reps is null, `incomplete` when
  actual is below planned, and `completed` otherwise. Zero is a valid entered value.
- Clicking `已完成` fills actual reps from planned reps and marks completed; a null plan leaves
  actual reps null. Clicking `未完成` clears actual reps and marks incomplete.
- Clicking an already selected result clears both actual reps and result.
- Weight/plan/RPE edits alone do not silently change an explicit result. This preserves Demo
  behaviour; result is the qualification source, not a new inferred achievement rule.
- Removing a set or exercise updates the recoverable aggregate draft; ordered IDs remain stable.
  Focus moves to the adjacent set or add control. A destructive exercise removal uses confirmation
  when it contains sets; a set removal offers an in-route undo until the next edit/navigation.

### 4.2 Server-owned achievements

Only sets whose `result === completed` qualify. Weight metric uses the maximum non-null
`plannedWeight` converted to the display unit; reps metric uses maximum non-null `actualReps`.
Nulls, incomplete, and unmarked sets contribute nothing. A qualified zero is valid, not missing.
Neither planned volume, incomplete actual reps, nor an estimated one-rep maximum is substituted.

Use `1 lb = 0.45359237 kg`; compare unrounded converted values and round the displayed maximum to
one decimal place only once. Thus 80 lb displays as 36.3 kg, and outweighs 32 kg. Reps remain
integers. Mixed snapshot metrics never share a series, even under one Definition ID.

| Projection value   | Rule                                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session `current`  | Maximum qualified value from this Session's accepted record, including a scheduled current Session                                                                              |
| Session `previous` | Latest qualifying completed Session strictly before this Session's `startsAt`, excluding this Session                                                                           |
| Session `personal` | Maximum across qualifying completed Sessions plus this current Session; like the Demo, completed records after the viewed date may contribute                                   |
| Session `history`  | One point per qualifying completed Session plus the current non-cancelled Session, deduplicated by Session ID; ascending `startsAt, id`                                         |
| Student directory  | Completed Sessions only, grouped by Definition ID plus snapshot metric; latest snapshot supplies the display label, each entry includes session count, latest and personal best |
| Student trend      | All qualifying completed points for that entry; exclude reopened, scheduled, cancelled, legacy, and other-Student Sessions                                                      |

Session display unit follows the first ordered set with a weight in the viewed occurrence, else the
Training preference. Student performance uses the Training preference. Directory order is session
count descending, latest date descending, then display name and identity for deterministic ties.
Empty values render `尚無紀錄` or `—`, never an invented zero. A one-point trend shows one point.

The browser may preview local set entry, but official best/history labels update only from accepted
server projections. During unsaved edits show `儲存後更新表現`; do not mix a draft point into an
official history chart. Charts have a readable date/value list and do not imply equal time intervals
when Sessions are irregularly spaced.

## 5. Versioned operations and Module seam

Every operation starts with verified identity and resolves Workspace server-side. Cross-Workspace
and missing private IDs return the same `404`. Unauthorized nested references return `404` without
revealing a parent. `400` carries field/precondition errors; `401` stops sending; `409` carries a
machine-readable reason and the minimum authorized current resource. Operational errors expose no
SQL, credentials, private logs, or stack traces.

| HTTP operation                                                       | Contract                                                                                                                                                                                             |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /v1/exercises`                                                  | Library projection: visible definitions, filter metadata, totals, versions; same data powers picker. Query fields `q`, `equipment`, repeated `bodyPart`, `movementType`, `view=all/favorite/custom`. |
| `POST /v1/exercises`                                                 | Create custom definition; operation ID makes ambiguous retry safe. Server sets ID/version/origin.                                                                                                    |
| `PATCH /v1/exercises/:id`                                            | Full editable definition fields with `version`; never accept Workspace, origin, or snapshot updates.                                                                                                 |
| `PUT /v1/exercises/:id/favorite`                                     | Explicit boolean `favorite` and definition `version`; no retry-unsafe toggle command.                                                                                                                |
| `DELETE /v1/exercises/:id`                                           | Soft delete with `version` and `confirmation=DELETE`; preserve snapshots/history.                                                                                                                    |
| `GET /v1/training/preferences`                                       | Default unit and preference version; missing preference reads kg/version 0.                                                                                                                          |
| `PUT /v1/training/preferences`                                       | Default unit and expected version; no other Workspace/account fields.                                                                                                                                |
| `GET /v1/sessions/:id/training`                                      | Session workspace projection defined below; no write on read.                                                                                                                                        |
| `PUT /v1/sessions/:id/training`                                      | Full ordered record input, `recordVersion`, `sessionVersion`, and operation ID; CAS of one aggregate in one transaction, never child-by-child HTTP writes.                                           |
| `POST /v1/sessions/:id/training/complete`                            | Same complete draft payload plus both expected versions and operation ID; accept record and complete Session atomically. Return accepted workspace and lesson summary.                               |
| `GET /v1/sessions/:id/training/defaults?definitionId=...&metric=...` | Authorized server-derived previous set defaults for picker/add-set; existing soft-deleted definitions require an occurrence in this Session.                                                         |
| `GET /v1/students/:id/performance`                                   | Directory projection, without private notes.                                                                                                                                                         |
| `GET /v1/students/:id/performance/:definitionId?metric=weight/reps`  | Complete ordered points and summaries for the authorized Student and definition/metric; deleted definitions remain usable via history.                                                               |

Library/search uses trimmed case-insensitive substring matching across name, equipment, type, and
body-part labels. Equipment/type match exactly; selected body parts use AND; all filter dimensions
combine with AND. Filter metadata is from the whole visible authorized library. Library order is
catalog order then custom creation order, each with ID tie-break; picker puts favourites first while
retaining that order. Query/filter failures cannot be presented as an empty successful library.
For M5 these projections return their full result sets; never silently truncate counts or trends.

The Session Training projection contains:

```text
session: id, studentId, studentName, startsAt, endsAt, location, status, version, isLegacy
lessonSummary: purchased, completed, remaining
record: id|null, version (0 when absent), privateNote, ordered exercise/set snapshots, updatedAt|null
defaultWeightUnit
exerciseSummaries: occurrenceId, definitionId, metric, unit, current, previous, personal, history
allowedActions: canEditTraining, canComplete, canReopen
```

The existing M4 Session projection remains available for scheduling/conflicts. Training obtains
Session facts through a Scheduling read/transaction interface, rather than duplicating placement
rules. Training completion invokes the existing Scheduling transition rules in a shared transaction.
Lock Session first, then record, then referenced definitions in sorted ID order. Record saves also
check Session version/status under that lock. Serialize creation with the unique Session constraint.
No-op content saves return the current version; actual content changes increment record version once.

The aggregate write contains `privateNote` and ordered `exercises[]`; each occurrence has its UUID,
Definition ID, expected definition version when new, and ordered `sets[]` with the fields in section 3. Array order determines positions. Existing IDs must belong to this record; moving a persisted set
between occurrences or changing an existing occurrence's Definition ID is rejected. Snapshots,
timestamps, ownership, totals, and performance are response-only. Omitted children are removed in
the same accepted transaction; malformed payloads leave the entire record unchanged.

Completed empty records are allowed: completion tracks attendance/entitlement, not set achievement.
Missing or incomplete sets never block completion. Completion increments Session version exactly
once, uses server completion time, and retains Scheduling's reconciliation behaviour after commit.
Reopen uses the existing M4 transition after flushing the Session draft; it does not clear sets.
Cancel similarly flushes first. Network failure/conflict prevents dependent transitions.
Before completion, drain any in-flight autosave, keep later edits, then submit the latest revision
with the newly acknowledged versions. Freeze editing during that final atomic request; a delayed
autosave cannot overwrite or follow it with an obsolete payload.

Existing Calendar/Today complete/reopen controls remain valid without loading Training. Their M4
version checks remain intact; a remote status change makes an outstanding Training save conflict.
No record write changes Session placement, entitlement, or status by itself. Session deletion racing
with a save must serialize: either the saved record is deleted with the Session, or save returns 404.

All M5 writes carry a UUID operation ID. Check an existing receipt before checking stale versions:
same target/hash returns the original accepted response, different payload with that ID returns
`409 operation_mismatch`. Retries preserve the exact ID/payload; new edits get a new ID. An expired
receipt never bypasses versions; creation retries after expiry require refreshing the library before
an explicit new create. Store no raw identity tokens in receipts.

## 6. Autosave, offline draft, and conflict recovery

1. Only an authenticated, successfully loaded temporal Session can start a draft. Persist edited
   content promptly to IndexedDB under environment + verified Coach subject + Session + tab draft
   ID. Include draft schema version, base record/Session versions, local revision, saved time, and
   an exact outstanding operation when needed. Persist only this edited aggregate and recovery
   metadata, never the route response, Student context, history, library, or Auth token.
2. Debounce valid edits for 650 ms. Allow one in-flight write per Session editor; coalesce later
   revisions. A response acknowledges only the revision it sent and cannot replace newer input.
   After acceptance, use the returned version for the next unsent revision. Do not claim `已儲存`
   until all current edits have been accepted; delete only the acknowledged draft revision.
3. Invalid input remains visible and recoverable, with inline errors and autosave paused. If durable
   storage fails, show `無法保留本機草稿，請保持此頁開啟並重試儲存。`; keep the in-memory input.
4. On route navigation flush the latest valid revision and wait. On failure offer `留在此頁` and,
   only after verified durable draft storage, `保留草稿並離開`. Invalid drafts use the same explicit
   leave choice. Complete uses the atomic draft-and-complete endpoint, not two independent writes.
5. On page hide/unload persist the latest draft and attempt only best-effort flush. Never depend on
   unload HTTP success. Warn on unsaved tab close where the browser permits; do not claim a browser
   can guarantee that warning or a final network write.
6. Offline editing is limited to already loaded records/occurrences and adding/removing their sets.
   Library writes, new exercise selection, completion/reopen/cancel, and deletion require online
   acceptance. Reconnect reads current authority first; retry an ambiguous operation with its exact
   ID to establish whether it committed before sending newer content.
7. On reload offer `恢復草稿` / `捨棄草稿` after identity and Session authorization succeed. Matching
   versions permit recovery and autosave. Differing versions open Conflict; never auto-rebase or
   overwrite. Separate tab drafts remain separately recoverable; one tab cannot erase another's.
8. Conflict pauses saves and preserves local input while showing accepted current content. Offer
   `保留草稿並檢視最新紀錄` and `捨棄草稿，載入最新紀錄` (confirm discard). The Coach may manually
   re-enter selected edits against the latest version; no force-save or automatic merge.
9. Explicit sign-out/account deletion clears that Coach's drafts after the existing unsaved-change
   guard allows flush or confirmed discard. Subject change hides all old-subject data immediately;
   draft access requires the matching verified subject. Session expiry retains drafts but blocks
   sends until reauthentication. Missing/deleted Session recovery never recreates a Session.
10. Drafts expire after 7 days since their last local edit; purge on startup/access and explain the
    retention in the leave/recovery message. Do not refresh expiry just by reading. Browser data
    clearing/eviction can remove drafts; the UI describes them as local recovery, not a backup.

An offline badge requires observed connectivity/transport state. A server failure while online is
`暫時無法儲存，草稿已保留。`, not proof of being offline. Unknown draft schema versions are not
replayed; show a recoverable incompatibility notice and explicit discard.

## 7. Route states, copy, and interaction acceptance

Use the existing FORM shell, typography, restrained surfaces, and accent. Desktop Session keeps
context/note separate from exercise entry; mobile stacks context, exercises, then note with one
compact sticky save/completion bar above safe-area navigation. No page-wide horizontal scrolling.
At 390×844, each set wraps labels and inputs into a readable card; all controls remain reachable
with the software keyboard. Do not shrink a desktop spreadsheet to fit.

Library and picker share search, all/favourite/custom tabs, filter shelf, removable selected tags,
and reset. Picker selects one definition and closes; focus returns to the inserted occurrence.
Create-from-picker opens the same definition form and adds the accepted definition once. A failed
record save must not recreate that definition. Preserve filters when returning from create/cancel.
Definition version conflicts keep form input and require reload/cancel before resubmission.

Student performance is an independent section: directory -> trend -> back to the same directory
scroll position. Session trend opens from its exercise card. Use accessible date/value text beside
the chart, distinguish metric/unit, and avoid hover-only details. Empty/one-point/equal-valued trends
must remain legible. Library removal never makes a historical trend disappear.

Dialogs/bottom sheets trap focus, lock background scroll, support Escape, and restore opener focus.
Use at least 44 px touch controls, labelled numeric inputs with decimal/numeric keyboards, visible
keyboard focus, `aria-pressed` for result/favourite buttons, and polite save announcements. Honour
reduced motion; no whole-page entrance delay or blocking overlay during cached refresh.

| State/slot                   | Required wording and behaviour                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| First Training load          | `載入訓練紀錄中…`; no editable empty record before success                                                                                   |
| Training error               | `無法載入訓練紀錄。` + `重試`; preserve successful Scheduling context                                                                        |
| Missing/inaccessible Session | `找不到這堂課。` + `返回行事曆`; never restore into a replacement Session                                                                    |
| Empty record                 | `尚未安排動作` / `加入第一個動作，開始記錄這堂課的訓練。` + `加入動作`                                                                       |
| Entry labels                 | `工作重量`, `目標次數`, `實際次數`, `RPE（自覺用力程度，1–10）`, `已完成`, `未完成`, `新增一組`                                              |
| Private note                 | `教練私人筆記` / `僅供你查看。`                                                                                                              |
| Save pending/success         | `儲存中…` / `已儲存`; announced only from the real state                                                                                     |
| Offline durable draft        | `離線中，草稿已保留於此裝置。`                                                                                                               |
| Recovery                     | `有尚未送出的草稿。` / `本機草稿保留至最後編輯後 7 天。` + recovery choices above                                                            |
| Training conflict            | `紀錄已在其他裝置變更；你的草稿仍保留。` + recovery choices above                                                                            |
| Refreshed data failure       | `暫時無法更新，仍顯示上次載入的內容。` + `重試`; never replace dirty input                                                                   |
| Completion/reopen            | `完成上課` / `改回待上課`; success `課程已完成。` / `課程已改回待上課。`                                                                     |
| Library headings/actions     | `動作庫`, `全部`, `常用`, `自訂`, `新增自訂動作`, `建立動作`, `儲存修改`, `取消`                                                             |
| Library empty/filter empty   | `尚無動作` + `新增自訂動作`; `沒有符合的動作` + `清除篩選`                                                                                   |
| Definition editor            | `動作名稱`, `器材`, `部位標籤（可複選）`, `動作類型`, `最佳表現指標`; metric options `重量（每堂最高工作重量）` / `次數（每堂最高實際次數）` |
| Definition note/delete       | `修改動作庫不會覆寫已保存的課堂內容。`; `刪除這個動作？` / `既有課堂紀錄會保留。` + `保留` / `確認刪除`                                      |
| Performance                  | `動作表現`, `本次最佳`, `上次最佳`, `個人最佳`, `尚無紀錄`, `返回動作列表`                                                                   |
| Trend empty                  | `還沒有可繪製的最佳表現` / `只有標記為已完成的組別會進入最佳表現紀錄。`                                                                      |
| Unit preference              | `預設重量單位` / `只影響新增組別與表現顯示，不會改寫既有重量。`                                                                              |

All write controls prevent duplicate submission and preserve input on transport/validation errors.
For limits, render `最多 {limit} 個字。`, `請輸入 {min}–{max} 之間的有效數值。`, or
`已達可新增數量上限。` next to the affected field/control. Use `此動作已變更，請重新選擇。`
for a picker conflict. No raw API reasons or milestone names appear in rendered copy.

## 8. Cache and lifecycle integration

Use Coach-scoped TanStack Query keys for Library/filter parameters, Training preferences, Session
Training, defaults, Student directory, and definition/metric trend. Keep responses in memory.
Prefetch only from authorized visible Session/Student links. Cancel and clear private queries on
Auth subject change/sign-out; stale in-flight responses cannot populate a new subject's cache.

- Record acceptance invalidates that Session's Training/defaults and its Student's performance;
  invalidate cached defaults for other Sessions of that Student as their source may have changed.
- Complete/reopen/cancel/delete also invalidate existing Session, Today, Calendar, Student detail,
  roster/lesson summaries through the preserved Scheduling invalidation seam, plus performance
  and Training/defaults. A status change observed on focus/refetch updates Training editability.
- Definition changes invalidate Library/picker/defaults. Accepted snapshots are never replaced by
  refetching a definition. Removing a definition does not erase performance queries.
- Unit preference acceptance invalidates Training defaults and performance display projections;
  existing draft/set units remain unchanged. Training errors remain separate from account panels.

## 9. Gate evidence and implementation handoff

**Contract exit:** passed 2026-09-15. Product Owner approved this document, including section 2 and
the draft policy, and authorized Sol to execute M5 while retaining the mandatory Terra -> Sol -> CI
gate order. Roadmap scope/order and M0–M4 evidence remain unchanged. Historical Architecture section
6.2 predates M4 delivery; use M4 Contract and current Status for that delivered seam, not its
obsolete `M4 is not started` sentence.

**Terra:** implement serialized migration and Training Module/repository operations, then typed
queries, draft coordinator, and semantic route states with the supplied wording. Existing Modules
remain authority for their facts. Missing product decisions return to Contract. Required evidence:

1. Domain/Module tests: same-name/different-ID isolation, rename/delete snapshot preservation,
   metric separation, repeated occurrences, set-result transformations, zero/null distinctions,
   conversion/rounding, no-history defaults, planned defaults versus achieved history, date ties,
   and completed/reopened/cancelled membership.
2. PostgreSQL/HTTP evidence: tenant-safe nested IDs; one record per Session; atomic whole-record
   replacement/completion rollback; multi-device and save/delete races; definition snapshot races;
   receipt retry/mismatch; empty-record completion; account/Student deletion cascades. Verify
   notes cannot enter Library/performance/list/error responses or browser-accessible tables.
3. Focused Web evidence: 650 ms debounce, newer edit while save is in flight, no-op/read behaviour,
   failed write, lost-response replay, invalid input, navigation flush, atomic completion, reload,
   offline/reconnect, two-tab drafts, conflict preservation, storage failure, draft expiry, subject
   switch, logout/expiry, and independent Loading/Error/Empty/Refreshing boundaries.
4. Deterministic catalog initialization proves all manifest definitions, stable keys, no duplicates
   on rerun, private Coach edits/favourites, and no recreation of deleted defaults. Migration
   preserves M3 legacy rows/M4 timestamps and creates no historical Training facts. Add an M5
   migration-preview fixture with counts/rejections/checksum; it is not a Demo import operation.

**Sol:** converge only after Terra evidence passes. Run full keyboard/pointer flow on desktop and
exact 390×844: Library filters/create/edit/favourite/delete; picker/create-from-picker; two metrics,
mixed units, set outcomes/removal; note/save feedback; completion/reopen; Student directory/trend;
empty/one-point trend; conflict/offline/reload recovery; focus/Escape/scroll restoration and no page
overflow. Verify no console errors and no private note in a performance response.

**CI:** root `npm run check`, `npm run build`, `git diff --check`; focused M5 live two-Coach E2E;
M4 live regression for touched transitions/reconciliation/deletion; M5 migration preview; linked
`npm run db:push:dry`; relevant Supabase lint/advisors. Create migrations using the official CLI
after discovering syntax. Run live writes only on verified isolated development fixtures and clean
them up. Keep the accepted development warnings separate from new findings.

Terra must add and document `npm run e2e:m5 --workspace @gym-assistant/api` and
`npm run preview:m5 --workspace @gym-assistant/api`; these commands do not exist at Contract time.
Finish with a cohesive commit/push and observed GitHub Actions Verify plus migration-dry-run for
that exact commit. Record actual evidence in Status; M5 is complete only after Sol and CI pass.
Stop at M5 completion and hand off M6 Contract as the next milestone boundary.
