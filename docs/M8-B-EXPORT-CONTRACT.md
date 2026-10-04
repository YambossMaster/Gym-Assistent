# M8-B-Export Contract — Coach data export

> Draft for Product Owner review, 2026-10-04. This is not a frozen Contract or implementation
> authorization. The Roadmap owns scope and gate order; this document proposes the precise
> decisions needed to implement its export package.

## Job and route

A Coach can download one selected category of their Workspace data from `設定 → 資料與裝置 → 匯出資料`
as one CSV, JSON or PDF file. The download is a readable extract for inspection or personal
analysis, not a restorable backup. It does not replace the private process for applicable
data-rights requests. Growth Trajectory PNG remains an action in the trajectory view and is outside
this package. The Demo's Settings backup button is not copied into the formal product because it
exports the Demo's local-storage graph.

The panel presents four data types, a format selector, the relevant filters, a short privacy notice
and one `下載檔案` action. Only the selected type is requested. Changing type resets type-specific
filters and the private-note checkbox. The UI never suggests that it exports all Workspace data or
can restore records.

## Proposed selection rules

`start` and `end` are inclusive local calendar dates in the Workspace time zone read by the server.
The server interprets them as `[start at local midnight, day after end at local midnight)` in UTC.
Invalid local dates, `start > end`, and ranges longer than 366 local days are rejected before
generating a file. The default is the most recent 90 local days including today; the Coach can
change both dates. Archived Students remain selectable and their retained records remain eligible.
Entity IDs are validated within the verified Workspace; a foreign or missing ID returns the same
`404 not_found`.

| Type                           | Filters                                                                                   | Included rows and date rule                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Training Records               | Date range; optional one Student (or all)                                                 | Existing non-legacy Session Training Records with saved exercises, sets, or a private note. Select by Session start date. Include scheduled, completed and cancelled Session records, labelled by status; do not invent an empty record for a Session without a Training Record. A record with no set remains in JSON/PDF and has one row with empty set fields in CSV.                                          |
| Growth Trajectory numeric data | Date range; optional one Student; optional one Exercise definition (or all)               | One point per Student, Exercise, metric, unit and qualifying Session, using the current Training performance-series rules. Select by Session start date. Keep the current rule that a completed set in a scheduled or completed Session can contribute; cancelled Sessions do not. Export the numeric points, not a chart image or private note.                                                                 |
| Calendar                       | Date range; optional one Student; `包含行事曆區塊` switch, off by default                 | Sessions whose time interval intersects the selected local-day interval, including scheduled, completed and cancelled states. Filter Sessions by Student if selected. When enabled, add intersecting Calendar Blocks independently of the Student filter. Do not export availability rules, conflict warnings, or unmaterialized future recurrence. An event crossing midnight appears once.                     |
| Finance details                | Date range; optional one Venue; income, expense and reference switches, all on by default | Current visible `financeLedger` rows whose effective local date is within range. Preserve manual entries and corrections from the server-derived ledger, including row status and source-change flags. Exclude hidden/deleted rows and source-only draft data; the existing manual rights route covers a comprehensive data request. Rows without a Venue are included only when the Venue filter is `全部場地`. |

The type/format/filter choices are explicit before download. No background multi-file job, ZIP,
scheduled export, saved file, or export history is created.

## Private content

The `包含私人備註` checkbox is off by default and is shown only where the selected type can contain
notes. It must be checked for each request; its state is cleared after a completed download and on
type change or Auth subject change. Training includes `training_record.private_note` when checked;
Calendar includes `calendar_block.note`; Finance includes manual-entry private notes when their
visible ledger rows are selected. Student profile private notes and unrelated Coach notes never
enter these exports. Growth Trajectory has no note option. CSV formula protection applies to all
text, including opted-in notes. PDF/JSON show the original note text. The UI states that downloaded
files may contain Student and financial data and should be stored privately.

## File contracts

