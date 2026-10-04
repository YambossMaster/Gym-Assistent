# M8-B-Export Contract — Coach data export

> Frozen by Product Owner confirmation, 2026-10-05. The Roadmap owns scope and gate order.

## Job and route

A Coach can download one selected category of their Workspace data from `設定 → 資料與裝置 → 匯出資料`
as one CSV, JSON or PDF file. The download is a readable extract for inspection or personal
analysis, not a restorable backup. It does not replace the private process for applicable
data-rights requests. Growth Trajectory PNG remains an action in the trajectory view and is outside
this package. The Demo's Settings backup button is not copied into the formal product because it
exports the Demo's local-storage graph.

The panel presents four data types, a format selector, the relevant filters, a short privacy notice
and one `下載檔案` action to a Coach with current Prime (`advanced`) entitlement. Free and Pro see a
locked explanation and a `方案與帳單` link, not an enabled download control. Only the selected type is
requested. Changing type resets type-specific filters and the private-note checkbox. The UI never
suggests that it exports all Workspace data or can restore records.

## Selection rules

`start` and `end` are inclusive local calendar dates in the Workspace time zone read by the server.
The server interprets them as `[start at local midnight, day after end at local midnight)` in UTC.
The initial CSV/JSON selection is the most recent 30 local dates including Workspace-local today;
its maximum is 31 inclusive local dates. PDF initially selects the most recent 7 local dates and
allows at most 7 inclusive local dates. These are calendar-date counts, not fixed 24-hour windows.
The Web derives today from the Workspace time zone supplied by the authenticated Settings
projection, never from the device time zone. The server independently checks its own Workspace
time zone and the selected dates. Invalid local dates, `start > end`, and overlong ranges return
`400 invalid_export_range` before querying data. On a format switch, preserve valid dates; if the
range exceeds the new format's maximum, keep its end date and move its start to the earliest legal
date, show the corrected range and an inline explanation, and require a fresh click to download.
Changing a date or filter never silently requests a file. Archived Students remain selectable and
their retained records remain eligible. Entity IDs are validated within the verified Workspace;
a foreign or missing ID returns the same `404 not_found`.

| Type                           | Filters                                                                                   | Included rows and date rule                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Training Records               | Date range; optional one Student (or all)                                                 | Existing non-legacy Session Training Records with saved exercises, sets, or a private note. Select by Session start date. Include scheduled, completed and cancelled Session records, labelled by status; do not invent an empty record for a Session without a Training Record. A record with no set remains in JSON/PDF and has one row with empty set fields in CSV.                                              |
| Growth Trajectory numeric data | Date range; optional one Student; optional one Exercise definition (or all)               | One point per Student, Exercise, metric, unit and qualifying Session, using the current Training performance-series rules. Select by Session start date. Keep the current rule that a completed set in a scheduled or completed Session can contribute; cancelled Sessions do not. Export the numeric points, not a chart image or private note.                                                                     |
| Calendar                       | Date range; optional one Student; `包含行事曆區塊` switch, off by default                 | Sessions whose time interval intersects the selected local-day interval, including scheduled, completed and cancelled states. Filter Sessions by Student if selected. When enabled, add intersecting Calendar Blocks independently of the Student filter. Do not export availability rules, conflict warnings, or unmaterialized future recurrence. An event crossing midnight appears once.                         |
| Finance details                | Date range; optional one Venue; income, expense and reference switches, all on by default | Current visible `financeLedger.rows` whose effective local date is within range. Preserve manual entries and corrections from the server-derived ledger, including row status and source-change flags. Exclude `financeLedger.deleted` and source-only draft data; the existing manual rights route covers a comprehensive data request. Rows without a Venue are included only when the Venue filter is `全部場地`. |

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
  Finance is a ledger table with per-currency **selection totals** derived only from the exported
  visible rows: income, expense and income minus expense in each currency, with no running or
  account-balance claim. These may differ from the Settings monthly totals when the export uses a
  narrower date range, Venue or direction filter. Both use the same visible-ledger rules; hidden
  rows are absent from both. The PDF shows the human-readable fields in the table above, with source IDs in a compact secondary
  line for reconciliation. Long text wraps without clipping. Private notes, when opted in, are
  clearly labelled. No selected rows are omitted to shorten the PDF.

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
truncation occurs. CSV/JSON permit at most 2,000 flat output rows; PDF permits at most 500 flat
output rows. A Training row means one set, or one no-set record; other row definitions are in the
format contract above. The server counts no more than the relevant limit plus one selected row
before starting any file writer. A larger selection returns `413 export_too_large` without
rendering PDF. The final file may be at most 10 MiB; crossing that limit also returns 413 before
any attachment bytes are sent. There is no page-count limit or automatic truncation. A date range
within its limit can still produce too many rows; the UI gives the Coach date and entity filters to
narrow it.

