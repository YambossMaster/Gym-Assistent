# M7 Contract — Local resilience and Demo migration

> Frozen 2026-09-15. The Product Owner confirmed M6 completion and authorized continuous M7 work.
> M0–M6 are the protected target baseline. This Contract governs Terra -> Sol -> CI without changing
> the Roadmap's scope, sequence, authority model, or completion criteria.

## 1. Coach job, owning surfaces, and evidence sources

A Coach using a personal device needs recoverable work when connectivity is interrupted and a safe,
reviewable path from the archived Demo into the formal server-authoritative Workspace. Recovery must
never make the browser a second system of record or silently overwrite accepted server state.

| Surface                    | M7 responsibility                                                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Global authenticated shell | Show truthful offline/pending state, resume eligible queued work after reconnect/focus, and provide a route to inspect it.                                        |
| `/sessions/:id`            | Retain the delivered seven-day Training draft and replay its exact idempotent save after reconnect.                                                               |
| `/settings`                | Own device-data controls and Demo backup, validation, preview, confirmed import, progress, rejection, retry, and rollback.                                        |
| Resilience adapter         | Scope IndexedDB records to environment plus verified Coach subject; expire, replay, cancel, and clear only approved local records.                                |
| Demo Migration Module      | Validate one complete `form-coach-mvp-v1` snapshot, create an immutable preview, import ordered phases, and roll back only untouched rows created by that import. |

Evidence inspected at the M6 baseline:

- Demo `AppData`, `form-coach-mvp-v1` loader/migrations, reset behaviour, and Settings/public flows;
- formal M3/M4/M5 preview code and stable target schemas, M5 mutation receipts and Training draft;
- current route/query/Auth cache boundaries, Architecture, ADR-0001/0002, Roadmap, and Status;
- current Supabase changelog, migration guidance, and database-advisor guidance.

M7 excludes full offline browsing, persisted private query responses, background sync after the app is
closed, cross-device draft sync, conflict auto-merging, arbitrary JSON/CSV import, scheduled backups,
cloud backup storage, Demo storage deletion, importing Demo secrets, and M8 production recovery.

## 2. Frozen local-persistence allowlist

PostgreSQL remains the only official data source. Supabase Auth keeps its existing session storage.
M7 adds one IndexedDB database, `form-coach-local-v1`, with schema-versioned `drafts`, `operations`,
`preferences`, and `imports` stores. Records include environment and Coach subject; private records
from one subject are never read, counted, replayed, or shown to another.

| Local category       | Frozen policy                                                                                                                                                                                                                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Training draft       | Keep the existing Session/tab draft, including private Training Note and set input, for seven days. The accepted server version remains authoritative.                                                                                                                                                          |
| Other form drafts    | Persist only unsent Student, Purchase, Course Session, Calendar Block, Availability, custom Exercise, and Workspace-setting form values after the Coach changes them. Keep seven days; exclude passwords, account deletion confirmation, capability tokens, and public payloads.                                |
| Pending operations   | Persist only Training save/complete and Exercise create/update/favourite operations because M5 already supplies operation receipts. Destructive deletes, Session lifecycle/scheduling writes, Student/Purchase writes, Workspace/account changes, and every Capability Link operation remain online-only in V1. |
| Query cache          | Keep all authenticated and public TanStack Query data memory-only. A disconnected route may retain data already in the current tab, but reload never hydrates private server responses from disk.                                                                                                               |
| UI preferences       | Persist non-sensitive device choices only: Calendar view, Exercise filters/view, and dismissed recovery guidance. They expire after 180 days. Server-owned time zone, weight unit, availability, and profile settings are never shadowed locally.                                                               |
| Import working state | Keep the source backup fingerprint, server preview ID/checksum, phase status, rejections, and rollback eligibility for 30 days. Do not retain the raw Demo snapshot in IndexedDB after upload/preview.                                                                                                          |