All formats use one server-derived, deterministically ordered record set. Dates and times carry the
Workspace time-zone name. Instants in JSON are ISO 8601 UTC; CSV and PDF show local date/time with
the zone named in metadata. Monetary amounts retain integer minor units and ISO currency; no
cross-currency total is invented. Missing values are `null` in JSON and blank in CSV/PDF.

The CSV column order and JSON record allowlists are:

| Type     | Fields in order                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Training | `sessionId`, `studentId`, `studentName`, `sessionStartsAt`, `sessionEndsAt`, `sessionStatus`, `location`, `recordId`, `recordUpdatedAt`, `exerciseId`, `definitionId`, `exerciseName`, `recordingType`, `setId`, `setNumber`, `plannedWeight`, `plannedReps`, `actualReps`, `rpe`, `result`, `weightUnit`, `weight`, `duration`, `durationUnit`, `distance`, `distanceUnit`, `rounds`, `privateNote` (only when opted in). The JSON record nests `exercises[]` and their `sets[]` with these same owned fields; Session and record fields remain at the parent. |
| Growth   | `studentId`, `studentName`, `definitionId`, `definitionName`, `metric`, `unit`, `direction`, `sessionId`, `sessionStartsAt`, `value`.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Calendar | `eventType`, `eventId`, `studentId`, `studentName`, `startsAt`, `endsAt`, `status`, `venueId`, `venueName`, `location`, `seriesId`, `blockNote` (only when opted in). Session-only and block-only fields are blank/null for the other event type.                                                                                                                                                                                                                                                                                                               |
| Finance  | `rowId`, `date`, `occurredAt`, `kind`, `direction`, `label`, `detail`, `amountMinor`, `currency`, `venueId`, `venueName`, `status`, `sourceChanged`, `sourceRemoved`, `privateNote` (only when opted in and sourced from a manual entry).                                                                                                                                                                                                                                                                                                                       |

CSV `sessionStartsAt`, `sessionEndsAt`, `startsAt`, `endsAt` and `occurredAt` are local ISO-like
date/time strings; JSON uses UTC ISO instants for these fields. `date` is a Workspace-local
`YYYY-MM-DD`. The chosen time zone appears in a JSON metadata field and in the PDF heading;
CSV has a `timeZone` column appended to every row. Rows sort by effective local date/time, then
stable source ID and set order. Optional private-note columns are absent entirely unless opted in,
not present as blank columns by default.

- **CSV:** UTF-8 with BOM and one header row. One Training row per set, plus one row for each
  record without sets; one Growth row per point; one Calendar row per event; one Finance row per
  ledger row. Stable English field keys are used as column names. Quote/escape CSV fields and
  neutralize spreadsheet formula prefixes (`=`, `+`, `-`, `@`, tab, CR, LF after leading whitespace)
  in every text cell. Numeric and timestamp cells stay typed by their documented columns.
- **JSON:** UTF-8 object with `schemaVersion: 1`, `type`, `generatedAt`, `timeZone`, `filters`,
  `count` and `records`. Training records nest ordered exercises and sets. Other types use flat
  records. IDs are included for reconciliation; the envelope contains no Workspace ID or Auth
  credential. API implementation tests will lock the exact field allowlists and their order.
- **PDF:** A4 portrait or landscape as needed for the selected type, with title, filter summary,
  generation time and time zone, repeated table headings and page numbers. Training groups sets
  under Session/Student and Exercise; Calendar is an ordered agenda; Growth is a numeric table;
  Finance is a ledger table with per-currency totals derived from the selected visible rows. The
  PDF shows the human-readable fields in the table above, with source IDs in a compact secondary
  line for reconciliation. Long text wraps without clipping. Private notes, when opted in, are
  clearly labelled. No hidden rows are omitted to force a PDF page limit.