Generation stays in the same Fly.io-hosted Fastify API process as the existing application, not a
Supabase Edge Function. It uses one synchronous request with bounded concurrency and a server-side
work deadline of 30 seconds. Sol must use cancellation where the data and writer operations support
it, and verify the deadline against the actual local production-mode host path. When the work
deadline is reached, return `422 export_processing_limit` with no file if the connection still
permits a structured response. An upstream disconnect may prevent that response; the Web treats a known
generation timeout as the same narrowing guidance. This is an action rule for the same selected
parameters, not a claim that every timeout has a deterministic cause. Network/service errors that
are not known timeouts retain ordinary recovery. No background job or durable file is created.

Every type requires current Prime (`advanced`) entitlement, including its active promotional or
permanent grant. Free and Pro have no export access even when their ordinary Training or Calendar
read projections are available. The API returns `403 plan_required` after a downgrade; the Web
clears any in-memory export response or stale download state. A fresh server plan check occurs for
every request. An over-capacity write lock does not affect an active Prime export.

The panel has visible Loading, Ready, Empty-after-request, Generating, Downloaded, Recoverable
Error and Plan-Locked states. There is no count endpoint or automatic count request when filters
change: the download action stays available for a valid selection. If the selected result is empty,
the API returns `404 export_empty` with no attachment; the Web then shows `此區間無資料，請調整篩選條件`,
keeps the selected filters, and re-enables the action for a changed selection. While generating,
disable only the download action and keep filters visible. A failed request preserves selections
but clears any previous success. Invalid filters show inline guidance; expired Auth follows the
existing sign-in recovery; `403 plan_required` explains Prime and links to `方案與帳單`. For
`413 export_too_large`, `422 export_processing_limit`, or a known generation timeout, show
`資料量過大，請縮小日期範圍或指定單一對象後再試` and do not offer an immediate retry with unchanged
parameters. A normal network/service failure may offer Retry. The button has a stable accessible
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
two-Coach isolation, Free/Pro/Prime plan changes, format-switch range correction, Workspace-local
today across device time zones, pre-render row rejection, processing deadline and no-count empty
response, no-store headers, desktop and 390×844 download behavior, root check/build, applicable
migration dry-run and exact-SHA GitHub Actions. Browser
acceptance proves one downloaded file per action and verifies its name and contents. No test claims
that an export is a backup or a complete data-rights response.

## Frozen decision record

The Product Owner confirmed Prime-only access, the four included-row/filter rules, the per-request
private-note opt-in and these synchronous-request limits on 2026-10-05: CSV/JSON 30 default and
31-day maximum with 2,000 rows; PDF 7 default and maximum with 500 rows; 10 MiB final file and
30-second server work deadline. The 7-day PDF choice resolves the offered 7-or-14-day alternative
conservatively. A focused load fixture must demonstrate that these bounds can complete within the
actual host path before Sol can claim the feature ready.

After these decisions are accepted, remove the Draft marker, record the frozen Contract in
`PROJECT_STATUS.md`, and begin Sol. Do not implement against unapproved product rules.