The shell clears every draft, operation, preference, and import record for the departing Coach after
sign-out/account deletion, and cancels replay first. Expired records are removed on startup and after
successful writes. `清除此裝置的暫存資料` performs the same Coach-scoped clear after confirmation;
it never deletes official server records or Supabase Auth state.

IndexedDB is ordinary browser storage, not encrypted backup. The Settings copy says it is suitable
only for a trusted personal device. Storage failure leaves the live form usable, announces that local
recovery is unavailable, and never blocks an online server write.

## 3. Operation-queue and recovery contract

Each queued operation contains a UUID operation ID, frozen target, canonical payload, payload hash,
created/updated time, attempt count, next-attempt time, and state `pending`, `sending`, `conflict`, or
`failed`. The raw Auth access token is never persisted. Replay obtains the current in-memory session
token and stops immediately if the subject or environment differs.

Eligible operations are already idempotent through M5's seven-day mutation receipt. An identical
operation ID and payload returns the accepted response without duplicating a Definition or Training
Record mutation. Reusing an ID with another target or payload returns `409 operation_mismatch` and
becomes a terminal local failure requiring cancel. Queue retention is seven days so it never outlives
the matching server receipt.

Replay is single-flight per Coach and FIFO by creation time:

1. start on app bootstrap, browser `online`, authenticated-window focus, or explicit `重試`;
2. send one operation and wait for its accepted response before the next;
3. remove an accepted operation and invalidate every affected in-memory projection;
4. on network/`5xx`, keep it pending with capped exponential retry while the app remains open;
5. on `401`, pause for Auth recovery; on `400` or operation mismatch, mark failed;
6. on stale `409`, mark conflict, fetch current server state, and require `使用雲端版本` or
   `以目前內容建立新操作`; the original operation ID is never repurposed;
7. `取消待送` removes only the local operation and associated draft after confirmation.

Closing, reloading, or losing connectivity during `sending` returns the record to `pending`; exact
replay is therefore required. Completing a Training Session remains one atomic server operation and
is never split into separate record and Session queue entries. Capability issuance/reissue is never
queued because a lost one-time token response cannot be recovered.

## 4. Source backup, validation, and preview

The archived Demo adds a `下載完整備份` action that serializes the exact current value of
`form-coach-mvp-v1` into a UTF-8 JSON file. It does not migrate, reset, or rewrite the storage key.
The formal Settings route accepts that file and, when running on the same origin as an existing Demo
key, may offer `使用這個瀏覽器的 Demo 資料`.

Before the first preview the formal Web downloads the exact source bytes as
`form-coach-demo-backup-YYYY-MM-DD.json`. A checkbox confirms that the download succeeded. The source
key and backup remain untouched throughout M7; the UI never offers cleanup.

`POST /v1/demo-imports/previews` accepts a complete JSON snapshot up to 10 MiB and derives Workspace
from verified identity. Validation rejects invalid JSON, unknown top-level shape, unsupported value
types, excessive collection sizes, invalid dates/ranges/enums, duplicate source IDs, missing
references, or values outside target limits. Unknown object fields are ignored and reported as
warnings so older additive Demo shapes remain usable.

The server stores an immutable preview for 24 hours: source SHA-256, normalized manifest checksum,
target baseline fingerprint, ordered mapped entities, warnings/rejections, counts, and proposed
changes. Raw Demo capability tokens are discarded before persistence and never logged. Responses do
not echo the full source or private-note bodies; they show entity labels/IDs and reason codes.

Target IDs are UUIDv5-equivalent deterministic SHA-256 mappings over Workspace ID, entity kind, and
Demo source ID. A rerun in one Workspace maps identically; another Workspace maps differently.
Existing target ID plus matching imported checksum is `already imported`; differing content is a
conflict and is never overwritten silently.

## 5. Ordered mapping and deliberate deviations