Suggested stable filenames are
`form-coach-{training|growth|calendar|finance}-{start}_{end}-{YYYYMMDD-HHmm}.{csv|json|pdf}`.
The generation stamp uses the Workspace local time and the response uses `Content-Disposition:
attachment`. Each response sets `Cache-Control: no-store, private`, `Pragma: no-cache`,
`Referrer-Policy: no-referrer`, and `X-Robots-Tag: noindex, nofollow`; service workers and browser
query caches do not store the body.

## Bounds, errors and authority

`POST /v1/exports` accepts the type, format, local date range, relevant filters and
`includePrivateNotes`. The API verifies the Coach, resolves their Workspace, checks the current
plan at generation time, validates selected entities, and obtains data through the owning Training,
Scheduling and Finance rules. There is no new persistent export table or client-supplied Workspace
ID. The API builds a bounded file before sending a success response, so no partial success or silent
truncation occurs. A request may contain at most 2,000 flat output rows and 10 MiB of final file;
PDF may contain at most 100 pages. A larger selection returns `413 export_too_large` with guidance
to narrow dates or entities. The server caps work time at 30 seconds and returns a retryable error
if it cannot finish; it never returns a partial file. Concurrent downloads per Coach are bounded
to prevent resource exhaustion.

Training and Calendar exports follow the existing Free read access, even if Free is above capacity.
Growth Trajectory and Finance exports require current Pro/Prime access, matching their locked
projections. The API returns `403 plan_required` after a downgrade; the Web clears any in-memory
premium export response or stale download state. A fresh plan check occurs for every request.
Export does not itself count as an operational write, so the over-capacity write lock does not block
an otherwise allowed data download.

The panel has visible Loading, Ready, Empty, Generating, Downloaded, Recoverable Error and
Plan-Locked states. Empty selection is reported before download; it does not create a misleading
empty file. While generating, disable only the download action and keep filters visible. A failed
request preserves selections but clears any previous success. Invalid filters show inline guidance;
expired Auth follows the existing sign-in recovery; `403 plan_required` explains the plan and links
to `方案與帳單`; `413 export_too_large` asks for a narrower range. The button has a stable accessible
name and status messages are announced. At desktop and 390×844, filters, note consent, errors and
download action remain visible and keyboard/touch reachable without horizontal overflow.

## Sol and CI acceptance

Sol adds the Settings panel, a bounded Export Module and adapter operation, typed API/Web request
and download handling, format writers, and focused tests. Reuse current domain calculations rather
than a second Training, Scheduling or Finance interpretation. No migration is expected; create one
through the Supabase CLI only if implementation finds a necessary schema change and return that
decision to Contract first.

During Sol integration, merge the approved `codex/feedback-form-link` branch into the Export
integration branch as required by the Roadmap's parallel feedback handoff. Preserve its Settings
`協助與回饋` Form link alongside the new `匯出資料` panel and include their combined desktop/390×844
behavior in CI evidence.

CI verifies all 12 type/format combinations with deterministic fixtures. Cover local midnight and
DST boundaries, inclusive dates, archived Student and foreign entity filters, cancelled/cross-day
events, corrected/hidden finance entries and multiple currencies, empty and oversized selections,
private-note default exclusion and explicit opt-in, CSV formula injection, PDF Unicode/wrapping,
two-Coach isolation, Free and premium plan changes, no-store headers, desktop and 390×844 download
behavior, root check/build, applicable migration dry-run and exact-SHA GitHub Actions. Browser
acceptance proves one downloaded file per action and verifies its name and contents. No test claims
that an export is a backup or a complete data-rights response.

## Product Owner decisions to freeze

1. Confirm the proposed Free access for Training/Calendar and Pro/Prime access for Growth/Finance,
   including download access while Free is over capacity.
2. Confirm the date defaults and 366-day maximum, the four inclusion/filter rules above, and
   whether Finance should exclude hidden/deleted rows by default.
3. Confirm the 2,000-row, 10 MiB and 100-page per-request limits and the private-note opt-in scope.

After these decisions are accepted, remove the Draft marker, record the frozen Contract in
`PROJECT_STATUS.md`, and begin Sol. Do not implement against unapproved product rules.