Import executes these phases in the Roadmap order. Each phase is one database transaction; a failed
phase rolls back itself, leaves prior accepted phases visible, and pauses later phases.

1. **Settings / exercises / students** — compare Workspace settings and Training preference versions;
   import Demo display name, IANA time zone, and default weight unit only after confirmation. Ignore
   reminder/conflict-scan/calendar-hour fields with warnings because no formal authority owns them.
   Match official system exercises by stable catalog name only when unique; create deterministic
   custom Definitions and apply favourites through Workspace-owned copies. Import Students with
   private context and active/archive state; `lineLinked` becomes a warning because formal V1 has no
   LINE authority.
2. **Purchases** — import deterministic Lesson Purchases after their Student exists. Demo integer
   amount is TWD minor units; zero remains zero. Preserve note and purchase instant.
3. **Training** — create deterministic legacy Session identity shells needed by Training rows, then
   import custom Definition snapshots, Training Records, ordered exercises, and sets. Map uniquely
   matched system definitions; ambiguous or missing definitions create a deterministic private
   custom Definition. Preserve notes and successful/incomplete/unmarked results without inventing
   performance facts.
4. **Scheduling** — upgrade the same Session shells to temporal Course Sessions, then import Series,
   Availability, overrides, and Blocks. Preserve warning-only overlaps, statuses, timestamps,
   locations, recurrence identity, and date-local windows. Reconciliation runs only after all source
   rows are present and never backfills before server now.
5. **Capability links** — process every Demo link and reject it as `legacy_secret_not_transferable`.
   Demo raw tokens, expiry/use metadata, and note consent do not create formal grants. The Coach may
   issue fresh M6 links from each eligible Session after import.

The preview shows, per phase, create/already-imported/conflict/rejected/warning counts plus totals,
source and manifest checksums, and the exact settings replacements. `開始匯入` requires the preview
ID, checksum, current settings versions, and literal confirmation `IMPORT`. A changed/expired preview
or target baseline returns `409 preview_stale` and requires a new preview.

## 6. Import progress, retry, and cancellation

`POST /v1/demo-imports` creates one import run from a valid preview and returns `202`. Only one run
per Workspace may be active. `POST /v1/demo-imports/:id/continue` executes the next incomplete phase;
the Web continues serially while open. `GET /v1/demo-imports/:id` returns phase progress and safe
rejections. This request-driven worker needs no M8 job infrastructure.

The run records `ready`, `running`, `partial`, `completed`, `rolling_back`, `rolled_back`, or
`rollback_blocked`. Refreshing Settings resumes the same run. The Coach may stop before the next
phase; an in-flight phase completes transactionally. Retry revalidates baseline and reuses the same
run, IDs, and checksums. Completed and already-imported rows are skipped exactly; duplicates are not
created.

Partial success is explicit: accepted earlier phases remain official data until the Coach continues
or rolls them back. A failed entity caused by a source validation issue is rejected during preview;
an unexpected persistence error fails the whole phase rather than skipping an unknown subset.

## 7. Rollback contract

The import ledger records every created target row, its accepted version/content fingerprint, phase,
and dependency order. Rollback is available for 30 days and only for rows created by that run.
Pre-existing rows, `already imported` rows, and source backups are never changed.

Rollback first verifies that no imported row was edited after import and no later official row now
depends on it. If any check fails, the run becomes `rollback_blocked`, lists the affected entity
labels and reasons, and deletes nothing. If all checks pass, one transaction deletes ledger-owned
rows in reverse dependency order, restores the exact pre-import Workspace settings/preferences held
in the run, and marks the run rolled back. Interrupted rollback is safe to retry.

Rollback requires literal confirmation `ROLLBACK`. It does not revoke or delete a fresh formal M6
Capability Link created by the Coach after import; such a dependency blocks rollback until handled
through its owning M6 flow.

## 8. Sol experience and final copy intent

Settings adds one `資料移轉與裝置復原` panel after ordinary workflow settings and before account
deletion. Its calm sequence is `下載備份 → 選擇資料 → 檢查結果 → 開始匯入 → 完成`. It shows
counts before details, groups problems by phase, keeps accepted progress visible after refresh, and
never calls a partial run complete.

Required copy:

- local storage guidance: `暫存內容只留在這台裝置，正式資料仍以雲端為準。`
- offline shell: `目前離線。可繼續編輯這堂訓練，連線恢復後再送出。`
- pending state: `有 {count} 項變更等待送出。`
- preview warning: `匯入只會在你確認後開始，Demo 原始資料與備份不會被刪除。`
- legacy link rejection: `舊分享連結無法安全轉移；匯入後請重新建立。`
- partial state: `已完成 {completed} 個階段；尚未完成的資料仍可重試或回復。`
- success: `Demo 資料已匯入。原始備份仍保留在你的裝置。`

Every status change uses an `aria-live` region. Progress is a labelled ordered list, not colour
alone. Rejection disclosure is keyboard accessible. Destructive local clear and server rollback use
separate confirmations and restore focus. Desktop and exact 390×844 keep the action order, readable
checksums, file controls, and error details without horizontal page overflow.

## 9. HTTP, authorization, and security

All import routes require Coach Auth, derive Workspace from identity, accept no Workspace ID, and
return `404` for cross-Workspace preview/run IDs. Bodies, private notes, source bytes, and checksums
are redacted from logs. Limits are enforced before parsing large structures. Preview/import responses
use `Cache-Control: no-store`.

M7 tables live in `app_private`, use RLS as defense in depth, revoke `anon`/`authenticated`, and grant
only the API role. No view/function/table is exposed through the Data API. Import transactions use
one Workspace advisory lock and the existing aggregate lock order. The browser never receives a
database credential, token hash, raw imported private-note listing, or another Workspace's state.

| Operation                            | Result                                                                  |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `POST /v1/demo-imports/previews`     | `201 { preview }`; `400` invalid/oversized source.                      |
| `POST /v1/demo-imports`              | `202 { importRun }`; `409` stale preview/baseline or active run.        |
| `GET /v1/demo-imports/:id`           | Current safe run projection.                                            |
| `POST /v1/demo-imports/:id/continue` | Execute exactly the next phase; `200` partial/completed projection.     |
| `POST /v1/demo-imports/:id/rollback` | Require `ROLLBACK`; `200` rolled back, `409` blocked with safe reasons. |

## 10. Verification matrix and gate handoff

Terra is complete when typed adapters, queue state selection, Demo normalization, stable mapping,
preview/run/ledger repositories, HTTP routes, and semantic Settings/shell states pass focused tests.
No product, visual, or copy decision remains for Sol.

Sol is complete after Demo-aligned Settings/import/recovery presentation, keyboard/focus/announcement
behaviour, interruption recovery, and exact desktop plus 390×844 acceptance.

CI must prove:

- subject/environment isolation, TTL cleanup, sign-out/device-clear cleanup, and storage-failure fallback;
- offline/reload/reconnect replay, duplicate receipt, payload mismatch, FIFO, cancel, and stale conflict;
- exact source backup, invalid/oversized source, deterministic Workspace-scoped mapping, phase order,
  partial failure, continuation, rerun, stale preview, and cross-Coach isolation;
- successful rollback, edited/dependent-row rollback block, and backup/source preservation;
- private query-cache non-persistence, capability-token rejection/redaction, root check/build,
  migration dry-run, `app_private` lint/advisors, live two-Coach E2E, desktop/390×844 browser pass,
  `git diff --check`, cohesive commit/push, and exact-SHA GitHub Actions success.

Terra starts with the local resilience adapter and pure Demo normalization/preview model, then creates
the official CLI migration and server repository. Sol begins only after Terra evidence passes. M8
does not begin automatically because M7 completion is a milestone boundary.
