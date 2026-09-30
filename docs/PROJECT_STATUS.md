# Gym Assistant project status

> Last verified: 2026-09-30. This file records live engineering state; scope and completion rules
> live in [`ROADMAP.md`](ROADMAP.md).

## Current snapshot

| Field              | Current value                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| Active phase       | **M7.5 — Pre-deployment product hardening and acceptance**                                          |
| Current package    | **M7.5 Product Owner-led mobile route and dialog review**                                           |
| Package state      | **Accumulated mobile checkpoint passed exact-SHA CI; Stage 1 and installed-PWA review remain open** |
| Completed baseline | M0–M7 Done; M7.5 is Product Owner-led and remains in progress                                       |
| Branch baseline    | Accumulated mobile checkpoint `864d594` reached Main; CI run `36699684675` passed both jobs         |
| Worktree           | Accumulated mobile corrections are on Main; installed-PWA review remains open                       |
| Linked database    | Development only; migrations through `20260928194356` applied; linked dry-run is up to date         |
| Production         | Not configured; no real customer data                                                               |
| Approved M8 scope  | Beta help, problem-reporting, and product-feedback paths added; implementation remains unstarted    |

## Next handoff

The Product Owner decided to retain the accumulated mobile UI changes and authorized a Main delivery
after CI checks. Continue the route-by-route installed-PWA review below after this delivery; a green
CI checkpoint does not establish physical-device acceptance or complete M7.5.

Review the mobile Today strip and header on an installed PWA. Today courses, active students, and
monthly finances now occupy one three-column strip; the notification bell sits directly beside
Settings in the dark app bar. An unread count lights the bell lime and appears in a badge; the
existing read, dismiss, and target-navigation actions remain in the same notification panel.
The mobile active-student value is 16px and shares the finance label's content-row height.
Both link chevrons align vertically with those content values.
Authenticated Chrome 390×844 preview showed three equal-height columns with aligned title rows and
value bottoms, a 106px header, two 44px header buttons with an 8px gap, an opening empty notification
panel, 21–22px greeting margins, and no document-level
horizontal overflow. Web checks (58 files, 248 tests) and production build passed. Unread visual
state and physical installed-PWA touch/safe-area behavior still need Product Owner review.

Review mobile setting/edit dialog scrollbars on an installed PWA. Calendar scheduling, Course Session
editing, fixed Series, purchase editing, Venue creation/detail/course records, Finance ledger editing, Settings
password/device-cache, and Capability Link dialogs now assign scrolling to fields above their fixed
action rows. The reported Calendar case was checked in a 390×844 authenticated browser preview:
the field scroller ended where the action row began, while the outer content did not scroll. Venue
creation/detail/course records and Finance ledger layouts were also inspected in that preview. Check touch scroll,
opened choice panels, and action clearance on a physical installed PWA before visual acceptance.

Review the new mobile Calendar experiment on an installed PWA: 課表 keeps its existing list, while
日／週 share one vertically scrolling timeline with no horizontal scrolling, and 月 fits all week
rows into the available height. The Calendar controls use two compact rows, with the desktop legend
hidden on mobile; a week date or month cell opens 日. Authenticated Chrome preview at 390×844 and
direct 320 CSS-pixel checks found no horizontal overflow in day/week/month, and month had no
internal overflow. The follow-up gives today's 課表 date a lime circle, sizes the mobile day/week
timeline to show about ten hours at 390×844, and stacks time/name/location in a one-hour 日 event.
Existing scheduling actions remain in place. Confirm touch panning, dense-event readability, and
safe-area/bottom-nav clearance on a physical installed PWA before visual acceptance.

Try the new Training Record set-input flow on desktop and an installed phone PWA. Focusing a populated
measurement or RPE selects its value; Enter advances through that set's measurements and RPE, then
to the next set in the same exercise. Enter on the last RPE blurs the field. Desktop Chrome and a
390×844 desktop-browser preview confirmed focus progression without changing stored values; actual
iOS/Android return-key behavior remains for Product Owner device review.

Review the revised Training Record mobile tabs on an installed PWA. Both tabs keep the same
student/actions/save row and tab row. The selected tab now has a light rounded-top surface, dark
outline, and dark text. The second tab reads 教練筆記. The tab row and expandable class summary share
one light background; no dark separator is added when class information is collapsed.
Both selected tabs now reach the side edges. Bullet and number marks align with their first line;
list indentation remains visible. Enter continues a nonempty list, while Enter on an empty nested
item steps outward and Enter on an empty top-level item exits the list. Backspace at the beginning
first outdents or removes the list marker before joining the previous paragraph. Tab and Shift+Tab
also work on list items, with matching touch toolbar actions. Typing `- `, `1. `, or `# ` at the
beginning of a blank paragraph converts it to a bullet, number, or heading. These keyboard rules
and the edge layout passed desktop-browser preview and Web tests; actual installed-PWA keyboard
behavior still needs device review.
The dark class summary appears on both tabs. A second tap on the selected tab toggles that summary,
switching tabs preserves its state, an upward swipe collapses it, and focusing the Note editor also
collapses it. The Training cards start without a duplicate title and keep clearance above bottom
navigation. Tapping empty Note canvas focuses the final paragraph at its end. The keyboard dock now
includes heading/body, paragraph bold, stronger bullet, numbering, indent/outdent, and class facts.
Import choices start empty, clicking a fact directly inserts it, and checkbox selection persists
locally for later batch insertion. The Note canvas now uses one editable surface so native text
selection can cross paragraphs and long lines wrap; list markers and seven labeled toolbar controls
align with their text. Note content still uses the 5,000-character private-note autosave
contract as readable text markers; optional public Training Result notes render paragraph bold and
the downloadable image uses clean text. Authenticated Chrome 390×844 preview confirmed tab state,
shared summary, blank-canvas focus, summary collapse, and the compact tool dock. Web checks and
production build passed. Real iOS/Android keyboard movement, caret visibility, multiline editing,
formatting, and autosave need installed-PWA review. The shared save API now accepts unchanged legacy
sets alongside a newer recording snapshot, so a note-only save is no longer rejected as a definition
conflict; an authenticated Chrome preview accepted a previously stuck draft and displayed 已儲存.
Desktop keeps its original two-column textarea,
where formatting markers remain visible when editing a note created on mobile. Continue the wider
keyboard audit during mobile route review.

Review the Student and Exercise Library pinned mobile switch/search bars and the compact Exercise
cards on a physical installed PWA. Exercise filters now expand within the pinned controls and reserve
their own height, leaving the first card fully visible below them on initial entry. They remain
available anywhere in the list, then collapse on continued downward scrolling or a second tap. Opening
Search hides Filter, shifts the close button to the far right, and gives the input the freed space.
The Filter shelf now fades and moves upward over 220ms when closing, with reduced-motion support.
Confirm touch scrolling, expanded search/filter controls, 320px width, and the transparent
edit/delete icon targets.

Review the four mobile subpage back actions and the compact Training Record toolbar on an
installed PWA. Student detail, Training Record, Monthly Finances, and Venue management now use a
safe-area-aware Back action in the dark app bar instead of the Logo and in-page Back. Training
Record keeps the student avatar/name, session actions, and visible save status in one mobile row;
long offline or sync messages can wrap below the actions. Confirm touch targets and narrow-phone
layout before visual acceptance.

Review the mobile Venue management page at 390×844 and on an installed PWA. The page keeps the
Back action in its dark header, places the Venue Add action beside Settings, removes the large in-page
title, and puts its status switch and expanding name search on one row. The card heading now reads
「場地管理與支出」 on mobile; desktop retains its original layout and wording. Confirm the mobile
spacing and touch behavior before visual acceptance.

Review the mobile Settings header and pinned category switcher at 390×844 and on an installed PWA.
Settings now uses the same safe-area-aware dark app bar as Student, Calendar, and Exercise Library;
its in-page title is hidden on mobile. Tapping the Settings icon again returns to the route from
which Settings was opened, including a deep route; direct Settings entry falls back to Today. The
category switcher stays directly below the app bar while Settings content scrolls. Desktop sidebar,
page title, and category layout remain unchanged. Installed-PWA visual acceptance remains open.

Review the mobile Exercise create/edit dialog on a physical installed PWA. Its Add action now uses
the same Plus icon as the nearby tag action; the fields own the scroll region, which ends above the
fixed footer. The mobile in-app scrollbar rule now covers all descendants of the Web root, while
portaled choice panels retain their olive scrollbar. The browser window's own scrollbar is outside
this UI scope. Check touch scrolling and opened choice menus on the device before visual acceptance.

Review the mobile dialog action rows in Exercise editing, Student creation, and other route dialogs.
Their sticky footer now uses the dialog's own surface color and has no separate top border, so the
actions no longer sit in a contrasting rectangular strip. Keep the mobile and desktop page palette
as a separate Product Owner visual decision; the current paper, card, and dialog shades remain in
place. Verify the footer treatment on a physical installed PWA before accepting the experiment.

Review the matching Student, Calendar, and Exercise Library mobile headers at 390×844 and on a
physical installed PWA. Each now places its route title and Add action beside Settings in the dark,
safe-area-aware app bar; Student and Exercise Library show total counts. Calendar opens its existing
scheduling dialog from the new Add control. Student and Exercise Library use one-row segment/Search
toolbars: opening Search expands an input while the segments narrow and hide counts; closing it
clears the text filter. Exercise Library's three segments use the same sliding white selection as
Student. The Calendar's in-page title is hidden on mobile and its wheel-driven header collapse is
disabled there because the app bar now owns the title. Desktop remains unchanged. Keep these
retained design on an installed PWA before visual acceptance.

Review the first Today PWA visual experiment at 390×844 and on a physical installed PWA: the mobile
schedule card has a quiet shadow, the bottom navigation uses one solid surface and lime icon/text
selection, and the shell applies viewport safe-area padding. Local follow-ups add 16px of visible
space below navigation items, a 44px Settings target, a mobile Today schedule skeleton, and a short
fade between bottom-navigation routes while the shell stays fixed. Keep desktop presentation unchanged.
These experimental changes were unintentionally included in the concurrent `47370fe` checkpoint
before Product Owner confirmation; do not treat their inclusion as visual acceptance. Decide whether
to keep or revise this direction during the mobile route-by-route sweep.

Continue the Product Owner's mobile route-by-route sweep. In each newly reported Settings or edit
dialog, verify that the title/close action and bottom action row remain visible while only the fields
scroll; keep Delete left and Cancel/Save right on one row where space permits, with concise mobile
labels and matching action-button sizes. Check that internal and choice-menu scrollbars stay slim at
the outer edge without taking field width, and that wheel/touch scrolling works over their content. The
authenticated desktop preview has covered fixed-Series editing, purchase creation, Exercise Library
creation, Course History wheel scrolling, and trajectory history scrolling; a 320 CSS-pixel viewport
confirmed that three footer buttons shrink together without wrapping or horizontal overflow. Other
dialog variants and physical-phone/PWA behavior remain for the route-by-route sweep.
The two capability-link dialogs now have mobile-specific paired metadata, inline copy actions with
URL-scoped checkmark feedback and no visible status row, and action rows above the bottom navigation. Continue Product Owner review from
these states without changing the shared dialog rules.
Then review the locally implemented Calendar preferences in Settings → 工作偏好 at desktop and 390×844.
The mobile
Auth entrance is accepted for now. Its initial view presents FORM's private-Coach
identity, value promise, and separate 建立帳號／登入 actions without form fields. Either action
opens its corresponding form in the same component, with a single mobile return to the entrance;
the existing desktop split layout remains. The current all-black entrance keeps the 264px FORM logo
in its approved position, places the one-line value statement lower with a 36px gap above the first
CTA at 390×844, and anchors the two centered CTA labels near the safe-area bottom. Google OAuth launched
from the desktop-sized mobile preview now leaves its iframe for the top-level Google sign-in page;
the ordinary top-level sign-in path remains unchanged. The mobile sign-in and signup forms center
their 繼續 labels while keeping the arrows on the right. A physical-phone/PWA viewport check and
completed Google account sign-in have not been claimed. The Product Owner previously mentioned a
Google mark beside 使用 Google 繼續 and input placeholders as possible later form polish; return to
them only when the Product Owner resumes Auth review. Keep subsequent corrections mobile-only
unless the reported issue is global. This Stage 1 checkpoint is on Main with exact-SHA CI; it does
not complete Stage 1 or M7.5 or begin Stage 2.

Review the revised Settings page with the Product Owner at desktop and 390×844. Four categories
separate Coach/Workspace, work preferences, account/security, and device data. Coach name saves on
field exit; zone, unit, and currency choices save when selected. There is no page-level Save button or
persistent success text. Account/security uses the shared row pattern, with password editing in its
own dialog. Device-cache management opens a separate dialog; Demo import remains a collapsed
development-only tool. Continue Product Owner review of the category grouping, copy, and device-data
scope after this authorized delivery checkpoint. Calendar display hours, week start, and default
Course Session duration now have an M7.5 Stage 1 Contract and local implementation. The linked
development migration is applied; during browser checks, the existing review account was restored
to 06:00–22:00, Monday, and 60 minutes. Product Owner acceptance remains open; this checkpoint is
on Main with exact-SHA CI.
Language, privacy controls, and plans remain later product decisions.

Account/security follow-up remains in Product Owner review: password dialog now sends the same recovery email
used from sign-in, and sign-out asks for confirmation. Recovery intent survives Auth token refresh
and page reload; expired links show an error instead of opening Today. A fresh email link reached
the new-password form in the development browser, reload stayed out of Today, and the test ended
with recovery cancellation and local sign-out without changing the account password. Keep the active
review open; the full password-update/sign-out/new-password-login sequence has not been rerun in
this pass. The password-dialog recovery action now uses smaller secondary type and shows its
confirmation directly below the action with the revised concise copy.

Review the Student roster balance cards and Student purchase history with the Product Owner. The
roster numerator remains total remaining lessons, the denominator is the latest dated purchase
count, and the track caps at 100%; the reported `1/16` case showed `1/8` at verification time.
Purchase history now orders newest first, shows at most four rows on the page, and offers a complete
dialog only when more than four exist. A five-purchase isolated Web test covers the four-row cutoff
and complete-history selection. The preserved development Student examined in the browser has three
purchases, so the five-row dialog still needs later live browser acceptance. No purchase data was
changed for these checks. Continue the pending Stage 1 review below without treating this delivery
checkpoint as M7.5 completion.

Review the corrected Venue creation, expense-change, and prepaid dialogs with the Product Owner,
alongside the corrected `/t/:token` and `/r/:token` presentation and date picker.
Review the M7.5 Capability Link correction: new links are retained in this browser tab across
dialog close and page reload, then cleared on revocation, reissue, expiry, or Coach sign-out/change.
Previously issued links whose one-time URL was already discarded cannot be recovered from the
server's digest-only record; avoid reissuing the preserved review link unless the Product Owner
chooses to replace it. This Stage 1 change intentionally narrows M6's one-time browser-secret rule
to per-tab `sessionStorage`; it requires acceptance as part of the current Product Owner review.
The Stage 1 checkpoint reached Main and passed exact-SHA remote CI; it does not close M7.5. Continue review of
Venue management, Venue course records, Student course history, trajectory navigation, and Finance overview/month
selector against the preserved 2026 development data (LOG-221–243; scenario index in local
`output/M7.5-2026-venue-finance-review-data.md`). Take subsequent corrections only when the
Product Owner resumes review; do not infer Stage 1 or M7.5 completion from this checkpoint.
The remaining Stage 1 browser acceptance for Venue creation, Venue-bound purchases,
Calendar/fixed-Series choices, salary pay-day income, and prepaid completion/reopen with
its low-balance notice remains open. Preserve these review fixtures until the Product Owner
finishes inspecting them. Keep the unrelated `output/` intact; do not enter Stage 2/M8 without
separate Product Owner direction.

## M7.5 Stage 2 backlog

- **Windows local entrypoint follow-through:** Stage 1 now starts/reuses API, waits for `/health`,
  reuses a verified formal Web, and gives Today a local-proxy failure hint. Stage 2 still needs
  continued API-exit detection and consistent service-unavailable recovery across authenticated
  routes; this local correction is not a complete persistent-runtime or remote-CI claim.
- **Cross-route information architecture:** the Product Owner reports that broad sidebar categories
  leave many route actions, facts, and recovery options at the same apparent priority. Stage 2 must
  inventory every formal Coach route and its nested panels against the actual job-to-be-done, group
  primary work, contextual detail, secondary actions, and recovery at their owning locations, and
  remove premature or duplicate controls. Freeze route-by-route hierarchy with Product Owner review;
  accept desktop and exact 390×844 task paths, keyboard order, and no hidden/overflowing action.
- **Cross-route notification scope:** Stage 1 Today now has the Product Owner-selected low-balance,
  current-day conflict, and redeemed-reschedule notifications with Workspace-scoped read receipts.
  Stage 2 should evaluate other future event kinds and a cross-route inbox only after the Coach
  workflow is frozen; do not treat Today’s 30-day reschedule window as push delivery or a universal
  notification service. Preserve private-note and capability-token boundaries.

## Milestone status

| Milestone                              | State       | Evidence or remaining boundary                                                                                                  |
| -------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| M0 Repository and product contract     | Done        | Demo archived separately; formal workspaces, vocabulary, ADR/Roadmap/Status discipline established                              |
| M1 Cloud foundation tracer             | Done        | Supabase private schema, verified identity/Workspace derivation, two-Coach isolation, migration workflow, remote CI             |
| M2 Coach account operations            | Done        | Registration, six-digit OTP, Email/Google/recovery, settings, sessions, deletion lifecycle, Edge Function/cron, live acceptance |
| M3 Student and Lesson entitlement      | Done        | Student lifecycle, purchases/manual income, derived balances, two-Coach E2E, 390px acceptance, CI run `34565338417`             |
| M3.5 Frontend gap filling              | Done        | A0–A5 delivered; commit `e403170`, CI run `34766425884` Verify and migration-dry-run successful                                 |
| M4 Scheduling                          | Done        | Commit `dc83d92`; CI run `34947956256` Verify and migration-dry-run succeeded after complete local/live/browser evidence        |
| M5 Training and Exercise Library       | Done        | Commit `5afa212`; CI run `34956661567` Verify and migration-dry-run succeeded after complete local/live/browser evidence        |
| M6 Public Capability Links             | Done        | Commit `658ce1a`; CI run `34966898151` Verify and migration-dry-run succeeded after complete local/live/browser evidence        |
| M7 Local resilience and Demo migration | Done        | Commit `8885404`; CI run `34976808273` Verify and migration-dry-run succeeded after complete local/live/browser evidence        |
| M7.5 Pre-deployment product hardening  | In progress | Stage 1 interim checkpoint `f5996f1`; CI run `35065072206` Verify and migration-dry-run succeeded                               |
| M8 Deployment and Beta readiness       | Not started | No staging/production environment                                                                                               |
| M9 Post-V1 options                     | Deferred    | Evaluate after Beta                                                                                                             |

## Preserved implementation inventory

### Formal runtime

- React/Vite PWA in `apps/web`, Fastify modular monolith in `apps/api`, Supabase Auth/PostgreSQL.
- Same-origin `/api` contract with Vite development proxy.
- Root `start-gym-assistant.cmd` starts or reuses API at `127.0.0.1:3000`, waits for health, then
  opens or reuses the formal Web at `http://127.0.0.1:5173`. A Web-only half-start is refused; the
  current Windows API-absent/Web-present cold path has been launch-verified locally.
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

### M4 Scheduling

- Server-authoritative Session, Series, Block, and Availability operations now use UTC storage,
  Workspace IANA conversion, version conflicts with current state, warning-only overlaps, and
  Coach-derived tenant isolation.
- Calendar supports Agenda/Day/Week/Month, drag-assisted editing, recurring Block scopes, Session
  lifecycle actions, availability editing, and accessible desktop/modal plus mobile/bottom-sheet
  interactions. Today and Student detail expose the owned schedule projections; Session detail
  remains scheduling-only until M5.
- Deterministic Demo scheduling preview validates entity counts, rejections, preserved legacy
  entitlement rows, conflict reports, and per-entity checksums without importing Demo persistence.

### M5 Training and Exercise Library

- Private-schema Exercise Definition, Training Preference, Training Record, occurrence snapshot,
  Set, and seven-day mutation-receipt data now sit behind a tenant-scoped Training Module and
  dedicated API role. The formal 100-item catalog uses stable keys and bootstrap-once semantics.
- Session Training supports coalesced autosave, one identity/Session/device-local IndexedDB recovery
  slot, single-visible-tab editor ownership,
  immutable occurrence snapshots, explicit conflicts, atomic completion, completed-record edits,
  reopen, qualified current/previous/personal bests, and mixed-unit display conversion.
- `/exercises`, Session Training, Student performance/trends, and Settings weight preference now
  match FORM's desktop and mobile visual language without importing Demo persistence or private
  Coach notes into Student projections.

### M7 Local resilience and Demo migration

- Coach/environment-scoped IndexedDB stores local drafts, a receipt-backed Training operation
  queue, UI preferences, and resumable import metadata; private Query data remains memory-only and
  Auth subject changes clear the departing Coach's local records.
- Settings provides exact Demo JSON backup, server-side validation and redacted preview, ordered
  five-phase import, safe retry, stale/conflict handling, and version-protected rollback. IDs are
  deterministic but Workspace-salted; raw legacy Capability tokens are rejected and never imported.
- App Shell exposes offline, pending, retry, and attention states. The archived Demo only gains an
  exact backup download and retains the `form-coach-mvp-v1` storage contract.

## Remaining route boundaries

- `/today`, `/calendar`, `/sessions/:id`, Student scheduling/performance, `/exercises`, and M5
  Settings now expose their server-authoritative projections.
- `/t/:token` and `/r/:token` now mount before Coach Auth with a separate, non-persisted public
  query client; the service worker excludes both route prefixes and all API responses.
- Some rendered copy describes implementation state rather than helping a Coach complete a task.

## Open risks and constraints

| Risk/constraint                                                   | Current handling                                                                                |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| M4 starter had been applied to development schema                 | Approved rollback migration restored M3 entitlement schema; local/remote migration list aligned |
| Frontend monolith increases accidental cross-route regressions    | M3.5-A1 decomposes by route while freezing behaviour                                            |
| Product UI can drift when engineering invents presentation/copy   | Four mandatory gates; Terra hard limit; Sol owns product convergence                            |
| Auth leaked-password-protection warning remains                   | Accepted development warning; resolve in M8 production security gate                            |
| GitHub-hosted Node 20 action compatibility warnings               | CI stays green; upgrade checkout/setup-node actions before GitHub removes compatibility         |
| Previously exposed development credentials require final rotation | No production use; rotate all deployment secrets during M8 before Beta                          |
| Demo seed/local data can be mistaken for production truth         | Use Demo only for behaviour/presentation; all official data comes from route projections        |

## Verification baseline

- M3 local: root check/build, live two-Coach isolation, migration preview, desktop and 390×844
  acceptance passed.
- M3 remote: commit `c55a95d`, GitHub Actions run `34565338417`, verify and migration-dry-run jobs
  successful.
- After M4 reset: linked rollback migration applied, migration dry-run is up-to-date, and Supabase
  advisors report only the pre-existing leaked-password-protection warning.
- M3.5-A3: commit `26bc036`; GitHub Actions CI #11 / run `34706580673` completed in 52 seconds with
  Verify and migration-dry-run jobs green (API 24, Web 45).
- M3.5-A4 local: root check passed (API 27, Web 51), root build passed with the existing bundle-size
  advisory, migration dry-run is up to date, linked `app_private` schema lint found no errors, and
  the live two-Coach E2E verified the Today allowlist/isolation then deleted its isolated Student.
  Desktop and exact 390×844 browser acceptance passed without horizontal overflow or console errors.
- M3.5-A4 remote: commit `ae6b764`, GitHub Actions CI #13 / run `34764878712` completed in 57
  seconds with Verify and migration-dry-run jobs successful (API 9 files/27 tests; Web 11 files/51
  tests).
- M3.5-A5 remote: commit `e403170`, GitHub Actions CI #14 / run `34766425884` completed
  successfully; Verify and migration-dry-run jobs both succeeded (API 9 files/27 tests; Web 11
  files/51 tests).
- M3.5 documentation reset: targeted Prettier check and repository-wide `git diff --check` passed
  on 2026-09-12; only Git's existing LF-to-CRLF notices were emitted.
- M4 local: root check passed (API 12 files/43 tests; Web 14 files/61 tests), root production builds
  passed with the existing over-500-kB Vite advisory, and `git diff --check` passed. Linked migration
  dry-run is up to date and linked `app_private` schema lint reports no errors.
- M4 live: isolated two-Coach E2E passed Session stale-version/current-state handling, Availability
  baseline conflict handling, recurring Block future/all scopes with preserved offsets, route
  projections, Series horizon/effective boundary, tenant isolation, and cleanup; the post-run Block
  residue count was zero. Deterministic Demo scheduling preview also passed.
- M4 browser: authenticated desktop and exact 390×844 acceptance passed for Calendar views,
  warning acknowledgement, modal/bottom-sheet focus and Escape restoration, Week-only horizontal
  scrolling, Today schedule, Student Series UI, no page overflow, and no console errors.
- M4 remote: commit `dc83d92`, GitHub Actions CI #17 / run `34947956256` completed in 58 seconds;
  Verify and migration-dry-run succeeded (API 12 files/43 tests; Web 14 files/61 tests).
- M5 Terra/Sol local: root check passed (API 14 files/51 tests; Web 15 files/65 tests), root builds
  passed with the existing over-500-kB advisory, and `git diff --check` passed. Demo preview passed
  with 100 stable catalog keys, checksum
  `0d915287e55739226788ff7c984a729bf734c1534b87d48eef8961ba632ac08a`, zero rejections,
  preserved legacy rows, and zero invented historical Training facts.
- M5 linked/live: four official CLI-created Training migrations through `20260915100537` are
  applied; final dry-run is up to date and linked `app_private` lint has no errors. Isolated M5 E2E
  passed catalog stability, receipt retry/mismatch, atomic completion, completed-record editing,
  performance allowlist, reopen, two-Coach isolation, and cleanup. M4 live regression also passed.
- M5 advisors/browser: security retains only the accepted leaked-password-protection warning; M5
  RLS and foreign-key performance findings were resolved, leaving only pre-existing M4/unused-index
  informational notices. Authenticated desktop and exact 390×844 acceptance passed Session editor,
  Exercise Library, Settings preference, Student performance/trend, autosave state, mobile sticky
  actions/navigation, and isolated fixture cleanup.
- M5 remote: commit `5afa212` pushed to `origin/main`; GitHub Actions CI #19 / run `34956661567`
  completed successfully. The `verify` and `migration-dry-run` jobs both succeeded for exact SHA
  `5afa2124e98f5fea74310516cf85119d7c62e006`.
- M6 remote: delivery commit `658ce1a` pushed to `origin/main`; GitHub Actions run `34966898151`
  completed successfully. Jobs `verify` and `migration-dry-run` both succeeded for exact SHA
  `658ce1a6f59007f7ad9f709445b5989dd69d778b`.
- M7 local: root check passed API 18 files/66 tests and Web 17 files/72 tests; root production build
  passed with the existing over-500-kB advisory. Demo check passed 9 files/61 tests and its release
  build passed. Repository `git diff --check` passed with only LF-to-CRLF notices.
- M7 linked/live: three official migrations through `20260915131743` are applied; final linked
  dry-run is up to date and `app_private` lint reports no schema errors. Isolated two-Coach E2E
  passed safe preview redaction, legacy-token rejection, Workspace-salted IDs, ordered five-phase
  import, tenant isolation, and exact created-row rollback; its test data was removed.
- M7 browser: authenticated desktop and exact 390×844 Settings acceptance passed import/recovery
  hierarchy, readable step progression, mobile stacking and sticky navigation without horizontal
  overflow; Chrome console reported no warnings or errors.
- M7 remote: delivery commit `8885404` is on `origin/main`; GitHub Actions CI #24 / run
  `34976808273` completed successfully in 1 minute 9 seconds for exact SHA
  `888540469df530432c9ca62031742257900f077f`. Job `verify` succeeded in 37 seconds (API 66, Web 72)
  and `migration-dry-run` succeeded in 24 seconds. The two annotations are the tracked Node 20
  action compatibility warnings, not job failures.
- M7.5-01 local: Student course records now compose the nearest future scheduled Session with every
  completed Session in reverse chronology, exclude cancelled Sessions, and render as a dedicated
  prominent panel separate from fixed rhythm. Focused Student state tests passed 6/6; root check
  passed API 66 and Web 74 tests; root production build passed with the existing >500-kB advisory.
  Authenticated desktop and exact 390×844 Chrome acceptance showed the upcoming and completed rows,
  no horizontal overflow (`390` viewport / `375` content), and no console warnings or errors.
- M7.5 Stage 1 route-data correction: primary Coach route data now prefetches after authenticated
  Workspace settings resolve; ordinary navigation reuses a five-minute fresh cache retained for
  thirty minutes, and window focus no longer invalidates unrelated route queries. The complete
  Exercise Library is fetched under one Coach-scoped key, while `/exercises` and the Session picker
  search/filter locally. Focused regression tests passed 8/8; full Web check passed 19 files/79
  tests; Web production build passed with the existing >500-kB advisory; `git diff --check` passed.
  Fresh authenticated Chrome acceptance showed Calendar and Exercise Library without loading
  skeletons after prefetch, reduced 101 definitions to one visible `Pallof` match locally, and
  reported no console warnings or errors.
- M7.5 Stage 1 interim remote: commits `120f867` and `f5996f1` reached `origin/main`; GitHub Actions
  CI #26 / run `35065072206` succeeded in 55 seconds for exact SHA
  `f5996f1b25454dca3f7b186d801123ebe8bdcce8`. Verify succeeded in 28 seconds with API 18 files/66
  tests and Web 19 files/79 tests; migration-dry-run succeeded in 20 seconds. Its two annotations are
  the tracked Node 20 action compatibility warnings, not job failures.
- M7.5 Stage 1 development-data setup: only the authenticated test Coach's development Workspace
  received 11 Availability windows on six weekdays, five clearly marked fictional Students with
  Purchase entitlements, fixed weekly/biweekly Series, historical completed and future scheduled
  Sessions, plus eight historical completed Sessions for its one pre-existing Student. Read-only
  verification found six active Students/Series, 47 completed Sessions, 21 future Sessions, and
  zero Session overlaps. Authenticated Web showed six Students, derived balances, the nearest future
  and all completed history, fixed rhythm, and this week's Calendar. No application code, schema,
  Demo data, production environment, push, or remote CI changed for this data-only setup.
- M7.5 Stage 1 performance-data setup: every completed temporal Session in that same development
  Workspace now has one Training Record with three completed three-set exercises: 高背槓深蹲、槓鈴臥推、
  相撲硬舉. Read-only verification found 47 Training Records, 141 exercise entries, and 423 completed
  sets. After reload, the Student performance projection visibly showed all three exercise series and
  personal-best weights. No application code, schema, Demo data, production environment, push, or
  remote CI changed.
- M7.5 Stage 1 link discovery: the M6 reschedule operation already lived on `/sessions/:id`, but
  Calendar's session editor offered only an unlabeled route hop. A future scheduled Session now has
  an explicit `建立改期連結` entry that opens the existing Session link dialog directly. Desktop and
  390×844 authenticated browser paths passed; closing clears the route hint and restores focus.
  Web check passed 19 files/79 tests, Web build passed with the existing chunk-size advisory, and
  `git diff --check` passed. This is local Stage 1 work; no new link was issued, pushed, or run in CI.
- M7.5 Stage 1 Auth hierarchy: the sign-in page now separates password and Google with `或者`,
  places password recovery by that field, removes the unconditional verification-help entry, and
  uses the Product Owner's exact headline and supporting copy. After signup, the six-digit-code
  screen first prompts inbox review and waits 60 seconds before exposing resend; a specific
  `email_not_confirmed` sign-in error offers a contextual return to verification. Focused Web check
  passed 19 files/79 tests and Web build passed with the existing chunk advisory. Desktop and exact
  390×844 browser inspection passed; mocked signup/resend proved the wait, appearance, feedback, and
  reset without creating an account or sending email. No live Auth delivery or remote CI is claimed.
- M7.5 Stage 1 local-entrypoint recovery: initial `5173/today` was 200 while its `/api/health`
  was 502 and `3000/health` refused connection. A normal-environment API start made both health
  paths 200; stopping it restored the same failure. The revised double-click launcher then started
  API from that red state, waited for health, and reused the already-running formal Web. Both health
  paths returned 200 afterward; unauthenticated `/api/v1/today` returned the expected 401, proving
  proxy reachability. A second formal Vite startup refused occupied 5173 instead of moving ports.
  The local 502 Today message has focused regression coverage. Elevated root check passed API 18
  files/66 tests and Web 19 files/80 tests; elevated root build passed with the existing chunk-size
  advisory; `git diff --check` passed. No authenticated data read, linked migration, push, or remote
  CI is claimed for this local correction.
- M7.5 Stage 1 trajectory hierarchy correction: each Definition now has exactly one ordered primary
  metric. A second stored metric means comparison is unlocked; one metric means the primary is
  locked. The shared selector is used by both the custom-Exercise editor and trajectory dialog.
  The chart now renders only the primary as a labeled upper-region line and constrains the quiet,
  borderless secondary bars to the bottom 20–30%; it has no right-side scale and labels a secondary
  bar only when its value changes. Focused tests passed 8/8; complete single-worker checks passed
  API 23 files/84 tests and Web 35 files/137 tests; root production build passed with the existing
  chunk-size advisory; `git diff --check` passed. Authenticated desktop and exact 390×844 browser
  checks covered lock, unlock, primary switching, one changed secondary label, no horizontal
  overflow, and zero console warnings/errors. The development setting was restored to its original
  unlocked weight-primary state. No schema change, migration, push, or remote CI is claimed.
- M7.5 Stage 1 Training exercise-order correction: the heading-level duplicate add control is
  removed; the no-exercise state retains its primary action, while a non-empty record ends with one
  black append action. Each Exercise card now has an icon-only reorder handle with pointer/touch
  lift and a list-local compact exchange layer. Reorder now collapses the document to the real
  compact-list height, so the page scrollbar reflects the visible rows instead of retaining an empty
  expanded-card shell. The active row stays inside both the list and the usable viewport above the
  fixed footer while the compact list scrolls beneath it. A 72px edge zone uses a time-based quadratic
  ramp capped at 480px/s, stops immediately in the neutral area, reverses from either edge, and keeps
  no idle animation-frame loop. Pointer events are coalesced into one animation-frame update; row
  positions are computed from fixed compact geometry, React updates only after a real adjacent
  exchange, and crossing requires actual overlap. Intermediate positions stay in a browser-only
  buffer, and only pointer release enters the existing draft/autosave path once. Arrow Up/Down
  provides keyboard parity without rendered guidance text. Focused reorder tests pass 8/8; Web
  typecheck passes. Authenticated nine-Exercise desktop acceptance covered down/up adjacent exchange,
  original-order restoration, persisted reload, and zero console warnings/errors. Exact 390×844
  physical touch remains unclaimed. Complete single-worker Web tests pass 36 files/146 tests; the
  production build passes with the existing chunk-size advisory. No schema, migration, push, or
  remote CI is claimed.

Current development validation commands:

```powershell
npm run check
npm run build
npm run db:push:dry
npm run e2e:m4 --workspace @gym-assistant/api
npm run preview:m4-demo --workspace @gym-assistant/api
npm run preview:m5 --workspace @gym-assistant/api
npm run e2e:m5 --workspace @gym-assistant/api
npm run e2e:m6 --workspace @gym-assistant/api
npm run e2e:m7 --workspace @gym-assistant/api
git diff --check
```

Run only the checks required by the current Roadmap package, then retain exact results here. A
local pass or successful push is not a remote CI completion claim.

## Engineering log

### 2026-09-30 — LOG-344 — Accumulated mobile Main delivery preflight

- **Scope:** Product Owner chose to retain the current mobile changes and authorized a CI-gated
  Main delivery, including five local Training Record commits and the uncommitted Today, Calendar,
  Settings, Venue, Finance, and dialog-scroll refinements.
- **Outcome:** Consolidated the local review work for delivery without declaring installed-PWA
  visual or keyboard acceptance. The route-by-route M7.5 Stage 1 review remains open.
- **Verification:** Root `npm run check` passed formatting, API typecheck and 26 files/125 tests,
  and Web typecheck and 58 files/248 tests using the approved Windows elevated path after a sandbox
  `spawn EPERM`. Root `npm run build` passed with the existing large-chunk advisory. Linked
  development `npm run db:push:dry` is up to date with no migrations; `app_private` lint has no
  errors after one transient authentication failure. Advisors show only the existing leaked-password
  and Capability Link permissive-policy warnings. Local `git diff --check` passed. Code checkpoint
  `864d59411a75efd902f9bfa6c7d35cf8af01be71` reached `origin/main`; GitHub Actions run
  `36699684675` completed successfully for that exact SHA, with both `verify` and
  `migration-dry-run` green.
- **Known issue:** Installed iOS/Android PWA touch, soft-keyboard, and safe-area review remains open;
  this delivery checkpoint does not complete M7.5.
- **Next:** Continue the Product Owner's installed-PWA route review. Stage 1 and M7.5 remain open.

### 2026-09-30 — LOG-343 — Align mobile Today link arrows with their values

- **Scope:** Product Owner found the active-student and finance chevrons visually above their
  content text.
- **Outcome:** Both mobile chevrons now center on the shared value row; link targets and desktop
  styling remain unchanged.
- **Verification:** Authenticated Chrome mobile preview measured both arrow centers at 300.8 CSS px
  and both value centers at 301.1 CSS px. The page remains free of horizontal overflow. Web
  formatting, production build, and `git diff --check` passed. Physical installed-PWA review
  remains open; no remote CI is claimed.
- **Next:** Product Owner continues mobile Today and route review on an installed PWA.

### 2026-09-30 — LOG-342 — Tune mobile Today active-student value size

- **Scope:** Product Owner found the initially aligned active-student count too small and requested
  a 2px increase.
- **Outcome:** The mobile count is 16px, with the same 17.5px content-row height and bottom edge as
  the adjacent finance label. Desktop styling and Today behavior remain unchanged.
- **Verification:** Authenticated Chrome mobile preview measured both content rows at 17.5px with
  the same bottom coordinate and no horizontal overflow. Web formatting, production build, and
  `git diff --check` passed. Physical installed-PWA review remains open; no remote CI is claimed.
- **Next:** Product Owner continues mobile Today and route review on an installed PWA.

### 2026-09-30 — LOG-341 — Compact mobile Today signals and move notifications into the app bar

- **Scope:** Product Owner requested one horizontal row for the three Today signals and a bell beside
  Settings, then identified a stretched header, misaligned icon, and a remaining two-column layout
  in the first preview.
- **Outcome:** The Today signal strip now has three equal mobile columns. The existing notification
  center moves into the mobile header, with a neutral bell when clear and a lime bell/count badge
  when unread. Its panel retains read, dismiss, and target-navigation behavior. Header button sizing
  and alignment follow the Student-page app bar. A follow-up aligns all three title rows and value
  bottoms, normalizes the two numeric sizes, and trims greeting whitespace; desktop remains a
  four-cell strip.
- **Verification:** Web format/typecheck, 58 Web test files (248 tests), production build, and
  `git diff --check` passed. Authenticated Chrome 390×844 preview confirmed a single three-column
  row with aligned titles/value bottoms, 21–22px greeting margins, 44px header buttons with an 8px
  gap, an opening empty notification panel, and
  `documentElement.scrollWidth === clientWidth` (371 CSS px inside the preview iframe).
  Physical installed-PWA and unread-state visual acceptance remain open; no remote CI is claimed.
- **Next:** Product Owner reviews mobile Today on an installed PWA, then continues the M7.5 mobile
  route and dialog review without pushing this local correction to Main.

### 2026-09-30 — LOG-340 — End mobile dialog scrollbars above fixed actions

- **Scope:** Product Owner's Calendar screenshots showed a scrollbar extending beside the fixed
  取消／儲存 row, making the remaining form depth hard to judge. Audit related setting and edit dialogs.
- **Outcome:** Calendar and Course Session forms now scroll their field body; fixed Series, purchase
  editing, Venue creation/detail/course records, Finance ledger editing, Settings password/device-cache, and
  Capability Link dialogs use field-owned scroll regions above static action rows. The existing
  Exercise definition editor already had this structure. Desktop rules and existing form operations
  remain in place. Preserved concurrent mobile Calendar and Today changes in the worktree.
- **Verification:** Web typecheck, focused SchedulingDialog/CapabilityLinkManager/VenueManager tests (23), Web
  production build, changed-file formatting, and `git diff --check` passed. Authenticated Chrome
  390×844 preview measured Calendar field scroll ending at the footer top, with outer content
  non-scrollable; Venue creation/detail/course records and Finance ledger dialog geometry was checked as well.
  Physical installed-PWA touch behavior and remote CI remain unverified.
- **Next:** Product Owner checks the listed dialog variants on an installed PWA, then continues the
  route-by-route mobile review. Keep these local changes off Main until authorized.

### 2026-09-30 — LOG-339 — Clarify Calendar today and one-hour events

- **Scope:** Product Owner requested a clearer today marker in 課表, about ten visible hours in
  日／週, and a readable vertical event layout in 日.
- **Outcome:** Today's 課表 date now uses the same lime circle as the grid views. The mobile
  timeline measures its available viewport, expands hours to show about ten at 390×844, and keeps
  a minimum 52px per hour on shorter phones. A one-hour 日 event stacks time, student, and location;
  the desktop timeline and stored Calendar preferences remain unchanged.
- **Verification:** Authenticated Chrome 390×844 preview measured 52px/hour and about 9.7 visible
  hours, with a 52px day event in column layout and no horizontal overflow. The today circle was
  visible in 課表. Two focused Calendar test files / 15 tests and Web production build passed.
  Physical installed-PWA touch behavior remains for Product Owner review. No Main push or remote
  CI claim.
- **Next:** Review the revised three views on an installed PWA, particularly touch panning and
  short-event readability. Keep this Stage 1 correction local.

### 2026-09-30 — LOG-338 — Give mobile Calendar full-width day, week, and month layouts

- **Scope:** Product Owner requested a Google Calendar-inspired mobile Calendar, retaining 課表 while
  replacing the desktop-sized 日／週／月 grids and excess scrollbars with a compact PWA composition.
- **Outcome:** Mobile controls use a two-row date/pager and four-view switch; the status legend and
  frame borders no longer consume Calendar space. 日 fills the width, while 週 shows all seven days;
  both use one vertical timeline scroll. Tapping a week date opens 日. 月 uses equal-height week rows and
  compact lesson names, with today's date marked. Month weekday order follows the saved Workspace
  preference. Desktop layout and existing schedule operations remain intact.
- **Verification:** Web typecheck, 2 focused Calendar test files / 15 tests, production build,
  changed-file Prettier, and `git diff --check` passed. Authenticated Chrome 390×844 preview showed
  all seven week columns. At 320 CSS pixels, the timeline and month `scrollWidth` equaled
  `clientWidth`; the month also had matching `scrollHeight`/`clientHeight`, and the Calendar ended
  above bottom navigation. The initial sandbox Vite `spawn EPERM` was resolved by an elevated test
  and build rerun. No installed-phone/PWA, remote CI, or Main delivery claim.
- **Next:** Product Owner reviews 日／週／月 on an installed PWA, especially touch gestures and
  dense-event legibility. Keep this experiment local until accepted.

### 2026-09-30 — LOG-337 — Give Training tabs and class context one light surface

- **Scope:** Product Owner reported that the selected black tab ends abruptly against the Training
  and Note canvases when class information is collapsed. The first dark connector trial was rejected;
  Product Owner requested a white background across the tab and class information region.
- **Outcome:** Removed the dark connector. The mobile student/actions row, tab switcher, and class
  summary now share a light paper surface. The active tab keeps a rounded-top shape with a dark
  outline and text; inactive text stays muted. Class date, location, and icons use readable dark
  tones. The Training and Note canvases retain their established layout and editing behavior.
- **Verification:** Authenticated Chrome 390×844 preview showed both collapsed tabs and the expanded
  Training summary on the new light surface. Final Web production build, formatting, and diff checks
  passed. No phone/PWA claim.
- **Next:** Review the collapsed and expanded transition on an installed PWA, then continue the
  M7.5 mobile route review. Keep this local pending Product Owner acceptance.

### 2026-09-30 — LOG-336 — Make mobile Note lists behave like familiar editors

- **Scope:** Product Owner requested tabs that reach both side edges, aligned bullet/number marks,
  and more intuitive list editing, especially Backspace cancellation and Tab indentation.
- **Outcome:** Mobile selected tabs extend through the topbar's side padding. List indent now affects
  marker and text together; marker line heights match the first text line. The editor keeps Enter
  continuation, steps an empty nested item outward, and exits an empty top-level list. Backspace at
  a line start first removes one indent level or its list marker, then joins the previous paragraph
  on a subsequent press. Tab/Shift+Tab and touch toolbar indent/outdent share the same visible
  indentation. Typed `- `, `1. `, and `# ` prefixes become visible blocks. Existing Markdown-like
  storage stays compatible; Markdown syntax alone does not define keyboard behavior.
- **Verification:** Web 58 test files/248 tests and production build passed; changed files passed
  Prettier. Focused editor tests cover list continuation, marker cancellation, indentation,
  empty-list exit, and typed prefix conversion. Authenticated Chrome 390×844 preview showed selected
  tabs reaching both edges and bullet/number marks aligned beside their first line.
- **Known issue:** A desktop preview does not verify actual iOS/Android keyboard events, touch caret
  behavior, or installed-PWA visual positioning. Keep the change local for Product Owner review.
- **Next:** Exercise list typing, Backspace, indent/outdent controls, and keyboard docking on an
  installed PWA, then continue the M7.5 mobile route review.

### 2026-09-30 — LOG-335 — Repair Training Note editing and shared legacy-record saves

- **Scope:** Product Owner identified a seam below the active tab, misaligned list markers and
  toolbar labels, paragraph-limited selection and clipped Note text, and a repeated failure of
  採用目前內容. The save problem was explicitly reported on both desktop and mobile.
- **Outcome:** The mobile Note uses one editable canvas with native cross-paragraph selection and
  wrapping. The selected tab joins the summary, markers align with their first line, the number
  is smaller, the tool dock uses seven aligned icon/caption pairs, and the tab reads 教練筆記. The
  shared API now permits existing legacy sets without `measurements` under a recording snapshot;
  new sets still require measurements. Conflict recovery refreshes current versions, retries only
  version conflicts, and clears stale autosave requests after a successful explicit adoption.
  Conflict copy distinguishes version, definition, and unit problems.
- **Verification:** API typecheck, build, and 26 test files/125 tests passed, including a repository
  regression for a note save with a legacy set. Web typecheck, production build, and 58 test
  files/246 tests passed; changed files passed Prettier and `git diff --check`. Authenticated Chrome
  390×844 preview showed the revised Note layout and a previously stuck draft changing from
  儲存衝突 to 已儲存 after 採用目前內容, retaining all nine sets.
- **Known issue:** A desktop browser preview cannot prove installed-phone keyboard height or caret
  behavior. No Main push or remote CI claim; desktop and phone should both be exercised during
  Product Owner acceptance.
- **Next:** Review Note typing, cross-paragraph selection, toolbar docking, and autosave on an
  installed PWA; confirm a desktop edit of the same legacy lesson, then continue the M7.5 route
  review. Keep this change local pending acceptance.

### 2026-09-30 — LOG-334 — Refine Training tabs and make the Note canvas keyboard ready

- **Scope:** Product Owner requested black bookmark-shaped selected tabs, a shared collapsible class
  summary, blank-canvas writing focus, a keyboard-following tool dock, stronger bullets, outdent,
  persistent selective class import, and Bold.
- **Outcome:** Both mobile tabs render one dark class summary. Repeating the selected tab toggles it;
  switching tabs does not. Upward touch movement and Note focus collapse it. Empty Note canvas taps
  focus the final paragraph at its end. The mobile dock has a paragraph Bold toggle, outdent, a
  stronger bullet mark, and vertically arranged controls. Import checkboxes start empty, persist as
  local UI preferences, and are reserved for batch insertion; clicking a fact inserts it directly.
  Public Training Result notes render bold paragraphs. Desktop layout is unchanged.
- **Verification:** Elevated Web `npm run check` passed format, typecheck, 57 test files/241 tests;
  Web production build passed. Authenticated Chrome 390×844 preview confirmed the tab appearance,
  shared summary, repeat-tap collapse/expand, preserved collapse across a tab switch, blank-canvas
  focus, automatic summary collapse, and the revised dock. No Note fixture content was typed.
- **Known issue:** The desktop preview cannot verify a physical soft keyboard, its exact height,
  installed-PWA caret behavior, or real-device autosave. Bold is paragraph-level and stores readable
  `**` markers, which the desktop textarea displays literally.
- **Next:** Review soft-keyboard docking and text entry on an installed PWA, then continue the
  Product Owner's M7.5 mobile route review. Keep this local pending acceptance.

### 2026-09-30 — LOG-333 — Align Training tabs and add a functional mobile Note toolbar

- **Scope:** Product Owner required identical top rows across both tabs, a clearer selected-tab
  signal, no duplicate Training title, no Note Done or app-bar save copy, and usable heading/body,
  bullet, numbering, indentation, and selective class-info insertion tools.
- **Outcome:** Mobile tabs share the same student, class actions, save status, and switcher rows.
  Their active state has a pale-lime fill and stronger underline. The dark Training summary begins
  with date/time. A paragraph-based mobile Note editor presents heading/body visually and stores
  readable text markers in the existing private-note field; lists, Tab/indent, and import choices
  update the same autosave draft. The optional public Training Result note renders the supported
  markers when sharing was explicitly enabled; the downloadable result image uses clean text.
  The bottom tool dock continues following VisualViewport and safe-area insets. Desktop retains
  its original two-column layout and textarea.
- **Verification:** Elevated full `npm run check` passed (26 API files/124 tests; 57 Web files/239
  tests), including focused format and toolbar interactions. After the image-text conversion,
  focused Note tests (2 files/5 tests), Web typecheck, and the final Web production build passed.
  Authenticated Chrome 390×844 preview showed identical top rows, stronger tab selection, the
  shortened Training summary, Note focus and labeled dock, plus style and import menus. These are
  desktop-browser preview observations; no Note fixture data was changed during visual checks.
- **Known issue:** Actual phone keyboard geometry, multiline caret navigation, and autosave during
  device entry remain unverified. Desktop editing shows the readable formatting markers. No Main
  push or remote CI claim.
- **Next:** Review the mobile Note toolbar and keyboard flow on an installed PWA, then continue the
  Training Record and broader M7.5 Stage 1 mobile review.

### 2026-09-30 — LOG-332 — Advance Training set inputs with Enter within one exercise

- **Scope:** Product Owner requested faster Training Record numeric entry on desktop and phone:
  select a populated field on focus, then advance through each set's measurement fields and RPE
  with Enter without crossing into another exercise.
- **Outcome:** Training set inputs now use one exercise-scoped focus sequence for all eight recording
  types. Enter after the last RPE leaves the input; mobile return-key hints show Next or Done. The
  existing numeric constraints, result controls, draft, and autosave path remain in use.
- **Verification:** Full `npm run check` passed (26 API files/124 tests; 55 Web files/235 tests),
  including two focused Web test files (4 tests). Web production build and `git diff --check` passed.
  Authenticated Chrome desktop and 390×844 desktop-browser preview confirmed weight → reps → RPE →
  next-set weight. Desktop Chrome also confirmed focus clears after the last RPE without entering
  the next exercise. No record values were changed in this browser check.
- **Known issue:** Actual iOS/Android soft-keyboard Return behavior and input selection require an
  installed-PWA check. No Main push or remote CI claim.
- **Next:** Product Owner tries set entry with a real phone keyboard, then continues the Training
  Record and wider M7.5 Stage 1 mobile review.

### 2026-09-29 — LOG-331 — Give mobile Training a deliberate title and Note a real writing canvas

- **Scope:** Product Owner rejected the data-dump Training heading, the repeated desktop context in
  Note mode, the low usable writing area, redundant tools, bottom Done placement, and a completion
  button flush with the bottom navigation.
- **Outcome:** Mobile Training uses a dark class-summary title area with date, time, student, venue,
  and state above the exercise cards. Mobile Note hides all repeated class/exercise metadata and
  character-count furniture, starts writing immediately below the tabs, keeps save feedback and Done
  in the app bar, and hides primary navigation. Only bullet insertion remains, appearing above the
  soft keyboard during focus through the existing VisualViewport inset. The Training completion
  footer has 12px clearance above primary navigation. Desktop presentation and the private Note
  draft/autosave behavior remain in their original modules.
- **Verification:** Elevated `npm run check` passed (26 API files/124 tests; 54 Web files/233 tests).
  `npm run build --workspace @gym-assistant/web` passed. Authenticated Chrome 390×844 preview showed
  the Training title and footer gap, Note canvas and top Done, hidden bottom navigation, and the
  single bullet tool on focus. These are desktop-browser mobile-preview observations.
- **Known issue:** Installed-PWA keyboard movement, visible caret, and autosave after Note edits are
  unverified on iOS/Android; the broader input-surface keyboard audit remains open. No Main push or
  remote CI claim.
- **Next:** Review this Training Record flow with a real phone keyboard, then continue the Product
  Owner's mobile route review and focused-control keyboard audit.

### 2026-09-29 — LOG-330 — Replace mobile Training collapse with focused tabs

- **Scope:** Product Owner rejected the compressed context row and boxed Note, supplied native Notes
  and journal references, and identified soft-keyboard positioning as a missing interaction concern.
- **Outcome:** Mobile Training now has separate Training Record and private Note tabs. Session facts
  live with the training heading; the Note tab gets an unboxed writing surface and bottom insertion
  dock. VisualViewport inset moves that dock above the keyboard, Note focus hides bottom navigation,
  and numeric set focus hides bottom navigation/completion controls. The existing private Note limit,
  draft, autosave, and desktop two-column layout are preserved. Earlier mobile context-disclosure and
  compact metadata-row experiments are superseded locally.
- **Verification:** Elevated `npm run check` passed (26 API files/124 tests and 54 Web files/233
  tests); Web production build passed. Authenticated Chrome 390×844 preview showed both tabs, the
  full Note page, Note focus with bottom navigation hidden, and set-input focus with bottom controls
  hidden. A temporary 1440px viewport showed the preserved desktop columns and was reset.
  `git diff --check` passed.
- **Known issue:** Browser preview cannot verify actual iOS/Android soft-keyboard position or other
  routes' keyboard behavior; physical-PWA review is open. No Main push or remote CI claim.
- **Next:** Validate this route on an installed PWA, then continue the Product Owner's mobile route
  review with a keyboard and focused-control audit.

### 2026-09-29 — LOG-329 — Integrate mobile class facts and improve private Note entry

- **Scope:** Product Owner showed that the prior collapse hid important class facts, the completion
  button touched the bottom boundary, and the remaining Note area needed a better writing surface.
- **Outcome:** The sticky mobile session toolbar now shows date/time, location, status, and exercise
  names/count below student and class actions. The mobile disclosure contains only the private Note.
  Its larger paper-like plain-text editor offers subheading, list, task, and timestamp insertions;
  all edits use the existing 5000-character draft/autosave path. The fixed completion action has 12px
  additional separation above bottom navigation. Desktop content and controls stay two-column.
- **Verification:** Elevated `npm run check` passed (26 API files/124 tests and 54 Web files/233
  tests); Web production build passed. Authenticated Chrome 390×844 preview showed the class facts,
  collapsed and expanded Note, and the completion spacing. Expanded workspace `scrollWidth` and
  `clientWidth` were both 371px; desktop context and editor remained separate columns, with the
  mobile controls hidden. `git diff --check` passed.
- **Known issue:** Physical PWA touch, soft-keyboard, quick-insert, and Note autosave acceptance remain
  open; no remote CI or physical-device claim.
- **Next:** Continue Product Owner mobile review on an installed PWA before Main delivery.

### 2026-09-29 — LOG-328 — Make Training Record context collapsible on mobile

- **Scope:** Product Owner reported that the stacked class context and Note consumed the mobile
  Training Record first screen, and requested more space for live set entry.
- **Outcome:** At mobile widths, the context starts as a compact disclosure above Training Log and
  expands to the existing class details and private Note. Desktop keeps its two-column context and
  editor. Existing numeric measurement/RPE input modes and sticky student/save toolbar remain.
- **Verification:** Elevated `npm run check` passed (26 API files/124 tests and 54 Web files/233
  tests); Web production build passed. Authenticated Chrome 390×844 preview showed Training Log on
  the initial screen, the context disclosure opened and closed, and workspace `scrollWidth` equalled
  `clientWidth` (371px) in both states. The desktop session view retained separate left and right
  columns. `git diff --check` passed.
- **Known issue:** Installed-PWA touch, on-device keyboard, and Note edit/autosave acceptance remain
  open; no remote CI or physical-device claim.
- **Next:** Continue Product Owner mobile route review and check the expanded context on an installed
  PWA before Main delivery.

### 2026-09-29 — LOG-327 — Retain the mobile UI review checkpoint locally

- **Scope:** Product Owner approved keeping the current mobile UI changes and requested one commit.
- **Outcome:** The Today, Student, Calendar, Exercise Library, Settings, Venue, Training Record, and
  dialog presentation changes are retained together as a local checkpoint. Physical-PWA review and
  the M7.5 Stage 1 acceptance boundary remain open; no Main push was requested.
- **Verification:** `npm run check` passed (26 API files/124 tests and 54 Web files/233 tests);
  `npm run build` passed for API and Web. Earlier authenticated Chrome 390×844 previews covered the
  named route changes; `git diff --check` passed before committing.
- **Known issue:** Physical installed-PWA touch and narrow-phone acceptance remain open.
- **Next:** Continue the Product Owner mobile route-by-route sweep from the first handoff above.

### 2026-09-29 — LOG-326 — Keep the first Exercise card clear of mobile filters

- **Scope:** Product Owner reported that the initially expanded Filter shelf covered the first
  Exercise card, hiding 「低背槓深蹲」 on page entry.
- **Outcome:** The Filter shelf now occupies measured height within the sticky controls while its
  220ms reveal animates. The card list follows below with an 18px gap. Opening filters in the middle
  of the list moves visible cards down instead of placing the shelf over them. No Main push was made.
- **Verification:** Web production build, targeted Prettier, and `git diff --check` passed. Chrome
  390×844 authenticated preview showed 「低背槓深蹲」 completely visible below the filters after
  navigating into Exercise Library, and showed the list shift below the reopened shelf mid-scroll.
- **Known issue:** Physical installed-PWA touch and motion acceptance remain open.
- **Next:** Product Owner reviews initial entry and mid-list reopening on a device.

### 2026-09-29 — LOG-325 — Soften the mobile Exercise filter collapse

- **Scope:** Product Owner reported that the swipe-to-close Filter shelf disappeared too abruptly.
- **Outcome:** The mobile floating shelf now eases upward 12px while fading over 220ms, and reverses
  the motion when reopened. It becomes noninteractive during the closed state. Reduced-motion
  preference disables the transition. No Main push was made.
- **Verification:** Web production build and targeted Prettier passed. Chrome 390×844 preview showed
  the Filter toggle close the shelf while the pinned toolbar and cards remained usable. `git diff
--check` passed before the Status update.
- **Known issue:** Physical installed-PWA motion and touch acceptance remain open.
- **Next:** Product Owner reviews the filter motion on a device with the rest of the mobile route.

### 2026-09-29 — LOG-324 — Make Exercise filters available throughout the mobile list

- **Scope:** Product Owner requested transparent backgrounds for the mobile Exercise card's Delete
  and Edit icons, an immediately accessible Filter panel from any scroll position, more space for
  expanded Search by temporarily replacing Filter, and breathing room above the first card.
- **Outcome:** The Filter shelf floats below the pinned toolbar, closes on further downward scroll,
  upward touch swipe within the shelf, or a second Filter tap, and keeps selected values. Opening
  Search closes the shelf, hides Filter, moves its close button to the right edge, and widens the
  input. Mobile card Delete/Edit icons now use transparent backgrounds; the grid starts 18px below
  the toolbar. Desktop presentation and existing actions remain intact. No Main push was made.
- **Verification:** Web production build passed. Chrome 390×844 preview showed the floating Filter
  shelf opening over cards from a scrolled list position, the expanded Search layout, transparent
  card actions, and the first-card gap. Prettier and `git diff --check` passed after the change.
- **Known issue:** Physical installed-PWA touch and 320px viewport acceptance remain open.
- **Next:** Product Owner reviews Filter/Search behavior and card spacing on a device.

### 2026-09-29 — LOG-323 — Pin mobile roster and Exercise controls; compact Exercise cards

- **Scope:** Product Owner requested the Student switch/Search row also remain visible when scrolling,
  the Exercise Library row follow it, filters collapse during downward scrolling with a small reopen
  control, and mobile Exercise cards use a denser layout with icon-only edit/delete beside Favorite.
- **Outcome:** Both mobile toolbars are sticky below the dark app bar. Exercise filters retain their
  values when hidden and show an active indicator on the reopen icon. Exercise cards move body-part
  chips beside equipment/type, reduce heading size and spacing, and remove the mobile footer row.
  Desktop card actions retain their existing footer. No Main push was made.
- **Verification:** Web production build passed after a sandbox-only `spawn EPERM` retry with normal
  process-spawn permission. Chrome 390×844 preview showed the compact cards and sticky Exercise
  toolbar; scrolling collapsed the filter shelf while the filter button remained visible. The Student
  switch/Search row rendered in the same sticky position. `git diff --check` passed before the Status
  update.
- **Known issue:** Physical installed-PWA touch and narrow-phone checks remain open; the Student
  sticky behavior has not yet been independently confirmed by a full scroll capture.
- **Next:** Product Owner reviews the two pinned rows, filter reopen, and card touch targets on a device.

### 2026-09-29 — LOG-322 — Move mobile subpage Back into the app bar

- **Scope:** Product Owner requested the Logo replaced by Back in the mobile Student detail,
  Training Record, Monthly Finances, and Venue pages. Training Record should move student identity
  beside its actions and remove the repeated date/time in that white toolbar. A follow-up identified
  that the save indicator must remain visible.
- **Outcome:** Shared mobile subpage header provides Back and Settings, plus the existing Venue Add
  action where applicable. In-page Back remains for desktop and is hidden only on mobile. Training
  Record shows avatar/name, actions, and save status on one mobile row; longer offline/error status
  wraps within the toolbar. Its dark session context still shows the session date/time. No Main push
  was made.
- **Verification:** Web build and 25 focused Session/Training tests passed. Chrome 390×844 preview showed each subpage's app-bar Back;
  Training Record Back returned to its originating Student page, and the compact toolbar displayed
  「✓ 已儲存」 beside its actions. Desktop Chrome retained the original Venue Back and heading.
- **Known issue:** Physical installed-PWA safe areas and touch behavior remain unverified.
- **Next:** Product Owner reviews mobile Back and Training Record toolbar on a device.

### 2026-09-29 — LOG-321 — Compact mobile Venue management

- **Scope:** Product Owner requested the Venue page's large title removed on mobile, its Add action
  moved to the dark header as a Plus icon, a stronger 「場地管理與支出」 card title, and a single row for
  active/archive switching with an expanding search.
- **Outcome:** Venue keeps the Logo and safe-area-aware header. Its Plus action opens the existing
  creation dialog. The mobile card title, segmented switch, and venue-name search now follow the
  Student interaction pattern. Desktop retains its title, Add button, and original card heading.
  No Main push was made.
- **Verification:** Web production build, 16 focused Venue tests, targeted Prettier, and
  `git diff --check` passed. Chrome 390×844 preview showed the new header and single-row controls;
  searching 「健美」 reduced the list to one matching Venue, and the Plus opened the creation dialog.
  Desktop Chrome showed the original heading and Add button.
- **Known issue:** Physical installed-PWA safe areas and touch behavior remain unverified.
- **Next:** Product Owner reviews the Venue layout and interaction on mobile; continue the route
  sweep without Main delivery until approved.

### 2026-09-29 — LOG-320 — Give mobile Settings its app bar and pinned category switcher

- **Scope:** Product Owner requested the Settings page title in the mobile dark app bar, a second
  Settings tap to return to the entry route, and a category switcher that remains visible while the
  Settings content scrolls.
- **Outcome:** Settings joins the shared mobile route-header slot, with its in-page heading hidden
  only on mobile. The shared mobile Settings link stores the current route when opening Settings and
  uses it as the return destination on the next tap; direct entry returns to Today. The category
  grid uses sticky positioning immediately below the safe-area-aware header, with an opaque surface
  over scrolling content. Desktop navigation and presentation remain unchanged. No Main push was made.
- **Verification:** Chrome 390×844 preview showed the dark Settings title, and scrolling Work
  Preferences kept the category grid immediately below the 113px header, including at the bottom
  of the long category.
  Settings returned to Today and Calendar from their respective entry links. Desktop Chrome still
  showed the sidebar Settings item and original page heading. Web build, targeted Prettier, and
  `git diff --check` passed.
- **Known issue:** Physical installed-PWA safe areas and touch scrolling remain unverified.
- **Next:** Product Owner reviews the mobile Settings header, return action, and pinned categories.

### 2026-09-29 — LOG-319 — Align mobile in-app scrollbars and Exercise dialog regions

- **Scope:** Product Owner spotted a tiny literal Plus in Exercise creation, a thick native dialog
  scrollbar with arrows, and a scrollbar that extended alongside fixed action buttons. Requested
  an audit of interface scrollbars against the recently established mobile standard.
- **Outcome:** Exercise create/edit uses the same Plus icon component as the tag Add action, sized
  for the footer button. Its form fields scroll in a separate pane above the fixed footer. A
  low-specificity mobile rule gives all scrollable descendants of the Web root a 4px transparent
  track, pale rounded thumb, and hidden arrows; existing choice-list rules retain their olive
  thumb. The 35 explicit CSS overflow declarations and three portal usages were reviewed: the only
  scrollable portals are FormSelect and SeriesDatePicker, which already use the choice-list rule.
  Desktop styling remains unchanged; no Main push was made.
- **Verification:** Chrome 390×844 preview measured the Exercise field pane at 220–694px and the
  footer beginning at 710px. The pane scrollbar computed to 4px, pale thumb, and no arrow buttons;
  the Plus icon measured 18px. Scrolling the fields left the footer visible. Web build, the four
  existing Exercise Page tests, targeted Prettier, and `git diff --check` passed. Vite/Vitest needed
  the approved Windows process-permission retry after sandbox `spawn EPERM`.
- **Known issue:** Physical-phone rendering and touch scrolling are not yet verified. The desktop
  browser scrollbar around the 390×844 preview is outside the app UI.
- **Next:** Product Owner reviews this dialog and the in-app scrollbar appearance on a phone.

### 2026-09-29 — LOG-318 — Remove contrasting mobile dialog action strips

- **Scope:** Product Owner identified a boxed, mismatched action row in Exercise editing and Student
  creation and asked for the recurring dialog pattern to be corrected. Background colors across
  pages were raised as a separate, lower-priority visual concern.
- **Outcome:** The shared mobile sticky action row now takes its surface color from the containing
  dialog and drops its separate top border. Exercise, scheduling, and modal dialogs each declare
  that surface once. Action placement, button handlers, and desktop colors remain unchanged. No
  Main push was made.
- **Verification:** Chrome's 390×844 preview showed the Exercise edit and Student create dialogs
  without the contrasting footer strip; both action rows remained visible. Web build, targeted
  Prettier, and `git diff --check` passed. The first sandboxed Vite build hit Windows `spawn EPERM`;
  the approved elevated retry passed.
- **Known issue:** Other dialog variants and physical installed-PWA scrolling remain to be checked.
- **Next:** Review the action-row treatment across mobile dialogs, then decide separately whether
  to consolidate the page and card palette across desktop and mobile.

### 2026-09-29 — LOG-317 — Extend Student app bar and compact search to Calendar and Exercises

- **Scope:** Product Owner approved the Student mobile pattern for Calendar and Exercise Library,
  including top-bar titles/Add actions and the Exercise Library's All/Favorite/Custom selector.
- **Outcome:** A small shared mobile app-bar component renders the route title, optional total,
  existing Add action, and Settings link in the shell for all three routes. Calendar's duplicate
  mobile page heading is hidden; its content height tracks the taller header and its desktop-only
  wheel collapse no longer intercepts mobile scrolling. Exercise Library's three-state selector
  uses a sliding white plate, and its search shares one row with a compressing selector. Desktop
  presentation and the existing query/filter/add handlers remain unchanged. No Main push was made.
- **Verification:** Web build, targeted Prettier, and `git diff --check` passed. Authenticated Chrome
  390×844 preview opened and closed the Calendar scheduling dialog from the app bar; Exercise Library
  switched to Favorite and Custom, expanded Search, filtered to an empty result, then restored the
  list on close. Student's app bar still rendered after switching back. Desktop Chrome showed the
  original Calendar and Exercise Library headings and toolbar.
- **Known issue:** Physical installed-PWA safe areas and touch/keyboard transitions remain to be
  checked on a phone.
- **Next:** Product Owner reviews the three mobile route headers and the Exercise Library search
  interaction before further presentation changes or Main delivery.

### 2026-09-29 — LOG-316 — Condense Student search and rebalance its mobile header

- **Scope:** Product Owner requested a one-row Student status/search control with an expanding
  search field, a roomier page header with stronger title, restored Settings action, and subtle
  depth at the header and controls.
- **Outcome:** On mobile, the status switch occupies the toolbar until Search is tapped; Search
  then expands left, the switch narrows and hides counts, and the input takes focus. Closing Search
  clears its filter and restores the full switch. The header gained vertical breathing room, a
  stronger title, Settings beside Add, and a soft shadow. The toolbar uses the taller header offset.
  Desktop Student layout remains unchanged. No Main push was made.
- **Verification:** Authenticated Chrome 390×844 preview showed the closed and expanded one-row
  toolbar, six-card roster, filtering/empty result, and restored list after closing Search. Desktop
  Chrome retained the original search field, status switch, title, and add button. Final Web build,
  targeted Prettier, and `git diff --check` validate this revision.
- **Known issue:** Physical installed-PWA safe-area and touch/keyboard motion still need review.
- **Next:** Product Owner reviews the Student mobile interaction before more visual changes or Main
  delivery.

### 2026-09-29 — LOG-315 — Extend top inset to every mobile app header

- **Scope:** Product Owner pointed out that the previous top inset correction covered only the
  Student route, leaving the shared Logo header on other routes visually close to a notch.
- **Outcome:** The authenticated mobile shell now owns one top-inset and header-height pair, using
  at least 40px or the larger device `safe-area-inset-top` on all routes. Student search and the
  session workspace topbar follow that height when sticky. Public capability pages now include a
  top safe-area allowance; Auth already used the device inset in its mobile layout. The change is
  mobile-only and remains local without a Main push.
- **Verification:** Authenticated 390×844 Chrome preview showed clear space above the shared Logo
  on Today, Calendar, Exercise Library, and a Course Session, and above the title/add action on
  Student. The Session toolbar appeared below the shared header. Final Web build, targeted Prettier,
  and `git diff --check` validate this revision.
- **Known issue:** The desktop-sized preview reports no physical display cutout. Installed-PWA
  behavior and the actual status-bar/safe-area geometry remain to be checked on a phone.
- **Next:** Product Owner reviews shared top spacing on mobile before settling the PWA proportions.

### 2026-09-29 — LOG-314 — Reserve visible top inset for Student app bar

- **Scope:** Product Owner noticed that the new Student app bar appeared too close to a possible
  phone notch or Dynamic Island in the 390×844 desktop preview.
- **Outcome:** The Student-only mobile header now uses the larger of a 40px visual top inset and
  `safe-area-inset-top`; its dark background still reaches the viewport edge. The sticky Student
  toolbar offset uses the same inset so scrolling does not place it under the taller header.
  Desktop and other mobile routes are unchanged. This adjustment remains local, with no Main push.
- **Verification:** The authenticated 390×844 Chrome preview showed clear dark space above the
  Student title and add button, with search, segments, and cards below. Web build, targeted Prettier,
  and `git diff --check` are the final local checks for this adjustment.
- **Known issue:** Desktop responsive preview reports no physical display cutout; an installed PWA
  on a notched phone must still confirm the actual safe-area value and status-bar appearance.
- **Next:** Product Owner reviews the new top spacing on mobile before settling the Student design.

### 2026-09-29 — LOG-313 — Try Student roster mobile app bar and segmented control

- **Scope:** Product Owner requested a mobile-only Student roster trial that puts the title/count and
  add action in the top app bar and gives active/archived selection a sliding, inset segment.
- **Outcome:** On `/students`, the mobile shell replaces the Logo and Settings control with
  `學生 (count)` and a 44×44px add button wired to the existing CreateStudentDialog. The duplicate
  roster heading is hidden at mobile widths, moving search and cards upward. A white plate with a
  subtle shadow slides across the gray active/archived track; button semantics and filtered results
  are preserved. Desktop heading, add action, and layout remain unchanged. No Main push was made.
- **Verification:** Web production build and `git diff --check` passed. Authenticated Chrome mobile
  preview at 390×844 showed the condensed bar, six cards, the archived empty state after switching,
  and the original add dialog opened and closed from the new action. Desktop Chrome showed the
  original heading and add button with the six-card grid.
- **Known issue:** Sliding motion was seen in the preview, but physical installed-PWA safe-area and
  device behavior remain unverified.
- **Next:** Product Owner reviews this Student visual direction on mobile before further roster
  changes or Main delivery.

### 2026-09-29 — LOG-312 — Try mobile Today loading and route continuity

- **Scope:** Product Owner approved a first mobile-only experiment with a Today schedule skeleton,
  a 44×44px Settings target, and a subtle fade between bottom-navigation routes.
- **Outcome:** Today now reserves a schedule-card shape while initial data loads at mobile widths;
  its four signal placeholders match the mobile two-column surface. Bottom navigation links request
  a short View Transition, with the fixed header and bar excluded from the content fade and reduced
  motion respected. The Settings button measures 44×44px. Desktop presentation and navigation are
  unchanged. This work and LOG-311 remain local; no Main push is authorized for this experiment.
- **Verification:** Targeted Prettier, `git diff --check`, and Web production build passed.
  Authenticated Chrome 390×844 preview switched from Students to Today through the bottom bar and
  rendered the fixed shell without visible overflow. The brief animation and initial-loading
  skeleton were not separately captured; physical installed-PWA behavior remains unverified.
- **Next:** Product Owner reviews Today at 390×844 and on an installed phone, including a cold-load
  skeleton and reduced-motion setting, before extending the pattern to other routes.

### 2026-09-29 — LOG-311 — Lift mobile navigation above the gesture area

- **Scope:** Product Owner compared the mobile bottom navigation with LINE and found its icons and
  labels too close to the screen edge.
- **Outcome:** Added 16px of fixed space below the navigation items in addition to
  `safe-area-inset-bottom`, raising the mobile navigation height from 68px to 84px plus the inset.
  Adjusted the mobile Today, Calendar, Finance, and capability-dialog clearances that depend on that
  height. Desktop styling was not changed; the revision remains local pending visual review.
- **Verification:** Authenticated Chrome 390×844 preview showed a visible gap beneath all four labels
  while the dark bar still reached the frame bottom. Targeted Prettier, `git diff --check`, and Web
  production build passed. Physical installed-PWA safe-area behavior remains unverified.
- **Next:** Have the Product Owner review the 390×844 spacing and check it on a phone before settling
  the bottom-navigation proportions or extending the PWA treatment.

### 2026-09-29 — LOG-310 — Deliver mobile and Calendar checkpoint to Main

- **Scope:** Complete the Product Owner-authorized early Main checkpoint and confirm remote CI for
  its exact commit.
- **Outcome:** Commit `47370fe1452f1e5844fedc0b859e2326d3f8224c` was pushed to Main. The
  checkpoint contains the accumulated mobile corrections and Calendar preferences contract,
  implementation, and migration. Formal local API and Web were restarted and both returned HTTP 200.
- **Verification:** GitHub Actions CI run `36539030534` targeted that exact SHA. Both `verify` and
  `migration-dry-run` completed successfully. Remote Main resolved to the same SHA.
- **Known issue:** Stage 1 Product Owner acceptance and physical-phone/PWA checks remain open. The
  concurrent Today PWA visual experiment in LOG-309 also entered this commit before visual review.
- **Next:** Continue Product Owner-led mobile route and Today PWA review, then Calendar preferences
  review without marking M7.5 complete.

### 2026-09-29 — LOG-309 — First Today PWA visual experiment

- **Scope:** Product Owner requested a mobile-only trial of quieter Today card depth, edge-to-edge
  safe areas, and a bottom navigation whose active state uses lime icon and text without a tile.
- **Outcome:** Reduced the mobile Today schedule shadow, made the mobile navigation a solid dark
  surface with equal-size icons and a visible keyboard focus ring, added top safe-area spacing, and
  enabled `viewport-fit=cover`. Desktop CSS rules were not changed. Concurrent staging included
  these changes in commit `47370fe` before Product Owner review, contrary to the requested hold on
  Main delivery for this experiment.
- **Verification:** Targeted Prettier check and `git diff --check` passed. Web production build passed
  after a sandbox `spawn EPERM` retry. Authenticated Chrome 390×844 preview visually showed the
  Today schedule and four-item bottom navigation; no physical-device safe-area check was run.
- **Known issue:** Product Owner visual acceptance is pending. The concurrent checkpoint commit
  already contains the experiment; this log makes no independent remote CI claim.
- **Next:** Review the Today preview with the Product Owner, verify an installed PWA on a phone,
  then revise the mobile direction without extending unaccepted styling to other routes.

### 2026-09-29 — LOG-308 — Mobile and Calendar Main checkpoint preflight

- **Scope:** Product Owner authorized pushing the current mobile corrections and Calendar preferences
  implementation to Main as an early review checkpoint.
- **Outcome:** Preserved the M7.5 Stage 1 review boundary. This delivery includes the Calendar
  contract and migration plus the accumulated mobile route and dialog corrections.
- **Verification:** `npm ci` completed with zero vulnerabilities. Root `npm run check` passed Prettier,
  API typecheck and 124 tests, and Web typecheck and 233 tests. Root `npm run build` passed. Linked
  `npm run db:push:dry` reported up to date. Linked Supabase database lint and advisors completed
  without errors; the known Auth leaked-password and capability-link permissive-policy warnings
  remain. Main matched local HEAD before the checkpoint push.
- **Known issue:** Remote exact-SHA CI, Product Owner Stage 1 acceptance, and physical-phone/PWA
  behavior remain unverified at this preflight point.
- **Next:** Push the authorized checkpoint, confirm exact-SHA `verify` and `migration-dry-run`, then
  resume Product Owner-led mobile and Calendar review.

### 2026-09-29 — LOG-307 — Tie mobile copy feedback to the current link

- **Scope:** Product Owner found that a newly reissued training-result link still displayed the
  previous link's copied message. Requested an icon-only success checkmark, no visible status row or
  reserved space, and a reset whenever the dialog is reopened.
- **Outcome:** Copy feedback is associated with the exact URL that was copied. A new token therefore
  starts with the copy icon even if the prior link was copied; closing and reopening also resets the
  state. On mobile, successful copy replaces the icon with a checkmark, while the live status remains
  visually hidden for assistive technology. Copy failure shows a red error icon and accessible name.
  The desktop copy button and visible feedback remain as before.
- **Verification:** The focused capability-link test covers copy success, close/reopen reset, and
  reissue reset (1 file/1 test passed). Authenticated Chrome 390×844 preview showed the initial copy
  icon, a checkmark after copying, and the copy icon again after closing and reopening. The mobile
  link card measured 116.6px before and after success, without a visible status row. Web typecheck,
  production build, changed-file Prettier, and `git diff --check` passed.
- **Known issue:** Physical-phone/PWA behavior remains unverified. The browser check did not reissue
  or revoke the preserved development link. This local correction has no commit, push, or remote CI.
- **Next:** Continue Product Owner-led mobile route review, then Calendar preferences review.

### 2026-09-29 — LOG-306 — Refine the two mobile capability-link dialogs

- **Scope:** Product Owner marked the reschedule and training-result link dialogs for narrow mobile
  corrections: pair metadata fields, put an icon-only copy action beside the URL, remove the white
  action strip, match baseline bottom spacing, reserve copy-feedback space, and keep reissue actions
  visible and centered. The shared dialog rules and desktop presentation remain in place.
- **Outcome:** Mobile metadata uses a smaller status column and wider detail column; training-result
  expiry occupies the next full row. The URL has a 48px copy-icon action with an accessible name.
  Copy feedback reserves two text lines before it appears. The footer uses the dialog paper color,
  full-width paired actions or one full-width action after revocation, and the baseline 28px
  button-to-dialog-bottom spacing. Confirmation actions align their text centrally, and the mobile
  backdrop ends above the 68px bottom navigation.
- **Verification:** Authenticated Chrome 390×844 preview inspected an active training-result link,
  a revoked reschedule link, and both reissue-confirmation layouts without issuing or revoking a
  link. The reschedule metadata columns measured 119px/212px and its date fit on one line; its sole
  action was 50px tall with a 28px bottom gap and clear of the 68px navigation. Copy feedback
  occupied 32px before and after success, with the link card remaining 158.6px tall. The two
  confirmation buttons computed `justify-content: center` and were fully visible. Web typecheck,
  focused capability-link test, production build, changed-file Prettier, and `git diff --check`
  passed. Vite test/build needed the approved Windows process-permission retry after sandbox
  `spawn EPERM`.
- **Known issue:** Physical-phone/PWA behavior remains unverified; other mobile dialogs remain in
  Product Owner review. These corrections remain local; no commit, push, or remote CI is claimed.
- **Next:** Continue the Product Owner's mobile route-by-route sweep, then review Calendar preferences.

### 2026-09-29 — LOG-305 — Set mobile dialog basic actions to 90×50

- **Scope:** Product Owner refined the shared mobile dialog action size to 90×50px without changing
  its text size; the cropped reference image measured 98×58px, and the final requested size was
  90×50px.
- **Outcome:** Delete, Cancel, Save, Add, and General/Confirm action buttons in shared mobile dialog
  footers use a 90px flex basis and 50px minimum height. The existing one-row shrink behavior and
  desktop action rules remain unchanged.
- **Verification:** Authenticated Chrome at 390×844 measured Delete/Cancel/Save as 90×50px with
  14px text on one line and document width equal to 390px. At 320×844, fixed-Series
  Delete/Cancel/Save each measured about 84×50px on one line; the footer remained visible and
  document width equaled 320px. Changed-file Prettier, Web production build, and `git diff --check`
  passed. No new test was needed for this scoped CSS dimension change.
- **Known issue:** Other mobile dialogs and physical-phone/PWA behavior remain for route-by-route
  review. Changes remain local; no commit, push, or remote CI is claimed.
- **Next:** Continue the mobile route-by-route review from the Next handoff.

### 2026-09-29 — LOG-304 — Make mobile choice scrollbars a reusable rule

- **Scope:** Product Owner clarified that the olive mobile scrollbar should be a common dropdown and
  option-panel standard, rather than a list of current component selectors.
- **Outcome:** The mobile CSS rule now targets semantic `[role='listbox']` automatically, including
  portaled `FormSelect` menus and equipment suggestions. Choice panels without listbox semantics use
  the reusable `ui-choice-scroll` class; the date calendar and Training exercise-picker results opt
  in. Their visual scrollbar width/color/arrow rules are defined once, while desktop styling and
  choice behavior remain unchanged.
- **Verification:** Authenticated Chrome 390×844 preview reopened 新增學生 → 年齡區間 and measured the
  semantic listbox scrollbar at 4px with the existing `rgb(169, 177, 139)` olive thumb; the menu
  retained scroll height 328px and client height 246px. Web build, changed-file Prettier, and
  `git diff --check` passed. No separate unit test was added for this mobile CSS consolidation.
- **Known issue:** Physical-phone/PWA rendering and unvisited option panels remain for route-by-route
  review. Changes remain local; no commit, push, or remote CI is claimed.
- **Next:** Continue the mobile route-by-route review from the Next handoff.

### 2026-09-29 — LOG-303 — Apply olive mobile scrollbars to choice menus

- **Scope:** Product Owner requested the new mobile internal-scrollbar standard for dropdowns and
  other option lists while retaining the existing olive-green thumb color.
- **Outcome:** Mobile `FormSelect` portal menus, equipment suggestions, date calendars, and picker
  results use a thin olive scrollbar against a transparent track without end arrows. Dropdown and
  suggestion lists use their existing right padding for the track rather than reducing option width.
  Desktop selectors and choice behavior remain unchanged.
- **Verification:** Authenticated Chrome 390×844 preview of 新增學生 → 年齡區間 measured the menu's
  border-plus-scrollbar width falling from 21px to 5px (about 3px of scrollbar); the first option's
  right edge gained about 18px. The scrollbar appeared at the menu edge in olive green without arrows.
  Wheeling over an option scrolled the menu through its 82px range and kept 未設定 selected; the menu
  was returned to its starting position. CSS Prettier, Web build, and changed-file `git diff --check`
  passed. No new test was needed for the scoped visual CSS change.
- **Known issue:** Other option surfaces and physical-phone/PWA rendering remain for route-by-route
  review. Changes remain local; no commit, push, or remote CI is claimed.
- **Next:** Continue the mobile route-by-route review from the Next handoff.

### 2026-09-29 — LOG-302 — Slim mobile internal scrollbars and repair Course History wheel

- **Scope:** Product Owner requested that mobile interface scrollbars use edge space instead of
  reserving content width, with slimmer and lighter thumbs and inconspicuous end controls. Course
  History also failed to respond to the wheel over its rows.
- **Outcome:** Shared mobile dialog scrollers extend 12px into the right inset while their content
  stays aligned with the fixed header. Internal scrollbars use a 4px transparent track, pale thumb,
  and no arrow buttons in Chrome; Firefox retains its thin scrollbar. Mobile Course History, purchase
  history, and Venue course records now let the outer dialog pane own scrolling rather than nesting
  an unscrollable child that traps wheel events. The trajectory history scrollbar moves into its
  surrounding inset. Calendar timeline, Finance ledger rows, and notification lists use the same
  mobile scrollbar appearance without changing desktop rules.
- **Verification:** Authenticated Chrome 390×844 preview reproduced Course History wheel failure:
  its inner list had 2038px client and scroll height, while its outer pane had 707px client and
  2058px scroll height. After the change, wheeling over a course row moved the outer pane from
  scrollTop 1142.5 to 0; the Chrome scrollbar measured about 3px wide and the course-row right
  edge aligned within 1px of the header right edge. Fixed-Series editing kept its fields and footer
  aligned; trajectory history scrolled 17.5px over its records with a 3px scrollbar near the edge.
  CSS Prettier, Web production build, and CSS `git diff --check` passed. The build's chunk-size
  advisory remains. No new unit test was added for this CSS/layout and browser-wheel correction.
- **Known issue:** Other mobile dialogs and physical-phone/PWA scrollbar rendering still await the
  Product Owner's route-by-route review. Changes remain local; no commit, push, or remote CI is
  claimed.
- **Next:** Continue the mobile route-by-route review from the Next handoff.

### 2026-09-29 — LOG-301 — Match mobile dialog action-button sizes

- **Scope:** Product Owner found Cancel/Save too narrow beside Delete in fixed-Series editing, and
  Cancel too narrow beside Add in purchase creation. Requested equal standard sizing when space
  permits, with compression only on constrained screens.
- **Outcome:** The shared mobile Settings/edit-dialog action rule gives Delete, Cancel, Save, and Add
  a 96px basis and 56px minimum height. Flex shrink retains one row on narrower screens. Desktop
  sizes and wording remain under the existing rules.
- **Verification:** Authenticated Chrome review of fixed-Series editing measured all three actions
  at about 96×56 on a roomy mobile viewport and about 76px wide each at 320 CSS pixels. Purchase
  creation measured Cancel and Add at about 96×56 each. Both rows stayed aligned; the 320px check
  found document scroll width equal to viewport width. Prettier, Web build, and `git diff --check`
  passed after this CSS edit.
- **Known issue:** Physical-phone/PWA behavior and unvisited dialog variants remain for Product
  Owner review. Changes remain local; no commit, push, or remote CI is claimed.
- **Next:** Continue the mobile route-by-route review from the Next handoff.

### 2026-09-29 — LOG-300 — Keep mobile dialog actions visible and compact

- **Scope:** Product Owner extended the shared mobile Settings dialog rule to the bottom action row
  and requested compact mobile button labels, with Delete left and Cancel/Save right on one row.
- **Outcome:** Mobile dialog content retains its own vertical scroller while shared action rows and
  button footers stick to its bottom. The fixed-Series editor shows one-line Delete/Cancel/Save;
  Calendar, Session, Exercise Library, Settings, Venue, purchase, and student edit actions use shorter
  mobile labels where the previous wording occupied extra width. Desktop wording remains available.
- **Verification:** Authenticated desktop browser preview at 390×844 and a shorter mobile viewport
  showed the fixed-Series action row and title staying in place as content scrolled; the short viewport
  measured content scroll 28/29px with the header and footer boundaries fixed. Exercise Library
  creation displayed a fixed Cancel/Add footer without horizontal overflow. Web typecheck, production
  build, and complete Web test suite passed (54 files, 233 tests); Prettier and `git diff --check`
  passed. Vite tests/build required the approved Windows process permission path after sandbox
  `spawn EPERM`.
- **Known issue:** Physical-phone/PWA behavior and unvisited dialog variants remain for the Product
  Owner's mobile sweep. This is local work; no commit, push, or remote CI is claimed. The existing
  Calendar preferences package still awaits acceptance.
- **Next:** Continue the mobile dialog and route-by-route review from the Next handoff, then review
  Calendar preferences.

### 2026-09-29 — LOG-299 — Keep mobile Settings dialog headers visible and remove horizontal scroll

- **Scope:** Product Owner requested a reusable mobile rule for Settings and edit dialogs: persistent
  title and close action, a distinct header divider, and content-only vertical scrolling. Follow-up
  screenshot showed an unwanted horizontal scrollbar in the Exercise Library editor.
- **Outcome:** Applied the mobile dialog layout to Exercise Library editing, Calendar scheduling,
  capability-link management, and Settings security/device operations. Fixed the editor footer's
  inherited negative margin that widened its scroll content; the shared mobile content rule now
  suppresses horizontal scrolling. Desktop layout remains under the existing rules.
- **Verification:** Web typecheck and focused Exercise/Calendar tests passed (3 files, 11 tests).
  Prettier check and `git diff --check` passed. Web production build passed after a Windows sandbox
  `spawn EPERM` retry with normal process permissions (existing large-chunk advisory). In the
  authenticated 390×844 desktop preview, scrolling the Exercise editor moved content from 0 to
  175px while header/close coordinates remained fixed; content `scrollWidth` equaled `clientWidth`
  at 331px. Device Cache dialog also showed equal scroll/client widths at 311px. No saved data
  was changed during browser checks.
- **Known issue:** Other dialog variants and physical-phone/PWA behavior remain to be reviewed.
  This correction is local; no commit, push, or remote CI is claimed. Calendar preferences remain
  locally implemented and await Product Owner acceptance.
- **Next:** Continue the mobile route-by-route review, checking each newly reported Settings or
  edit dialog against the shared rule, then review Calendar preferences.

### 2026-09-29 — LOG-298 — Add Calendar display and lesson defaults to Settings

- **Scope:** Product Owner requested configurable Calendar start/end hours, Monday/Sunday week
  start, and default lesson duration. Product Owner selected 30/45/60/90/120-minute options with
  60 as the initial value and automatic display extension for existing lessons beyond chosen hours.
  The bounded Stage 1 behavior is frozen in `M7.5-CALENDAR-PREFERENCES-CONTRACT.md`.
- **Outcome:** Added four versioned Workspace preferences with database constraints and API
  validation. Settings → 工作偏好 saves selections immediately. Calendar week/month ranges and
  day/week timeline use them; existing sessions and blocks extend the timeline when needed, and
  availability shading stays within it. New Calendar sessions and Student fixed-series editors
  use the saved default duration. Existing scheduled instants and durations were not rewritten.
- **Verification:** Complete root check passed before the final HTTP schema/CSS follow-up (API
  26 files/124 tests; Web 54 files/232 tests). Focused post-follow-up API tests passed 2 files/14
  tests and Web Calendar tests passed 2 files/14 tests, including an out-of-hours lesson regression.
  Final root build passed with the existing
  large-chunk advisory. Linked development migration `20260928194356` applied, schema query
  confirmed all four non-null defaults, and linked dry-run is up to date. Security advisor showed
  only the existing Auth leaked-password-protection advisory. Authenticated desktop browser
  confirmed Sunday-first week, 120-minute 09:00–11:00 new-course draft, and visibility of an
  18:00 lesson with display end set to 16:00. Exact 390×844 desktop preview showed usable setting
  rows and an open custom selector without horizontal overflow. The review account preferences
  were restored to 06:00–22:00, Monday, and 60 minutes. This is a desktop responsive preview,
  not physical-phone evidence.
- **Known issue:** Product Owner acceptance is pending. M7 Demo import still warns about skipped
  calendar-hour fields under its completed contract; this Settings correction does not revise
  historical import behavior. No commit, push, or remote CI is claimed for this local Stage 1 work.
- **Next:** Product Owner reviews Calendar preferences and the remaining Settings category
  decisions, then resumes the mobile route review from the Next handoff.

### 2026-09-29 — LOG-297 — Mobile Auth Stage 1 Main checkpoint preflight

- **Scope:** Product Owner accepted the current mobile Auth presentation for now, paused the wider
  mobile sweep until tomorrow, and explicitly requested an early Main checkpoint.
- **Outcome:** Preserve the two-level mobile entrance, centered actions, existing desktop layout,
  and framed Google OAuth top-level handoff as the checkpoint scope. Stage 1 remains open; the next
  review item comes from the Product Owner's next mobile screen report.
- **Verification:** Complete root `npm run check` passed (API 26 files/123 tests; Web 54 files/231
  tests), root `npm run build` passed with the existing Web chunk-size advisory, linked
  `npm run db:push:dry` reported up-to-date with no migrations, and `git diff --check` passed.
  The Git branch and fetched `origin/main` matched before delivery. Browser acceptance in
  LOG-290–296 covers the 390×844 Auth paths and top-level Google sign-in page; account credentials
  and physical-phone acceptance remain unverified.
- **Delivery:** Commit `b8e0e8cc5e2e0c2c4bf2dc534ad1fce62d5cd150` reached `origin/main`;
  GitHub Actions CI run `36470778656` completed successfully for that exact SHA, with both `verify`
  and `migration-dry-run` green. The following Status-only commit records this evidence.
- **Next:** Resume Product Owner-led mobile review on the next reported screen.

### 2026-09-29 — LOG-296 — Center the mobile Auth form action label

- **Scope:** Product Owner requested centered 繼續 text on both the mobile account-creation and
  sign-in forms while retaining the right-side arrow.
- **Outcome:** Scope the shared Auth primary-button alignment to the mobile breakpoint. The label
  is centered independently of the absolutely positioned arrow; desktop controls are untouched.
- **Verification:** In the live 390×844 preview, both form buttons measured text center x=195px
  equal to button center x=195px, with the arrow 20px from the right edge. Targeted CSS formatting
  and `git diff --check` passed. No physical-phone or remote CI claim.
- **Next:** Product Owner continues the mobile Auth and route sweep.

### 2026-09-29 — LOG-295 — Lower the mobile Auth value statement

- **Scope:** Product Owner approved the new logo size and position but preferred the value statement
  lower, close to the 建立帳號 action rather than visually grouped with the logo.
- **Outcome:** Keep the mobile logo at its existing 264px and y-position. Let the statement settle at
  the bottom of the story with 36px separation from the first CTA. Button placement, forms, OAuth,
  and desktop presentation are unchanged.
- **Verification:** Live 390×844 preview retained logo y=246–334 and button y=664–800, moved the
  statement group to y=538–628, and had no internal scroll. A 390×667 viewport also showed no
  overlap or scroll. Targeted CSS formatting and `git diff --check` passed. Physical-phone review
  and remote CI are not claimed.
- **Next:** Product Owner reviews the actual phone/PWA Auth viewport, then continues the mobile
  route sweep and pending Google icon/input-hint polish.

### 2026-09-29 — LOG-294 — Rebalance mobile Auth entrance and release framed Google OAuth

- **Scope:** Product Owner requested a smaller logo, a higher and tighter Logo/value group, bottom
  anchored actions with more separation, and correction of a Google 403 seen inside the mobile
  preview. Desktop Google login was reported working.
- **Outcome:** At the mobile breakpoint, reduce the full logo to 264px at 390px, center the story
  group, remove the slogan's bottom-pushing auto margin, and set a 20px action gap with 44px plus
  safe-area bottom space. When the app is embedded in the mobile preview, request the Supabase
  OAuth URL without automatic frame navigation and open it in the top-level window. Handle an
  OAuth startup error in the form. Ordinary top-level Google flow remains unchanged.
- **Verification:** Regression test failed before the OAuth handoff and passed after. Live 390×844
  preview measured logo y=246–334, slogan group y=364–454, action group y=664–800, no internal
  scroll, and the one-line value statement. Clicking Google from that preview reached the
  top-level Google account sign-in page rather than an iframe 403; no account credentials were
  entered. Web check passed (54 files, 231 tests), production build passed with its existing
  large-chunk advisory, and `git diff --check` passed. Physical-phone and completed account
  sign-in are not claimed; no commit, push, or remote CI is claimed.
- **Next:** Product Owner reviews the actual phone/PWA Auth viewport and account sign-in, then
  continues the mobile route sweep and pending Google icon/input-hint polish.

### 2026-09-29 — LOG-293 — Align the mobile Auth welcome focal point

- **Scope:** Product Owner found the first welcome composition visually divided by a duplicate
  icon, mixed alignment, an abrupt black/cream boundary, excessive space, an awkward headline
  wrap, and left-biased primary CTA text. Keep the working second-level forms intact.
- **Outcome:** Remove the duplicate square F icon, use one enlarged full FORM logo near the
  upper center, and give the welcome view a continuous black background. Center the Coach
  statement and both action labels, keep the value sentence on one line at 390px, and use
  brand lime for 建立帳號 with a white-outlined 登入 action. The signup arrow remains right-aligned
  independently of its centered label. Desktop layout and form behavior are unchanged.
- **Verification:** Live 390×844 browser preview checked the logo position, single-line
  statement, centered CTA label, and visible two-button stack. Web typecheck, focused Auth tests
  (3/3), production build, targeted Prettier, and `git diff --check` passed; the existing
  large-chunk advisory remains. Physical-phone interaction and remote CI are not claimed.
- **Next:** Product Owner mobile entrance review, then the noted Google icon/input-hint form
  polish and remaining mobile route sweep.

### 2026-09-29 — LOG-292 — Split mobile Auth into introduction and action

- **Scope:** Product Owner requested progressive disclosure for the mobile entrance: a clean
  first view for brand/value and 建立帳號／登入, then the corresponding Auth form only after a
  deliberate choice. Keep the desktop Auth route unchanged.
- **Outcome:** Add a mobile-only welcome view using FORM's existing icon, Coach-focused copy,
  and two clear actions. Component state opens sign-in or sign-up in place. The short brand header
  and one return action serve the form layer; recovery and verification keep their existing Auth
  behavior. Add visible keyboard focus and reduced-motion-compatible transition styling.
- **Verification:** Live 390×844 browser preview showed the field-free welcome view, both entry
  actions within the app viewport, login form, return to welcome, and direct sign-up form. A
  desktop browser view retained its existing split hero/form hierarchy. Focused Web Auth tests
  passed 3/3, Web typecheck and production build passed, with the existing large-chunk advisory.
  This is responsive browser evidence, not a physical-device claim. No push or remote CI is claimed.
- **Next:** obtain Product Owner mobile Auth acceptance, then continue the mobile route sweep.

### 2026-09-29 — LOG-291 — Give the mobile Auth entrance a product identity

- **Scope:** Product Owner accepted the compact mobile sign-in controls but found the entrance
  too anonymous for a first impression. Add a clear product introduction without restoring the
  earlier oversized desktop marketing hero.
- **Outcome:** The mobile sign-in brand section identifies FORM as a private Coach workspace,
  presents "每一堂課，都有跡可循。", and names Student, Course, and Training records. The introduction
  appears on sign-in only; sign-up, verification, and reset retain the shorter brand header.
  Desktop Auth presentation and authentication behavior are unchanged.
- **Verification:** Web typecheck, production build, targeted Prettier, and `git diff --check`
  passed; the existing large-chunk build advisory remains. The live 390×844 responsive preview
  showed the introduction above the complete sign-in action stack, then the compact sign-up form
  after switching modes. This is not a physical-device claim. No push or remote CI is claimed.
- **Next:** obtain Product Owner mobile sign-in acceptance, then continue the mobile route sweep.

### 2026-09-29 — LOG-290 — Compact the mobile Auth entry

- **Scope:** Product Owner began the final mobile route sweep and requested a clean, task-focused
  sign-in page inspired by the ease of a mobile PWA, without copying its composition. Limit the
  correction to the mobile breakpoint.
- **Outcome:** Replace the tall mobile marketing hero with a short brand header and bring the form
  directly below it. Tighten mobile form spacing, retain comfortable input and action sizes, and
  use 16px input text to avoid iOS focus zoom. Desktop Auth styles and authentication behavior are
  unchanged.
- **Verification:** Web typecheck and production build passed; the build retains the existing
  large-chunk advisory. The build needed the known elevated Windows path after sandbox `spawn
EPERM`. `git diff --check` passed. The live 390×844 mobile preview showed the sign-in fields,
  Google option, and account-creation entry within the app viewport; switching to reset and
  sign-up rendered their compact forms without horizontal overflow. This is a desktop browser
  responsive preview, not a physical-device claim. No push or remote CI is claimed.
- **Next:** obtain Product Owner mobile sign-in acceptance, then continue the mobile route review.

### 2026-09-29 — LOG-289 — Deliver Settings and Auth recovery checkpoint

- **Scope:** complete the Product Owner-authorized Main delivery after the local gates in LOG-288.
- **Outcome:** commit `c499e6b20dc1b4e08678d8ef52bb4be3d4c88563` reached `origin/main`.
  This checkpoint includes Settings, Auth recovery, currency preference, and approved M8 help scope;
  it does not close M7.5 Stage 1.
- **Verification:** remote `refs/heads/main` resolved to the exact commit. GitHub Actions run
  `36455086192` completed successfully for that SHA; both `verify` and `migration-dry-run` passed.
- **Next:** continue Product Owner Settings and Stage 1 review, including the open live password
  update/re-login path; do not enter Stage 2 or M8 implementation from this checkpoint.

### 2026-09-29 — LOG-288 — Settings and Auth recovery checkpoint preflight

- **Scope:** Product Owner authorized a quick CI gate and Main push for the current Settings,
  Auth recovery, finance-currency, and M8 help-scope changes.
- **Verification:** root `npm run check` passed after the Windows sandbox blocked Vitest child
  processes (API 26 files / 123 tests; Web 54 files / 229 tests). Root `npm run build` passed with
  the existing large-chunk advisory. Linked development migration dry-run reported up to date, and
  `git diff --check` passed. Remote Main matched local HEAD before delivery.
- **Boundary:** this is a review checkpoint. The password-update/sign-out/re-login browser path,
  Product Owner Settings review, and wider M7.5 Stage 1 acceptance remain open; it does not start
  Stage 2 or M8 implementation.
- **Next:** push this checkpoint, confirm exact-SHA GitHub Actions `verify` and
  `migration-dry-run`, then record remote evidence.

### 2026-09-29 — LOG-287 — Refine password recovery feedback in Settings

- **Scope:** reduce the prominence of the password dialog's forgotten-password action and connect
  the email-sent message to that action.
- **Outcome:** use smaller secondary typography; show a highlighted confirmation immediately below
  the action; use「密碼重設信已寄出，請查看電子郵件。」for this authenticated Settings flow.
- **Verification:** desktop browser confirmed the new type scale and nearby highlighted notice;
  exact 390 × 844 preview showed the password dialog fitting within the viewport. Web typecheck
  and production build passed. No new email or password change was needed for this copy/layout pass.
- **Next:** continue Product Owner review of the local Settings change before delivery.

### 2026-09-29 — LOG-286 — Keep password recovery in its intended Auth flow

- **Scope:** add the Settings password-forgotten entry, sign-out confirmation, and diagnose the
  reported reset-email navigation failure.
- **Outcome:** capture callback intent before Supabase consumes the URL; retain pending recovery
  across token refresh and reload; require the recovery event before offering password update;
  provide cancellation with local sign-out and an explicit invalid-link state. The sign-in and
  Settings reset requests share the current allowlisted origin.
- **Verification:** local Web regression reproduced the original event-order failure, then passed
  after the fix; Web format/typecheck and 54 files/229 tests plus production build passed.
  Desktop browser showed the new Settings controls. Development Auth logs confirmed
  the older email link's one-time token was invalid; a new email arrived in Gmail and its branded
  button opened the new-password form. Reload showed the invalid-link recovery entry instead of
  Today; cancel signed out locally. No password was changed in the live account.
- **Known issue:** the email template still contains both default English and branded content;
  fresh-link password-update/sign-out/re-login and exact 390×844 review remain open. The recovery
  Auth session is still a normal Supabase session at the API boundary; the Web gate is a UI safeguard.
- **Next:** finish the local checks and Product Owner Settings review before deciding on delivery.

### 2026-09-28 — LOG-285 — Align Settings save behavior and advanced panels

- **Scope:** The Product Owner identified the isolated Save button and misplaced success message, inconsistent Account/Security typography, inline password editing, and weak Device/Data presentation in the Settings review slice.
- **Outcome:** Coach display name now saves on blur or Enter; zone, training units, and finance currency save on selection. Workspace setting mutations are serialized against the latest cached version, so adjacent changes use current server state. Removed persistent success copy. Account/Security now uses the same two-column settings rows as the other categories; password editing opens a focused dialog. Device cache has a management dialog explaining local data and requiring explicit `CLEAR` before removal. Demo import remains collapsed and development-only.
- **Verification:** Root `npm run check` passed (API 26 files/123 tests; Web 53 files/227 tests), root `npm run build` passed with the existing Vite chunk-size advisory, and `git diff --check` passed. Browser review passed for desktop and exact 390×844: password dialog opened, Escape closed and returned focus; mobile dialog fit the 390px viewport without horizontal overflow. Time-zone selection saved and was restored to `Asia/Taipei`.
- **Known issue:** Product Owner review of the revised Settings layout and Device/Data scope is pending. No push or remote CI is claimed.
- **Next:** Obtain Product Owner Settings acceptance, then resume the preserved M7.5 Stage 1 acceptance without entering Stage 2 or M8.

### 2026-09-28 — LOG-284 — Settings category review implementation

- **Scope:** The Product Owner authorized a first Settings-page implementation using category navigation and setting rows, following the supplied visual reference and the prior Settings discussion.
- **Outcome:** Replaced the scattered panels with four focused categories and responsive row layouts. Work time zone is a city-labelled IANA dropdown with common zones first and supported zones available. The default finance currency now belongs to Workspace settings in the API and development database, and purchase, Venue, and ledger entry forms consume it. Existing training, account, and deletion operations remain in their owning categories. Demo import is folded under development-only tools; device cache clearing has an explicit confirmation.
- **Verification:** Root `npm run check` passed (API 26 files/123 tests; Web 53 files/227 tests); root `npm run build` passed with the existing Vite chunk-size advisory. Migration `20260928141736` was applied to the linked development database and subsequent `npm run db:push:dry` reported up to date. Browser review passed on desktop and exact 390×844 without observed horizontal overflow; changing currency to USD survived reload and was restored to TWD. `git diff --check` passed. No push or remote CI is claimed.
- **Known issue:** Product Owner visual and wording acceptance is pending. Calendar defaults, language selection, data export/privacy controls, and subscription flows were not implemented in this review slice.
- **Next:** Have the Product Owner review Settings, then continue the existing M7.5 Stage 1 Student/Venue/Finance and public-page acceptance before any wider milestone transition.

### 2026-09-28 — LOG-283 — Add Beta help and feedback scope

- **Scope:** The Product Owner asked to schedule 「取得協助／回報問題／意見回饋」 and to choose whether it belongs before or after deployment.
- **Outcome:** M8 now requires a Beta-ready path for all three intents before real-Coach Beta use. Its Contract will choose the entry points, channel, ownership, response expectations, and privacy handling; Sol will verify discoverability and the selected paths on desktop and mobile. No support system or product setting was implemented, and M9 subscription/payment scope is unchanged.
- **Verification:** Roadmap and Status were reviewed together; targeted Prettier check and `git diff --check` passed. No application, browser, deployment, or CI evidence is claimed.
- **Next:** Continue the current M7.5 Stage 1 Product Owner review and preserved acceptance. M8 begins only after M7.5 completion and Product Owner authorization.

### 2026-09-28 — LOG-282 — Deliver Student roster and purchase-history checkpoint

- **Scope:** Complete the Product Owner-authorized Main delivery for the Student balance denominator and purchase-history corrections after the full preflight in LOG-281.
- **Outcome:** Commit `894a60a2ec50f2076bdbdcf6417fadcab29e705e` reached `origin/main`. This is an M7.5 Stage 1 checkpoint; Product Owner review and wider Venue/Finance acceptance remain open.
- **Verification:** Remote `refs/heads/main` resolved to the exact commit. GitHub Actions run `36420917850` completed successfully for that SHA; both `verify` and `migration-dry-run` jobs succeeded. The push's credential-cache socket message did not affect the confirmed remote ref. After `npm ci`, the formal API and Web dev services were restored and returned HTTP 200 on `/health` and `/`; Demo on port 5174 stayed available.
- **Known issue:** The five-purchase complete-history dialog has isolated selection coverage but still needs live browser acceptance with more than four purchases; no preserved development purchase data was modified.
- **Next:** Continue Product Owner review of the Student roster and purchase-history cards, then the preserved Venue/Finance, Capability Link, and public-page Stage 1 flows. Do not infer Stage 2 or M8 authorization.

### 2026-09-28 — LOG-281 — Student roster and purchase-history delivery preflight

- **Scope:** The Product Owner authorized full CI and a Main push if clean for the local Student roster denominator and purchase-history corrections in LOG-279–280. Add an isolated five-purchase selection check without changing preserved development review data.
- **Outcome:** The five-purchase Web test verifies four visible records, all five available in complete history, and the more-entry threshold. The changes are ready for the authorized Stage 1 Main checkpoint; wider M7.5 acceptance stays open.
- **Verification:** `npm ci` passed after stopping only the formal Web Vite process that held `esbuild.exe`; Demo at 5174 remained running. The standard root `npm run check` passed on its final run (API 26 files/123 tests, Web 53 files/227 tests), and root `npm run build` passed with the existing Vite chunk-size advisory. Linked development `npm run db:push:dry` is up to date with no migrations pending; `app_private` lint found no errors; advisors found only the existing leaked-password-protection and Capability Link permissive-policy warnings. `git diff --check` passed. Local `HEAD` and remote `refs/heads/main` both resolved to `5ed5881464fcbca1e81faf5b0f576ba9fa3567c6` before delivery. A first root check had two 5-second API test timeouts under load; the complete API suite passed with two workers, then the standard root check passed without source changes.
- **Known issue:** The five-row dialog has isolated selection coverage but no live browser fixture. M7.5 Stage 1 Product Owner review remains open; this preflight is not remote CI evidence.
- **Next:** Commit and push the scoped Student corrections, confirm exact remote SHA and both Actions jobs, then resume preserved Stage 1 review.

### 2026-09-28 — LOG-280 — Bound Student purchase history to four newest rows

- **Scope:** Apply the Product Owner's Student detail purchase-history rule: newest purchases first, four rows at most on the page, and a `查看更多` entry to the complete list when more exist. Follow the existing Course Record dialog interaction and preserve purchase edit/delete actions.
- **Outcome:** Web sorts the detail projection by purchase date with deterministic ties, renders the latest four in the page card, and reuses the same purchase rows in a scrollable complete-history dialog. No API, schema, or purchase data changed in this correction; the preceding roster projection correction remains in the worktree.
- **Verification:** Web format/typecheck and 53 files/226 tests passed; Web production build passed with the existing chunk-size advisory; `git diff --check` passed. The authenticated development browser showed the preserved three-purchase Student in `9/28 → 7/1 → 3/11` order, and the card fit at desktop and exact 390×844. The >4-row dialog condition was checked in code but was not exercised with live data because the preserved review Student has only three purchases.
- **Known issue:** Stage 1 Product Owner review remains open; no commit, push, remote CI, or five-row live browser acceptance is claimed.
- **Next:** Review Student purchase history and roster with the Product Owner, then continue the pending Venue/Finance, Capability Link, and public-page Stage 1 acceptance.

### 2026-09-28 — LOG-279 — Show latest purchase count in Student roster balance cards

- **Scope:** Apply the Product Owner's Student roster rule: total remaining lessons over the latest dated Lesson Purchase count, with a full track when the numerator is at least the denominator. Keep the card compact without explanatory text.
- **Outcome:** The Workspace-scoped roster projection now includes the latest purchase count, ordered by purchase date with deterministic ties. The card retains the server-derived total remaining count, uses the latest count as denominator, and caps only the visual track at 100%. No schema, purchase record, or underlying entitlement calculation changed.
- **Verification:** Elevated root `npm run check` passed (API 26 files/123 tests; Web 53 files/225 tests); root build and `git diff --check` passed. The authenticated development browser loaded all six roster cards and showed the reported first Student as `1/8`, with the other latest-purchase denominators populated. The initial sandbox check hit Windows `spawn EPERM`; the elevated rerun passed.
- **Known issue:** This is a local Stage 1 correction; no commit, push, remote CI, or full Venue/Finance acceptance is claimed. The existing Vite bundle-size advisory remains.
- **Next:** Continue Product Owner review of the Student roster and the preserved Stage 1 Venue/Finance, Capability Link, and public-page flows.

### 2026-09-28 — LOG-278 — Stage 1 public and Venue checkpoint delivered

- **Scope:** Deliver the Product Owner-authorized Stage 1 checkpoint after the complete local preflight in LOG-277.
- **Outcome:** Commit `2359c67e8a413ade8a1b9cb22512ce5c7329e538` reached `origin/main`. M7.5 Stage 1 remains open for Product Owner review and wider Venue/Finance browser acceptance.
- **Verification:** Remote `refs/heads/main` resolved to the exact commit. GitHub Actions run `36415220894` completed successfully for that SHA; both `verify` and `migration-dry-run` jobs succeeded. The push emitted a non-blocking credential-cache socket message, while the remote ref and Actions evidence confirmed delivery.
- **Known issue:** An older active Capability Link whose raw URL was discarded remains unrecoverable; current-tab retention applies to newly issued links. The remaining Stage 1 browser acceptance is still open.
- **Next:** Continue Product Owner review of the corrected Capability Link, public pages, and Venue dialogs; then complete the preserved Venue/Finance Stage 1 acceptance without entering Stage 2 or M8.

### 2026-09-28 — LOG-277 — Stage 1 public and Venue checkpoint preflight

- **Scope:** The Product Owner explicitly requested full CI and a Main push if clean for the current Stage 1 Web corrections. This checkpoint includes the Capability Link, public pages and result image, Calendar quick action, Exercise card actions, RPE surface, and Venue/prepaid form layout already recorded in LOG-266–276.
- **Outcome:** The changes remain a bounded Stage 1 checkpoint; wider Venue/Finance browser acceptance and M7.5 completion remain open. No schema or API source changed.
- **Verification:** Elevated root `npm run check` passed (API 26 files/122 tests; Web 53 files/224 tests), root production build passed with the existing Vite chunk-size advisory, and `git diff --check` passed. Linked development migration dry-run is up to date; `app_private` lint found no schema errors. Advisors returned the accepted development leaked-password-protection warning and existing Capability Link permissive-policy performance warnings, with no errors. The initial sandbox check was blocked by Windows `spawn EPERM`; the elevated rerun passed. Remote Main matched local `ea92b194` before delivery.
- **Known issue:** The previously issued active link whose raw URL was discarded remains unrecoverable from its digest-only server record. Product Owner review and wider M7.5 Stage 1 acceptance remain open.
- **Next:** Commit and push this checkpoint, verify the exact remote SHA and both Actions jobs, then continue the preserved Stage 1 Product Owner review.

### 2026-09-28 — LOG-276 — Refine Capability Link copy field and explain older unrecoverable URLs

- **Scope:** The Product Owner asked to restore the light copy button and white URL field, stop automatic full-URL selection on input focus, and investigated another active Training Result link without a visible URL.
- **Outcome:** The copy action is light again, the URL input has a white surface and native caret/selection behavior, and the two-field reschedule status no longer reserves an empty third column. The missing Training Result URL was issued before the tab-retention correction; its original token was already discarded and the digest-only server record cannot reconstruct it. The existing grant was not reissued or revoked. The Product Owner then confirmed no further persistence redesign is needed if newly issued links remain available; the current behavior is scoped to the issuing browser tab.
- **Verification:** Focused Web regression was red on the old focus-select behavior, then passed after the edit. Web check passed 53 files/224 tests; Web production build passed with the existing chunk-size advisory. Status Prettier and `git diff --check` passed. No live link mutation, push, or remote CI claim is made.
- **Known issue:** The older active link can still be used by someone who has its URL, but the Coach dialog cannot reconstruct that exact URL. Product Owner review and wider M7.5 Stage 1 acceptance remain open.
- **Next:** Continue Product Owner review of the corrected share dialog and preserved public/Venue work, then resume Stage 1 Venue/Finance acceptance.

### 2026-09-28 — LOG-275 — Retain active sharing URLs across dialog close and page reload

- **Scope:** The Product Owner reported that an active Training Result link disappeared on reopening/reloading the share dialog, causing unnecessary reissue, and asked to remove the duplicate new-link notice.
- **Outcome:** The dialog keeps an issued URL in the current tab's `sessionStorage` under Coach, Session, and purpose scope, reconciles it with server metadata, and removes it on revocation, reissue, expiry, or Coach change/sign-out. Active links show a clear copy action; reissue has a separate confirmation and note-consent choice. Removed both the reload-recovery banner and the redundant new-link notice. This M7.5 correction deliberately changes the M6 browser-secret handling rule while preserving digest-only server storage and one active link per purpose.
- **Verification:** A red-before/green-after Web regression covers issue, close/reopen, full component remount, reissue, and revoke; a storage test covers scope, expiry, and Coach change. Web check passed 53 files/224 tests and Web production build passed with the existing chunk-size advisory; `git diff --check` passed. Authenticated Chrome inspected the pre-existing active-link state and confirmation layout before the final copy change. No live link was reissued or revoked for browser testing; no push or remote CI claim is made.
- **Known issue:** A link issued before this correction whose URL was already discarded cannot be recovered from server metadata. Stage 1 Venue/Finance acceptance and Product Owner review remain open.
- **Next:** Review the Capability Link secret-retention choice and corrected share dialog alongside the preserved public/Venue work, then resume Stage 1 Venue/Finance acceptance.

### 2026-09-28 — LOG-274 — Give Training Record RPE inputs a white surface

- **Scope:** Product Owner requested the RPE input background match the other Training Record numeric fields in white.
- **Outcome:** The direct RPE field now has a white background and a subtle border in normal and focused states; its centered numeric text remains unchanged. Other form fields retain their existing styles.
- **Verification:** Targeted CSS Prettier check and `git diff --check` passed. This focused CSS change was not browser checked; no commit, push, or remote CI claim is made.
- **Known issue:** Product Owner review and wider M7.5 Stage 1 Venue/Finance browser acceptance remain open.
- **Next:** Continue Product Owner review of the current local UI corrections, then resume Stage 1 Venue/Finance acceptance.

### 2026-09-28 — LOG-273 — Center Training Record RPE values

- **Scope:** Product Owner requested RPE numbers align centrally with the other Training Record measurements.
- **Outcome:** The direct set-row RPE input is centered in both current and legacy recording layouts. Measurement inputs and other form controls are unaffected.
- **Verification:** Targeted CSS Prettier check, Web production build, and `git diff --check` passed. The first sandboxed build hit Windows Vite `spawn EPERM`; the elevated rerun passed with the existing chunk-size advisory. No browser, commit, push, or remote CI claim is made for this small correction.
- **Known issue:** Product Owner review and wider M7.5 Stage 1 Venue/Finance browser acceptance remain open.
- **Next:** Continue Product Owner review of the current local UI corrections, then resume Stage 1 Venue/Finance acceptance.

### 2026-09-28 — LOG-272 — Finish prepaid Venue form grouping and salary hierarchy

- **Scope:** Apply the Product Owner's follow-up screenshots to prepaid registration/editing and the new Venue form.
- **Outcome:** Registration and editing now place lesson count, total, and unit reference price on one desktop row; the editing form omits its redundant amount summary. New Venue prepaid creation places the independent salary choice below the prepaid money row, and its salary state uses quieter, smaller text than the field heading. The mobile money layout remains two columns with the unit price below.
- **Verification:** Targeted Prettier, Web typecheck, focused Venue/money tests (2 files, 18 tests), production build, and `git diff --check` passed. Authenticated Chrome visually checked desktop new Venue, prepaid registration/editing, and exact 390×844 prepaid editing. The test/build runs used the approved elevated path for the known Windows Vite `spawn EPERM` restriction. No database change, commit, push, or remote CI claim is made.
- **Known issue:** Wider M7.5 Stage 1 Venue/Finance browser acceptance and Product Owner review remain open.
- **Next:** Continue Product Owner review of these Venue dialogs and the preserved public pages, then resume Stage 1 Venue/Finance acceptance.

### 2026-09-28 — LOG-271 — Refine Venue creation, expense, and prepaid forms

- **Scope:** Apply the Product Owner's six screenshot corrections to Venue creation, expense changes, and prepaid purchase editing without changing Venue accounting or persistence.
- **Outcome:** Renamed the expense dialog to 「變更場地支出」; grouped effective date/time and prepaid deduction date/time; placed deduction timing below the expense type; put 「場地供客」 before 「教練自帶客源」 in a two-column rate row. New Venue prepaid money fields use one desktop row for count, total, and unit price. The purchase summary shows all three values when complete and no incomplete 「輸入堂數」 hint.
- **Verification:** Targeted Prettier, Web typecheck, focused Venue/money tests (2 files, 17 tests), production build, and `git diff --check` passed. Authenticated Chrome visually checked desktop creation, source-based commission, prepaid creation, prepaid editing, and expense-change title; the 390×844 prepaid form retained readable stacked timing and two-column money inputs. Vitest/build required elevated reruns after sandbox `spawn EPERM`. No database change, commit, push, or remote CI claim is made.
- **Known issue:** M7.5 Stage 1 browser acceptance for the wider Venue/Finance workflows and Product Owner review remain open.
- **Next:** Continue Product Owner review of these Venue dialogs and the preserved public pages, then resume the Stage 1 Venue/Finance acceptance handoff.

### 2026-09-28 — LOG-270 — Move Calendar reschedule link beside schedule editing

- **Scope:** Product Owner requested 「建立改期連結」 on the same row as 「編輯安排」 in the Calendar course quick view, removing its former bottom row.
- **Outcome:** The scheduled course time card now groups the two actions at its right edge. The reschedule route remains `/sessions/:id?link=reschedule`, and narrow layouts keep both actions together on one row within the card.
- **Verification:** Targeted Prettier, Web typecheck, focused Calendar gesture tests (10/10), and `git diff --check` passed. Vitest required an elevated rerun after sandbox `spawn EPERM`. No local Web server was listening for browser acceptance; no commit, push, or remote CI claim is made.
- **Known issue:** The Product Owner's public-page and Venue/Finance Stage 1 acceptance remain open.
- **Next:** Continue Product Owner visual review, then resume the preserved Venue/Finance Stage 1 acceptance.

### 2026-09-28 — LOG-269 — Finish public-page background and portrait result export

- **Scope:** Apply the next Product Owner screenshot corrections to both Student-facing public pages and the downloaded result image during M7.5 Stage 1.
- **Outcome:** The full page background is black on result and reschedule links, with a readable light footer. The Result page removes the download-success line, softens SET labels, aligns every measurement column across rows on mobile, labels the note `教練筆記`, and restores its bottom spacing. The downloaded PNG now uses the official FORM logo, a composed portrait layout near phone screen proportions, numbered exercises and sets, aligned measurements, completion icons, and the Coach note.
- **Verification:** Live Chrome review covered desktop and exact 390×844 layouts for both pages, with no horizontal overflow. The downloaded 1080×1920 PNG was opened and visually inspected. At 390px, the first three set rows had identical x coordinates for all five columns. Web check passed (51 files, 221 tests), and production build passed with the existing chunk-size advisory. The initial sandbox test attempt hit the known Windows `spawn EPERM`; the approved rerun passed. No database change, push, or remote CI occurred.
- **Next:** Product Owner reviews the corrected public pages; continue the preserved M7.5 Stage 1 acceptance afterwards.

### 2026-09-28 — LOG-268 — Refine public pages from Product Owner screenshots

- **Scope:** Apply the Product Owner's four screenshot corrections to the local M7.5 Stage 1 public pages.
- **Outcome:** Both pages restore the official horizontal FORM logo against a black brandbar. Reschedule has a smaller page and confirmation title, tighter confirmation spacing, and distinct date/time groups with FORM-aligned button type. Training Result numbers visible exercises and sets from 1, spreads measurements into columns, adds completion or incomplete icons, places image download beside the Coach label, and tightens the note typography.
- **Verification:** Desktop and exact 390×844 live Chrome review of valid development links passed; both mobile pages had no horizontal overflow. The mobile confirmation dialog opened, cancelled, and returned focus to the selected slot. Web check passed (51 files, 221 tests), production build passed with the existing chunk-size advisory, and `git diff --check` passed. No public redemption, database change, push, or remote CI occurred.
- **Next:** Product Owner reviews the corrected public pages; continue the preserved M7.5 Stage 1 acceptance afterwards.

### 2026-09-28 — LOG-267 — Compact public result and reschedule pages

- **Scope:** Product Owner requested a Demo-led visual correction to the two Student-facing public pages within M7.5 Stage 1.
- **Outcome:** `/t/:token` now uses a narrow, light document with consistent type, compact exercise rows, restrained note styling, and a readable FORM wordmark. `/r/:token` uses the same card scale and shows one day of slots at a time through visible date choices. Existing public data, terminal states, image download, and final redemption confirmation remain intact.
- **Verification:** Web check passed (51 files, 221 tests), Web production build passed with the existing bundle-size advisory, and `git diff --check` passed. Live Chrome review used a valid development result/reschedule link on desktop and exact 390×844; both had no horizontal overflow. Date switching, confirmation dialog, cancel, and focus return worked. No redemption, database change, push, or remote CI was performed.
- **Next:** Product Owner reviews both compact public pages; continue the preserved M7.5 Stage 1 acceptance afterwards.

### 2026-09-28 — LOG-266 — Swap Exercise Library card actions

- **Scope:** Product Owner requested 「刪除」 on the left and 「編輯」 on the right of each Exercise Library card.
- **Outcome:** Reordered the two card buttons in the formal Web. Their existing icons, styles, disabled states, and click actions remain attached to the correct labels.
- **Verification:** Targeted Prettier check, Web typecheck, and `git diff --check` passed. No browser, commit, push, or remote CI claim is made for this focused layout correction.
- **Known issue:** The Product Owner's Venue/Finance Stage 1 acceptance remains open.
- **Next:** Continue Product Owner visual review, then resume the preserved Venue/Finance Stage 1 acceptance.

### 2026-09-28 — LOG-265 — Interactive-control and Settings checkpoint preflight

- **Scope:** The Product Owner paused the desktop-led Settings layout and shared option-control review and authorized CI plus a Main push if clean. This checkpoint includes the current Web control, owning-route, CSS, regression-test, and control-standard changes. Stage 1 Venue/Finance acceptance remains open.
- **Outcome:** The local preflight found no migration changes or pending linked migrations. The first sandboxed root check could not start Vitest workers (`spawn EPERM`); the approved elevated rerun completed normally.
- **Verification:** Elevated root `npm run check` passed formatting, API typecheck and 26 files/122 tests, and Web typecheck and 51 files/221 tests. Elevated root `npm run build` passed with the existing over-500-kB chunk advisory. Linked development `npm run db:push:dry` returned `upToDate: true` and no migrations; `git diff --check` passed. Code commit `c232364e1ab02390267b7b04293c81df98dffb48` reached `origin/main`; GitHub Actions run `36346891642` completed successfully with both `verify` and `migration-dry-run` green.
- **Next:** Leave the Product Owner's remaining Stage 1 review and acceptance open until review resumes.

### 2026-09-28 — LOG-264 — Keep the desktop sidebar fixed when a dialog opens

- **Scope:** Product Owner showed the desktop sidebar jumping upward when opening the permanent Student deletion confirmation near the bottom of the detail page.
- **Cause:** Shared dialog scroll lock set `overflow: hidden` on both `body` and `html`, creating a scroll container that made the sticky sidebar move with the already scrolled page.
- **Outcome:** Shared scroll lock now uses `overflow: clip`, retaining the locked background without changing the sidebar's sticky reference. The prior overflow values are restored when the final dialog closes, including nested dialogs.
- **Verification:** In an isolated authenticated Chrome tab, the bug reproduced before the change: opening the confirmation moved the sidebar upward. After the change, the sidebar stayed in place on opening, an attempted background scroll did not move the page, and Cancel restored the normal view. No data was deleted. A new regression test checks the clip lock and restoration; the nested-dialog test was updated. Web check passed (51 test files, 221 tests), production build passed with its existing chunk-size advisory, and `git diff --check` passed. No commit, push, or remote CI is claimed.
- **Next:** Continue Product Owner visual review, then resume the preserved Venue/Finance Stage 1 acceptance.

### 2026-09-28 — LOG-263 — Separate permanent-deletion input and actions; enable valid keyboard confirmation

- **Scope:** Product Owner reported that the 「永久刪除」 confirmation input and action buttons nearly touch, and requested a keyboard shortcut after `DELETE` is entered correctly.
- **Outcome:** Typed confirmations now leave 20px between the input and action row. After the exact word is present, Delete confirms directly from the input or elsewhere in the dialog; Enter is not a confirmation shortcut. Before the word is complete, Delete retains its normal text-editing behavior.
- **Verification:** After the Product Owner clarified the shortcut, Web check passed (51 test files, 220 tests), production build passed with its existing chunk-size advisory, and `git diff --check` passed. Regression coverage verifies that Enter does not confirm, Delete confirms from the input only after the exact word is present, and incomplete text cannot confirm. An isolated authenticated Chrome tab showed the 20px gap and the button enabling only after `DELETE`; it was cancelled without deleting data. No commit, push, or remote CI is claimed.
- **Next:** Continue Product Owner visual review, then resume the preserved Venue/Finance Stage 1 acceptance.

### 2026-09-28 — LOG-262 — Put new Finance direction and amount on one row

- **Scope:** Product Owner requested the 「新增明細」 direction choice and amount field share one row to reduce unused space.
- **Outcome:** The two controls now sit in a dedicated equal-width grid row. The existing direction selection, amount input, and management of existing entries retain their behavior; no other form layout changed.
- **Verification:** Web production build (including TypeScript), focused Finance interaction tests (3/3), targeted TSX/CSS/Status formatting checks, and `git diff --check` passed. Authenticated desktop Chrome inspection showed the two labeled controls aligned on one row, with the description and footer following below; no data was submitted. The build retained its existing chunk-size advisory. No commit, push, or remote CI is claimed.
- **Next:** Continue focused Product Owner visual review, then resume the preserved Venue/Finance Stage 1 acceptance.

### 2026-09-28 — LOG-261 — Replace olive dropdown selection with pale FORM lime

- **Scope:** Product Owner rejected the olive selected row shown in the 「新增學生」age-range menu and clarified that selected options may be softer than the main color but must remain visibly related to the FORM green.
- **Outcome:** The shared `OptionItem` selected and selected-active fills now mix `--lime` with white at 25% and 35%, replacing the desaturated olive values. Neutral Hover and the dark checkmark remain. [`WEB_CONTROL_STANDARDS.md`](WEB_CONTROL_STANDARDS.md) now specifies pale FORM lime rather than an arbitrary muted tint. All `FormSelect` menus share this change.
- **Verification:** The 390×844 browser preview showed the updated selected row and computed `color(srgb 0.947843 1 0.741961)` for selected-active. Web production build (including TypeScript), focused Prettier check, and `git diff --check` passed; the existing bundle-size advisory remains. No full test run, commit, push, or remote CI is claimed for this CSS-only correction.
- **Next:** Continue Product Owner visual review, then resume the preserved Venue/Finance Stage 1 acceptance.

### 2026-09-28 — LOG-260 — Align purchase form fields and actions

- **Scope:** Product Owner requested 「堂數／總金額／每堂參考價」 on one row in both purchase dialogs, removal of the calculation prompt, and standard lower-right Cancel/Save actions in 「編輯購課紀錄」.
- **Cause:** The purchase form flattened `PurchaseMoneyFields` into a two-column grid, placing the third field on a new row. The edit action container occupied only the form's first grid column and split its buttons with an older fractional grid.
- **Outcome:** The two purchase dialogs now place the three monetary fields in a dedicated equal-width row and hide their calculation prompt. The edit action container spans the form and aligns standard 48px actions at the lower right; its save label is 「儲存」. Other uses of `PurchaseMoneyFields` are unchanged.
- **Verification:** Web production build (including TypeScript), targeted TSX/CSS/Status Prettier checks, and `git diff --check` passed. In an isolated authenticated Chrome tab, both dialogs visibly showed the three fields on one row without the calculation prompt; the edit dialog showed standard-size 「取消／儲存」 actions at the lower right. The verification tab was closed without submitting purchase data. The build retained its existing chunk-size advisory. No commit, push, or remote CI is claimed.
- **Next:** Continue focused Product Owner visual review, then resume the preserved Venue/Finance Stage 1 acceptance.

### 2026-09-28 — LOG-259 — Align Student creation with profile editing and remove autofill suggestions

- **Scope:** Product Owner reported sluggish scrolling in 「新增學生」, wasted full-width fields, browser-generated black phone suggestions contrary to the global text-input rule, and a Student introduction placeholder too dark to distinguish from entered text.
- **Cause:** Student creation still used the older tall `.modal` with a 10px blurred backdrop, while profile editing used the compact `SchedulingDialog` and paired phone/age fields. The creation and editing text inputs did not disable browser autofill.
- **Outcome:** Student creation now uses the same profile dialog and form layout as 「編輯基本資料」. Phone and age share a row on desktop and stack on mobile; the shorter dialog no longer needs internal scrolling at the tested sizes. Removed blur from shared modal backdrops, including the public confirmation style, to avoid expensive backdrop repaint during dialog scrolling. Disabled browser-generated autofill suggestions on Coach workflow forms and standalone search/name inputs while preserving credential-field behavior. The Student introduction placeholder is slightly lighter. The global text-input rule is recorded in [`WEB_CONTROL_STANDARDS.md`](WEB_CONTROL_STANDARDS.md).
- **Verification:** Before the change, the desktop Student creation dialog had a blurred backdrop and 769px content inside a 627px scroll area. Afterward, the authenticated desktop dialog had no backdrop blur and `scrollHeight = clientHeight = 628px`; Chrome showed no black suggestion list when the phone field was focused. The 390×844 preview showed the compact field layout and no internal scroll (`scrollHeight = clientHeight = 689px`); its placeholder computed to `rgb(150, 154, 146)` versus entered text `rgb(21, 23, 17)`. Full Web format/type/test checks passed 51 files / 219 tests, production build and `git diff --check` passed; the existing bundle-size advisory remains. Physical-phone scroll performance has not been measured. No commit, push, or remote CI is claimed.
- **Next:** Continue focused Product Owner visual review, then resume the preserved Venue/Finance Stage 1 acceptance.

### 2026-09-28 — LOG-258 — Restore fixed-Series dialog title scale

- **Scope:** Product Owner questioned the smaller titles in 「建立固定課表」 and 「編輯固定課表」 and asked them to match the established setting-dialog typography.
- **Cause:** The dialog is rendered inside Student detail's `.student-schedule` section, so the section-wide 21px `h2` rule overrode the shared `.ui-settings-dialog > header h2` 28px rule.
- **Outcome:** Scoped the Student schedule heading rules to `.student-schedule-heading h2`. Both fixed-Series dialog titles now use the existing shared 28px title font and size; the section heading retains its 21px size. No shared dialog rule or other dialog was changed.
- **Verification:** Web production build (including TypeScript), targeted CSS Prettier check, and `git diff --check` passed. The build retained its existing chunk-size advisory. No browser visual check, commit, push, or remote CI is claimed.
- **Next:** Continue focused Product Owner visual review, then resume the preserved Venue/Finance Stage 1 acceptance.

### 2026-09-28 — LOG-257 — Remove Training add-set Hover change

- **Scope:** Product Owner showed that hovering over 「訓練紀錄」的「＋新增一組」 changed its light dashed appearance to a dark filled button and requested no Hover effect for this control only.
- **Outcome:** Removed the older local Hover tint and made the Training add-set Hover keep its normal text, border, and transparent background. Shared action-button rules and other controls are unchanged.
- **Verification:** Web production build (including TypeScript), targeted CSS Prettier check, and `git diff --check` passed. The build retained its existing chunk-size advisory. No browser visual check, commit, push, or remote CI is claimed.
- **Next:** Continue focused Product Owner visual review, then resume the preserved Venue/Finance Stage 1 acceptance.

### 2026-09-28 — LOG-256 — Align Session edit timing fields and Calendar preview actions

- **Scope:** Product Owner requested the Session 「變更課堂」 date/start/end layout match Calendar scheduling and course editing, an explanation for completed lessons with disabled controls, and the scheduled Calendar preview button order 「刪除／開啟課堂／完成上課」.
- **Outcome:** Session editing reuses the Calendar `scheduling-time-fields` grid and separator arrow; the existing date and time controls, disabled states, and save behavior remain. Completed sessions show 「課堂已完成，無法變更安排。」 below the dialog title. Scheduled Calendar preview actions render in the requested left-to-right order.
- **Verification:** Focused Session and Calendar interaction tests passed 14 / 14. Full Web format/type/test checks passed 51 files / 219 tests; production build passed with the existing chunk-size advisory. Authenticated desktop browser showed the three time fields on one row. In the 390×844 preview, the date occupied one row and start/end aligned side by side; the dialog bottom remained within the viewport. No commit, push, or remote CI is claimed.
- **Next:** Continue focused Product Owner visual review, then resume the preserved Venue/Finance Stage 1 acceptance.

### 2026-09-28 — LOG-255 — Keep mobile modal scrolling inside the dialog and shorten end-time fields

- **Scope:** Product Owner supplied a mobile recording showing the Calendar background moving while 「安排這個時段」 remained open, plus clipped duration text in create/edit end-time fields and redundant 「不填也可以」 in the Block note.
- **Cause:** The shared dialog behavior locked only `body`, and Calendar's capturing wheel listener still processed wheel events from its descendant dialog, collapsing the background header. `TimeSelect` reused its duration-bearing option label in the narrow trigger.
- **Outcome:** The shared, reference-counted scroll lock now covers both `html` and `body`, including the public reschedule confirmation. Calendar ignores header wheel gestures while a modal is open. The scheduling dialog contains its own overscroll. End-time triggers show only `HH:mm`; their menu options retain `HH:mm（時長）`. Removed the Block note placeholder while keeping 「備註（選填）」. The mobile-modal rule is recorded in [`WEB_CONTROL_STANDARDS.md`](WEB_CONTROL_STANDARDS.md).
- **Verification:** Focused regressions failed before the fixes for background header collapse, root scroll lock, trigger label, and redundant placeholder, then passed 13 / 13. Full Web format/type/test checks passed 51 files / 218 tests; production build passed with the existing chunk-size advisory. Authenticated 390×844 preview reproduced the background collapse before the fix; after a fresh reload, a wheel scroll inside the dialog moved only its form body (about 69px), while the Calendar stayed uncollapsed and root scroll remained 0, including at the form's end. The same preview showed `10:00` in the selected field and `10:00（1 小時）` in the menu, and no Block-note placeholder. No commit, push, or remote CI is claimed.
- **Next:** Continue focused Product Owner visual review, then resume the preserved Venue/Finance Stage 1 acceptance.

### 2026-09-28 — LOG-254 — Refine checkbox and fix nested dialog Hover inheritance

- **Scope:** Product Owner approved the new dialog close action but rejected the dark 18px checkbox and the unreadable `複製連結` Hover. The supplied checkbox markup is a visual reference, not an instruction to add Tailwind or animation.
- **Cause:** `.session-top-actions button:hover:not(:disabled)` matched every descendant button, including the Capability Link dialog nested under the Session toolbar. Its higher specificity overrode the general action's neutral Hover, producing the dark lime tinted background and low contrast shown in the screenshot.
- **Outcome:** Session toolbar button base, icon, responsive, and Hover rules now target direct child buttons only. The dialog copy action therefore retains the shared neutral Hover. Native semantic checkboxes now use a 24px square, FORM lime checked fill, and dark check, with a neutral surrounding row and no scale animation. The approved dialog close action is unchanged. [`WEB_CONTROL_STANDARDS.md`](WEB_CONTROL_STANDARDS.md) records these rules.
- **Verification:** Authenticated Chrome showed the new checked appearance in the Training Result dialog. Web format/type checks and all 51 files / 216 tests passed; production build and `git diff --check` passed, with the existing bundle-size advisory. The copy action's Hover cause and corrected selector were inspected in CSS; the existing live dialog did not reveal its one-time raw URL, so no link was reissued solely for a pointer screenshot. No commit, push, or remote CI is claimed.
- **Next:** Continue Product Owner visual review, then resume the preserved Venue/Finance Stage 1 acceptance.

### 2026-09-28 — LOG-253 — Normalize checkbox, Hover, and dialog close presentation

- **Scope:** Product Owner reported a bright-green checked field, an unreadable copy-action Hover, and inconsistent dialog close icons. The mobile Calendar close action was the visual reference.
- **Outcome:** The shared checkbox keeps its row and border neutral and shows a compact dark square with a white check. Shared option selection and Hover use restrained neutral tints; general/cancel button Hover retains dark text and action buttons no longer lift. Dialog close buttons now use a 24px `X` inside a transparent 44px target, including the two dialogs that previously rendered a text `×`. The durable presentation rules are in [`WEB_CONTROL_STANDARDS.md`](WEB_CONTROL_STANDARDS.md). No route data or API behavior changed.
- **Verification:** Web format/type checks, 51 files / 216 tests, production build, and `git diff --check` passed. Authenticated Chrome showed the Training Result checkbox and close icon on desktop; the existing 390×844 preview showed the Calendar dialog close icon. The production build retained its existing chunk-size advisory. The copy button's Hover was checked through the shared CSS rule, not a live pointer-hover capture. No commit, push, or remote CI is claimed.
- **Known issue:** Product Owner visual acceptance and the remaining Venue/Finance Stage 1 browser paths remain open.
- **Next:** Continue focused Product Owner visual review, then resume the preserved Venue/Finance Stage 1 acceptance.

### 2026-09-28 — LOG-252 — Align time and Venue field labels across embedded forms

- **Scope:** Product Owner identified low, cramped time labels in Finance and Calendar dialogs, and a Venue label whose typography differed from neighboring field labels. Check the corresponding Session edit form as well.
- **Outcome:** The shared `scheduling-time-field` now uses grid layout so its 8px label-to-control gap takes effect; the shared embedded-dialog title rule now includes `venue-choice-label`. This fixes both callers of `SchedulingTimeInput`, the Finance ledger time field, and Venue fields using `VenueNamePicker` without changing form state or API behavior.
- **Verification:** An authenticated browser measurement reproduced the 1px time-label gap against the date field's 8px and the Venue label at 13px/400. After the CSS correction, Finance Date/Time and Calendar Date/Start/End were aligned at 8px; Calendar and Session edit Venue labels measured 14px/700 with an 8px gap. Web format check, production build (including TypeScript), and `git diff --check` passed. The existing bundle-size advisory remains; no commit, push, or remote CI is claimed.
- **Known issue:** Product Owner visual acceptance across the remaining routes and Venue/Finance Stage 1 browser paths remains open.
- **Next:** Continue focused Product Owner visual review of interactive controls and embedded setting dialogs, then resume the preserved Venue/Finance Stage 1 acceptance.

### 2026-09-28 — LOG-251 — Restore full-day choices for Finance entry time

- **Scope:** Product Owner found that the 新增明細 time menu began at 06:00 and asked where that restriction came from.
- **Cause and outcome:** FinanceLedger had reused the Calendar-owned `SchedulingTimeInput`, whose default menu offers 06:00–23:00 for a Course Session start. The Finance ledger Contract requires a date and time but sets no such window. Finance now uses the shared `TimeSelect` for 00:00–23:45 quarter-hour choices while retaining its existing label and modified-field marker; Calendar scheduling behavior is unchanged.
- **Verification:** the Finance interaction regression failed first because 00:00 was absent from the menu, then passed after the fix with 00:00, 05:45, and 23:45 present and 00:15 selectable. Full Web format/type/test checks passed 51 files / 216 tests; production build and `git diff --check` passed. The build retained its existing chunk-size advisory. No browser, live-data, push, or remote CI result is claimed.
- **Next:** Product Owner continues the interactive-control and Venue/Finance visual review; preserve the remaining Stage 1 acceptance and Stage 2/M8 boundary.

### 2026-09-28 — LOG-250 — Standardize formal Web return choices

- **Scope:** Product Owner requested that all return-related option text in the formal Web read `返回`, including the Finance page link shown in the supplied screenshot.
- **Outcome:** Student detail, Venue, Finance, Session, Training error, Auth recovery, and Venue preview return controls now show `返回`; the Finance month selector's jump back to the current month uses the same text. Existing destinations and actions are unchanged. The Auth heading `回到工作台` and explanatory error sentence remain descriptive copy, not return choices. The archived Demo remains untouched.
- **Verification:** source-wide formal Web search found no remaining extended return-choice labels. Web Prettier and TypeScript checks passed; elevated Vitest passed 51 files / 216 tests; production build and `git diff --check` passed. The build retained its existing chunk-size advisory. The initial sandboxed Vitest attempt stopped at Vite startup with Windows `spawn EPERM`, before rerunning successfully. No browser acceptance, push, or remote CI is claimed for this focused copy correction.
- **Next:** Product Owner continues the interactive-control and Venue/Finance visual review; preserve the remaining Stage 1 acceptance and Stage 2/M8 boundary.

### 2026-09-28 — LOG-249 — Align embedded setting forms and common action buttons

- **Scope:** Product Owner supplied Calendar and Finance dialog examples with inconsistent field labels and Save/Cancel sizing, directed removal of visible shortcut hints, and requested consistent common action buttons across the Web.
- **Outcome:** Shared embedded setting-dialog typography now gives titles, field labels, control text, and gaps one scale; Calendar and Finance time values use the regular site font. Visible keyboard-shortcut hints were removed while dialog keyboard behavior remains. Save/Confirm/Change, Cancel, Delete, Add, and general actions now use semantic button styles for 14px/700 text, 48px minimum height, fixed colors, and matching corners; remaining Settings, Demo import, exercise, public sharing, and Training add controls were aligned. The exercise tag Add button is more legible while disabled. Business mutations and API calls were not changed.
- **Verification:** Web format/type/test checks passed 51 files / 216 tests before the final class-only alignment; the subsequent production build (including TypeScript), final format check, and `git diff --check` passed. The build retained its existing chunk-size advisory. Browser checks compared Calendar and Finance dialogs on desktop and 390×844, confirming equal Save/Cancel typography and height, consistent labels and titles, hidden shortcut hints, and a fitting mobile footer. Exercise editor at 390×844 confirmed 24px title, 14px/700 labels and actions, and a visible Add control. No commit, push, or remote CI is claimed.
- **Known issue:** Product Owner visual acceptance across the remaining routes and Venue/Finance Stage 1 browser paths remains open.
- **Next:** Continue focused Product Owner visual review of interactive controls and embedded setting dialogs, then resume the preserved Venue/Finance Stage 1 acceptance.

### 2026-09-28 — LOG-248 — Use Settings currency for new Finance ledger entries

- **Scope:** Product Owner identified the redundant free-text 幣別 field in the 新增明細 dialog and directed its removal because Settings already owns the currency choice.
- **Outcome:** New manual Finance entries read the current Settings currency when the dialog opens, show it beside 金額, and submit that currency with the correctly scaled minor-unit amount. Existing entries retain their recorded currency. Settings copy now includes new manual ledger entries.
- **Verification:** A regression first failed on the visible currency field; after the change, the focused Finance interaction tests passed 3 / 3. Web format/type/test checks passed 51 files / 216 tests, production build passed with the existing chunk-size advisory, and `git diff --check` passed. No live data was changed; no push or remote CI is claimed.
- **Known issue:** Product Owner visual acceptance and the remaining Venue/Finance Stage 1 browser paths remain open.
- **Next:** Continue focused Product Owner corrections, then resume the preserved Venue/Finance Stage 1 acceptance.

### 2026-09-28 — LOG-247 — Align interactive choices and form controls with Product Owner examples

- **Scope:** Product Owner supplied 17 screenshots and defined the existing single-select, segmented, switch, date, time, checkbox, input, and common action-button patterns as the review standard. Preserve route business behavior while correcting the affected Web controls.
- **Outcome:** Shared `FormSelect` now avoids label-click close/reopen and coordinates with the exercise suggestion menu so two site menus do not overlap. Exercise name/equipment text inputs disable browser autofill suggestions. Formal Web native date/time inputs were replaced with the approved calendar picker and a non-editable 15-minute `TimeSelect`; numeric inputs reject exponent/sign keystrokes as appropriate and hide spinner arrows. Checkboxes use the site palette. Common add/save/cancel/delete/general button classes fix dimensions, typography, and colors; key pending actions show `處理中…` and disabled buttons no longer use the prohibited cursor. Shared dialog behavior supports Escape, Ctrl/Cmd+Enter, and guarded Delete where the owning dialog supplies a delete action. Route state/API behavior is unchanged.
- **Verification:** Web format and TypeScript checks, all 51 test files/215 tests, production build, and a local authenticated Chrome check passed. Browser inspection confirmed the calendar date popover, a non-editable quarter-hour start-time list, and a single click on its field heading closing the list. At 390×844, browser DOM inspection found a formerly squeezed start-time field; the mobile grid selector was corrected and its date/start/end field bounds then fit the viewport. Earlier exercise-editor Chrome inspection confirmed one site menu at a time and no browser autofill overlay in the tested fields. Vite retained its existing chunk-size advisory; no commit, push, or remote CI is claimed.
- **Known issue:** Product Owner visual acceptance across every route and physical-phone touch states remains open. The current local worktree also includes the earlier Training Result review slice, which remains uncommitted.
- **Next:** Product Owner reviews these controls and reports any route-specific mismatch; continue focused corrections, then resume the preserved Venue/Finance Stage 1 acceptance.

### 2026-09-27 — LOG-246 — Prepare semantic option and form components for review

- **Scope:** Product Owner approved semantic primary/secondary text, contrast, and a 4px spacing scale, then requested the component-consolidation stage in TSX without changing business pages.
- **Outcome:** Shared `FormSelect` now renders reusable `OptionItem` rows with optional secondary descriptions; its menu and row spacing use 4/8/12px values. Added reusable controlled `RadioGroup` and native-semantic `Checkbox` with styled appearance, primary 14px labels, secondary 14px descriptions, and shared contrast tokens. Existing route state, API calls, and business pages are unchanged.
- **Verification:** Web format check, TypeScript check, all 50 test files/212 tests, production build, and `git diff --check` passed. Focused tests cover option descriptions, form submission, and radio/checkbox selection. The production build retained its existing chunk-size advisory. No browser visual acceptance, commit, push, or remote CI is claimed.
- **Known issue:** Some route-specific `FormSelect` trigger typography overrides remain outside this component-only scope; the new dropdown option rows themselves use Body Compact. Review those trigger variants with the owning page during the later single-file replacement stage.
- **Next:** Product Owner reviews these shared components; only after approval and a named target file should the single-page replacement begin. Venue/Finance Stage 1 browser acceptance remains open.

### 2026-09-27 — LOG-245 — Keep the mobile Finance ledger heading in view

- **Scope:** Product Owner found that the mobile Finance page could keep scrolling after **收支明細** reached its intended position, moving the heading above the viewport; then requested using a little more space above the card.
- **Outcome:** The no-deleted ledger now caps its mobile card height to the viewport, so populated rows scroll below the fixed heading. Mobile Finance bottom padding is 88px; the card cap was enlarged by 12px after visual review, moving its heading slightly higher while preserving the gap above the bottom navigation. Desktop rules are unchanged.
- **Verification:** Authenticated 390×844 Chrome preview reproduced the defect before the change: with the outer page at its end, the card top would be about −37px. After the correction and follow-up adjustment, the page ends with the card top at 82px, heading top at 101px, card bottom at 756px, and bottom navigation top at 776px. The nine-row list scrolls internally to its total while the outer page stays at its limit. Desktop Chrome retained its existing card height and 20px page padding. Web TypeScript, focused Prettier, production build, and `git diff --check` passed; the build retained its existing chunk-size advisory. Physical-phone touch acceptance remains open. No commit, push, or remote CI is claimed.
- **Next:** continue Product Owner Stage 1 review and remaining Venue/Finance acceptance; preserve development fixtures and the Stage 2/M8 boundary.

### 2026-09-27 — LOG-244 — M7.5 Venue and Finance Stage 1 delivery checkpoint

- **Scope:** Product Owner explicitly requested full CI and a Main push to pause the largely completed Venue management and monthly Finance review. Preserve the unfinished Stage 1 browser paths and Stage 2/M8 boundary. Keep local review fixtures outside Git.
- **Outcome:** The Venue live E2E exposed two regressions in the applied Session-rule trigger: missing default Customer Source derivation for dual-rate Venues and missing purchase-derived Venue eligibility. Two forward-only migrations restore those rules while retaining Session-end fee-rule selection. The Finance live E2E expectation now follows the approved effective-time rule; local `output/` is ignored by Git and Prettier.
- **Verification:** Local root format/types/tests passed again after the CI repair (API 26 files/122 tests; Web 49 files/209 tests); production build passed with the existing chunk-size advisory. Isolated two-Coach Venue and Finance live E2E passed after the trigger fix and removed their exact fixtures. Linked development migration dry-run is up to date, `app_private` lint found no schema errors, and security advisors retain only the accepted development leaked-password-protection warning. Initial commit `bbbbeca` reached Main, but exact-SHA Actions run `36271630283` failed because the new Student navigation test relied on local `VITE_SUPABASE_*` values. After the test supplied isolated public config, code checkpoint `baddb7db361fededa5a4deaee3e063ef68999641` reached Main and exact-SHA Actions run `36272037958` completed successfully: `verify` and `migration-dry-run` both passed. No full M7.5 browser acceptance or milestone completion is claimed.
- **Next:** await the Product Owner's next Stage 1 review direction; preserve local review fixtures and the Stage 2/M8 boundary.

### 2026-09-27 — LOG-243 — Keep deleted Finance rows in one scroll area and remove empty section

- **Scope:** Product Owner requested that expanded deleted rows follow the total in the same ledger scrollbar, with a clear **已刪除明細** divider; the expand/collapse option stays at the card bottom. The deleted-row editor must use the normal **恢復明細** button at the far left of the cancel/save row. Once no deleted rows remain, the option, divider, and reserved space must disappear.
- **Outcome:** The ledger now renders active totals and expanded deleted rows in one scroll area. Its bottom toggle remains outside that area. Restore and source-removed clone actions use the shared secondary button in the editor footer, with no browser-default action below the form. Zero deleted count removes the entire deleted section and toggle, and the card shrinks to its content. Added an interaction regression for shared scroll structure and restore action placement.
- **Verification:** Web format/typecheck/test passed (49 files, 209 tests), Web production build passed with the existing chunk-size advisory, and `git diff --check` passed. Authenticated Chrome desktop and exact 390 × 844 preview showed the zero-deleted state without the old heading or option; the mobile preview also showed the bottom toggle and single scrollbar while its prior cached count was one. No commit, push, or remote CI is claimed.
- **Next:** continue Product Owner Stage 1 review and remaining Venue/finance acceptance; preserve development fixtures and the Stage 2/M8 boundary.

### 2026-09-27 — LOG-242 — Clarify modified Finance rows and confirmation controls

- **Scope:** Product Owner requested a pale-green wrench **已修改** marker beside each modified ledger title, **取消修改** in the same footer row as delete/cancel/save, matching button styling for confirmation, Enter to confirm and Escape to cancel, and pale-green parenthesized markers beside the form fields whose saved values differ from their source.
- **Outcome:** Modified rows now show a compact title marker instead of spending a third detail line on that state. The edit footer places reset between the left delete action and right cancel/save actions, including a four-button mobile layout. Confirmation uses the shared secondary/lime buttons, focuses **確認**, and accepts Enter or Ctrl/Cmd+Enter while Escape returns to the editor. The Finance projection now includes original occurrence time so date, time, name, and amount markers reflect their actual source comparisons. An amount-only edit no longer invents a midnight occurrence time for a date-only source.
- **Verification:** Focused Web interaction/navigation tests (5), API Finance tests (18), both TypeScript checks, Web production build, focused Prettier, and `git diff --check` passed. Interaction coverage includes Enter confirmation, Escape cancellation, and amount-only submission without an occurrence-time override. Web build retained the existing chunk-size advisory. Authenticated visual acceptance remains open because local Web/API services were not running. No commit, push, or remote CI is claimed.
- **Next:** continue Product Owner Stage 1 review and remaining Venue/finance acceptance; preserve development fixtures and the Stage 2/M8 boundary.

### 2026-09-27 — LOG-241 — Present Finance source as structured plain text

- **Scope:** Product Owner clarified that **來源說明** stays as the heading, followed by one text display box containing a written explanation, source amount, and source date; the source-record button belongs on the next line.
- **Outcome:** Replaced the separately styled explanation and fact grid with a single read-only, preformatted text display. Generated source details now use a summary sentence and labelled amount/date lines, with repeated commission wording shortened; source-change state becomes an additional text line. The existing source-record action remains immediately below the box.
- **Verification:** Focused Prettier, Web TypeScript, targeted Finance navigation/source-format tests (3 passed), production build, and `git diff --check` passed. Vite needed the known elevated Windows rerun after sandbox `spawn EPERM`; build retained the existing chunk-size advisory. Authenticated visual acceptance remains open because the local Web/API services were not running. No commit, push, or remote CI is claimed.
- **Next:** continue Product Owner Stage 1 review and remaining Venue/finance acceptance; preserve development fixtures and the Stage 2/M8 boundary.

### 2026-09-27 — LOG-240 — Align and simplify Finance source information

- **Scope:** Product Owner identified the Finance detail editor's indented **來源說明** heading, oversized and crowded source text, and an unframed source-record link.
- **Outcome:** The source section now aligns with the other form fields without a surrounding card. Its heading is larger than its description; middle-dot source details appear on separate lines; amount and date use labelled, smaller text. The source-record link is an outlined button with hover and keyboard-focus states.
- **Verification:** Focused Prettier, Web TypeScript, and production build passed with the existing chunk-size advisory. The local Web/API services were not running, so authenticated visual acceptance remains for Product Owner review. No commit, push, or remote CI is claimed.
- **Next:** continue Product Owner Stage 1 review and remaining Venue/finance acceptance; preserve development fixtures and the Stage 2/M8 boundary.

### 2026-09-27 — LOG-239 — Restore Finance source paths and simplify Today finance signal

- **Scope:** Product Owner reported a black selected-row frame, a scattered Finance source field,
  purchase income stopping at Student detail, Venue course detail skipping its list on close,
  prepaid source lacking a return, and a Today card that exposed an income total.
- **Outcome:** Ledger keyboard focus now uses a quiet left accent rather than a full black frame.
  Source description, original amount/date, and its route form one bounded field on desktop and
  mobile. Purchase income opens the Student purchase-history card and its back link restores the
  originating Finance month and detail. Venue course detail closes to its record list, then to the
  Finance detail; prepaid source closes directly to that detail. Today displays the month and
  **收支明細概覽** with its existing arrow and route, without an amount.
- **Verification:** Web TypeScript, affected-file Prettier, Web production build, and focused
  Vitest passed (2 files, 17 tests). Authenticated desktop Chrome verified the source field,
  purchase-history scroll/back, both Venue course close layers, prepaid close/back, and Today copy.
  Exact 390×844 preview showed the source field without visible overflow. `git diff --check`
  passed for tracked affected Web files. Sandbox Vitest/build first hit Windows `spawn EPERM`;
  elevated reruns passed. Physical-phone touch remains open. No commit, push, or remote CI is claimed.
- **Next:** continue Product Owner Stage 1 review and remaining Venue/Finance acceptance; preserve
  development fixtures and the Stage 2/M8 boundary.

### 2026-09-27 — LOG-238 — Separate Student roster from management entries

- **Scope:** Product Owner asked for a clear, full-width division between all Student cards and the **本月收支** / **場地管理** entry cards.
- **Outcome:** The management-entry grid now starts below a 2px horizontal rule with larger space on both sides; the rule spans the roster content width. Narrow screens retain proportional spacing and the stacked entry cards.
- **Verification:** Focused Prettier and `git diff --check` passed. Web TypeScript and production build passed on an elevated rerun after Vite hit the known Windows sandbox `spawn EPERM`; the existing chunk-size advisory remains. No authenticated browser acceptance was available because the local Web service was not running; the exact rendered visual remains for Product Owner review.
- **Next:** continue Product Owner Stage 1 review and remaining Venue/finance acceptance; preserve development fixtures and the Stage 2/M8 boundary. No commit, push, or remote CI is claimed.

### 2026-09-27 — LOG-237 — Tighten mobile Finance operators and pin the ledger heading

- **Scope:** Product Owner requested a smaller, lower mobile minus; a smaller equals sign farther left; the mobile row count beside **收支明細** instead of above the add action; removal of the month title's pale-green outer focus frame; and desktop-style internal scrolling with a clearer title-to-record divider on mobile and desktop.
- **Outcome:** Mobile operators were adjusted while the amounts stay centered. The mobile ledger title and count share one line, and **＋新增** stands alone at right. The month selector retains a keyboard-visible underline without the green outer ring. Mobile ledger records scroll inside a viewport-height card below its fixed heading, with clearance between the scrollbar and record amounts. Both sizes use a stronger heading divider, and desktop column labels have a clearer bottom rule.
- **Verification:** Focused Prettier, Web TypeScript, production build, and diff check passed. Authenticated Chrome at exact 390×844 showed the title/count/action alignment and the opened month title without the green frame. Scrolling records changed the inner scroll position while the heading stayed fixed; the card bottom measured 20px above fixed navigation. Authenticated desktop Chrome showed the stronger header and column-label rules. Physical-phone touch acceptance remains open.
- **Next:** continue Product Owner Stage 1 review and remaining Venue/finance acceptance; preserve development fixtures and the Stage 2/M8 boundary. No commit, push, or remote CI is claimed.

### 2026-09-27 — LOG-236 — Refine Finance ledger scrolling and source navigation

- **Scope:** Product Owner requested desktop ledger scroll chaining, clearer Finance editor hierarchy and source field, direct Venue course-record source positioning with return to the Finance detail, consistent footer controls, and less dialog bottom space.
- **Outcome:** The ledger rows now pass an upward scroll to the page when already at the top. Finance editor title and form are separated; source explanation has its own heading, amount/date facts, and source link. Session expense links carry Venue and Session IDs to the Venue course-record list, which loads and centers the matching row with a pale-green highlight. Closing that dialog, canceling a source-record edit, using the Venue page back link, or browser Back restores the original Finance month and detail dialog. Save uses the shared compact lime action and Ctrl/Cmd + Enter; delete/cancel/save heights align, and bottom padding is reduced.
- **Verification:** Web typecheck, full Web suite (47 files, 201 tests), and production build passed with the existing chunk-size advisory. Authenticated desktop Chrome confirmed the inner-to-outer upward scroll (page position 391 → 0 while ledger remained at 0), exact Venue record highlight, return by close and browser Back, and the revised Finance editor layout. Initial Vite test/build attempts hit the known Windows sandbox `spawn EPERM`; reruns with normal process permissions passed. No commit, push, or remote CI is claimed.
- **Next:** continue Product Owner Stage 1 review and remaining Venue/finance acceptance; preserve development fixtures and the Stage 2/M8 boundary.

### 2026-09-27 — LOG-235 — Refine mobile Finance overview and ledger heading

- **Scope:** Product Owner requested a mobile-only alignment correction for the Finance equation, a single interactive year/month overview title, and a smaller ledger add action labeled **新增** without squeezing the heading.
- **Outcome:** At mobile widths, income and expense occupy equal centered columns around a larger minus sign. The dark difference panel centers its amount and places a white equals sign beside it. The existing custom month selector presents as the overview title with a chevron and retains the paged month menu. The ledger heading uses separate grid slots for its title, row count, and compact **＋新增** action. Desktop Finance presentation remains on its existing rules.
- **Verification:** Web TypeScript and production build passed, with the existing chunk-size advisory. Focused Prettier and diff check passed. Authenticated Chrome's exact 390×844 preview showed centered September and August totals, the compact ledger header, and no visible horizontal overflow; selecting August updated the heading, totals, and ledger, and returning to the current month restored September. Physical-phone touch acceptance remains open.
- **Next:** continue Product Owner Stage 1 review and remaining Venue/finance acceptance; preserve development fixtures and the Stage 2/M8 boundary. No commit, push, or remote CI is claimed.

### 2026-09-27 — LOG-234 — Refine desktop Finance equation and scrollable ledger

- **Scope:** Product Owner requested stronger, centered equation operators; a Student-detail-style Finance ledger heading; a smaller add action and explicit row count; an internal ledger scrollbar with its heading held above the rows; better expense/income clearance; a clear total without TWD; and less bottom-page whitespace. A follow-up rejected the total row's pale-green fill and identified its amount alignment.
- **Outcome:** Desktop overview amounts are centered in equal-width columns around larger minus/equal signs. The ledger has a `FINANCE / LEDGER` eyebrow, **共 N 筆**, and a slightly smaller add button. The page ends with a small gap under the viewport-height ledger; its rows scroll inside the card beneath a fixed title and sticky column labels. Expense/income columns sit farther from chevrons. The total uses the existing card background, an ink divider, stronger type, and column-aligned amounts. The ledger remounts for a selected month so its scroll position resets with the data. Mobile layout remains on its existing rules.
- **Verification:** Web typecheck and production build passed with only the existing chunk-size advisory; focused Prettier and `git diff --check` passed. Authenticated Chrome checks at desktop and 1756×1078 confirmed operator placement, ledger title/row count/action sizing, inner scrolling through the total, fixed header, amount alignment, and about 20px of bottom space. No commit, push, or remote CI is claimed.
- **Next:** continue Product Owner Stage 1 review and remaining Venue/finance acceptance; preserve development fixtures and the Stage 2/M8 boundary.

### 2026-09-27 — LOG-233 — Combine Finance title and recorded-difference equation

- **Scope:** Product Owner requested the monthly Finance overview card to replace the page title, a year/month selector in that card instead of the historical-month card, an emphasized recorded-difference equation, shorter copy, and a consistent add icon.
- **Outcome:** The card's heading names the selected year and month. The custom selector retains paged access to earlier months and updates the overview and ledger through their shared month query. The totals display recorded income minus recorded Venue expense equals recorded calculated difference, with the result emphasized. Removed the redundant currency abbreviation and partial-coverage sentence from the overview; the ledger add action uses the shared Plus icon. A transient JSX edit error seen during work was corrected before final verification.
- **Verification:** Web production build and typecheck passed; full Web suite passed with two workers (47 files, 201 tests). The first unrestricted suite attempt had worker startup timeouts despite 156 passing tests, so it was rerun with bounded concurrency. Focused Prettier and `git diff --check` passed. Authenticated Chrome confirmed desktop and exact 390×844 display, August selection and return to September, corresponding ledger values, and no horizontal overflow. No commit, push, or remote CI is claimed.
- **Next:** continue Product Owner Stage 1 review and remaining Venue/finance acceptance; preserve development fixtures and the Stage 2/M8 boundary.

### 2026-09-27 — LOG-232 — Clarify Venue course history time, month changes, and mobile scrolling

- **Scope:** Product Owner requested Calendar-consistent 24-hour times, a narrow visible mobile scroll indicator, one divider before each month, and clearer year/month markers in Venue course history.
- **Outcome:** Venue course rows and details format times with the 24-hour cycle. The mobile list reserves a slim scrollbar gutter with a styled thumb. Month headings use a larger, darker label on a pale green field with a lime edge; their extra top border is removed while row spacing remains.
- **Verification:** Focused Web Venue tests passed (2 files, 14 tests), Web typecheck and production build passed with the existing chunk-size advisory, and `git diff --check` passed. Authenticated desktop and exact 390×844 Chrome inspection showed 09:00/15:30 times, month changes, the single prior-row divider, and a visible mobile scroll indicator clear of record text. No commit, push, or remote CI is claimed.
- **Next:** continue Product Owner Stage 1 review and remaining acceptance, including the historic rent-rule discrepancy; preserve development review fixtures and the Stage 2/M8 boundary.

### 2026-09-27 — LOG-231 — Refine Venue course history and repair prepaid writes

- **Scope:** Product Owner requested a Venue-name history title, weekdays, month dividers, desktop scrollbar placement and clearance, and a hidden mobile scrollbar without losing scrolling; prepaid creation returned an unexpected server error.
- **Outcome:** The history title now names the Venue, date rows include a one-character weekday, and month boundaries show year and month. Its toolbar stays outside the scrollable list; desktop rows have scrollbar clearance, and the exact mobile layout hides only the scrollbar. A live server log traced the 500 to PostgreSQL `42P08` (one bind parameter inferred as both date and timestamp). Explicit date casts repair Venue-rule and prepaid create/edit SQL in all matching paths. The running local API was restarted on port 3000 and `/health` returned 200.
- **Verification:** Before the SQL correction, an isolated development live run failed at `POST /venues` with 500 and the server logged `42P08`. Afterward, the same run passed the prepaid create, edit, balance, reopen, and notice block, including an explicit deduction start; the runner removed its exact fixtures. API adapter tests (12) and Web Venue tests (13), both typechecks, both builds, and affected-file Prettier passed. Authenticated desktop and exact 390×844 browser checks showed the title, weekdays, month transitions, desktop scrollbar below the fixed toolbar, and hidden mobile scrollbar with successful vertical scrolling. `git diff --check` passed. No commit, push, or remote CI is claimed.
- **Known issue:** The broader pre-existing finance live runner continues past the prepaid block and fails later in a separate historic rent-rule expectation (`800` actual versus `500` expected); that behavior is outside this correction and remains for Stage 1 acceptance. It cleaned its isolated fixtures on failure.
- **Next:** continue the Product Owner's M7.5 Stage 1 review and remaining acceptance, including the historic rent-rule discrepancy; preserve development review fixtures and the Stage 2/M8 boundary.

### 2026-09-26 — LOG-230 — Keep Venue history controls visible and save prepaid credits directly

- **Scope:** Product Owner requested a fixed heading and history entry while Venue course rows scroll, and a one-step prepaid Venue purchase flow for both new and edited batches. They also reported that the old preview confirmation appeared to do nothing.
- **Outcome:** The Venue course dialog retains its heading, close action, and `過往支出類型` entry while the record body scrolls. Prepaid create and edit submit directly to the existing POST/PATCH operations with `登錄預購` or `變更`; the preview panel and second confirmation for these forms are removed. Mutation errors now appear beside the form actions. Rule and historical-link preview flows remain as contracted. The Venue course records Contract records this Product Owner correction.
- **Verification:** Two focused form tests failed before the change because they observed preview endpoints, then passed with direct POST/PATCH and the successful return to Venue detail. Web production build/typecheck and 15 focused tests passed. Authenticated desktop and exact 390×844 browser views confirmed fixed heading/history controls during list scrolling and the direct create/edit action labels. Affected-file Prettier and `git diff --check` passed. No customer or review fixture data was changed; no commit, push, or remote CI is claimed. The precise cause of the old second-click failure was not isolated because that step was removed; direct save and error feedback are covered by the new tests.
- **Next:** continue the Product Owner's M7.5 Stage 1 review and remaining acceptance; preserve development fixtures and the Stage 2/M8 boundary.

### 2026-09-26 — LOG-229 — Keep Venue status switch available at zero archived

- **Scope:** Product Owner reported that restoring the only archived Venue left the Coach on an
  archived list with no way to switch back, and requested the Student roster's two-status control.
- **Outcome:** Venue management always shows `進行中` and `已封存` with counts, including zero. The
  selected category stays switchable after a Venue changes status, and an empty category explains
  that it has no Venues. Desktop aligns the control to the right; mobile fills the list width.
- **Verification:** The focused regression first failed on the missing switch after a simulated
  last-Venue restore, then passed after the fix (VenueManager: 11 tests). Web typecheck, production
  build, affected-file Prettier, and `git diff --check` passed. Authenticated desktop and exact
  390×844 browser checks showed both choices at `已封存 0`, the empty state, and direct return to
  `進行中`. Development review data was not changed. No commit, push, or remote CI is claimed.
- **Next:** continue the Product Owner's M7.5 Stage 1 review and remaining acceptance; preserve
  development fixtures and the Stage 2/M8 boundary.

### 2026-09-26 — LOG-228 — Open complete course history in a dialog and refine Venue course details

- **Scope:** Product Owner clarified that `查看更多` should open a scrollable interface on the Student page, and requested a Venue course title divider, larger footer actions, and direct navigation from the purchase-source row.
- **Outcome:** The Student page keeps ten course rows and opens all records in the same row layout inside a scrollable dialog; the temporary separate route was removed. Venue course details now separate the title from the venue/student information, show the purchase source as a whole-row link with a right arrow, and retain only `修改場地紀錄` and a black `查看課堂` footer action. Both footer actions are slightly larger.
- **Verification:** Web typecheck and production build passed; focused Student navigation and VenueManager tests passed (12 tests). Authenticated desktop and exact 390×844 browser views confirmed the complete course dialog and its internal scrolling, plus the Venue detail layout. Clicking the purchase-source row on mobile opened the correct Student `#purchase-history` section. Affected-file Prettier and `git diff --check` passed. No commit, push, or remote CI is claimed.
- **Next:** continue the Product Owner's M7.5 Stage 1 review and remaining acceptance; preserve development fixtures and the Stage 2/M8 boundary.

### 2026-09-26 — LOG-227 — Restore Venue heading emphasis and match footer actions

- **Scope:** Product Owner corrected the prior mobile Coach-supplied heading layout and requested
  equal geometry for the Venue detail footer actions.
- **Outcome:** The mobile `教練自帶客` heading retains its original size and weight, the add action
  sits at the right of the heading, and the explanation plus count share one line underneath.
  The mobile Archive/Delete/Restore, Cancel, and Save buttons use matching 80 × 46px geometry.
  Desktop heading and action layout remain visually unchanged.
- **Verification:** Web typecheck and production build passed; focused VenueManager tests passed
  (10 tests), and affected-file Prettier check passed. Authenticated exact 390×844 and desktop
  browser views confirmed the heading and footer arrangements. `git diff --check` passed.
  No commit, push, or remote CI is claimed.
- **Next:** continue the Product Owner's M7.5 Stage 1 review and remaining acceptance; preserve
  development fixtures and the Stage 2/M8 boundary.

### 2026-09-26 — LOG-226 — Clarify mobile Venue detail hierarchy

- **Scope:** Product Owner requested a clearer mobile Venue title/field boundary, reserved address
  line when blank, a two-line Coach-supplied heading with its add action beside the title, and
  wider Cancel/Save actions.
- **Outcome:** Mobile Venue details have a subtle divider below the title/address block. Empty
  addresses retain the same line height. The Coach-supplied explanation sits below its title,
  while `加入自帶客` aligns with that title. Mobile Cancel/Save buttons are wider; desktop layout
  rules remain unchanged.
- **Verification:** Web typecheck, production build, and focused VenueManager tests passed (10 tests),
  including a blank-address assertion. Prettier check passed. Authenticated 390×844 preview showed
  the divider, Coach heading/action arrangement, and wider footer for prepaid and Coach-supplied
  Venues without visible horizontal overflow. `git diff --check` passed. No commit, push, or
  remote CI is claimed.
- **Next:** continue the Product Owner's M7.5 Stage 1 review and remaining acceptance; preserve
  development fixtures and the Stage 2/M8 boundary.

### 2026-09-26 — LOG-225 — Align Venue action and simplify list copy

- **Scope:** Product Owner requested alignment of `新增場地`, a two-count prepaid summary,
  `單次計費` wording, and a focused mobile Venue-list layout correction.
- **Outcome:** The add action centers its icon and label on desktop and mobile. Prepaid cards show
  only remaining available and undeducted lessons, including zero. All current Web labels,
  rule summaries/history, and the API validation message use `單次計費`. The mobile list uses
  shorter cards and tighter gaps while retaining full-card targets and readable wrapping.
- **Verification:** Web and API typechecks passed; VenueManager focused tests passed (10 tests),
  affected-file Prettier check and Web production build passed. Authenticated desktop and exact
  390×844 preview showed the updated action, prepaid count, rent label, and compact cards without
  visible horizontal overflow. Repository `git diff --check` passed. Initial sandbox Vitest/build
  attempts hit Windows `spawn EPERM`; elevated reruns passed. No commit, push, or remote CI is claimed.
- **Next:** continue the Product Owner's M7.5 Stage 1 review and remaining acceptance; preserve
  development fixtures and the Stage 2/M8 boundary.

### 2026-09-26 — LOG-224 — Restore trajectory navigation and bound Student history

- **Scope:** Product Owner reported inactive growth-trajectory history rows from Student detail,
  unlimited Student course records, Venue record hierarchy/source navigation/unit-price gaps,
  opaque prepaid rule history, and requested a lime preview button with a shortcut.
- **Outcome:** Student trajectory rows now route to the original Session and exercise. Student detail
  shows at most ten classes with a dedicated complete-history route. Venue record detail uses a
  smaller Venue–Student heading, matched action buttons, a purchase-history anchor, and a per-class
  purchase price. The expense-rule list states type changes directly and omits versions with no
  visible setting change. Preview uses the existing lime primary style; Ctrl/Cmd+Enter submits the
  form's current preview/save step without opening the custom select.
- **Verification:** Web typecheck and production build passed; four focused Vitest files passed
  (21 tests). Authenticated desktop and exact 390×844 preview confirmed Venue detail, concise rule
  history, ten-class Student summary, complete-history route, purchase-history scroll, and the
  Ctrl+Enter preview without saving. `git diff --check` passed for the affected Web files.
- **Known issue:** Stage 1's remaining broader Venue and Finance acceptance is still open. This is
  local evidence only; no push or remote CI is claimed.
- **Next:** continue the Product Owner's M7.5 Stage 1 review and fix the next reported issue; keep
  refreshed development fixtures and the Stage 2/M8 boundary intact.

### 2026-09-26 — LOG-223 — Refine Venue course records and detail navigation

- **Scope:** Product Owner requested Stage 1 corrections only in Venue management and Venue course
  records: layered closing, concise fee summaries, consistent purchase source, historical prepaid
  balance per Session, 「場地供客」 wording, newest-first Venue purchases, and desktop/mobile layout.
- **Outcome:** Nested Venue views and individual Session/edit states close one layer at a time.
  Individual records use a collapsible applied-rule summary and a consistent Student purchase source
  section, with edit/source/Session actions aligned in one footer row. Rent and purchase-time
  commission summaries are shorter; same-basis commission differences omit the repeated rate label.
  Venue purchase batches sort newest first, rule history has a visible toolbar action, and mobile
  archive/delete aligns with cancel/save. The API now projects the remaining lessons immediately
  after each allocated Session from the final assignment set in chronological order; the batch
  detail separately retains its current balance. Coach-facing source wording is now 「場地供客」
  throughout the formal app; Contract and Context record the term and historical balance rule.
- **Verification:** focused API Finance tests 18/18 and Venue Web tests 10/10 passed. Authenticated
  Chrome confirmed the actual rent/commission/prepaid copy, chronological balances, nested close
  sequence, detail disclosure, and action alignment on desktop and exact 390×844, including both
  archive and delete Venue footers. API/Web typechecks, Web build, and final diff/format checks are
  recorded in this local turn; no push or remote CI is claimed.
- **Next:** Product Owner reviews the Venue surfaces, then provides the Finance ledger issues they
  mentioned. Preserve the test data and continue Stage 1 acceptance separately.

### 2026-09-26 — LOG-222 — Clarify Venue records and Finance ledger

- **Scope:** Product Owner found recorded Venue rule history, course rows, and ledger amounts too
  vague to interpret, and requested oldest-to-newest financial-statement presentation with separate
  desktop expense/income columns, a total row, and a single mobile amount column.
- **Outcome:** Rule history identifies exact same-kind fee/rate changes, effective time, and the
  settings in each version; each row expands to calculation context and links to prepaid batches.
  Venue course rows explain allocated/pending prepaid status, purchase-time commission, rate
  differences, rent, and their sources; individual rows expose package pricing and effective rules.
  Finance rows now name the Student/Venue and concrete purchase, fee, rate, salary, or prepaid basis.
  Desktop amounts use separate red expense and green income columns; mobile keeps one amount column.
  Rows use Workspace-local displayed date/time from oldest to newest, followed by per-currency totals.
- **Verification:** API/Web typechecks passed; focused Finance tests 17/17 and Venue Web tests 9/9
  passed; Web production build passed with only the existing chunk-size advisory. Authenticated Chrome
  confirmed July ledger values/ordering, a commission Session detail, prepaid pending/allocation
  explanations, expandable rule history, and desktop plus exact 390×844 ledger/history layouts.
  Touched TS/TSX files passed focused Prettier and changed files passed `git diff --check`;
  no remote CI or push is claimed.
- **Next:** Product Owner inspects the refined displays with the preserved development fixtures;
  keep Stage 1 browser acceptance and deferred arbitrary edit/source-change tests separate.

### 2026-09-26 — LOG-221 — Regenerate Venue and Finance review data

- **Scope:** Product Owner requested only steps 1–3 of a new historical test-data cycle: retain the
  existing Students and Venues, replace old Student purchases, scheduling/completion, Training
  records, and prepaid Venue batches, and add a few same-kind Venue rule changes. Steps 4–5 remain
  for a later Product Owner review.
- **Isolation:** matched the exact development project host, the previously verified Asia/Taipei
  Workspace `4ba6de2b-520d-4c65-88d0-1fd7d529ae0b`, its owner ID, all six Student IDs/names,
  and the four selected Venue IDs/names before a single transaction. The original Workspace had
  six purchases, six Series, 78 Sessions, two prepaid batches, no manual Finance states/entries,
  and no Venue-linked Sessions. A local backup of replaced rows is in ignored `output/`.
- **Outcome:** kept all six Students and five Venues; gave each Student one Venue-specific purchase
  pattern and a fixed weekly/biweekly rhythm. The new data has 14 Purchases, six active Series,
  119 completed and four upcoming Sessions, 119 Training Records/1,071 completed sets, and three
  prepaid Venue batches. Two completed prepaid Sessions intentionally precede the first batch's
  start-deducting time by less than two days and remain unallocated. The four selected Venues have
  dated same-kind commission/rent/prepaid rules; one Venue has two dated salary settings. Local
  `output/M7.5-2026-venue-finance-review-data.md` records the per-Student scenarios.
- **Verification:** transaction/rollback dry run passed before the committed run; a fresh read found
  exactly 27 allocated and two pending prepaid Sessions, zero missing rule links, zero Session
  overlaps, zero cross-Venue or overfilled credit links, and zero stale scheduled Sessions. The
  production Finance projection generated populated TWD ledgers for March–September with no
  missing calculation rows and a salary income row in its applicable months. No code/schema
  checks, commit, push, or remote CI are claimed for this data-only setup.
- **Next:** Product Owner inspects Venue course records and monthly ledger with this dataset. Do
  not perform the deferred arbitrary edits or add/modify/delete/source-change tests until directed.

### 2026-09-26 — LOG-220 — Tighten Finance ledger layout and editor

- **Scope:** Product Owner requested a focused layout pass on the Finance ledger before continuing
  Stage 1 acceptance.
- **Outcome:** Ledger rows are shorter and fully clickable, with inline status, full year, a chevron,
  and a black `+新增明細` action. Prepaid rows show their stored activation time separately from the
  booked purchase date, preserving month assignment and sort semantics. The editor uses the shared
  date picker and scheduling time input side by side, a segmented income/expense choice, source link
  next to the source value, and delete/cancel/save on one footer row. Existing Escape, Enter and
  Delete dialog shortcuts remain available.
- **Verification:** API typecheck and focused Finance test passed (15 tests); Web typecheck, production
  build and shared date-picker test passed (1 test). The existing Vite chunk-size advisory remains.
  Authenticated desktop and 390×844 browser checks covered list density, row opening, editor controls,
  responsive footer, and the new-entry direction control. `git diff --check` passed. Initial sandbox
  build/test attempts hit Windows `spawn EPERM`; elevated reruns passed. No commit, push, or remote CI
  is claimed for this Stage 1 layout correction.
- **Next:** continue the remaining Stage 1 browser acceptance in the Next handoff after Product Owner
  direction.

### 2026-09-26 — LOG-219 — Deliver Venue course records and monthly ledger through Sol

- **Scope:** Product Owner directed direct Sol implementation of the frozen Venue course-record
  and Finance ledger Contracts, without a separate Terra handoff. Stage 1 stays local.
- **Outcome:** The Workspace-scoped migration `20260926024512_venue_course_finance_ledger.sql`
  stores rule instants, batch deduction starts, per-Session adjustments, Finance source states,
  and manual entries. API projections use Session end instants, allocate prepaid batches to
  eligible completed Sessions, calculate commission differences against purchase-time rates,
  retain manual ledger values when sources change, and recompute adjusted month totals. The Web
  now has paged Venue course records with per-Session previews and editing, rule and credit
  previews, and Finance row add/edit/hide/restore/reset with visible source changes and month
  reassignment. The course record links to the actual allocated purchase source and labels
  missing calculation data honestly. Other Stage 1 worktree changes were preserved.
- **Verification:** linked development migration applied; subsequent linked dry-run reports no
  pending migration; `db lint --linked --schema app_private --level error` reports no errors.
  A transaction/rollback SQL fixture passed end-time batch eligibility, later-batch backfill,
  preserved allocation, and independent ledger state. Final API check passed 26 files/118 tests;
  Web check passed 45 files/194 tests; root format check, build, and `git diff --check` passed.
  Authenticated browser verified desktop Venue rule and credit impact previews, Venue course
  detail → month expense propagation, manual amount retained after source mutation, reset,
  hide/restore, manual row movement from September to October, and exact 390×844 Venue empty
  state without horizontal overflow. A second isolated browser fixture verified prepaid
  batch reassignment, batch balance preview, saving, conflict recovery with preserved input,
  and saving again on desktop. Exact 390×844 repeated the populated batch switch and save;
  the detail spacing was tightened and no horizontal overflow appeared. Both fixtures were
  removed, with exact IDs checked to zero. Browser fixture operations touched only isolated
  rows; the migration backfilled existing development rule/credit instants and balances.
- **Known issue:** the earlier Venue creation/purchase/salary/prepaid reopen acceptance paths
  remain for the next local Stage 1 pass. No push or new remote CI is claimed.
- **Next:** run the single local acceptance package in Next handoff; keep Stage 1 local.

### 2026-09-26 — LOG-218 — Compact the prepaid Venue dialog

- **Scope:** Product Owner said the prepaid purchase editor used too much space and felt empty.
- **Outcome:** reduced the editor's maximum width from 900px to 720px, shortened the Coach note
  field, and tightened field spacing. At mobile width, fields use one column and the dialog grows
  to its content while retaining a viewport-bound scroll limit.
- **Verification:** authenticated desktop and exact 390×844 preview show a narrower dialog with
  less unused note space and usable fields. No automated test or build was run for this styling
  adjustment; no record was saved.
- **Next:** continue the frozen Venue and finance-ledger Contracts through Terra, then Sol and the
  pending Stage 1 local acceptance; preserve unrelated worktree changes and `output/`.

### 2026-09-26 — LOG-217 — Freeze finance-ledger management Contract

- **Scope:** Product Owner expanded 收支明細 to edit one row's amount/date/time/name, add manual
  income or expense, hide and restore system rows, cancel edits, and sort by each row's own
  displayed date/time. Direction stays fixed; changing it uses hide plus a new manual row.
- **Outcome:** Added `M7.5-FINANCE-LEDGER-MANAGEMENT-CONTRACT.md`, linked it from the Venue and
  monthly-finance Contracts, and recorded its Stage 1 scope in the Roadmap. System source facts
  remain independent from ledger adjustments. Active rows drive adjusted monthly totals;
  the income headline becomes **本月已記錄收入** with **含手動調整** when relevant. An edited
  system row restored from 已刪除保留其原有手動欄位；這是依恢復同筆資料的意圖採用的
  bounded implementation choice.
- **Verification:** Reviewed current stable Finance row IDs, read-only ledger UI, and monthly
  projection; Contract formatting and targeted diff checks passed. No schema, API, UI,
  or development data changed for this Contract gate.
- **Next:** implement the two frozen Contracts together through Terra, then Sol and the
  pending Stage 1 local acceptance; preserve unrelated worktree changes and `output/`.

### 2026-09-26 — LOG-216 — Freeze Venue records and open finance-ledger review

- **Scope:** Product Owner resolved upfront commission timing, later rate differences,
  fee-mode changes, prepaid backfill and manual allocation, manual finance-row amounts,
  and Student purchase date/time, then expanded the discussion to ledger edit/add/delete/restore.
- **Outcome:** Promoted the Venue review draft to `M7.5-VENUE-SESSION-RECORDS-CONTRACT.md`,
  linked its precedence from the monthly-finance Contract, added its approved Stage 1 scope
  to the Roadmap, and defined Venue Course Record and Venue Lesson Allocation in `CONTEXT.md`.
  The ledger extension remains under review and has no implementation.
- **Verification:** Inspected the Finance projection and page; Venue Contract formatting passed.
  No schema, API, UI, or development data changed for this Contract work.
- **Next:** resolve the ledger extension and then implement the combined frozen Contract
  through Terra → Sol; retain prior Stage 1 browser acceptance work.

### 2026-09-26 — LOG-215 — Remove prepaid shortcut from Venue cards

- **Scope:** Product Owner decided the `登錄預購` card action was difficult to fit and did not save
  enough effort to justify its placement.
- **Outcome:** removed the action from Venue cards. Remaining prepaid lessons stay beside the
  prepaid rule, and the dedicated Venue detail continues to expose `登錄預購` in its prepaid
  section.
- **Verification:** authenticated desktop and exact 390×844 browser review show the prepaid card
  aligned with other Venue cards and no `登錄預購` shortcut. Automated tests and build were not run
  for this small presentation change.
- **Next:** continue the existing Venue course records Contract review in the handoff above; keep
  local changes and `output/` intact.

### 2026-09-26 — LOG-214 — Draft Venue course records Contract correction

- **Scope:** Product Owner proposed a Venue course-record history with one row per completed
  Session, end-time-based fee rules, prepaid batches with start times and explicit Session
  allocation, and one-way manual corrections in monthly finance detail.
- **Outcome:** Initially added the Venue records review draft, promoted to
  `M7.5-VENUE-SESSION-RECORDS-CONTRACT.md` in LOG-216. Confirmed that the
  existing model instead selects dated rules from Session starts, consumes prepaid credits as
  aggregate FIFO, and counts Venue-bound purchase commission in the purchase month. The Product
  Owner confirmed prepaid usage remains one whole lesson per Session or zero when exempt,
  retained upfront commission for Venue-bound Student purchases, and bounded automatic
  catch-up to a prepaid batch's effective start time while allowing explicit manual allocation.
  Later changes to an upfront commission percentage add only the difference for completed
  Sessions. Manual finance-row edits persist across source changes with a visible notice.
  No production code, schema, or development data was changed for this proposal.
- **Verification:** Inspected the current Contract, Finance Module, PostgreSQL migration, Venue
  editor, and cleanly formatted the proposal. No behavioral or live test is claimed.
- **Known issue:** One product choice listed in the Next handoff remains open; this proposal
  must not be treated as a frozen Contract or implemented piecemeal.
- **Next:** Resolve those choices, freeze the revised Contract, then resume its ordered delivery
  gates and the outstanding Stage 1 browser acceptance.

### 2026-09-26 — LOG-213 — Unify Venue management cards

- **Scope:** Product Owner requested that prepaid Venues use the same card shape as other Venues,
  with remaining lessons beside the prepaid rule and the purchase action in the heading row.
- **Outcome:** removed the prepaid-only lower strip. The card now reads
  `預購場地堂數（剩餘堂數 N 堂）`; `登錄預購` remains a separate button before the detail arrow.
  At 390px, all Venue headings share a minimum height so the wrapped prepaid label does not make
  its card taller than its neighbours.
- **Verification:** Web typecheck, focused Venue Manager tests (9/9), targeted Prettier check,
  production build, and `git diff --check` passed. Authenticated desktop and exact 390×844
  browser review confirmed card alignment, action order, and that the mobile action opens its
  editor. The initial sandboxed test/build attempts hit Windows `spawn EPERM`; elevated reruns
  passed. The build retained its existing large-chunk advisory. No data was saved or deleted.
- **Next:** finish Stage 1 browser acceptance in the Next handoff; preserve other local work and
  `output/` without entering Stage 2 or M8.

### 2026-09-25 — LOG-212 — Remove Venue detail gaps and allow prepaid batch deletion

- **Scope:** Product Owner identified an apparent empty row above the detail
  footer, misaligned prepaid and Coach-supplied headings, weak section separation,
  oversized prepaid records, and no way to delete a prepaid batch from its editor.
- **Outcome:** Venue detail uses its own zero-gap layout instead of generic form
  spacing. The footer has one intentional top spacing and no duplicate divider.
  Prepaid and Coach-supplied sections align with the setting labels and have a
  clear bottom boundary. Prepaid rows use smaller type and scroll after three
  visible records. An existing batch's editor now exposes a delete action and
  impact confirmation. The Workspace-scoped API checks the batch version,
  deletes only that Venue's batch, and recalculates affected month and balance;
  completed Sessions remain.
- **Verification:** API full suite passed 26 files/115 tests, including
  deletion recalculation. Web full suite passed 45 files/193 tests.
  API/Web typecheck and production builds
  passed; Web build retained the existing large-chunk advisory. Authenticated
  desktop browser confirmed three Venue layouts, section boundaries, and the
  delete confirmation. Exact 390×844 prepaid detail had no horizontal overflow.
  Existing browser records were not deleted.
- **Next:** finish Stage 1 browser acceptance in the Next handoff; keep local
  changes and `output/` intact without entering Stage 2 or M8.

### 2026-09-25 — LOG-211 — Venue detail density, address and prepaid batches

- **Scope:** Product Owner requested optional Venue address, clearer detail actions,
  compact prepaid and Coach-supplied Student sections, per-batch balances and prices,
  a separate rule-history dialog, and removal of empty space in simple Venues.
- **Outcome:** Venue create/name edit accepts an optional address and shows it below
  the Venue title when present. The linked development migration
  `20260925092226_venue_address.sql` adds the private Venue column. The server
  projects each prepaid batch's remaining lessons by consuming completed Sessions
  from the earliest purchase date and ID. Detail shows four compact rows before
  scrolling, per-batch remaining and unit price, and per-lesson rent. Edit Name,
  prepaid registration and Coach-supplied add actions have visible icons. The
  Coach-supplied Student list uses compact chips; add opens a child dialog and
  remove stays in the Venue detail. The dated rule records open in a child dialog;
  an untracked Venue with only its two settings has no extra divider or reserved area.
- **Verification:** linked development push applied only this migration; subsequent
  dry-run reported up to date. API 26 files/112 tests and Web 45 files/192 tests
  passed. API/Web typecheck and Web production build passed; the existing Vite
  large-chunk advisory remains. Authenticated desktop browser confirmed prepaid
  per-batch balances and prices, simple Venue density, per-lesson rent,
  Coach-supplied chips, the optional address field, and Esc returning from
  Coach-supplied and rule-history child dialogs. Exact 390×844 inspection found
  no horizontal overflow in the Coach-supplied detail. Browser data was not changed.
- **Next:** finish the remaining Stage 1 browser acceptance in the Next handoff;
  keep local work and `output/` intact without entering Stage 2 or M8.

### 2026-09-25 — LOG-210 — Tighten Venue detail and salary interaction

- **Scope:** Product Owner requested a single row for monthly salary and pay day
  without numeric spinners, shorter Venue setting rows, clearer commission rates,
  title-aligned name editing, and return to Venue detail from child settings.
- **Outcome:** the salary inputs share one responsive row and retain numeric
  validation. Existing monthly projection clamps a 29th–31st pay day to the last
  day of a shorter month. Venue detail places Edit Name beside the title, shows
  uniform or dual commission percentages, shortens both setting rows, and removes
  their dark hover fill. Child editors opened from Venue detail return there on
  close, cancel, or successful save; a directly opened editor keeps its list return.
  Refreshed Venue data updates a reopened detail without replacing an active child.
- **Verification:** focused Web dialog tests passed 2 files/12 tests; full Web
  suite passed 45 files/191 tests with one worker. Web typecheck, formatting, and
  production build passed with the existing chunk-size advisory. Focused API
  finance tests passed 1 file/9 tests, including February pay-day clamping.
  Authenticated desktop and exact 390×844 browser checks confirmed compact rows,
  title alignment, uniform and dual commission summaries, a single salary row
  without visible spinners, no horizontal overflow, and close/cancel returning
  to Venue detail. No salary or Venue data was saved in the browser check.
- **Next:** complete the remaining Stage 1 browser acceptance in the Next handoff;
  keep local work and `output/` intact without entering Stage 2 or M8.

### 2026-09-25 — LOG-209 — Align Venue prepaid purchase with Student purchasing

- **Scope:** Product Owner requested Student purchase layout and input behavior in
  the Venue prepaid purchase editor, omitting the Student-specific Venue selector.
- **Outcome:** date/count and total/unit price now form paired rows, followed by a
  private Coach note and the usual actions. Money inputs preserve the active draft,
  allow zero to be cleared, and recalculate total or unit price without jumping.
  The note persists on the Venue purchase batch behind the finance API. Existing
  Venue credit requests without a note remain accepted with an empty default.
- **Verification:** focused Web tests passed 2 files/7 tests, focused API tests
  passed 2 files/18 tests, full Web tests passed 45 files/190 tests, and full API
  tests passed 26 files/110 tests with one worker. Web/API typechecks and Web
  formatting passed; both production builds passed with the existing Web chunk-size
  advisory. Authenticated desktop browser review and 390×844 inspection
  confirmed the rows, note, keyboard zero-clear/re-entry, recalculated total,
  and no horizontal overflow. Development migration `20260925072518` applied;
  linked dry-run reports up to date. Browser inspection did not save a purchase.
- **Known issue:** the full default parallel Vitest runs stalled on worker timeouts;
  single-worker full suites passed. Remaining Venue/finance acceptance in the Next
  handoff has not been completed by this editor correction.
- **Next:** continue the Stage 1 browser acceptance above. Keep this work local
  until Product Owner direction; Stage 2 and M8 remain gated.

### 2026-09-25 — LOG-208 — Link Today student and finance signals

- **Scope:** Product Owner requested whole-column navigation from the Today
  active-student and monthly-purchase summary signals, with chevrons matching
  the adjacent notification signal.
- **Outcome:** the active-student signal opens `/students`; the monthly-purchase
  signal opens `/students/finances` (本月收支). Both entire signals are keyboard
  focusable links with visible focus and hover states. The existing finance
  wording and unrelated local Stage 1 work remain preserved.
- **Verification:** Web check passed formatting, typecheck, and 45 test files / 190
  tests; Web production build passed with the existing chunk-size advisory;
  scoped `git diff --check` passed. The sandbox initially blocked Vite with
  `spawn EPERM`; checks passed when rerun outside it. No local Web/API service
  was listening for an authenticated browser check, so click-through and exact
  390×844 visual acceptance remain unobserved.
- **Next:** continue the corrected Venue/finance browser acceptance in the
  Next handoff. Keep Stage 1 local until Product Owner direction.

### 2026-09-25 — LOG-207 — Simplify Venue create and detail interactions

- **Scope:** apply the Product Owner's Venue manager copy, layout, one-step
  creation, conditional fields, and keyboard shortcuts.
- **Outcome:** a new Venue accepts optional fee rule, first prepaid purchase,
  and salary in one transaction; the name-only path keeps untracked/no-salary
  defaults. Venue detail uses the Venue name as title, moves status summaries
  into the setting rows, opens name editing separately, and uses green Save,
  Cancel, and left-aligned deletion. Enter, Escape, and Delete use the dialog's
  keyboard behavior, with Delete excluded from editable fields.
- **Verification:** API check passed 26 files/110 tests; Web check passed 45
  files/189 tests; API/Web production builds passed with the existing Web
  chunk-size advisory. Focused Venue transaction and UI tests passed. Typecheck,
  formatting, and `git diff --check` passed. Authenticated desktop and exact
  390×844 browser review confirmed the default and prepaid create forms, compact
  42×24 salary switch, Venue detail hierarchy, and no horizontal overflow.
  Delete opened confirmation and Enter closed the detail through Save. No Venue
  was created or deleted during browser inspection.
- **Known issue:** the detail Save closes the view after settings are saved in
  their own dialogs; this view contains no editable fields. The remaining
  purchase, salary, and prepaid browser scenarios in the Next handoff remain.
- **Next:** complete the remaining finance browser scenarios in the Next
  handoff, including a saved non-default Venue creation in an isolated fixture.

### 2026-09-25 — LOG-206 — Implement corrected Venue and purchase workflow locally

- **Scope:** connected purchase-specific Venue entitlement to Student purchase entry,
  Calendar and fixed-Series Venue selection, completion-based lesson allocation,
  Venue commission timing, prepaid Venue purchases and low-balance notification,
  Venue-scoped Coach-supplied Student exceptions, and dated monthly salary.
- **Outcome:** new purchases choose **無固定場地** or a fixed Venue. Scheduling
  derives eligible active Venues from those purchases; the database validates
  the association and prevents a purchase correction/removal that would leave
  scheduled work without an eligible Venue. General purchases incur the selected
  Venue cost on completion, while a Venue-bound commission is charged once on
  purchase. The Venue detail shows type-specific actions and salary settings;
  the monthly detail gains pay-day salary income. Legacy collecting-Venue data
  remains separate from the new entitlement Venue.
- **Verification:** API check passed 26 files/108 tests; Web check passed 45
  files/188 tests; API/Web typecheck and production build passed (existing Vite
  chunk-size advisory). `git diff --check` passed. Official CLI migrations
  through `20260924215948` applied to linked development; subsequent dry-run
  reported no pending migrations. Two isolated SQL mutation suites passed on
  linked development inside rolled-back transactions, covering purchase
  eligibility, source defaults/exceptions, the purchase-removal guard, salary
  storage, low-balance lifecycle, and reopen. An isolated two-Coach API run
  passed fixed/general purchase and Calendar/fixed-Series eligibility,
  purchase-removal protection, commission timing, Venue/Coach-supplied rates,
  and cross-Workspace isolation. Its fixtures were removed; a linked-database
  count confirmed zero remaining under the exact test prefix. Authenticated
  desktop browser inspection confirmed conditional prepaid and salary controls;
  390×844 preview confirmed Student purchase Venue options, Venue details,
  and current-month finance layout. Security advisor reports
  only the pre-existing leaked-password-protection warning; performance advisor
  reports two older unindexed foreign keys plus informational index/policy items.
- **Known issue:** the older finance E2E depends on an unavailable local
  PostgreSQL listener. The replacement API flow uses only isolated development
  accounts and cleans up through the product API. New-purchase, salary, and
  prepaid completion browser scenarios remain unobserved; no remote CI or push
  is claimed for this local Stage 1 work.
- **Next:** complete the remaining browser scenarios in the Next handoff,
  then record their exact evidence while keeping Stage 1 local.

### 2026-09-25 — LOG-205 — Apply Product Owner's clarified Venue and salary rules

- **Scope:** correct the previous agent's unnecessary questions about multi-Venue
  deduction, commission timing, and base salary. The Product Owner had already
  specified that completion deducts one lesson at the selected Venue, a general
  purchase incurs Venue cost per completed Session, and Venue-bound commission
  can be calculated when the Student purchases. They specified a monthly pay day
  and one salary row in **本月收支** → **收支明細**.
- **Outcome:** revised the M7.5 Contract and Venue-model review with these
  rules, Venue-supplied customer-source default, a Venue-specific Coach-supplied
  Student list, conditional Venue controls, and removal of the ordinary
  **確認影響範圍** step. Updated Roadmap scope and the domain glossary. The Venue
  fee-rule editor now saves directly without the extra impact-preview step;
  explicit historical linking keeps its separate confirmation. The larger
  purchase, salary, and customer-source implementation remains unfinished.
- **Verification:** compared Student purchase, scheduling, finance, Venue UI,
  and existing migrations with the corrected workflow. The focused VenueManager
  test passed 4/4 and Web typecheck passed. The first test attempt hit Windows
  `spawn EPERM` in the sandbox; the elevated retry passed. Targeted Prettier
  check and `git diff --check` passed with only line-ending notices.
- **Known issue:** purchase-specific Venue entitlement, once-at-purchase
  commission, Venue-scoped customer-source list, and salary income are not yet
  implemented. The pending unique-name development migration remains unapplied.
- **Next:** reconcile revised API/migration details, then implement and verify
  the corrected Venue-first workflow locally in M7.5 Stage 1.

### 2026-09-25 — LOG-204 — Reopen Venue model before further finance work

- **Scope:** Product Owner identified the missing relationship among Student
  purchases, Venue eligibility, Calendar/fixed-Series scheduling, and conditional
  Venue management. They rejected the normal **確認影響範圍** setup step and specified
  default Venue-supplied customer source, a Coach-supplied Student list, prepaid
  Venue purchase entry, low-balance notice, and optional monthly base salary.
- **Outcome:** marked the former monthly-finance Contract as reopened and wrote
  [`M7.5-VENUE-MODEL-REVIEW.md`](M7.5-VENUE-MODEL-REVIEW.md) with the requested
  workflow, current code mismatches, concrete acceptance scenarios, and the
  remaining decisions required to freeze a revised Contract. No schema, API,
  browser flow, or historical data was changed in this documentation review.
- **Verification:** compared the live worktree's Student purchase schema,
  scheduling inputs, finance derivation, Venue editor and prepaid-entry UI with
  the Contract; Prettier check passed for the Contract and review document, and
  targeted `git diff --check` passed (only existing line-ending notices).
- **Known issue:** local finance behavior still follows the previous Contract;
  the unique-name development migration remains unapplied after auto-review
  rejected its two-record cleanup.
- **Next:** resolve the four decisions in the Venue-model review, revise/freeze
  the Contract and Roadmap scope, then resume focused Terra and Sol corrections
  within M7.5 Stage 1. Do not enter Stage 2, M8, or push this package.

### 2026-09-25 — LOG-203 — Calculate Student purchases less Venue expenses

- **Scope:** Product Owner removed the distinction between Coach collection and Venue collection.
  This is a purchase-and-cost calculator, not a settlement ledger.
- **Outcome:** Student purchases enter the month at their full recorded amount regardless of legacy
  collection designation. Commission and rent are Venue expenses; historical Venue payouts no longer
  enter totals. The purchase form shows only the optional fixed Venue, the Venue rule editor no longer
  asks who collected payment, and the Venue detail no longer offers payout entry. The payout HTTP
  routes are removed; historical payout rows remain stored. Finance and Today copy now identify
  purchase totals and a calculated difference. New purchase HTTP requests reject obsolete
  collection fields; correcting an existing purchase keeps its historical metadata intact.
  Customer source remains only for dual-rate commission.
- **Verification:** API 26 files / 105 tests and Web 44 files / 187 tests pass; typechecks and both
  production builds pass. Authenticated desktop and 390×844 browser review confirms the purchase
  form, commission editor, and current-month finance labels. The live finance E2E stopped before
  fixture creation because `.env.e2e` points to local PostgreSQL port 5432, which refused connection.
  No existing Venue or Student record was changed in the browser. No push or remote CI is claimed.

### 2026-09-25 — LOG-202 — Simplify Venue details and fix archive behavior

- **Scope:** correct the Product Owner's numbered review of Venue detail layout, action relevance,
  copy, fee history, and deletion/archive behavior.
- **Outcome:** the detail dialog uses a compact Venue name with a muted expense type beside it;
  name editing opens only on request. **場地支出類型** is the primary action. Prepaid entry appears
  only for prepaid Venues, and actual payout entry appears under **場地代收** only when there are
  Venue-collected sources. Legacy linkage is shown only for matching unlinked history. The initial
  untracked rule is hidden; later dated rules live in a compact disclosure. The API now projects
  whether each Venue can be deleted. Unreferenced active or archived Venues can be deleted with
  confirmation; referenced active Venues can be archived, and archived Venues can be restored.
  Archive no longer runs duplicate-name validation when the name did not change, fixing the failure
  with existing same-name development Venues. The DELETE operation still rechecks references and
  version inside its transaction.
- **Verification:** browser reviewed the detail on desktop and exact 390×844. Web 44 files / 187
  tests and API 26 files / 105 tests pass; both production builds and typechecks pass. Focused tests
  cover conditional controls, versioned direct deletion, unchanged-name archive, and duplicate-name
  archive recovery. `git diff --check` passed. No existing Venue was changed or deleted in live data.
- **Known issue:** the earlier same-name migration remains unapplied after automatic approval review
  rejected its irreversible two-record development-data cleanup. The Venue list still shows those
  original records until that separate migration is authorized.
- **Next:** continue M7.5 Stage 1 local Product Owner review. Keep the duplicate-name migration
  pending until explicitly authorized; do not push or advance to Stage 2.

### 2026-09-25 — LOG-201 — Use Settings currency in Venue management

- **Scope:** the Product Owner removed the redundant currency selector from Venue management's
  fee form and directed it to use the currency chosen under Settings → 收支設定.
- **Outcome:** new rent rules, Venue prepaid purchases, and payouts use that preference. Their
  amount labels show the currency code without a selector. Editing a recorded prepaid purchase or
  payout retains its saved currency. A new rent rule only carries forward the prior amount when
  its currency matches the current preference, avoiding an unconverted amount in another currency.
  Settings copy now describes purchase and Venue finance use.
- **Verification:** focused Venue UI tests passed 2 / 2, including a USD rent-rule preview with
  the correct minor-unit amount and no currency selector. Full Web tests passed 44 files / 185
  tests; Web typecheck and build passed. Browser review confirmed the rent form shows one amount
  field marked `TWD` and no currency control. `git diff --check` passed. No live finance data was
  changed; no push or remote CI claimed.
- **Known issue:** the earlier duplicate-name migration remains unapplied after automatic approval
  review rejected its irreversible two-record development-data cleanup.
- **Next:** continue Stage 1 local Product Owner review; keep the duplicate-name migration pending
  until explicitly authorized, and do not push or advance to Stage 2.

### 2026-09-25 — LOG-200 — Delete an unused archived Venue with simple confirmation

- **Scope:** the Product Owner asked that archived Venues support restore and deletion with a
  confirmation prompt that does not require typing `DELETE`.
- **Outcome:** the Venue editor keeps **恢復場地** and adds **刪除場地** only for archived Venues. A
  standard confirmation names the Venue. The Workspace-scoped `DELETE /v1/venues/:venueId`
  operation checks the supplied version and rejects active Venues or Venues referenced by Sessions,
  fixed Series, Student fixed Venue, Student purchases, Venue credit purchases, or payouts. Unused
  archived Venues and their fee rules are deleted together; referenced history remains intact.
- **Verification:** Web 44 files / 184 tests and API 26 files / 104 tests pass; both production
  builds and typechecks pass. Focused UI test checks restore availability, the no-input confirmation,
  and the versioned DELETE request. Focused repository tests check unused deletion and active or
  referenced rejection. Browser Venue page inspection found no existing archived Venue to safely
  exercise; no live record was deleted. `git diff --check` passed before this Status update.
- **Known issue:** the earlier duplicate-name migration remains unapplied after automatic approval
  review rejected its irreversible cleanup of two existing development records. This change does
  not apply that migration or remove those records.
- **Next:** continue Stage 1 local Product Owner review. The distinct duplicate-name migration
  still requires explicit approval for the exact development-data cleanup before applying it; do
  not push or advance to Stage 2.

### 2026-09-25 — LOG-199 — Place required Venue validation at its field

- **Scope:** correct the Product Owner's feedback on the inline placement from LOG-198.
- **Outcome:** show the red parenthetical validation immediately after `收款場地`, the field it describes;
  `收款方式` remains a clean heading. Keep the layout stable and clear the message when corrected.
- **Verification:** `git diff --check` passed. No tests, build, or browser review run for this narrow correction.
- **Next:** continue M7.5 Stage 1 Product Owner review; preserve local scope and the pending duplicate-Venue migration boundary.

### 2026-09-25 — LOG-198 — Keep purchase validation inline with its label

- **Scope:** apply the Product Owner's error-message placement correction to new and edited purchase forms.
- **Outcome:** remove the standalone error rows that shifted the form layout. When Venue collection
  lacks a Venue, show the validation in red parentheses after `收款方式`; clear it when the user
  chooses a Venue or switches to Coach collection.
- **Verification:** `git diff --check` passed. No tests, build, or browser review run for this narrow correction.
- **Next:** continue M7.5 Stage 1 Product Owner review; preserve local scope and the pending duplicate-Venue migration boundary.

### 2026-09-25 — LOG-197 — One-field Venue entry and separate Venue management

- **Scope:** apply the Product Owner's scheduling and Venue management corrections, including the
  follow-up request that `＋ 新增場地` turn the existing selector slot into a text input without adding
  another row.
- **Outcome:** scheduling and purchase forms can choose an existing Venue or create one in the same
  field. Student fixed Venue uses the same picker. New Venues default to `不記錄場地支出`, and same-name
  input resolves to an existing Venue. The picker collapses legacy same-name options. New scheduling
  no longer has a separate `地點` field or `僅記錄地點` mode. `/students/venues` now owns Venue management,
  linked from Students; 本月收支 retains finance cards and links to the Venue page. Venue create/rename
  reports `該場地已存在。` for a Workspace duplicate; API and notification links target the new route.
- **Verification:** API tests 26 files / 101 tests; Web tests 43 files / 182 tests before the final
  picker de-duplication, then focused Venue tests 3 / 3. API and Web typechecks and builds pass.
  Browser review covered Calendar same-slot input on desktop and exact 390×844, Student links,
  Finance page separation, Venue page desktop/mobile, and duplicate-name manager feedback.
  `git diff --check` passed before the final test/format edits; rerun before delivery. No push or
  remote CI claimed.
- **Known issue:** linked development data contains three `比利時` Venues; read-only inspection found
  no references and only default untracked rules. The pending migration would delete two records and
  add the unique Workspace/name index. Automatic approval review rejected `supabase db push --linked
--yes` because deletion is irreversible and current authorization did not cover that cleanup. The
  migration remains unapplied; manager still exposes the original records for review.
- **Next:** obtain explicit approval for that exact two-record cleanup and migration before applying
  it, then verify the linked schema and Venue flows. Continue Stage 1 local Product Owner review;
  preserve `output/`, and do not push or advance to Stage 2.

### 2026-09-25 — LOG-196 — Restore Web compilation after purchase-form correction

- **Scope:** resolve the Vite syntax overlay reported in the Student purchase fields and the next
  TypeScript error exposed in the same local Venue work.
- **Outcome:** group the Venue selector and validation message into one JSX branch; pass the already
  loaded Venue list from Calendar to its editor so changing Students can apply a fixed Venue.
  Calendar test fixtures now provide that query result.
- **Verification:** the Web typecheck first reproduced the reported parser failure at
  `PurchaseCollectionFields.tsx:69`; after the JSX fix it exposed the Calendar scope error. The Web
  typecheck and production build now pass. Focused Calendar/Venue tests pass 3 files / 15 tests;
  targeted Prettier and `git diff --check` pass. Vite build required the elevated Windows path after
  sandbox `spawn EPERM`; it retains the existing large-chunk advisory. No authenticated browser
  acceptance, push, or remote CI is claimed for this correction.
- **Next:** continue Stage 1 Product Owner review and remaining focused UI/API and desktop/390×844
  acceptance from LOG-195. Keep all changes local and preserve `output/`.

### 2026-09-25 — LOG-195 — Student purchase controls and fixed Venue preference

- **Scope:** apply the Product Owner's six corrections to the M7.5 Stage 1 purchase and Student
  experience while retaining the local-only review boundary and all pre-existing worktree changes.
- **Outcome:** purchase currency selection moved to a **收支設定** card with a TWD default for new
  records; zero amounts now use placeholders; purchase date labels match other fields and share a
  row with lesson count; collection mode is a two-option control defaulting to Coach collection and
  the Venue selector stays visible, using 尚無固定場地 for the optional Student preference and a
  required collecting Venue only for Venue collection. Student profile also has an optional fixed Venue, and
  new fixed-rhythm schedules prefill its Venue/name. Added the nullable tenant-scoped Student Venue
  reference migration and amended the Contract for these Product Owner-directed additions.
- **Verification:** `git diff --check` passed. The linked development migration succeeded as version
  `20260924181013`; a read-only schema query confirmed nullable UUID `default_venue_id`. Automated
  tests and browser acceptance were not run for this follow-up; push and remote CI remain out of
  scope.
- **Next:** continue Stage 1 Product Owner review; run focused UI/API checks and desktop/390×844
  browser acceptance. Keep all changes local and preserve `output/`.

### 2026-09-25 — LOG-194 — Group monthly finances by task

- **Scope:** address the Product Owner's report that the monthly-finance page is difficult to scan;
  give each existing topic and task a titled card without changing finance operations.
- **Outcome:** the current or selected month's overview, conditional missing-data list, transaction
  detail, month history, and Venue management now have separate card boundaries and headings.
  The page title remains 本月收支 and all existing links and controls remain in place.
- **Verification:** Web TypeScript and production build passed; the existing large-chunk advisory
  remains. In the signed-in Chrome page, desktop and exact 390×844 views showed distinct cards;
  mobile document width was 375px within the 390px viewport. Prettier and `git diff --check` passed.
- **Next:** continue Stage 1 Product Owner review and focused corrections; keep Stage 1 local.

### 2026-09-25 — LOG-193 — Finance read failure recovery

- **Scope:** investigate the Product Owner's second report that current finances, month history,
  and Venues all appeared unreadable in the signed-in Chrome page after LOG-192.
- **Outcome:** `/health`, Web proxy, and all three API routes were available when checked. The
  affected browser held errors, but each manual retry succeeded without a data or migration change.
  A direct scoped snapshot of the same development Workspace loaded its 6 purchases, 78 sessions,
  and 6 Series; derived current/month data succeeded. Finance reads now use bounded retry for
  transient network/server failures, and failed finance queries refetch when the Coach returns to
  the page. Healthy cached routes keep the existing no-focus-refetch policy. Calendar interaction
  tests now isolate the independently tested VenueField from their scheduling fixtures.
- **Verification:** a regression test failed against the prior focus policy and passed after the
  finance-specific recovery change. Full Web suite: 43 files / 181 tests passed; Web typecheck and
  production build passed (existing JS chunk advisory). `git diff --check` passed. In the user's
  signed-in Chrome tab, manual retries restored all three blocks; subsequent navigation and reload
  loaded current income ($16,000 TWD), three historical months, and the Venue section without error.
- **Known issue:** the original transient request status was not captured, so the exact outage cause
  remains unconfirmed. The confirmed defect was the page retaining a failed state after service
  recovery. Stage 2 still owns consistent service-unavailable recovery across other Coach routes.
- **Next:** continue Stage 1 Product Owner review and focused corrections; keep Stage 1 local.

### 2026-09-24 — LOG-192 — Linked finance migrations applied; local functionality verified

- **Scope:** resume Monthly finances and venues under the Product Owner's explicit permission to
  apply migrations to the linked development Supabase; resolve the three failing finance panels
  and complete focused Terra/Sol verification.
- **Outcome:** verified the linked destination against the Supabase project's identity, then
  applied `20260924111403_monthly_finances_venues.sql` and
  `20260924125303_monthly_finance_reference_indexes.sql`. Current/month index/Venue reads now
  work. Venue-retained commission appears as reference detail without a second cash expense.
  Credit/payout corrections return affected months; transaction retries re-read contested versions.
  Source links open the matching credit/payout editor. Cached Venue data survives failed refresh.
  History previews show income, expense and difference per currency, including a disappearing
  currency; historical Series must supply customer source when current/future dual rates need it.
  Rent editing respects currency units.
  Purchase create/edit share the same date control and form layout. Receipt dates use Workspace
  time zone; amount-only edits retain the original purchase instant. Indivisible package totals
  remain exact and their approximate unit price no longer blocks form submission. Dialog
  replacement and quick-view-to-edit transitions preserve keyboard focus.
- **Verification:** API 11 files / 55 tests and Web 6 files / 14 tests passed; root typecheck and
  API/Web production build passed. `git diff --check` passed. Build retains the existing chunk-size
  advisory (Web JS 760.25 kB, gzip 219.31 kB; CSS 169.54 kB, gzip 31.17 kB).
  `apps/api/src/e2e/run-finance-live.ts` passed against the linked database and local API using two
  distinct existing test accounts: untracked/free/rent/prepaid/uniform and dual commission,
  both collection modes, exact rounding and missing price, dated history preview/confirm,
  completed-rule pinning, stale versions, simultaneous edits (one 200/one 409 with current entity),
  payout/credit date and amount corrections, generated Series Venue propagation, negative prepaid
  balance, completion/reopen, stable notification/read/dismiss/top-up/new occurrence, cross-Coach
  HTTP denial, and real runtime-role RLS. The runtime inherits `gym_assistant_api` without superuser
  or bypass-RLS privileges. A rerun interrupted by development hot reload was cleaned and rerun
  successfully after `/health` recovered; this interruption was not counted as a pass.
  The applied-schema SQL rollback test passed again. Linked dry-run reports up-to-date. All 78
  prior text-only locations remain unassigned; no legacy costs were fabricated. Uniquely named
  API/browser fixtures and their test notification states were removed after non-interference
  checks, with zero test Student/Venue rows remaining.
- **Browser evidence:** normal Chrome desktop and the existing exact 390×844 preview exercised
  populated current income/expense/difference, historical July and return to current, Venue create,
  rule preview/confirm, prepaid 3 lessons / exact 1000 total, retained balance, source-record opening,
  Student venue-collected purchase, fixed schedule save and generated Calendar course. Mobile
  purchase/Series/Calendar editors retain the selected Venue, usable custom menus and Escape
  behavior. Measured finance document width/scrollWidth 390/390; purchase dialog width 370 with
  save button bottom 818 inside the 844-high viewport; Series Venue menu right edge 361. This is
  browser responsive acceptance, not a physical-device claim.
- **Evidence limits:** automatic review rejected one additional inline Venue creation in the
  signed-in browser Workspace for lack of explicit account-specific mutation authority. No bypass
  was attempted. That extra browser mutation is not claimed as passed: the real inline component
  integration test verifies its name-only authenticated POST, automatic selection and preservation
  of the surrounding draft; real Venue creation/defaults were separately verified by live HTTP and
  the earlier accepted browser Venue setup. The original migration-approval blocker is resolved.
  Supabase security advisors report only the pre-existing
  [disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
  Both new unindexed foreign-key findings were fixed. Remaining
  [foreign-key index findings](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)
  concern the existing Series and Demo-import references; capability-link policies and unused-index
  information remain baseline advisories. No security settings, production data, push or remote CI
  changes were made.
- **Next:** continue Stage 1 Product Owner review and focused corrections; enter Stage 2 only after
  explicit Product Owner direction.

### 2026-09-24 — LOG-191 — Monthly finances local implementation; migration approval boundary

- **Scope:** implement the frozen Monthly finances and venues Contract using the Product Owner's
  selected Astra workflow, preserving existing Student visual work and Stage 1 locality.
- **Outcome:** added private Venue/rule/credit/payout migration, server-owned monthly calculations,
  paginated month index, versioned Venue/rule/history/purchase operations, Session/Series optional
  Venue/source fields, and prepaid threshold occurrence handling. Student collection designation
  and actual venue payouts feed the same income accounting. Web has current/historical finances,
  Venue management and preview forms, in-context Venue selection, total/unit arithmetic, targeted
  invalidation, and FORM-style responsive composition. This is implementation-in-progress, not
  completed Terra/Sol acceptance.
- **Verification:** API 7 focused files / 41 tests and Web 4 focused files / 9 tests passed;
  root typecheck and API/Web production build passed (existing >500-kB bundle advisory remains).
  A real linked-development BEGIN/ROLLBACK migration check passed, preserving 78 text-only locations.
  `supabase/tests/monthly-finances.sql` additionally passed rule pinning, top-up/reopen/new threshold
  occurrence, repeat-refresh stability, location preservation, cross-Workspace composite FK,
  private grants and policy-presence assertions. All fixture/schema writes were rolled back.
  Linked dry-run listed only the pending finance migration. Chrome desktop and the existing
  390×844 preview reached the new route; only loading/error presentation was observed.
- **Known issues / limits:** automatic approval review rejected persistent linked `db push`, citing
  missing explicit remote-schema authorization and destination/shared-impact evidence. An async
  authorization question is pending; do not retry the persistent operation without resolving it.
  The Management API temporary role could not `SET ROLE gym_assistant_api`, so role-level row
  isolation was not proved by that SQL test; real two-Coach/API-role testing is still required.
  Populated UI, all mutation paths, preview concurrency, live backfill, payout/credit corrections,
  and full Sol visual/keyboard/touch acceptance remain unverified. Migration has not been applied;
  local updated reads need that schema. No push, remote CI, Stage 2 transition, or M8 work occurred.
- **Next:** resolve the explicit migration approval, complete Terra live evidence and fixes, then
  finish Sol desktop/exact-390×844 acceptance as described in Next handoff.

### 2026-09-24 — LOG-190 — Monthly finances and venues Contract frozen

- **Scope:** Product Owner added a bounded monthly-finance/Venue package inside M7.5 Stage 1 and
  corrected the prepaid-Venue and historical-month behaviour before implementation.
- **Outcome:** [`M7.5-MONTHLY-FINANCE-CONTRACT.md`](M7.5-MONTHLY-FINANCE-CONTRACT.md) freezes the
  `本月收支` route with an `各月收支紀錄` entry, optional untracked Venues, dated fee rules,
  one-time prepaid Venue expense and completion-time credit use, low Venue-balance notification,
  Student total/unit-price entry, collection modes, backfill, and server-owned monthly totals.
  Roadmap records only this approved Stage 1 addition; CONTEXT defines the new product terms.
- **Verification:** targeted Prettier check and `git diff --check` passed for the Contract,
  Roadmap, Status, and vocabulary. No implementation, database mutation, browser acceptance,
  push, or remote CI is claimed.
- **Known issue:** unrelated local Student entrance/header visual changes and `output/` remain in
  the shared worktree and must be preserved.
- **Next:** implement the Contract's Terra gate, then Sol and focused Stage 1 verification.

### 2026-09-24 — LOG-189 — Mobile Student create-button placement

- **Scope:** keep the mobile Student `新增學生` action on the title row at the right edge with
  appropriate inset from the page boundary.
- **Outcome:** mobile Student header uses a title/action grid and a compact 44px button; the action
  no longer occupies a separate full-width row. Desktop layout is unchanged.
- **Verification:** exact 390×844 preview shows the title and compact `新增學生` button on one row;
  the button stays inset from the right edge, and the search/status controls remain on their own
  following row. `git diff --check` passed. No automated tests were run for this CSS-only adjustment.
- **Next:** continue M7.5 Stage 1 Product Owner review. Enter Stage 2 only after explicit Product
  Owner direction; do not begin M8.

### 2026-09-24 — LOG-188 — Student finance card spacing correction

- **Scope:** reduce the monthly-finance portal's top and bottom inner spacing to match the
  established Student performance portal.
- **Outcome:** removed the oversized minimum height and set desktop and mobile padding to the same
  compact vertical rhythm as the reference card.
- **Verification:** authenticated desktop and exact 390×844 preview show compact inner spacing with
  no excess vertical blank area; existing finance-entry navigation remains visible. `git diff --check`
  passed. No additional automated tests or production build were run for this CSS-only adjustment.
- **Next:** continue M7.5 Stage 1 Product Owner review. Enter Stage 2 only after explicit Product
  Owner direction; do not begin M8.

### 2026-09-24 — LOG-187 — Student finance entrance and return-link correction

- **Scope:** match the Student-list monthly-finance entry to the established Student-detail section
  portal hierarchy and place the finance page's return link at the same upper-left position as the
  Student-detail return link.
- **Outcome:** the entry now has a mono English eyebrow, Chinese heading, brief explanation, larger
  card spacing, and right-arrow affordance. The finance route uses the shared page header with a
  preceding `回到學生列表` link styled like Student detail. Income data and navigation targets are
  unchanged.
- **Verification:** authenticated desktop and exact 390×844 preview showed the entry and return
  layout; the return link navigated to the Student list. Web format, typecheck, and 40 files/174
  tests passed; Web production build passed with the existing >500-kB chunk advisory;
  `git diff --check` passed. No live data mutation, migration, push, or remote CI is claimed.
- **Next:** continue M7.5 Stage 1 Product Owner review. Enter Stage 2 only after explicit Product
  Owner direction; do not begin M8.

### 2026-09-24 — LOG-186 — Stage 1 checkpoint local CI gate

- **Scope:** Product Owner requested full CI and delivery of the current M7.5 Stage 1 corrections to `main`; Stage 1 review remains open.
- **Outcome:** the Student, Series, monthly scheduling, and Training picker changes are ready as one checkpoint. Keep `output/` local and outside the commit.
- **Verification:** clean `npm ci` passed with zero vulnerabilities. Root `npm run check` passed formatting, API typecheck and 23 files/90 tests, and Web typecheck and 40 files/174 tests. Root API/Web production builds passed with only the existing Vite >500-kB chunk advisory. Linked migration dry-run is up to date; `app_private` lint found no schema errors. Linked advisors returned the accepted development leaked-password warning and existing capability-link permissive-policy performance warnings, with no errors. `git diff --check` passed. Earlier Stage 1 logs contain the focused authenticated desktop and 390×844 browser evidence for the changed surfaces. Commit `c70a253` reached `origin/main`; exact-SHA Actions run `35906283925` completed with Verify and migration-dry-run both successful.
- **Known issue:** Stage 1 Product Owner review continues; this checkpoint does not complete M7.5.
- **Next:** resume M7.5 Stage 1 Product Owner review. Enter Stage 2 only after explicit Product Owner direction; do not begin M8.

### 2026-09-24 — LOG-185 — Student introduction wording correction

- **Scope:** make the former training-goal field a flexible, recognizable Student introduction in
  Coach-facing create, edit, roster, detail, and search copy; keep longer aims and context in Notes.
- **Outcome:** `學生簡介` now accepts concise traits such as occupation or labels, and the create form
  uses the same `備註` label as edit/detail. Existing values remain intact and searchable. The
  existing `goal` API/storage key is retained for compatibility; no schema or data migration occurred.
  The product terms are recorded in `CONTEXT.md`.
- **Verification:** authenticated desktop detail/edit and 390×844 create views showed the new label,
  optional example, existing value, and separate Note. Web format, typecheck, and 40 files/174 tests,
  production build, documentation formatting, and `git diff --check` passed. No create/edit
  submission or live data mutation was needed.
- **Known issue:** Stage 1 Product Owner review continues; no push or remote CI is claimed.
- **Next:** continue M7.5 Stage 1 Product Owner review. Enter Stage 2 only after explicit Product
  Owner direction; do not begin M8.

### 2026-09-24 — LOG-184 — Mobile Student roster without next-session row

- **Scope:** trial a shorter mobile Student card by hiding its next-session row.
- **Outcome:** cards at the mobile breakpoint show identity, training goal, and lesson balance with
  progress only. The desktop roster and Student detail still show the existing next-session data.
- **Verification:** authenticated 390×844 Chrome preview showed more Student cards per viewport,
  retained readable lesson counts, and no visible horizontal overflow. Web production build,
  targeted formatting, and `git diff --check` passed; no new tests were needed for this CSS-only
  presentation trial.
- **Known issue:** Stage 1 Product Owner review continues; no push or remote CI is claimed.
- **Next:** continue M7.5 Stage 1 Product Owner review. Enter Stage 2 only after explicit Product
  Owner direction; do not begin M8.

### 2026-09-24 — LOG-183 — Mobile Student roster density correction

- **Scope:** reduce the height of each Student card on the mobile roster without removing its
  identity, goal, remaining/purchased lessons, progress track, or next-session entry.
- **Outcome:** the mobile-only card uses a smaller avatar and tighter card, balance, progress-track,
  and next-session spacing. Desktop card layout and Student data are unchanged.
- **Verification:** authenticated 390×844 Chrome preview showed the first card about one-fifth
  shorter while its facts and navigation remained legible; no horizontal overflow was visible.
  Web production build and `git diff --check` passed. This CSS-only Stage 1 correction did not
  require new tests.
- **Known issue:** Stage 1 review continues; no push or remote CI is claimed.
- **Next:** continue M7.5 Stage 1 Product Owner review. Enter Stage 2 only after explicit Product
  Owner direction; do not begin M8.

### 2026-09-24 — LOG-182 — Student record controls and feedback correction

- **Scope:** remove redundant course-card counts and footer treatment; bring purchase add controls,
  date selection, numeric inputs, and feedback into line with the existing Student interface.
- **Outcome:** course history ends after its final white row without a shaded summary footer. Fixed
  Schedule and Purchase now share the same add-button styles and responsive short label. The purchase
  form reuses the fixed-schedule calendar with its own label, keeps numeric input semantics without
  visible spinner arrows, and omits the private-note placeholder. Successful Student/Purchase
  mutations no longer print a status line in the page; actionable errors remain visible.
- **Verification:** Web format, typecheck, and 40 files/174 tests passed; Web production build passed
  with its existing >500-kB chunk advisory; `git diff --check` passed. Authenticated desktop and
  exact 390×844 Chrome views confirmed the card ending, matched add buttons, reusable date picker,
  mobile calendar fit, and focus returning to the add trigger after closing.
- **Known issue:** Stage 1 review continues; no push or remote CI is claimed.
- **Next:** continue M7.5 Stage 1 Product Owner review. Enter Stage 2 only after explicit Product
  Owner direction; do not begin M8.

### 2026-09-24 — LOG-181 — Student course and purchase records presentation

- **Scope:** align the Student course history with the surrounding page, compress each course row,
  and bring the purchase ledger and add flow closer to the Demo reference.
- **Outcome:** course history now uses a white card and page-scale heading, one-line desktop
  time/location rows, compact spacing, and a centered completed count without the redundant next
  lesson footer. The purchase ledger has the Demo's labeled header and date, lessons, amount, note,
  and icon-action columns with slightly larger text. Add opens a focused `新增購課紀錄` dialog and
  preserves the existing server mutation.
- **Verification:** Web format, typecheck, and 40 files/174 tests passed; Web production build passed
  with the existing >500-kB chunk advisory; `git diff --check` passed. Authenticated desktop and
  390×844 Chrome views confirmed the layout, purchase dialog, and focus returning to its trigger.
  The initial sandbox Vite `spawn EPERM` was resolved by the elevated rerun.
- **Known issue:** local Stage 1 review continues; no push or remote CI is claimed.
- **Next:** continue M7.5 Stage 1 Product Owner review. Enter Stage 2 only after explicit Product
  Owner direction; do not begin M8.

### 2026-09-24 — LOG-180 — Student detail card and management placement

- **Scope:** group the student identity, remaining lessons, and basic profile into one card; add the
  desktop age/note divider and centered note content; move Archive/Restore to the page bottom.
- **Outcome:** the existing identity and profile layout now sits within one bordered card on desktop
  and mobile. Remaining lessons occupies the far-right identity position with slightly larger type.
  Desktop facts have evenly positioned column dividers, and note content is centered. Archive or
  Restore, plus permanent deletion when archived, follows the purchase history at page bottom.
- **Verification:** authenticated desktop and 390×844 browser views confirmed the shared card and
  right-aligned balance; desktop view confirmed both dividers, centered note, and bottom Archive.
  Web format, typecheck, and 40 files/174 tests passed; Web production build passed with its existing
  > 500-kB chunk advisory. `git diff --check` passed.
- **Known issue:** local Stage 1 review continues; no push or remote CI is claimed.
- **Next:** continue M7.5 Stage 1 Product Owner review. Enter Stage 2 only after explicit Product
  Owner direction; do not begin M8.

### 2026-09-24 — LOG-179 — Student profile dialog and age range

- **Scope:** move basic-profile editing into a dialog; move remaining lessons to the identity row;
  replace its profile fact with a selectable age range; refine 390×844 alignment and the fixed
  schedule add button.
- **Outcome:** profile editing uses a scrollable dialog and shared `FormSelect` with optional age
  bands. The age range is validated and stored in the Workspace-scoped Student record, with existing
  Students left unset. Mobile facts have a centered divider and values, while labels stay left;
  remaining lessons appear beside the name and the schedule button reads `新增`.
- **Verification:** linked development migration `20260923172115` applied; subsequent dry-run was
  up-to-date. Authenticated desktop and 390×844 review confirmed the dialog, dropdown, placement,
  and a saved age range after a fresh route load. The isolated test student's age range was restored
  to unset. API typecheck and 23 files/90 tests passed; Web format, typecheck, and 40 files/174 tests
  passed; API and Web builds passed. `git diff --check` passed.
- **Known issue:** local Stage 1 work only; no push or remote CI is claimed.
- **Next:** continue M7.5 Stage 1 Product Owner review. Enter Stage 2 only after explicit Product
  Owner direction; do not begin M8.

### 2026-09-24 — LOG-178 — Student detail responsive hierarchy

- **Scope:** refine the Student detail header, profile facts, fixed-schedule row, and performance
  entrance after Product Owner desktop and mobile review.
- **Outcome:** Archive/Restore sits beside the student name at 390 px. Mobile profile facts now use a
  compact two-column layout with a separate note row and visible edit heading. The fixed-schedule
  status shares the row with the time while the schedule item is shorter. The performance entrance
  keeps its English eyebrow and uses the same title size and outer spacing as the schedule card on
  desktop and mobile.
- **Verification:** authenticated desktop and 390×844 browser reviews confirmed the requested
  placement and matching section hierarchy. Web format, typecheck, and 40 files/174 tests passed;
  Web production build passed with its existing >500-kB chunk advisory. `git diff --check` passed.
- **Known issue:** local Stage 1 presentation work only; no push or remote CI is claimed.
- **Next:** continue M7.5 Stage 1 Product Owner review. Enter Stage 2 only after explicit Product
  Owner direction; do not begin M8.

### 2026-09-24 — LOG-177 — Performance entrance and directory sorting refinement

- **Scope:** remove the Student performance entrance icon, shorten personal-best summaries, and
  offer count or recency ordering inside the complete movement directory.
- **Outcome:** the entrance now begins with its title and supporting copy. Best values show only
  numbers and units, such as `102.5 kg / 5 次`. The directory introduction keeps only the action
  instruction, and its shared custom selector offers `最多筆數` and `最新紀錄` in descending order.
- **Verification:** authenticated desktop review confirmed the icon-free entrance, compact best
  values, and a real four-movement ordering change when switching to latest records. The 390×844
  preview confirmed the modal and opened selector fit without horizontal overflow. Web format,
  typecheck, and 40 files/174 tests passed; Web production build passed with the existing >500-kB
  chunk advisory. `git diff --check` passed.
- **Known issue:** this is local Stage 1 presentation work; no push or remote CI is claimed.
- **Next:** continue M7.5 Stage 1 Product Owner review. Enter Stage 2 only after explicit Product
  Owner direction; do not begin M8.

### 2026-09-24 — LOG-176 — Student facts, fixed schedule deletion, and performance entry

- **Scope:** refine Student profile facts and edit focus; allow confirmed fixed-schedule deletion
  from its editor with a Delete shortcut; replace the inline performance preview with one designed
  entrance and a complete directory ordered by record count.
- **Outcome:** Phone, remaining lessons, and notes now use three evenly spaced desktop columns.
  Leaving profile edit by pointer clears the lingering button focus. The Series editor opens a
  deletion warning from its button or Delete key; a versioned, Workspace-scoped API operation
  removes the Series while the existing foreign key detaches and preserves its Course Sessions.
  The Student page has one compact performance entrance; its modal shows every movement in
  descending valid-record count with count, latest record, and a single-line best summary.
- **Verification:** root check passed API 23 files/88 tests and Web 40 files/174 tests. Root
  production build passed with the existing >500-kB chunk advisory. Authenticated desktop review
  confirmed the three facts, no persistent pointer focus after edit, the single performance
  entrance and directory, and both button and Delete-key routes to the Series warning. The
  390×844 preview showed the entrance and modal without horizontal overflow. `git diff --check`
  passed. The sandboxed test attempt hit the known Windows `spawn EPERM`; the elevated run passed.
- **Known issue:** the deletion confirmation was verified without deleting the existing test
  Series, so no live deletion or restoration of that fixture is claimed. The physical-phone
  acceptance remains open. This Stage 1 change is local; no push or remote CI is claimed.
- **Next:** continue M7.5 Stage 1 Product Owner review. Enter Stage 2 only after explicit Product
  Owner direction; do not begin M8.

### 2026-09-23 — LOG-175 — Monthly fixed schedules and editor control correction

- **Scope:** apply the Product Owner's annotated Series-editor corrections and confirmed monthly rule: repeat on the same local calendar date, clamping to month end when needed.
- **Outcome:** narrowed the automatic scheduling field, gave the adjacent status switch more space, reduced the explanatory copy, replaced the editable start-time field with 15-minute choices, and replaced the browser date input with a calendar that closes on the next trigger click. Added `每一個月` frequency; Series uses `intervalWeeks=0` as the monthly marker while existing 1/2-week rows retain their meaning. Reconciliation computes months from the original local date, so 31 January leads to 28 February then 31 March in a non-leap year. The editor and API now cap new automatic scheduling at two weeks; the migration converts existing `MAX_WINDOW` rows to `2_WEEKS` and tightens the database check. Existing future Sessions retain their date when an edit leaves the historical start date untouched.
- **Verification:** authenticated desktop Chrome and 390×844 preview showed the smaller copy, spacing, non-editable time options, monthly choice, and deterministic date-picker open/close. Linked development migration `20260923153034` applied, database constraints queried, and linked dry-run reported up-to-date. API/Web typechecks and production builds passed; API 23 files/86 tests and Web 40 files/174 tests passed. Targeted Prettier and `git diff --check` passed. Web build retained its existing >500-kB advisory.
- **Known issue:** physical-phone touch acceptance remains open. This is local Stage 1 work; no push or remote CI claim.
- **Next:** continue the Product Owner's stepwise Student-detail review; Stage 2 remains Product Owner-gated.

### 2026-09-23 — LOG-174 — Student detail facts and fixed-series editor layout

- **Scope:** apply the Product Owner's two annotated Student-detail corrections to balance placement, archive copy, fixed-time grid, and the Series editor fields.
- **Outcome:** replaced the visible Profile heading with the remaining-lesson count, removed its duplicate beside the name, shortened the action to bold `封存`, and removed the redundant manual future-course recheck action. Fixed-time cards now occupy two columns on desktop and wrap in reading order. The editor aligns date/time, duration/location, then frequency/automatic range/status with deliberate gaps; its status switch is compact and aligned. Duration uses 30–180 minute choices in 30-minute steps, defaulting to 60 for new Series while preserving an existing out-of-range value on edit. Start time uses the Calendar's 15-minute picker.
- **Verification:** authenticated desktop Chrome and 390×844 preview showed the layout and editor without a visible horizontal overflow. Browser accessibility tree confirmed the duration choices and 15-minute time sequence. Web TypeScript, production build, 39 test files/173 tests, targeted Prettier, and `git diff --check` passed. The build retained its existing >500-kB bundle advisory.
- **Known issue:** physical-phone touch acceptance remains open. This is local Stage 1 work; no push or remote CI claim.
- **Next:** continue the Product Owner's stepwise Student-detail review; Stage 2 remains Product Owner-gated.

### 2026-09-23 — LOG-173 — Student header facts and fixed-series switch

- **Scope:** refine the Student detail page from the Product Owner's annotated screenshots: move remaining lessons beside the name, remove the unwanted stats row, align phone before a labelled note, reduce the fixed-course panel, and clarify the fixed-series editor controls.
- **Outcome:** the header shows only remaining lessons; the profile facts read `電話` then `備註`, with `[ 無備註 ]` when blank. The fixed-course panel uses a smaller header and row. Editing an existing Series now shows one `使用中／已停用` switch. Removed the `從下一堂課開始套用新時間` checkbox because omitting its optional pivot already updates the first future scheduled Session linked to that Series under the M4 contract; no API behavior changed.
- **Verification:** authenticated desktop Chrome and the 390×844 preview showed the new placement and compact panel. The Series editor exposed one accessible switch, toggled its state, and was cancelled without saving. Web production build and 39 test files/173 tests passed. Prettier and `git diff --check` passed. The build retained its existing >500-kB bundle advisory.
- **Known issue:** physical-phone touch acceptance remains open. This is local Stage 1 work; no push or remote CI claim.
- **Next:** continue the Product Owner's stepwise Student-detail review; Stage 2 remains Product Owner-gated.

### 2026-09-23 — LOG-172 — Compact Student detail header and lesson statistics

- **Scope:** address the Product Owner's finding that the Student detail page uses oversized type and large, mostly empty cards.
- **Outcome:** reduced the avatar and name to header scale, integrated the personal facts and edit action into that header, and replaced the large dark lesson card with one compact row for purchased, completed, and remaining lessons. The remaining count has a subtle lime tint; low and negative balances keep their existing attention text. No attendance rate was added because the current projection does not establish attendance as a metric.
- **Verification:** authenticated desktop Chrome and the 390×844 preview showed the consolidated header, readable three-column stats, no visible horizontal overflow, and the fixed-time section directly below. Web production build and targeted Prettier passed; `git diff --check` passed. The build retained the existing >500-kB bundle advisory. No test behavior changed; the prior Web suite passed 39 files/173 tests before this visual correction.
- **Known issue:** physical-phone touch acceptance remains open. This is local Stage 1 work; no push or remote CI claim.
- **Next:** continue the Product Owner's stepwise Student-detail review; Stage 2 remains Product Owner-gated.

### 2026-09-23 — LOG-171 — Training picker button style and copy

- **Scope:** give the no-results `清除篩選` action the shared secondary-button style. In the
  Training picker only, change the toolbar action to black with white text and label it
  `＋自訂動作`; the Exercise Library page keeps its own action style.
- **Outcome:** no browser-default button remains in the picker's empty state. The action remains
  distinct from the selected filter tab on desktop and at 390×844.
- **Verification:** authenticated Chrome reached zero results through combined filters and
  confirmed computed styles: secondary button 46px with site border, toolbar action black/white;
  exact 390×844 had no horizontal overflow. Focused picker tests passed 2/2, Web typecheck,
  targeted Prettier, and `git diff --check` passed. No data mutation, push, or remote CI.
- **Next:** continue Stage 1 Product Owner review; Stage 2 remains Product Owner-gated.

### 2026-09-23 — LOG-170 — Student detail header, overview, and fixed course time

- **Scope:** follow the Product Owner's Demo-guided visual review of the Student detail header, remaining lessons and personal details, and fixed course time. Remove the lesson formula copy, LINE line, and `不會分享` badge; put back navigation at top left and editing by the profile card.
- **Outcome:** the header now has the Student avatar, status, name, and goal. Remaining lessons and a read-only personal-details card sit side by side on desktop; `編輯` opens the existing fields and closes after a successful save. `固定課程時間` displays weekday/time, frequency, duration, location, and active status; the weekday badge is lime only for active rows and gray otherwise. `新增時段` uses a dark button; the existing future-course reconciliation remains a secondary action.
- **Verification:** authenticated Chrome checked desktop layout, profile-edit toggle, fixed-time editor, and the 390×844 preview including the fixed-time card and editor. Web typecheck, production build, and 39 test files/173 tests passed. Prettier and `git diff --check` passed. The build retained the existing >500-kB bundle advisory.
- **Known issue:** physical-phone touch acceptance remains open. This is local Stage 1 work; no push or remote CI claim.
- **Next:** continue the Product Owner's stepwise Student-detail review; Stage 2 remains Product Owner-gated.

### 2026-09-23 — LOG-169 — Compact Training picker controls

- **Scope:** place search, All/Favorite/Custom tabs, and the renamed `新增動作` action in one desktop
  toolbar; keep the action beside the tabs on mobile with search above. Move `清除篩選` beside the
  body-part choices and make the row's favorite/edit/delete button backgrounds transparent.
- **Outcome:** the picker retains its fixed height and independent result scrolling. At 390×844,
  the controls stay within 390px, the three row actions remain 44px touch targets, and the clear
  action stays inside the filter's existing row.
- **Verification:** authenticated Chrome checked desktop 1440×675 and exact 390×844 placement,
  filter selection, picker height, no horizontal overflow, and computed transparent backgrounds.
  Focused picker tests passed 2/2; Web typecheck, targeted Prettier, and `git diff --check` passed.
  No data mutation, push, or remote CI was performed.
- **Next:** continue Stage 1 Product Owner review; Stage 2 remains Product Owner-gated.

### 2026-09-23 — LOG-168 — Training picker uses the Exercise Library controls

- **Scope:** the Session Training `加入動作` dialog now uses the Exercise Library's Coach-scoped
  search, equipment/type/body-part filters, favorite toggle, definition create/edit/delete flows,
  and shared `FormSelect`. Creating a definition here adds it to the current Training record.
- **Outcome:** the picker has a fixed viewport-bounded height, with its result list scrolling
  independently. The 390×844 layout keeps all body-part choices visible and uses 44px action
  targets. The underlying Training draft and existing library authority remain unchanged.
- **Verification:** the picker regression was red before the fix and now passes, including combined
  filters, nested editor return, and create-to-add. Focused Web tests passed 4 files/29 tests;
  TypeScript, Prettier, Web production build, and `git diff --check` passed. Authenticated Chrome
  checked desktop 1440×675 and exact 390×844: 108 results and zero matches kept the same picker
  height; the result area alone scrolled, custom select opened, and editor focus/Escape returned
  to the picker. The create mutation was verified with a mocked response; no live definition was
  created or deleted. Build retained the existing >500-kB chunk advisory.
- **Next:** continue Stage 1 issue review; Stage 2 remains Product Owner-gated. No push or remote CI
  was run for this correction.

### 2026-09-23 — LOG-167 — Student detail hierarchy and archive-first action

- **Scope:** reorder the Student detail page as remaining lessons and personal details, fixed course rhythm, performance, course records, then purchase records. Place purchase registration under `購課紀錄` → `新增`, and offer permanent Student deletion only after archiving.
- **Outcome:** the personal-details form no longer uses an active-state checkbox; it offers `封存學生` or `恢復學生`, with `永久刪除` appearing only in the archived state. The purchase form opens within its record section and closes after successful registration. No API or schema contract changed.
- **Verification:** authenticated Chrome confirmed the section order and purchase-form toggle on desktop and in the 390×844 preview. An isolated fictional Student was archived, the deletion action appeared, and the Student was restored with that action gone. Web typecheck, production build, and 39 test files/172 tests passed; Vite/Vitest required the approved elevated Windows path after sandbox `spawn EPERM`.
- **Known issue:** archive-only deletion is a UI hierarchy change in this local correction; server policy is unchanged. Physical-phone touch acceptance remains open. No push or remote CI claim.
- **Next:** continue the Product Owner's Student-detail review, then the M7.5 Stage 2 Contract handoff; do not enter M8.

### 2026-09-23 — LOG-166 — Student-card goal text clearance

- **Scope:** add a little breathing room between the training-goal line and the balance divider on desktop Student cards.
- **Outcome:** the goal line now leaves 12px beneath it before the following balance section; the existing mobile grid keeps its prior margin.
- **Verification:** authenticated desktop Chrome showed the goal and divider visibly separated across the four-card row. Targeted CSS Prettier check and `git diff --check` passed. This visual-only nudge did not warrant another test or build run.
- **Known issue:** physical-phone touch acceptance remains open. This is local work with no push or remote CI claim.
- **Next:** begin the M7.5 Stage 2 Contract preparation from the current handoff; do not enter M8.

### 2026-09-23 — LOG-165 — Ease Student-card spacing and keep refresh status out of the switch

- **Scope:** respond to the Product Owner's Student-roster visual review and the report that `更新中` shifts the active/archive control.
- **Outcome:** reduced the desktop card's avatar, name, and balance number; increased the spacing around the balance divider, progress bar, and next-course block; darkened secondary card text. The roster refresh label is absolutely positioned in the toolbar so it no longer participates in the control row's flex layout. Mobile keeps its 54px avatar and sticky toolbar.
- **Verification:** authenticated desktop Chrome showed four cards per row with less crowded sections; the 390×844 preview showed readable stacked cards without visible horizontal clipping. Web typecheck and production build passed with the existing bundle-size advisory; targeted Prettier and `git diff --check` passed. No additional tests were added for this CSS-only correction.
- **Known issue:** physical-phone touch acceptance remains open. This is local work with no push or remote CI claim.
- **Next:** begin the M7.5 Stage 2 Contract preparation from the current handoff; do not enter M8.

### 2026-09-23 — LOG-164 — Student roster compact cards and income-page entry

- **Scope:** apply the Product Owner's limited Student-page review: active/archive counts, four-across desktop cards, lesson progress, next scheduled Course Session or `尚未安排`, and a bottom `每月收支` entry containing the former cumulative-received summary. Omit the Demo's presence dot.
- **Outcome:** the existing Student roster projection now adds the nearest future scheduled Session under the verified Workspace, using the existing course-session index; schedule writes invalidate the roster. The Student page no longer loads income in the background. The new income route retains the prior cumulative total and makes no monthly calculation or expense claim.
- **Verification:** API and Web typechecks passed; API tests 23 files/84 tests and Web tests 38 files/171 tests passed with one worker using the approved Windows elevated path after sandbox `spawn EPERM`; root production build passed with the existing chunk-size advisory; targeted Prettier and `git diff --check` passed. Authenticated desktop Chrome showed four cards per row, counts, scheduled and unarranged next-course states, and the income route. The 390×844 desktop preview showed the compact Student card and income route without visible horizontal clipping.
- **Known issue:** physical-phone touch acceptance and Stage 2 backlog remain open. This local correction has no push or remote CI claim; `output/` remains untracked.
- **Next:** continue M7.5 Stage 2 Contract preparation and the route-by-route review; do not enter M8.

### 2026-09-23 — LOG-163 — Training and trajectory Stage 1 checkpoint local CI gate

- **Scope:** run the Product Owner-requested full local CI gate for the current mobile Training,
  trajectory, history-navigation, draft-isolation, and summary corrections before Main delivery.
- **Outcome:** the existing dev Web process was temporarily stopped so `npm ci` could replace its
  locked native dependency. It and the API were restored with 200 responses from Web and `/health`.
  The source checkpoint `09f9eaf` reached `origin/main`; untracked `output/` screenshots remain
  local evidence.
- **Verification:** clean `npm ci` completed with zero reported vulnerabilities; root `npm run check`
  passed (API 23 files / 84 tests; Web 38 files / 171 tests), root `npm run build` passed with the
  existing >500-kB bundle advisory, linked migration dry-run reported up to date, and
  `git diff --check` passed. The changed desktop and exact 390×844 surfaces were visually reviewed
  during LOG-158–162. Exact-SHA GitHub Actions run `35840171334` completed successfully, with both
  Verify and migration-dry-run jobs green; `origin/main` was independently confirmed at `09f9eaf`.
- **Known issue:** physical-phone touch acceptance and the deferred Stage 2 backlog remain open;
  neither is represented as M7.5 completion.
- **Next:** begin the Stage 2 Contract without entering M8.

### 2026-09-23 — LOG-162 — Remove redundant weight metric prefix from Training summaries

- **Scope:** remove the repeated `重量：` prefix from current/previous and personal-best summary
  values on both desktop and mobile, while making those weight values slightly larger.
- **Outcome:** weight summaries now show their values and units directly under the existing summary
  headings. Other primary metrics retain their metric and distance context. Desktop and mobile
  weight-specific font sizes are scoped separately; layout columns and trajectory actions remain
  unchanged.
- **Verification:** authenticated desktop and 390×844 Chrome views showed weight values without the
  prefix, with readable spacing and kg units. Web build and diff check passed.
- **Known issue:** physical-phone acceptance remains open. A pre-existing local draft conflict was
  visible in the mobile preview; no conflict-resolution action or data edit was made during this
  visual correction. This is local Stage 1 work with no push or remote CI claim.
- **Next:** continue the existing M7.5 Stage 1 Product Owner handoff; Stage 2 and M8 remain gated.

### 2026-09-23 — LOG-161 — Separate desktop and mobile Training summary alignment

- **Scope:** correct the Product Owner's desktop trajectory button gap introduced during mobile
  summary refinement, and improve the mobile personal-best clearance and trajectory button width.
- **Outcome:** desktop summary actions use their own breakpoint rule so the trajectory button sits
  between the personal-best column and remove action with comparable horizontal gaps and centered
  vertical alignment. Mobile summary columns give the longer current/previous values more width,
  inset personal-best text farther from the divider, and widen the trajectory action. A small
  first-value letter-spacing adjustment keeps longer values clear of the divider. Desktop and
  mobile rules are explicit and independent.
- **Verification:** authenticated Chrome showed the desktop Session summary with balanced action
  spacing and the 390×844 mobile preview with clear value/divider spacing and the wider button.
  Web build and diff check passed.
- **Known issue:** physical-phone acceptance remains open. This is a local Stage 1 correction; no
  push or remote CI is claimed.
- **Next:** continue the existing M7.5 Stage 1 Product Owner handoff; Stage 2 and M8 remain gated.

### 2026-09-23 — LOG-160 — Mobile Training density and footer spacing

- **Scope:** refine the small mobile exercise summary value, trajectory action's right inset,
  excessive space after the last exercise, completion/reopen footer spacing, and RPE input alignment.
- **Outcome:** mobile summary values use a larger font and the trajectory button has a right inset.
  The long-list bottom gap no longer stacks workspace and editor reserves; the editor keeps a small
  clearance above the fixed footer. The footer button has balanced space above and below its visible
  portion, and RPE values are centered. The Product Owner confirmed the `1332 kg` value was a
  deliberate 9/21 test edit copied into the 8/24 local draft during the old bug. The observed
  conflict prevented a backend save; the cross-Session editor remount from LOG-159 addresses the
  underlying route-state reuse. No backend record was changed in this correction.
- **Verification:** authenticated Chrome 390×844 preview showed the 9-group Session's last exercise,
  the add-exercise control with a short gap above the footer, centered RPE values, the summary
  button inset, and equal visible footer spacing. Web build and diff check passed.
- **Known issue:** physical-phone acceptance remains open. This is a local Stage 1 correction; no
  push or remote CI is claimed.
- **Next:** continue the existing M7.5 Stage 1 Product Owner handoff; Stage 2 and M8 remain gated.

### 2026-09-23 — LOG-159 — Mobile trajectory polish and Session draft isolation

- **Scope:** refine the mobile chart axis/plot, history rows, Training summary/actions/footer, and
  investigate a history jump that displayed the prior Session's Training draft under the destination
  Session with a version-conflict warning.
- **Outcome:** the mobile plot extends farther horizontally while its axis labels move away from the
  first data point. History dates stay left and values right; hover changes the row background while
  keyboard focus remains visible. Training summaries balance the two values around a centered
  divider, show the full trajectory label, and leave room for icon-bearing Session actions. The
  footer shows progress beside a compact completion button. The editor now remounts for each
  Coach/Session identity, resetting its draft, save coordinator, lease, and version references before
  the destination Training record appears. This prevents a prior Session draft from being submitted
  using the destination Session ID. History navigation still scrolls the matching exercise into view.
- **Verification:** a focused regression failed before the editor-key fix because the destination
  exercise was absent; after the fix, both destination-content and pending-source-save regressions
  passed. Web checks passed **38 files / 171 tests**, and the production build and `git diff --check`
  passed. Authenticated Chrome's 390×844 preview showed the expanded chart, separated axis labels,
  history row alignment, icon-bearing Session actions, balanced exercise summary, and compact footer
  with progress. The existing >500-kB build advisory remains.
- **Known issue:** the existing 8/24 browser draft already contains conflicting, apparently stale
  content from before this correction. The version conflict blocked its save in the observed run;
  no server overwrite was observed. Its provenance is unconfirmed, so it was preserved pending the
  Product Owner's answer about whether that local draft is disposable. Physical-phone acceptance
  remains open. This is a local Stage 1 correction; no push or remote CI is claimed.
- **Next:** continue M7.5 Stage 1 review; resolve the preserved 8/24 conflict draft only after its
  ownership is confirmed, then follow the existing Next handoff. Stage 2 and M8 remain gated.

### 2026-09-23 — LOG-158 — Mobile Training summary and trajectory space

- **Scope:** address the Product Owner's three mobile screenshots: opaque Logo backing, Training
  card summary spacing, trajectory summary/chart spacing, and history-to-Training navigation.
- **Outcome:** the mobile header uses a solid dark background so the horizontal white Logo remains
  legible. Training summaries begin at the card's left edge and give the trajectory action more
  width. The trajectory's two summary values occupy equal columns around a centered divider; the
  mobile plot starts 41 SVG units farther left, with axis labels nearer its edge. History rows open
  the recorded Session and scroll the matching Exercise into view, with a visible focus outline.
- **Verification:** Web format/TypeScript and **38 files / 169 tests** passed; Web production build
  passed with the existing >500-kB bundle advisory; `git diff --check` passed. The first sandboxed
  Vitest/build attempt hit Windows `spawn EPERM`; the approved elevated rerun passed. Authenticated
  Chrome's 390×844 preview showed the solid dark header, expanded plot, centered summary divider,
  and the 8/31 history jump to the correct completed Session with 高背槓深蹲 visible and outlined.
- **Known issue:** physical-phone touch acceptance remains open in Stage 1. This is a local review
  correction; no push or remote CI is claimed.
- **Next:** continue M7.5 Stage 1 Product Owner review and the existing Next handoff; Stage 2 and M8
  remain gated by explicit Product Owner authorization.

### 2026-09-23 — LOG-157 — Training reorder local CI gate

- **Scope:** deliver the current M7.5 Stage 1 Training exercise reorder, append-action, drag-boundary,
  and gesture-regression corrections after the Product Owner requested a complete CI run and Main
  push if clean. Preserve the untracked `output/` screenshots as local evidence.
- **Outcome:** no additional product behaviour or schema change; the current corrections are ready
  for a bounded Main delivery while Stage 1 Product Owner review remains active.
- **Verification:** `npm ci` succeeded after pausing the active formal Web/Vite process that locked
  Rolldown; `npm run check` passed Prettier, TypeScript, API **23 files / 84 tests**, and Web **38 files /
  169 tests**; `npm run build` passed API and Web with the existing >500-kB chunk advisory;
  `npm run db:push:dry` found the linked development database up to date; `git diff --check` passed.
  `origin/main` matched local HEAD `74e4f9a` before delivery. Commit
  `9f5d25f3170051629a7e1fc7970f2cd7de67d4b6` reached `origin/main`; GitHub Actions run
  `35775467730` passed `verify` and `migration-dry-run` for that exact SHA.
- **Known issue:** physical-phone touch acceptance for Calendar and Training remains open in Stage 1.
- **Next:** continue the existing M7.5 Stage 1 Next handoff. Stage 2 and M8 remain unauthorized.

### 2026-09-23 — LOG-156 — Prevent native-scroll double compensation at the drag boundary

- **Scope:** fix the remaining list jump in the 18:37 recording and add the requested small top
  gap. Keep the accepted initial-neighbour anchoring and all prior drag/drop corrections.
- **Diagnosis:** reducing shell height can clamp native scrollTop before the following compound
  subtraction reads it. Subtracting the retired leading space again moves the entire list backwards.
  A gesture regression with native-clamp simulation reproduced first-row movement back to 200px
  instead of continuing past about 120px. The previous heading-only fix could not correct this.
- **Outcome:** capture the absolute compensated scroll position before any shell shrink and assign
  that saved position afterwards. The upper drag boundary includes an 8px inset below the sticky
  header; initial-space retirement and upward scroll limits use that same boundary.
- **Verification:** reviewed the supplied recording contact sheet; focused tests pass **3 files /
  31 tests**, including bounded movement across spacer retirement, an exact 8px resting gap, and
  existing drop/heading/cancellation regressions. TypeScript and production build pass with the
  existing bundle-size advisory. No new live browser or physical-phone acceptance is claimed.
  No new animation loop or per-frame layout read was introduced.
- **Next:** Product Owner reviews the corrected boundary transition in M7.5 Stage 1. This remains
  local; no push, remote CI, Stage 2, or M8 transition.

### 2026-09-23 — LOG-155 — Keep the Training heading out after it leaves the drag viewport

- **Scope:** the Product Owner accepted the three drag corrections and requested only the remaining
  heading reappearance fix shown in the 18:10 recording. Retain the independently withdrawable
  initial-neighbour anchor and all previous drop/scroll corrections.
- **Diagnosis:** retiring the initial leading space compensates scrollTop, which can bring the
  already-departed Training heading back into view. Two new gesture regressions failed before the fix.
- **Outcome:** measure the heading's offset once on activation and track it using the existing shell
  rectangle. Once it passes above the usable viewport, keep it hidden for the rest of that gesture.
  Preserve its layout space and restore its original visibility on drop, cancellation, or cleanup.
  This adds no per-frame layout read or idle animation loop.
- **Verification:** focused gesture/reorder/start-anchor checks pass **3 files / 29 tests**, including
  heading re-entry after scroll compensation and visibility restoration on pointerup/pointercancel.
  Web production build (including TypeScript) passes with the existing bundle-size advisory.
  Browser inspection found a pre-existing save conflict in the test session. A short drag did not
  reach the heading-hidden condition before release; its exercise order remained unchanged. The
  conflict was not resolved or overwritten, and the extra test tab was closed. Complete live
  heading-transition acceptance remains with Product Owner review; automated geometry checks are
  not physical-phone evidence.
- **Next:** continue M7.5 Stage 1 review of this local correction. No push, remote CI, Stage 2, or M8.

### 2026-09-23 — LOG-154 — Drop visibility, scroll boundaries, and isolated start-anchor trial

- **Scope:** implemented the Product Owner's three follow-ups from the 17:18, 17:25, and 17:26
  recordings. Keep the now-smooth gesture lifecycle; preserve the current nine-exercise order and
  existing uncommitted work. The third behaviour is an explicitly optional, independently withdrawable
  trial; Stage 1 remains active.
- **Diagnosis:** four new editor geometry cases initially failed: expanded drop target below the
  viewport, upward scroll not activating below the sticky header, scroll continuing into footer
  padding after the final row, and initial second-row placement at 266px instead of its held 460px.
  Compaction could exhaust the browser's available scroll correction; expansion had no corresponding
  target-position restoration. Normal editor reading padding was also retained during dragging.
- **Outcome:** on release, a layout effect restores the expanded target into the usable viewport
  before paint, showing the whole card when it fits and its heading when it is taller than the view.
  Capture the real sticky-header bottom and fixed-footer top, lower the upward activation threshold,
  bound each scroll step by the first/last actual row, and reserve the fixed controls only once in
  drag-mode CSS. The optional `exercise-drag-start-anchor.ts` module supplies only the initial space
  that native scrolling cannot provide, keeping the held row between its original neighbours. Each
  temporary edge is retired when the corresponding real row reaches the viewport boundary; leading
  removal compensates scrollTop to avoid a jump. The space never grows again during that gesture.
- **Independent withdrawal:** change only `ENABLE_DRAG_START_ANCHOR` to `false` in that module. Do not
  remove the always-on drop restoration, `boundedDragScroll`, or drag-only CSS padding correction.
  Integration coverage runs drop restoration with the experiment both enabled and disabled.
- **Verification:** focused tests pass 27/27; complete Web regression passes **38 files / 165 tests**;
  typecheck and production build pass with the existing >500-kB bundle advisory. Authenticated desktop
  and exact 390×844 browser drags both moved item 2 to item 5 and retained the expanded target in view.
  At 390×844, the target occupied about y=458–709 above the footer at y=719; upward dragging at y=230
  worked beneath the sticky-header bottom at y=181. Concurrent read-only inspection during desktop
  activation found the held second row between rows 1 and 3 with about 171px initial leading space.
  Drag-mode space after the final row measured 75.7px desktop / 124.1px mobile against fixed controls
  of 75.7px / 124.7px, eliminating the extra editor-bottom region. The burst-event/no-idle-loop and
  final-only-save regressions remain green. Original order and normal viewport size were restored;
  a fresh reload showed that same order and `已儲存`.
  These are real browser pointer and simulated touch checks, not physical-phone acceptance.
- **Next:** Product Owner tests all three behaviours; withdraw only the isolated third experiment if
  requested. Continue Stage 1 without push, remote CI, Stage 2, or M8 transition.

### 2026-09-23 — LOG-153 — Training drag lifecycle and skipped-row recovery

- **Scope:** M7.5 Stage 1 correction of the Product Owner's two recordings showing desktop and
  mobile-preview exercise dragging freezing after activation. Preserved prior uncommitted reorder,
  append-action, and CSS work; no schema, API, or persistence-contract change.
- **Diagnosis:** pointer capture and movement handlers belonged to the keyed handle that moves with
  its card. Once capture is lost, subsequent hit-tested movement outside that handle was ignored.
  The overlap-only neighbour test also rejected a pointer that had already crossed a complete row;
  a frame lock could discard motion instead of catching up. A separate lifecycle defect treated
  `pointercancel` as a successful drop. Earlier pure-order tests did not exercise these editor paths.
- **Outcome:** capture now belongs to the stable list shell, with gesture-scoped window listeners
  from pointerdown through release. Directional threshold crossing catches up across every passed
  row in one render without a frame lock. Neighbour animations use one batch and fixed row offsets,
  without per-card layout reads. Drop includes its final pointer position and commits once against
  the latest draft. Cancellation, Escape, window blur, hidden document, and unmount clean up without
  committing a partial order; a second pointer cannot replace the active gesture. Calendar's related
  capture was inspected: it belongs to a stable grid and does not reorder its captured element.
- **Verification:** `npm test --workspace @gym-assistant/web -- TrainingWorkspace.gesture.test.tsx
--maxWorkers=1` initially failed all four original repro cases: mouse/touch off-handle movement,
  skipped rows, and pointer cancellation. The final full Web run passes **37 files / 156 tests**,
  including ten editor gesture cases and eight reorder-rule cases. A deterministic burst of 100
  pointer moves produces one geometry read, one batched exchange-animation callback, no save before
  release, and no idle frame loop. Web typecheck and production build pass; the existing >500-kB
  bundle advisory remains. Browser checks used the authenticated nine-exercise record: desktop
  first-to-sixth then sixth-to-second, and exact 390×844 iframe second-to-sixth then sixth-to-third
  dragging succeed. Keyboard restoration and a fresh editor load confirm the original nine-item
  order; inspected desktop console has no warnings/errors. These are browser/simulated-pointer
  checks, not physical-phone touch or a device CPU/FPS benchmark.
- **Next:** continue Product Owner-led Stage 1 review from the existing handoff. No commit, push,
  remote CI, Stage 2 transition, or M8 work is claimed for this correction.

### 2026-09-22 — LOG-152 — Training reorder scroll and mobile-frame correction

- **Scope:** corrected the Product Owner-recorded desktop runaway/blank-space auto-scroll, blocked
  reverse exchange, and mobile drag stall without changing Training persistence or adding UI copy.
- **Outcome:** compact mode now owns its real 58px-row document height, so browser scrollbar geometry
  changes with the visible list and cannot continue through the old expanded-card blank area. The
  held row is clamped above the fixed footer and within the list while rows scroll beneath it. Edge
  scrolling uses a bounded time-based quadratic ramp with a true neutral zone and immediate direction
  reversal. Pointermove only records the newest point; one requestAnimationFrame performs transform,
  optional scroll, and at most one adjacent exchange. Idle drag performs no frame loop, and each
  exchange waits for one rendered frame before another. Fixed row geometry replaces per-move card
  queries, and both directions require real overlap before exchange. Final release remains the sole
  entry into the existing draft/autosave path.
- **Verification:** focused reorder regression tests pass 8/8 for sequential/final-only commit,
  bidirectional real-overlap thresholds, compact document height, pointer anchoring, viewport/list
  clamping, and neutral/reversible edge speed. Web typecheck passes; complete single-worker Web tests
  pass 36 files/146 tests; production build passes with the existing chunk-size advisory.
  Authenticated desktop browser verification restored the original nine-Exercise order, reloaded it
  as saved, and found zero console warnings/errors. Physical-device touch is not claimed.
- **Next:** continue Product Owner-led M7.5 Stage 1 review from the existing Next handoff; do not
  enter Stage 2 or M8 without explicit authorization.

### 2026-09-22 — LOG-151 — Training exercise reorder and tail-action correction

- **Scope:** corrected the Product Owner-reported duplicate/misplaced add-Exercise actions and the
  inability to rearrange Exercises without deleting and recreating their Sets. This remains local
  M7.5 Stage 1 work and preserves the delivered Training schema, API, autosave, conflict, offline,
  and recovery contracts.
- **Outcome:** empty Training Records keep only the centered lime first-use action. Non-empty records
  keep only one black append action after the final card. Exercise cards expose a compact grip and
  reorder through a browser-local buffer. Press-hold turns rows into a compact layer clipped inside
  the Training list, centered on the active row's unchanged pointer position instead of forcing all
  rows into the viewport. Crossing 32% of an adjacent row exchanges those two positions, so moving
  1→3 visibly performs 1↔2 and then 2↔3. Document-edge auto-scroll exposes offscreen neighbours.
  Pointer motion writes only one CSS transform; it no longer updates React state each frame, queries
  every card, or applies a whole-panel filter. React updates only for an actual exchange, while only
  final release enters the coalesced autosave once. Keyboard arrows provide the same adjacent
  operation without explanatory UI copy.
- **Verification:** focused reorder tests pass 5/5 and Web typecheck passes. Authenticated desktop
  acceptance on the nine-Exercise development fixture covered an adjacent pointer exchange, clean
  release, original-order restoration, and zero retained drag layers. Existing exact 390×844 evidence
  still covers handle/tail-action layout. Complete single-worker Web tests pass 36 files/143 tests;
  the Web production build passes with the existing chunk-size advisory. No physical-device touch,
  migration, linked-database change, commit, push, or remote CI is claimed.
- **Next:** continue Product Owner-led M7.5 Stage 1 review from the existing Next handoff; do not
  enter Stage 2 or M8 without explicit authorization.

### 2026-09-22 — LOG-150 — Calendar CI-race fix delivered

- **Scope:** delivered the Calendar quick-view test synchronization correction discovered by the
  failed documentation follow-up run.
- **Outcome:** commit `37c9be154d6bfb4e415d89eef73535da96e7c761` is on `origin/main`; the
  restored quick-view now has deterministic test coverage for focus-aware Delete handling without
  changing product behaviour. The earlier CI #34 failure remains recorded rather than rewritten.
- **Verification:** remote `origin/main` resolved to the exact fix SHA. GitHub Actions CI #35 / run
  `35698934366` completed successfully in 1m13s: `verify` passed in 49s with API 23 files/84 tests
  and Web 35 files/138 tests, and `migration-dry-run` passed in 17s. Only the existing Node action
  deprecation and future Ubuntu runner-image notices remain.
- **Next:** continue Product Owner-led M7.5 Stage 1 review from the existing Next handoff; do not
  enter Stage 2 or M8 without explicit authorization.

### 2026-09-22 — LOG-149 — Calendar quick-view CI race corrected

- **Scope:** the documentation follow-up at `d288e3d` reran unchanged product tests in GitHub
  Actions CI #34 / run `35698183500`; API passed, but one Calendar gesture test failed because it
  tried to click a missing confirmation action immediately after returning from edit mode.
- **Outcome:** the test now waits for the product's existing animation-frame focus restoration and
  asserts that focus is inside the restored quick-view dialog before sending the Delete shortcut.
  This preserves the safety rule that Delete inside editable fields does nothing and does not
  weaken product behaviour or assertions.
- **Verification:** the focused Calendar gesture file passed 20/20 isolated repetitions. Exact root
  `npm run check` passed API 23 files/84 tests and Web 35 files/138 tests; root build passed with the
  existing bundle-size advisory; linked migration dry-run reported `upToDate:true`; and
  `git diff --check` passed with line-ending notices only.
- **Next:** push the Calendar synchronization fix to `main`, confirm its exact-SHA Verify and
  migration-dry-run jobs, and record final delivery evidence before resuming Stage 1 review.

### 2026-09-22 — LOG-148 — M7.5 recording checkpoint delivered

- **Scope:** delivered the Product Owner-authorized interim M7.5 recording package after correcting
  its formatting and autosave repository CI regressions.
- **Outcome:** commit `1e9fd4d6c8e315731bd327e1d61878060b149c2c` is on `origin/main` with the
  eight recording types, per-record unit scales, Training inputs, Exercise/Session/Student/public
  summaries, persistent primary metrics and trajectories, brand assets, migrations, and focused
  regression coverage. M7.5 Stage 1 remains open; this checkpoint does not authorize Stage 2 or M8.
- **Verification:** remote `origin/main` resolved to the exact feature SHA. GitHub Actions CI #33 /
  run `35697896707` completed successfully in 1m45s: `verify` passed in 47s with API 23 files/84
  tests and Web 35 files/138 tests, and `migration-dry-run` passed in 27s. The run retains the known
  Node 20 action deprecation warning and adds an informational future `ubuntu-latest` runner-image
  migration notice; neither job reported a product or migration failure.
- **Next:** continue Product Owner-led M7.5 Stage 1 review from the existing Next handoff; do not
  enter Stage 2 or M8 without explicit authorization.

### 2026-09-22 — LOG-147 — Recording delivery CI regression corrected

- **Scope:** Product Owner requested an interim M7.5 delivery and authorized correction of every
  blocking CI finding. The first root check found one formatting mismatch; after formatting, the
  API repository regression isolated an unconditional Training-preference read during an empty or
  note-only autosave.
- **Outcome:** formatting is normalized and `saveSessionTraining` now loads the Workspace unit
  preference lazily only when it must validate the units of a new measurement. Existing-set unit
  immutability and new-measurement convention validation remain unchanged, while empty and
  note-only autosaves avoid an unnecessary database round trip.
- **Verification:** the original focused repository repro passed 2/2. Exact root `npm run check`
  passed API 23 files/84 tests and Web 35 files/138 tests; root production build passed with the
  existing over-500-kB advisory; linked migration dry-run reported `upToDate:true`; linked
  `app_private` lint reported no schema errors; and `git diff --check` passed with line-ending
  notices only.
- **Next:** create and push the cohesive M7.5 recording checkpoint to `main`, then confirm the
  remote ref and exact-SHA GitHub Actions Verify plus migration-dry-run jobs. Stage 1 remains open.

### 2026-09-22 — LOG-146 — Recording-summary presentation normalization

- **Scope:** Product Owner found a remaining visual exception above legacy `重量×次數` rows:
  when a primary progress series existed, its current/previous/personal values were compressed into
  one summary block while other recording types used separate current/previous and personal-best
  blocks. This remains an M7.5 Stage 1 presentation-only correction.
- **Outcome:** primary-series summaries now use the same two fixed blocks for every recording type:
  `本次／上次最佳` and `個人最佳`. Metric labels and distance context stay with each value, without
  changing the stored measurements or progress calculation.
- **Verification:** Web TypeScript and `git diff --check` passed. The exact 390×844 mobile preview
  verified the legacy 高背槓深蹲 summary as separate `重量：—／76.25 kg` current/previous and
  `重量：119 kg` personal-best blocks, followed by the normalized weight/reps input row. No
  full-suite, push, or remote-CI claim is made.
- **Next:** continue Product Owner-led M7.5 Stage 1 review of the remaining Training-record
  corrections; do not enter Stage 2 or M8 without explicit authorization.

### 2026-09-22 — LOG-145 — Legacy weight-times-reps recording normalization

- **Scope:** Product Owner found that legacy `重量×次數` occurrences still rendered the retired
  planned-weight/actual-reps controls on mobile, unlike all configured recording types. This is an
  M7.5 Stage 1 compatibility and presentation correction.
- **Outcome:** absent recording snapshots now infer `weight_reps` for legacy weight-based
  exercises and `reps` for legacy repetition exercises. Their historical planned values are mapped
  into the common measurement structure for display; the first edit or added set upgrades the
  whole occurrence to a version-2 recording snapshot with normalized measurements. All recording
  types therefore share the same measurement inputs, RPE, result, and delete layout.
- **Verification:** Web TypeScript and `git diff --check` passed; focused `MeasurementInputs`
  tests passed 2/2 after the approved elevated Windows rerun. The existing exact 390×844 mobile
  preview read a legacy 高背槓深蹲 occurrence as separate 重量 and 次數 controls followed by RPE,
  result actions, and remove action, matching the configured 重量×時間 row. No full-suite, push,
  or remote-CI claim is made.
- **Next:** continue Product Owner-led M7.5 Stage 1 review of the remaining Training-record
  corrections; do not enter Stage 2 or M8 without explicit authorization.

### 2026-09-22 — LOG-144 — Training-record balanced desktop RPE correction

- **Scope:** Product Owner clarified that the desktop RPE field must be visually balanced between
  the measurement group and fixed right-side result group; it must not consume the measurement
  gap on the left and leave all flexible whitespace on the right. This remains an M7.5 Stage 1
  presentation-only correction.
- **Outcome:** the desktop recording grid now uses equal flexible tracks on each side of the fixed
  RPE field: `measurement group | equal space | RPE | equal space | result group | remove`.
  Result and remove actions remain fixed and right-aligned; the existing single-metric full-lane
  rule and compact mobile grid remain unchanged.
- **Verification:** Web TypeScript and `git diff --check` passed. The authenticated training tab
  reported active editing ownership from another open local Training tab, so this correction does
  not claim a second browser screenshot while preserving that tab's draft ownership. No full-suite,
  push, or remote-CI claim is made.
- **Next:** after the active Training editor releases ownership, browser-check the balanced desktop
  RPE layout; otherwise continue Product Owner-led M7.5 Stage 1 review without entering Stage 2 or
  M8.

### 2026-09-22 — LOG-143 — Training-record RPE grid invariant correction

- **Scope:** Product Owner rejected the prior superficial fixed-position treatment: the visible RPE
  field had to follow the final measurement field at the exact same gap as two adjacent measurement
  fields, including single-metric types. The RPE field also had to be a plain numeric input without
  focus halo or native number steppers. This remains an M7.5 Stage 1 presentation-only correction.
- **Outcome:** a one-metric measurement now occupies the full 256px desktop measurement group, so
  its right edge and the second field's right edge both sit 16px before RPE. At 390px a one-metric
  measurement occupies the complete measurement lane; both its RPE gap and the two-metric internal
  gap are 6px. RPE now explicitly suppresses the inherited focus shadow and browser spin controls.
- **Verification:** Web TypeScript and `git diff --check` passed; focused `MeasurementInputs` tests
  passed 2/2 after the approved elevated Windows rerun. Browser DOM geometry measured desktop
  two-metric `120px → 16px → RPE` and one-metric `256px → 16px → RPE`; at exact 390×844 it
  measured two-metric `6px → RPE` and one-metric full-lane width with the same 6px gap. The mobile
  content viewport remained 375px wide without horizontal overflow. No full-suite, push, or
  remote-CI claim is made.
- **Next:** continue Product Owner-led M7.5 Stage 1 review of the remaining Training-record
  corrections; do not enter Stage 2 or M8 without explicit authorization.

### 2026-09-22 — LOG-142 — Training-record fixed-column and mobile hierarchy correction

- **Scope:** Product Owner required that narrow Training rows retain their field names and one-line
  scanning order rather than stacking two measurements, and that status/delete icons cannot be
  mistaken for one another. Desktop RPE also had to use the same physical gap as the measurement
  inputs. This remains an M7.5 Stage 1 presentation-only correction.
- **Outcome:** desktop now derives both measurement and measurement-to-RPE spacing from one 16px
  layout token; every individual metric control remains 120px whether a recording type has one or
  two metrics. At 390px each exercise shows a compact field-label row followed by one set row:
  smaller set number, parallel metric controls, fixed RPE, a wider result group with check/X
  actions, then a trash-can remove action. The mobile exercise header keeps the current/previous
  and personal-best summaries side by side, while growth uses its recognisable icon-only control.
- **Verification:** focused `MeasurementInputs` tests passed 2/2 after the approved elevated
  Windows rerun; Web TypeScript and `git diff --check` passed. Authenticated desktop review
  confirmed the fixed field/RPE rhythm. Exact 390×844 browser review confirmed parallel dual
  metrics, visible label row, one set row, non-overflowing 375px content viewport, no console
  warnings/errors, and distinct X versus trash affordances. No full-suite, push, or remote-CI
  claim is made.
- **Next:** continue Product Owner-led M7.5 Stage 1 review of the remaining Training-record
  corrections; do not enter Stage 2 or M8 without explicit authorization.

### 2026-09-22 — LOG-141 — Training-record compact mobile-row correction

- **Scope:** Product Owner requested one mobile row per set, unambiguous compact result actions,
  a fixed middle RPE column, and a side-by-side header split between record summary and growth
  action. This remains an M7.5 Stage 1 presentation-only correction.
- **Outcome:** desktop preserves a 16px inter-group rhythm from the two measurement fields through
  fixed RPE. At 390px each set is one row: set number, one/two measurement inputs, RPE, compact
  result icons, and remove-set action. A single metric gets 105px; a two-metric group divides its
  available width evenly. Mobile hides visual field labels but retains accessible input names. The
  completed check and incomplete `CircleOff` icon are distinct from the remove-set `XCircle` icon.
  The exercise header now uses its wider left section for record summaries and a right section for
  the growth action.
- **Verification:** focused `MeasurementInputs` tests passed 2/2, Web TypeScript passed, and
  `git diff --check` passed. Authenticated desktop acceptance verified group spacing; exact
  390×844 acceptance verified one row per set, distinct outcome/delete icons, left/right header
  split, and no horizontal overflow. No full-suite, push, or remote-CI claim is made.
- **Next:** continue Product Owner-led M7.5 Stage 1 review of the remaining Training-record
  corrections; do not enter Stage 2 or M8 without explicit authorization.

### 2026-09-22 — LOG-140 — Training-record group and mobile reflow correction

- **Scope:** Product Owner requested that Training rows use three explicit layout groups instead of
  unconstrained, per-type stretching: measurement inputs, RPE, and result actions. This remains an
  M7.5 Stage 1 presentation-only correction.
- **Outcome:** every desktop measurement control now uses the same 120px width, whether its type
  has one or two dimensions. The measurement group is fixed at 256px, RPE at 75px, and results at
  a right-aligned fixed 157px; only the deliberate gap between groups can absorb remaining row
  width. At 390px, up to two 115px measurement inputs share row one, while the 75px RPE and fixed
  result group share row two. A single metric remains left-aligned in the first row.
- **Verification:** focused `MeasurementInputs` tests passed 2/2 and Web TypeScript passed.
  Authenticated desktop acceptance verified fixed one/two-metric widths and separate groups;
  exact 390×844 acceptance verified two-row reflow, same-row RPE/results, and no horizontal
  overflow. No full-suite, push, or remote-CI claim is made.
- **Next:** continue Product Owner-led M7.5 Stage 1 review of the remaining Training-record
  corrections; do not enter Stage 2 or M8 without explicit authorization.

### 2026-09-22 — LOG-139 — Training-record input sizing correction

- **Scope:** Product Owner requested centered values, 1.5× two-metric input and RPE widths, and a
  doubled single-metric input width. This remains an M7.5 Stage 1 visual correction only.
- **Outcome:** two-metric entries are now fixed at 141px each; a one-metric entry is 188px. Numeric
  values are centered. RPE is 75px and remains in its fixed column before the right-side result
  group. To retain the fixed measurement sizes without a desktop horizontal scroller, result
  actions are compact, fixed 78px controls with an 8px row gap; the complete row fits its desktop
  container while preserving the right-aligned result/removal position.
- **Verification:** focused `MeasurementInputs` tests passed 2/2 and Web TypeScript passed.
  Authenticated desktop acceptance verified the requested widths, centered value, fixed right-side
  controls, and no Training-row horizontal scrollbar; exact 390×844 acceptance retained its inline
  labels and had no horizontal overflow. No full-suite, push, or remote-CI claim is made.
- **Next:** continue Product Owner-led M7.5 Stage 1 review of the remaining Training-record
  corrections; do not enter Stage 2 or M8 without explicit authorization.

### 2026-09-22 — LOG-138 — Training-record column alignment correction

- **Scope:** Product Owner requested that measurement fields use fixed positions without duplicate
  desktop labels, while RPE, result actions, and set removal align to the right. This remains a
  local M7.5 Stage 1 presentation-only correction.
- **Outcome:** desktop measurement headings are the sole field labels; the two fixed 94px
  measurement positions use a 24px column gap regardless of recording type. The row now reserves
  a flexible middle region before its fixed 50px RPE, 201px result group, and 28px removal action,
  placing those controls at the right edge. Mobile retains inline measurement labels because its
  table heading is hidden. Number steppers no longer render browser increment/decrement arrows;
  focus keeps the input background unchanged and uses only a thin border.
- **Verification:** focused `MeasurementInputs` tests passed 2/2 and Web TypeScript passed.
  Authenticated desktop and exact 390×844 browser acceptance confirmed fixed field positions,
  right-aligned result/removal controls, label treatment by breakpoint, no number arrows, stable
  focus background, and no 390px horizontal overflow. No full-suite, push, or remote-CI claim is
  made.
- **Next:** continue Product Owner-led M7.5 Stage 1 review of the remaining Training-record
  corrections; do not enter Stage 2 or M8 without explicit authorization.

### 2026-09-22 — LOG-137 — Training-record fixed-row correction

- **Scope:** Product Owner rejected the still-inconsistent record-row geometry during M7.5 Stage 1.
  This local correction changes only the Training-record presentation and preserves the approved
  one-click, same-convention scale conversion.
- **Outcome:** the header now names every rendered measurement column rather than showing a combined
  recording-type label. Each measurement control is 94px, RPE is 50px, and the two result actions
  are fixed at 98px each; no record-row column uses remaining-width stretching. A time/distance
  unit is now the input's right-side text button (`sec`, `min`, `m`, `km`, `ft`, or `mi`), so one
  click both converts the entered value and shows the replacement scale in the same location as a
  static unit suffix.
- **Verification:** focused `MeasurementInputs` tests passed 2/2 and Web TypeScript passed.
  Authenticated desktop and exact 390×844 browser acceptance confirmed matching headers, fixed
  result-action widths, input-contained one-click scale buttons, and no 390px horizontal overflow.
  No full-suite, push, or remote-CI claim is made.
- **Next:** continue Product Owner-led M7.5 Stage 1 review of the remaining Training-record
  corrections; do not enter Stage 2 or M8 without explicit authorization.

### 2026-09-22 — LOG-136 — Training-record compact measurement flow correction

- **Scope:** Product Owner identified that the prior visual correction still stretched numeric fields
  across the set row and gave scale controls too much visual weight. This is an M7.5 Stage 1
  presentation correction only; recording behaviour and the direct scale-toggle decision remain
  unchanged.
- **Outcome:** measurement controls now have a 94px value width and no longer flex to fill their
  grid cell. The set row uses a content-sized measurement column so values follow the set number on
  the left. `sec`/`min` and distance-scale controls are separate 26px subdued pills, rather than
  height-matched joined segments; static unit suffixes remain inside their short value field.
- **Verification:** focused `MeasurementInputs` tests passed 2/2 and Web TypeScript passed.
  Authenticated desktop and exact 390×844 browser acceptance confirmed the compact left-aligned
  value flow, direct scale controls, and no 390px horizontal overflow. No full-suite, push, or
  remote-CI claim is made.
- **Next:** continue Product Owner-led M7.5 Stage 1 review of the remaining Training-record
  corrections; do not enter Stage 2 or M8 without explicit authorization.

### 2026-09-22 — LOG-135 — Training-record measurement input hierarchy correction

- **Scope:** Product Owner requested a visual correction to the compact numeric-entry flow during
  M7.5 Stage 1. This is presentation-only: no recording semantics, API contract, or stored data
  changed.
- **Outcome:** each measurement now places its label above a 38px numeric input group. Fixed units
  (`kg`, `次`, and `回合`) are quiet right-aligned suffixes inside that group. Time and distance
  keep their direct scale controls, but those controls are now a compact, border-sharing segment
  joined to the input instead of floating inside an oversized field.
- **Verification:** focused `MeasurementInputs` tests passed 2/2 and Web TypeScript passed.
  Authenticated browser acceptance passed on desktop and exact 390×844: labels, inputs, suffixes,
  and `sec`/`min` controls remain grouped; the 390px page had no horizontal overflow. No full-suite,
  push, or remote-CI claim is made.
- **Next:** continue Product Owner-led M7.5 Stage 1 review of the remaining Training-record
  corrections; do not enter Stage 2 or M8 without explicit authorization.

### 2026-09-22 — LOG-134 — Local Web HMR recovery

- **Scope:** Product Owner reported the local formal site could not open during M7.5 Stage 1.
- **Cause and recovery:** API health and both local Web ports returned HTTP 200, but the browser
  reproduced a blank page because the port-5173 Vite process served an empty transformed
  `TrainingWorkspace` module while `SessionPage` imported its named export. The source file itself
  retained the export. Restarted only the verified stale port-5173 Web process; no API, database,
  record, migration, or source change was made for this recovery.
- **Verification:** the direct Vite module request again contains `export function
TrainingWorkspace`; authenticated Chrome reloaded `/today` and displayed the completed Today
  projection. API `/health` remained `200 {"status":"ok"}`.
- **Next:** continue Product Owner-led M7.5 Stage 1 review of the remaining Training-record
  corrections; do not enter Stage 2 or M8 without explicit authorization.

### 2026-09-22 — LOG-133 — M7.5 unit-convention correction

- **Scope:** Product Owner corrected the recording-type unit model during Stage 1: unit preference
  is a weight/distance convention, not a choice of measurement scale; time and counts have no
  Workspace preference. This remains local review work and does not start Stage 2 or delivery.
- **Outcome:** Settings now contains only `重量單位習慣` (`kg` / `lb`) and `距離單位習慣`
  (metric `km` / imperial `mi`). New Session sets lock weight to that preference; distance offers
  direct same-convention `m` / `km` or `ft` / `mi` scale buttons, and time offers `sec` / `min`
  buttons. A scale click converts the entered value instead of merely relabelling it. The API also
  rejects a new set outside the current convention and prevents an existing set's stored units from
  being changed. Existing records retain their entered units and are normalized for presentation.
- **Database:** new linked-development migration `20260921181944_recording_unit_preferences`
  removes the unused duration preference, upgrades the distance preference from scale to
  convention (`m` → `km`), and accepts `ft` / `mi` in preserved set measurements. Dry-run listed
  only this migration; after apply, migration history aligned and a read-only database check
  confirmed the validation function accepts feet and miles.
- **Verification:** API and Web TypeScript checks passed. Focused API recording tests passed 6/6;
  focused Web measurement-input tests passed 2/2, including semantic conversion after a unit click.
  Authenticated desktop acceptance showed static weight units and direct time/distance controls;
  exact 390×844 Settings acceptance showed only the two convention selectors with no time setting.
  The temporary browser viewport was reset. No full-suite, push, or remote-CI claim is made.
- **Next:** continue Product Owner-led M7.5 Stage 1 review of the remaining Training-record
  corrections; do not enter Stage 2 or M8 without explicit authorization.

### 2026-09-21 — LOG-132 — M7.5 recording hierarchy and spatial-layout correction

- **Scope:** refined the Product Owner-rejected presentation of the already-authorized recording
  hierarchy. This remains a local M7.5 Stage 1 correction; it neither changes the data contract nor
  starts a delivery gate.
- **Outcome:** Session exercise headers now show only the primary metric and reserve proportionate
  room for the record summary. Exercise Library and Growth Trajectory use one shared selector: two
  metrics use a selected surface plus lock/unlock icon, while a single metric is a static fact rather
  than a disabled-looking button. The trajectory selector, latest record, range best, and range
  control now share a compact top row. It removes explanatory/tutoring copy, secondary summaries,
  secondary history values, and the chart footer; the remaining left scale is moved farther from
  point labels.
- **Follow-up refinement:** increased the usable chart height, moved the history panel lower,
  increased secondary-bar opacity and restored a quiet label on every bar. The top summary now
  uses dark, larger numerals on the light toolbar with wider spacing; its previous light-on-light
  contrast defect is removed.
- **Final polish:** secondary-bar labels now use a legible, restrained blue-grey instead of the
  bar-fill colour. The metric selector avoids a prohibited cursor during a pending transition and
  uses a waiting lock animation; summary values are separated by a fine vertical rule, and the
  visible history-sort caption is removed. Their final opacity is 82%, retaining readability while
  sitting below the primary line's visual priority.
- **Verification:** Web formatting and TypeScript checks passed. Focused `MultiMetricTrend` Vitest
  regression passed (1 file / 1 test). Authenticated local browser checks confirmed the shared
  dual-metric selector, static one-metric presentation, and exact 390×844 document width with no
  horizontal overflow. The broader Web test command was also started through the elevated Windows
  path after the sandbox's `spawn EPERM`; its runner did not return a final aggregate in this turn,
  so this log makes no full-suite count claim.
- **Known boundary:** the 390×844 browser preview is not physical-phone acceptance. No migration,
  commit, push, or remote CI was requested or run.
- **Next:** continue Product Owner-led M7.5 Stage 1 review; do not enter Stage 2 or M8 without
  explicit authorization.

### 2026-09-21 — LOG-131 — M7.5 trajectory primary/secondary hierarchy correction

- **Scope:** corrected the Product Owner-rejected dual-line/dual-primary presentation without
  removing the broader recording-type work. Updated the frozen Stage 1 recording Contract to make
  the metric order authoritative: first is the only primary, second is optional comparison context.
- **Outcome:** custom Exercise setup and the trajectory dialog share one lock/unlock transition.
  Clicking the current primary toggles comparison; clicking the other metric makes it primary and
  unlocks comparison. The trajectory is now a spatially separated primary line and low-opacity
  secondary bar layer, with only the left primary scale and change-only secondary labels.
- **Verification:** focused chart/editor/selection tests passed 8/8; complete single-worker API
  tests passed 23 files/84 tests and Web tests passed 35 files/137 tests. Root build and
  `git diff --check` passed; Vite retains only the existing large-chunk advisory. Authenticated
  desktop and exact 390×844 browser acceptance passed with no horizontal overflow or console
  warnings/errors. The tested server setting was restored after lock/unlock verification.
- **Known boundary:** exact 390×844 is the desktop mobile-preview surface, not physical-phone
  acceptance. This is local Stage 1 work; no migration, push, or remote CI was requested or run.
- **Next:** continue Product Owner-led M7.5 Stage 1 review; do not enter Stage 2 or M8 without
  explicit authorization.

### 2026-09-21 — LOG-130 — M7.5 exercise-owned recording formats

- **Scope:** Product Owner authorized eight recording types across Exercise Library, Session
  Training, shared growth trajectories, and Training unit settings. Confirmed duration + rounds,
  same-distance shortest-time comparison, and lower-is-better pace. Contract frozen before implementation;
  no broader Student/Settings review, Stage 2 transition, or push.
- **Outcome:** versioned server-owned recording configuration and primary metric selection; all
  100 builtin definitions classified in `M7.5-RECORDING-CATALOG.md`; dynamic one/two-field input;
  kg/lb, sec/min, m/km preferences; independent metric histories and chart axes with persistent
  visibility controls. RPE/results remain; new records have no separate actual-reps input.
  Public results and shared Student performance consume compatible projections. Old snapshots retain
  their original quantities; old clients cannot erase modern measurements. Stable JSON comparison
  prevents JSONB key ordering from causing false dirty state or unnecessary record revisions.
- **Verification:** complete `npm run check` passed (API 23 files / 84 tests; Web 34 files / 134
  tests), and both production builds passed. Live eight-type acceptance passed round trips,
  unchanged saves, exact replay, conflicts, old-client rejection, two-Coach isolation, same-distance
  grouping, persistent metric selection, and public allowlists. Desktop and exact 390×844 browser
  checks covered custom creation/type menus, units, dynamic inputs, save/reload, dual charts,
  metric toggles/reopen, and distance selection. Mobile card and row scroll widths equal their
  visible widths after removing inherited legacy table minimum width. Evidence: local
  `output/playwright/recording-*.png`.
- **Database:** migration `20260920172553_exercise_recording_types.sql` applied only to linked
  development; final dry-run up to date. All isolated fixtures cleaned and test units restored.
  Original 146 occurrences remain legacy; 427 sets retain fingerprint
  `3dd5e56d09369b8f7313d2e3f33241b3`, identical before/after. Security advisor retains only the
  pre-existing leaked-password-protection warning.
- **Known boundary:** browser viewport checks are not physical-phone acceptance. Vite's existing
  large-chunk warning remains. Development watcher restarts caused transient 502/stale-module
  responses during edits; final reload and persisted input verification succeeded. No remote CI
  claim for this uncommitted change.
- **Next:** continue Stage 1 Product Owner review of this local implementation; retain the explicit
  Stage 2 authorization boundary.

### 2026-09-20 — LOG-129 — M7.5 growth-trajectory CI delivery confirmed

- **Delivery:** commit `a63f7316fb1c8c5ee5282ee60217f37785b652ae` was pushed to
  `origin/main`; the remote ref resolved to that exact SHA.
- **Remote verification:** GitHub Actions CI #31 / run `35514885492` completed successfully
  in 1m 51s, including `verify` and `migration-dry-run`.
- **Next:** continue the M7.5 Stage 1 Product Owner review. Keep Calendar touch/Block
  physical-phone acceptance in the review queue; do not enter Stage 2 or M8 without explicit
  Product Owner authorization.

### 2026-09-20 — LOG-128 — M7.5 growth-trajectory local CI gate

- **Scope:** ran the complete authorized delivery gate for the accumulated M7.5 Stage 1
  growth-trajectory work before committing or pushing it to `main`.
- **Verification:** a clean `npm ci` completed after pausing the local API/Web development
  processes that held Windows native-module locks. Root formatting passed; API typecheck and 22
  test files / 78 tests passed; Web formatting/typecheck and 32 test files / 131 tests passed;
  API and Web production builds passed. The only build output was the existing Web over-500-kB
  chunk advisory. `npm run db:push:dry` against the linked development project reported
  `upToDate: true` with no pending migrations; `git diff --check` passed.
- **Next:** commit and push this authorized M7.5 Stage 1 checkpoint, then record only the observed
  exact-SHA GitHub Actions result. Continue Stage 1 review afterward; do not enter Stage 2 or M8.

### 2026-09-20 — LOG-127 — M7.5 full-range chart and accepted-record updates

- **Scope / Contract:** follow-up Product Owner review replaces chart pagination with complete
  desktop 10/20 and mobile 5/10 ranges, Student-name titles, compact desktop summaries, and
  accepted-record updates before class completion. The bounded override of M5 private performance
  membership is frozen in [`M7.5-GROWTH-TRAJECTORY-CONTRACT.md`](M7.5-GROWTH-TRAJECTORY-CONTRACT.md).
- **Outcome:** the selected range now drives every plotted point, summary, and history row. Removed
  all-records mode and chart paging; dense ranges stagger all value/date/year labels. Desktop
  summary numbers and range selector share one row. Both routes show Student name — Exercise name.
  Private performance now includes saved completed sets in scheduled and completed non-legacy
  Sessions; cancelled Sessions and missing numeric values do not contribute. Previous completed
  Session defaults/previous-best and lesson deductions remain unchanged. Training/Scheduling
  acceptance invalidates affected Student trend and directory queries; pending/recovery changes
  remain clearly identified and never become unsaved chart facts. No polling or schema change.
- **Reproduction:** the original Web test expected 20 nodes but received 8 at its test width.
  The isolated live save expected a scheduled Session history point of 91.5 but received none.
  Root causes were the chart capacity/pagination cap, completed-only persistence query, and missing
  Student-trend invalidation after saves.
- **Verification:** focused Web tests passed (3 chart tests plus 6 Training/Scheduling query tests);
  focused API tests passed (2 files/11 tests). Live regression passed scheduled save, value correction,
  removal of completed status, null weight, completion/reopening/cancellation, no early lesson
  deduction, private-note exclusion, and two-Coach isolation; all isolated Students were deleted.
  Browser fixtures at 1440×731 verified 20 value/date/year labels with no pairwise overlaps or
  horizontal overflow and a 163px independent history viewport. Exact 390×844 verified full 5/10
  node ranges, no value-label overlap or horizontal overflow, and a 175px history viewport in
  10-point mode. Temporary fixture pages were removed. Web/API builds passed; Web retains the
  existing over-500-kB advisory.
- **Known boundary:** a combined Web fork-worker run hit startup timeout for the chart file;
  the query files passed, and a dedicated single-thread chart rerun passed. Responsive browser
  checks do not claim physical-phone touch acceptance.
- **Next:** continue Product Owner Stage 1 review of the full-range/dynamic trajectory. No push,
  remote CI, Stage 2, or M8 transition.

### 2026-09-20 — LOG-126 — M7.5 shared growth-trajectory presentation

- **Scope / Contract:** Product Owner authorized a Stage 1 redesign of both Session and Student
  growth-trajectory dialogs: action-specific empty copy, separated exercise title, labeled line
  chart with automatic bounds, recent 10 / 20 / all ranges, newest-first compact history, and
  independently scrolling history on desktop and exact 390×844.
- **Outcome:** both routes use one Training-owned dialog with FORM paper/ink/lime styling,
  latest/range-high/range-change summaries, per-node values and dates including year, adaptive
  chart paging (up to 10 points; 4 at 390px), and bounds based on the visible chart segment.
  All selected records remain in the history list. Loading, retryable error, cached refresh,
  empty, single, and flat-series states are explicit. Server projections, qualification rules,
  API rounding, persistence, Auth, and query/cache behavior remain unchanged; no chart dependency
  or polling was added.
- **Verification:** Web typecheck and production build passed (existing 500-kB advisory only).
  Focused Vitest tests passed (2): small 91.25 / 91.5 / 91.75 changes, flat/zero/single bounds,
  125-record reverse ordering, range/paging, Escape, and error-versus-empty copy. Authenticated
  Session desktop and exact 390×844 browser checks verified real data, empty copy, range menu,
  paging, and no horizontal overflow; the 760px mobile dialog had no internal overflow, while
  history alone had a 204px viewport over 440px of records. Student-page live loading/ready states also passed. Temporary browser fixtures checked
  125 cross-year records without writing database data.
- **Known boundary:** viewport verification is not physical touch-device acceptance. Initial
  sandbox test startup hit Windows spawn EPERM; the elevated focused rerun passed.
- **Next:** continue Product Owner Stage 1 visual review; no Stage 2, push, or remote CI.

### 2026-09-19 — LOG-125 — M7.5 Session autosave and recovery coordination correction

- **Scope:** corrected the Product Owner-reported same-tab false conflict, persistent draft prompts,
  and periodic `儲存中…` feedback without weakening server-authoritative version checks or allowing
  blind cross-device overwrites.
- **Outcome:** queued same-tab edits now receive the latest accepted Record/Session versions only
  when actually sent. Ambiguous failures replay the exact operation before newer input; temporary
  transport/server failures retry in the background without flashing `儲存中…`. No-change idle
  state sends nothing. Legacy per-tab drafts consolidate into one Coach/Session/browser-local slot;
  accepted-equivalent residue is removed, matching-version recovery resumes automatically, and
  successful acceptance clears the Session slot. A renewable local editor lease prevents two
  visible same-browser tabs from writing concurrently and automatically hands ownership over when
  the first page leaves; only genuine divergent server content exposes an explicit conflict choice.
- **Verification:** red-first autosave tests reproduced stale version reuse and tab-key splitting,
  then focused Training/Session tests passed 2 files/13 tests. Full Web check passed 31 files/127
  tests; Web production build passed with only the existing >500-kB chunk advisory. Authenticated
  browser acceptance verified consecutive same-tab edits, successful reload with no recovery banner,
  eight seconds of idle `已儲存` without periodic saving, automatic second-tab waiting/takeover, and
  restoration of the temporary Note to its original empty value.
- **Boundary:** this remains M7.5 Stage 1 local work. No migration, linked-database administration,
  Demo mutation, commit, push, or remote CI claim is included.
- **Next:** continue Product Owner review of the corrected Session and Calendar flows. Stage 2 and M8
  still require explicit Product Owner authorization.

### 2026-09-19 — LOG-124 — M7.5 Session background-refresh layout stability

- **Scope:** removed the Product Owner-reported transient `正在更新紀錄…` Training workspace line
  that inserted itself above the exercise cards during an otherwise non-blocking background fetch.
- **Outcome:** background refresh continues to revalidate the Session Training projection, but it no
  longer renders a layout-affecting status row. The visible loading, saving, conflict, offline, and
  error boundaries remain unchanged.
- **Verification:** focused Session/confirmation regressions passed 2 files/4 tests; Web typecheck
  passed. A browser reload encountered the existing multi-tab editor lock and correctly showed its
  non-mutating ownership boundary; no data was changed. No migration, commit, push, or remote CI
  claim is included.
- **Next:** continue Product Owner review of the corrected Session and Calendar flows. Stage 2 and M8
  still require explicit Product Owner authorization.

### 2026-09-19 — LOG-123 — M7.5 Session destructive-action and recovery-control refinement

- **Scope:** refined only the Product Owner-reported Session confirmation, recovery banner, and
  context-label presentation. No Session lifecycle authority, deletion semantics, or draft data
  handling changed.
- **Outcome:** the Session delete confirmation now uses the formal rounded danger-action treatment,
  labels its action `刪除`, and visibly offers `ESC 取消 · DELETE 刪除`. Delete is active only for this
  no-text-confirmation Session dialog; Escape still closes it. Recovery actions now use the formal
  secondary and danger-outline button styles. Session dates add a space before the weekday, while
  date, location, status, and their location icon increase by two pixels for legibility.
- **Verification:** red-first shortcut regression failed before the feature, then passed. Focused
  Web tests passed 2 files/4 tests. Full Web check passed 31 files/121 tests; Web production build
  passed with only the existing >500-kB chunk advisory. Authenticated desktop browser inspection
  confirmed the refined recovery controls, larger context metadata, the visible shortcut hint, and
  Escape dismissal without saving, deleting, or changing any Session data.
- **Boundary:** this remains M7.5 Stage 1 local work. No migration, linked-database write, Demo
  mutation, commit, push, or remote CI claim is included.
- **Next:** continue Product Owner review of the corrected Session and Calendar flows. Stage 2 and M8
  still require explicit Product Owner authorization.

### 2026-09-19 — LOG-122 — M7.5 Session editor proportion and lifecycle feedback correction

- **Scope:** corrected the Product Owner-reported fixed-height `變更課堂` dialog and the incomplete
  lifecycle pending treatment without changing another route's layout, scheduling authority, or
  persisted Session data.
- **Outcome:** the Session editor now opts into its existing content-height dialog variant, separates
  fields from a dedicated footer, and gives the `刪除課堂` / `取消` / `儲存變更` row deliberate
  breathing room without retaining the former unused lower half. `完成上課` and `改回未完成` now share
  one lifecycle action component: both enter the same lighter disabled spinner state and read
  `處理中…` while their mutation is pending.
- **Verification:** red-first Session regressions reproduced the missing compact-editor structure
  and asymmetric reopen state, then passed after correction. Focused Session/Scheduling dialog
  regression passed 2 files/7 tests. Full root check passed API 22 files/78 tests and Web 30
  files/120 tests. API and Web production builds passed with only the existing Web >500-kB chunk
  advisory. Authenticated Chrome verified the compact desktop dialog, separated action footer, and
  exact 390×844 content-height bottom sheet; the dialogs were closed without saving, deleting, or
  changing Session data.
- **Boundary:** this remains M7.5 Stage 1 local work. No migration, linked-database write, Demo
  mutation, commit, push, or remote CI claim is included.
- **Next:** continue Product Owner review of the corrected Session and Calendar flows. Stage 2 and M8
  still require explicit Product Owner authorization.

### 2026-09-19 — LOG-121 — M7.5 Session interaction and autosave root-cause correction

- **Scope:** corrected the Product Owner-reported Session completion feedback, context usefulness,
  one-off Student editing, delete-confirmation interactivity, false autosave conflicts, duplicate
  save feedback, and cross-route scrollbar loss. This supersedes the corresponding interaction
  claims in LOG-120 where browser review exposed remaining defects.
- **Outcome:** completion now enters a lighter non-interactive `處理中…` state instead of presenting
  a forbidden cursor. The context panel removes `SESSION CONTEXT`, balances time and Student
  typography, keeps location and state on one line, and lists exercise names followed by the total.
  A generated Series occurrence may change Student without altering its Series. Delete confirmation
  replaces the scheduling dialog instead of rendering beneath it, and the shared dialog scroll lock
  now uses a reference count so closing nested overlays cannot leave `body` locked.
- **Persistence:** ordinary Training autosave now contests the Training Record version only; Session
  version remains required for the atomic completion transition. This prevents an unrelated
  same-device Session time, location, or Student update from being misreported as a Training
  conflict while retaining real concurrent-record conflict protection. Only the top-right status
  presents `儲存中…`; genuine conflicts retain the single recovery panel.
- **Verification:** red-first focused regressions passed Web 3 files/15 tests and API 3 files/15
  tests. Full root check passed API 22 files/78 tests and Web 30 files/118 tests. API and Web
  production builds passed with only the existing Web >500-kB chunk advisory; `git diff --check`
  passed. Authenticated Chrome verified a non-Calendar Student page scrolls to its final cards,
  Calendar delete confirmation is the only active overlay, a Series occurrence Student selector
  opens with every active Student, and the Session page exposes the same editable Student field and
  interactive delete confirmation without changing test data. The 390×844 preview retained the
  revised context hierarchy, full exercise-name summary, internal scrolling, and usable
  bottom-sheet editor without document-level horizontal overflow.
- **Known issue:** the first full check hit the known Windows sandbox `spawn EPERM`; the approved
  elevated rerun passed. No migration, linked-database write, Demo mutation, commit, push, or remote
  CI claim is included.
- **Next:** continue Product Owner review of the corrected Session and Calendar flows. Stage 2 and M8
  still require explicit Product Owner authorization.

### 2026-09-19 — LOG-120 — M7.5 Session workflow and persistence corrections

- **Scope:** corrected the Product Owner-reported Session context, lifecycle, autosave, deletion,
  capability-action, icon, numeric-focus, and Note-focus defects without changing the shared App
  Shell or importing Demo persistence. The supplied Demo remains the typography, scale, spacing,
  and Lucide-icon reference for this route.
- **Outcome:** the dark context panel now presents authoritative date, time, Student, and location
  instead of a low-value lesson ordinal. Autosave waits for two seconds of idle input, accepted
  scheduling writes synchronize the Session Training cache/version, and a genuine conflict is shown
  once rather than repeated in three locations. Idle and saved states both show the Demo check icon;
  reopening immediately restores the `完成上課` action without an extra success sentence. Exercise
  and Set remove icons are transparent, numeric inputs no longer gain a misaligned pale-green frame,
  and the private Note retains readable dark-focus and selection styling.
- **Deletion and links:** `刪除課堂` now lives inside `變更課堂`; scheduled and completed Session
  deletion requires a confirmation explaining that unsaved content will be lost, then returns to the
  previous route. Calendar quick deletion now confirms both Sessions and Blocks; completed Sessions
  expose no Calendar delete shortcut. Scheduled Sessions expose `改期連結` even when overdue; an
  overdue link uses available future slots from today through the next six local dates, while a
  future Session retains the original-date ±3-day window. Completed Sessions retain `分享結果`.
- **Verification:** red-first focused regressions reproduced the 650-ms autosave, stale Training
  cache after reopen, scheduled-only repository deletion, and immediate Calendar deletion, then
  passed after correction (Web 3 files/15 tests; API 2 files/3 tests). Root check passed API 22
  files/76 tests and Web 30 files/117 tests. API and Web production builds passed with only the
  existing Web >500-kB chunk advisory; `git diff --check` passed. Authenticated desktop inspection
  confirmed the new context, check icon, nested completed-Session delete action, transparent remove
  controls, and readable Note focus; the 390×844 preview confirmed the revised context typography
  and layout without document-level horizontal overflow.
- **Boundary:** this remains M7.5 Stage 1 local work. The existing local recovery draft was preserved
  rather than discarded. No migration, linked-database write, Demo mutation, commit, push, or remote
  CI claim is included.
- **Next:** continue Product Owner review of the corrected Session and Calendar flows. Stage 2 and M8
  still require explicit Product Owner authorization.

### 2026-09-19 — LOG-119 — M7.5 Session page Demo visual convergence

- **Scope:** corrected only the formal Course/Session route after the Product Owner rejected its
  long generic form layout and required the Demo workbench's complete visual hierarchy, including
  typography, scale, icons, spacing, card proportions, and responsive composition. Existing formal
  API, authorization, Training mutations, conflict handling, and shared App Shell styling remain
  intact.
- **Outcome:** the ready Session route now uses the Demo's sticky context/workbench composition,
  centered student header, compact action hierarchy, dark Session context and private Note panel,
  numbered Exercise cards, inline performance summaries, table-like Set rows, and fixed completion
  bar. Route-scoped CSS matches the Demo's measured font sizes, weights, vertical rhythm, button and
  Lucide icon dimensions; the formal custom `FormSelect` remains the unit control while presenting
  as the Demo's compact unit suffix. Longer formal values such as `72.5 kg` remain fully visible.
- **Verification:** authenticated desktop browser comparison against the running Demo matched the
  74-pixel top bar, 410-pixel context column, editor/card geometry, heading rhythm, control sizing,
  and icon dimensions. Exact 390×844 inspection has no document-level horizontal overflow; Set rows
  retain the Demo-equivalent internal horizontal scroller. Web check passed format, typecheck, and
  29 files/116 tests. Web production build passed with only the existing >500-kB chunk advisory;
  `git diff --check` passed.
- **Boundary:** this is a route-scoped M7.5 Stage 1 correction. No schema, migration, Demo data,
  unrelated route restyle, commit, push, or remote-CI claim is included.
- **Next:** continue Product Owner review of the formal Session page and the remaining M7.5 Stage 1
  flows. Stage 2 and M8 still require explicit Product Owner authorization.

### 2026-09-19 — LOG-118 — M7.5 Session Training load-path hardening

- **Scope:** investigated the Product Owner-reported delay after a Session header appeared while its
  Training Record remained loading, then applied a bounded Stage 1 performance correction without a
  schema, API response, authorization, cache-retention, or broad-prefetch change.
- **Outcome:** Session detail and Training reads now start together on the first route render instead
  of forming a client request waterfall. The Training repository retains its transaction-local
  Workspace scope and complete route projection while batching Session/Record/preference and current
  Exercise/Set reads; one workspace read now uses three data queries rather than six, reducing the
  full scoped transaction from nine database calls to six. It adds no background polling, global
  cache, or all-Session prefetch and returns the same three Exercises, nine Sets, and 33 history
  points for the reported development Session.
- **Verification:** red-first focused regressions observed the missing parallel Training request and
  nine repository calls before the change, then passed with parallel reads and six calls. Full API
  check passed 20 files/73 tests; full Web check passed 29 files/116 tests; API and Web production
  builds passed with only the existing Web >500-kB advisory. Live old/new interleaved read-only
  measurements showed the new path faster in three of four adjacent pairs (`1552/1192`, `699/712`,
  `1440/1486`, and `611/865` ms as new/old after order normalization); Supabase network variance
  prevents claiming a fixed multiplier, while the 33% lower database-call count is deterministic.
- **Known issue:** authenticated browser timing could not be captured because the browser-control
  surface failed to load its request-header policy. The live repository path and exact data shape
  were verified; fresh in-browser Session navigation remains useful Product Owner acceptance.
- **Next:** include this correction in the already authorized M7.5 Stage 1 delivery, then commit,
  push, and confirm the exact commit's GitHub Actions Verify and migration-dry-run jobs. Stage 2 and
  M8 remain separate Product Owner decisions.

### 2026-09-19 — LOG-117 — M7.5 Stage 1 accumulated local CI

- **Scope:** ran the authorized local CI gate for the current M7.5 Stage 1 Calendar, Scheduling, and shared dialog corrections before delivery.
- **Outcome:** root format/typecheck/test check passed (API 19 files/72 tests; Web 28 files/115 tests). API and Web production builds passed; the Web build retains only the existing >500-kB chunk-size advisory. Linked Supabase migration dry-run reports the remote database is up to date; `git diff --check` passed.
- **Known issue:** the initial sandbox test run hit Windows `spawn EPERM`, and the first dry-run could not write Supabase telemetry. Approved elevated reruns completed successfully; neither error was an application or migration failure.
- **Next:** commit and push this authorized Stage 1 delivery, then confirm the exact commit's GitHub Actions Verify and migration-dry-run jobs. Stage 2 and M8 remain separate Product Owner decisions.

### 2026-09-19 — LOG-116 — M7.5 Calendar Week background correction

- **Scope:** Product Owner requested that the Calendar Week surface use one white background rather than a white/cream splice, while retaining the existing faint green treatment for today only.
- **Outcome:** the legend strip and every non-today timeline column now render white, including their hover state. The today column continues to use its existing faint green background; availability and course-status colors are unchanged.
- **Verification:** authenticated desktop Calendar inspection confirmed the unified white surface and preserved today highlight. `git diff --check` passed. This is a focused local Stage 1 correction; no schema, API, push, or remote CI claim.
- **Next:** continue M7.5 Stage 1 Product Owner review. Stage 2, push, remote CI, and M8 require separate authorization.

### 2026-09-18 — LOG-115 — M7.5 Calendar preview and editor follow-up

- **Scope:** Product Owner requested a Demo-sized Delete action, removal of the duplicate Cancel
  Course control, Edit Arrangement within the time card, a shorter course editor whose Cancel returns
  to preview, editable Student, and a designed Delete Block action.
- **Outcome:** the preview now gives Open, Complete, and Delete equal-width primary actions, with a
  quiet Edit Arrangement link in the time card. The redundant Cancel Course link is removed; a
  scheduled Series occurrence still uses its versioned cancellation transition behind the sole
  visible Delete action, retaining M4 history. The course editor fits its contents and Cancel,
  Escape, or close returns to preview with the unchanged Session; its Student selector can reassign
  an individual scheduled Session to another Student in the same Workspace. Version conflicts and
  missing Students remain explicit, and old/new Student queries invalidate after a successful
  reassignment. A Series-owned occurrence retains its Series Student and explains the restriction.
  Delete Block now has the Demo's pale red button treatment and sufficient width on mobile.
- **Verification:** API format/typecheck and 19 files/72 tests passed; Web format/typecheck and 28
  files/115 tests passed. API and Web production builds passed; Web reports only the existing
  > 500-kB chunk advisory. Isolated development M4 live E2E passed Student reassignment and Series
  > guard alongside existing conflict, Block recurrence, projection, and isolation flows, with fixture
  > cleanup. Authenticated Chrome confirmed equal preview actions, edit/Cancel return and focus,
  > enabled Student selection for standalone Sessions, compact desktop/mobile editors, and the Block
  > Delete style. At 390×844 the Block dialog was 370 px wide, all three footer actions fit one row,
  > and document width remained 390 px. `git diff --check` passed. No schema migration was required.
- **Limit:** changing the Student of one Series occurrence is not supported by the M4 Series ownership
  contract; the edit form says so. No physical touchscreen acceptance was available.
- **Next:** continue M7.5 Stage 1 Product Owner review. This correction remains local; Stage 2,
  push, remote CI, and M8 require their separate authorized handoff.

### 2026-09-18 — LOG-114 — M7.5 Calendar interaction and dialog parity corrections

- **Scope:** Product Owner reported seven follow-ups from two recordings and screenshots: a green day
  focus frame, dialog-close timeline jump, touch gestures, desktop cursors, course quick-view parity,
  Block editor density, and Delete keyboard access.
- **Outcome:** removed the day-sized focus shadow and restored dialog opener focus without scrolling.
  Blank grid now uses a crosshair; movable events use grab/grabbing. Day/Week touch keeps tap to open,
  shows a selection preview after a 300 ms hold, and lets a held finger extend a blank range or move a
  scheduled Session/Block; immediate swipes continue to pan. The mobile legend names these actions.
  Tapping an existing Session opens a compact Student/time/location quick view with Open, status,
  edit, and contextual removal actions; the full scheduling form remains behind Edit. The Block
  editor fits its date/time/note and actions to content height, with a single-row mobile footer.
  Delete works while a removable Session or Block dialog is active and focus is outside editable
  controls. A one-time scheduled Session uses the versioned delete operation; a scheduled Series
  occurrence uses the supported cancel transition and is labeled accordingly. Completed Sessions
  remain historical and do not expose deletion.
- **Verification:** a focused dialog regression failed before the focus fix and passed afterward.
  Web format/typecheck and 28 files/114 tests passed; Web production build passed with only the
  existing >500-kB chunk advisory; `git diff --check` passed. Authenticated Chrome confirmed the
  Block and Session dialogs, crosshair/grab cursor computation, no grid shadow, and unchanged
  timeline scroll positions (54 px desktop; 47.33 px at 390×844) after close. At 390×844, document
  width remained 390 px, the 370 px quick view and Block editor fit, and Block actions occupied one
  row. Touch pointer paths were exercised in jsdom regression tests; a physical touchscreen was not
  available for hardware validation.
- **Known issue:** M4 authority permits permanent delete only for scheduled, non-Series Sessions.
  Series occurrences use cancellation; completed Sessions remain history. The focus outline removal
  follows the Product Owner's request for no day-sized rectangle; keyboard users can still reach
  each day grid and press Enter.
- **Next:** continue M7.5 Stage 1 Product Owner review. Stage 2 and M8 require separate approval;
  this correction remains local, with no migration, push, or remote CI claim.

### 2026-09-18 — LOG-113 — M7.5 Calendar Day/Week drag scheduling

- **Scope:** Product Owner asked the formal Calendar to reproduce the Demo video's Day/Week gestures:
  drag a blank range into the composer and directly move scheduled Sessions or Blocks, including
  touch interaction on mobile. Agenda and Month do not use these gestures.
- **Outcome:** replaced release-only distance math with a captured pointer gesture and live range
  preview. A blank drag opens the existing three-mode composer at a 15-minute snapped range.
  Dragging a scheduled Session or Block preserves its duration and grab offset, can cross visible
  Week columns, and submits immediately through the existing versioned scheduling mutations;
  recurring Blocks move only the selected occurrence. Touch uses a 300 ms hold to start dragging;
  an immediate swipe pans the timeline instead, including when it begins over a completed Session.
  The grid can still scroll within the mobile panel.
  A failed move retains the proposed range in the editor, and a stale-version response refreshes
  Calendar authority. Completed Sessions remain openable but are not offered for direct movement
  because their scheduling update is not allowed by the M4 API.
- **Verification:** focused gesture regressions passed for dragged range, cross-day Session timing
  and version, held-touch range creation, touch pan/hold Block move, completed-Session touch panning,
  and retained failure draft. Complete Web format/typecheck and 28 test files/109 tests passed;
  Web production build passed with only the existing >500-kB
  advisory. In the authenticated desktop Chrome tab, a blank-grid drag opened the 12:00–13:30
  composer. An isolated development Block marked `[M7.5 開發測試資料] 拖曳驗證` was created on Friday,
  dragged to Saturday, and reopened showing the new date and original 90-minute duration. The
  390×844 browser preview showed Day at 390px document width and a 375px timeline without
  horizontal overflow; Week's 832px timeline scrolls inside its 375px panel. The computed grid
  touch action is `none`, with touch panning handled by the gesture code. `git diff --check` passed.
- **Boundary:** the 390×844 preview is a desktop browser frame; a physical touchscreen was not
  available for hardware acceptance. After the Product Owner approved cleanup, the isolated Block
  was deleted and its absence confirmed after a fresh Calendar reload. Stage 1 remains local;
  no migration, push, or remote CI is claimed.
- **Next:** continue M7.5 Stage 1 Product Owner review of Day/Week Calendar gestures.
  Stage 2 and M8 require their own authorization.

### 2026-09-18 — LOG-112 — M7.5 Calendar composer control scale and mobile fit

- **Scope:** Product Owner clarified that Demo typography and control dimensions were already
  correct; only the container needed slight expansion. The 390 × 844 composer still showed an
  internal scrollbar, and the scheduling backdrop should dim without blur.
- **Outcome:** kept a modest 560 × 550 desktop frame while restoring Demo-scale title, labels,
  inputs, selectors, mode cards, segmented controls, note, and action buttons. The 390 × 844
  composer uses a compact 610-pixel frame, reduced spacing, and a full-width location field.
  Removed the backdrop blur while retaining the dark overlay. This is a presentation-only change;
  scheduling operations and server authority are unchanged.
- **Verification:** the pre-change 390 × 844 Chrome preview visibly reproduced an inner form
  scrollbar. After the change, Course, Availability, and Block each showed all fields and actions
  within the same frame without an inner scrollbar. The existing desktop Chrome tab showed all
  three modes without internal scrolling; the block-repeat menu opened outside the dialog without
  clipping. A desktop screenshot confirmed the background remains dim but no longer blurred.
  Focused Calendar interaction tests passed 4/4, Web Prettier check passed, Web build/typecheck
  passed with only the existing >500-kB advisory, and `git diff --check` passed.
- **Boundary:** no live scheduling mutation, push, or remote CI was performed. On viewports shorter
  than the verified 390 × 844 target, overflow remains a safety fallback to avoid clipping.
  Continue Stage 1 Product Owner review; Stage 2 requires explicit authorization.

### 2026-09-18 — LOG-111 — M7.5 Calendar composer footprint and success feedback

- **Scope:** Product Owner found the new dialog oversized despite its availability mode still
  showing an inner scrollbar, and asked to remove the redundant `已建立 1 個封鎖時段。` display.
- **Outcome:** removed Calendar's routine success banners for scheduling mutations while keeping
  successful close, server-backed refresh, and in-form failure/conflict feedback. Reduced the
  composer from an 800 × 760 CSS-pixel frame to a fixed 620 × 620 desktop footprint, with tighter
  mode-card, field, segmented-control, note, and footer spacing. All three creation modes retain
  the same frame; the content region scrolls only when a genuinely short viewport or expanded
  editing controls cannot fit. Portaled dropdowns remain outside the dialog clipping boundary.
- **Verification:** a focused interaction test failed first on the exact block-success banner,
  then passed after the change (4/4 tests). Web Prettier check and production build/typecheck
  passed; build retained only the existing >500-kB advisory. `git diff --check` passed. In the
  existing authenticated desktop Chrome tab (1440 × 674), course, availability, and block modes
  all showed their fields without an inner scrollbar; the Student menu remained visible outside
  the dialog. The 390 × 844 mobile preview opened the course composer; its narrow-screen internal
  scrolling remains the deliberate overflow fallback, not a no-scroll acceptance claim.
- **Boundary:** no live block was created for this visual correction, and no remote CI/push was
  run. Very short/mobile viewports retain internal scrolling as a safety fallback instead of
  clipping fields or controls. Continue Stage 1 Product Owner review; Stage 2 needs explicit
  authorization.

### 2026-09-18 — LOG-110 — M7.5 Calendar composer and collapsed-header continuity

- **Scope:** Product Owner's video showed the collapsed title expanding again on view changes;
  the scheduling dialog's warning acknowledgement, layout, availability controls, block wording,
  shifting dimensions, and clipped Demo dropdowns required correction.
- **Outcome:** removed the view-change effect that reset the collapsed header and kept the wheel
  listener stable across views. Rebuilt the three scheduling modes around the Demo's type cards,
  shared date/time row, course Student/repeat/location grouping, availability add/remove and
  date/weekday segmented controls, and optional block note/repeat selector. Removed the extra
  pre-save warning and confirmation checkbox while retaining required time validation and server
  conflict responses. Course repeat uses the existing server-authoritative Schedule Series
  operation; no Demo persistence was introduced. The dialog now has a stable bounded size with a
  scrollable content region and fixed footer; time suggestions and shared FormSelect menus render
  above the dialog instead of being clipped by it. The block-note placeholder rejected by the
  Product Owner is absent from the formal UI.
- **Verification:** a CalendarPage interaction regression failed before the header fix and passed
  after it. The same test covers all three modes, the time-menu portal, and weekly-repeat routing
  to Schedule Series; SchedulingDialog focus tests passed. Web format/typecheck and all 27 test
  files/103 tests passed; Web production build
  passed with the existing >500-kB advisory. `git diff --check` passed. Sandbox `spawn EPERM`
  required elevated Vite runs. Local API `/health` and Web `/calendar` both returned 200.
  Authenticated desktop Chrome confirmed the header stays collapsed after switching Week to Day,
  the fixed-size three-mode dialog, and fully visible time and repeat menus. The exact 390×844
  mobile preview confirmed all three modes, the fixed footer/internal scroll, and student/repeat
  menus within the screen without horizontal clipping.
- **Known issue:** visual/browser checks did not submit new development scheduling records, so
  live save/repeat effects are not claimed. This remains Stage 1 local work; no push or remote CI.
- **Product Owner follow-up:** the existing `5173/calendar` Chrome tab still held the old runtime
  after the source and Vite-served module had changed. Its dialog still showed the native time
  picker and warning checkbox at 15:08, even though the new CalendarPage source was last written
  at 14:58. The prior browser check had used a new tab and therefore missed this mismatch. Reloaded
  that exact existing tab without preserving an in-progress form; it then showed `FORM / ACTION`,
  the Demo-style three modes, custom time fields, and no warning. In the reloaded tab, an actually
  collapsed header stayed collapsed across Week → Month → Day. Course, availability, and block
  modes were inspected there; the block repeat menu remained visible after scrolling its trigger
  into view. The focused Calendar interaction suite passed again (3/3); its first sandbox run
  hit Windows `spawn EPERM`, then passed through the approved elevated path. The reason the old tab
  did not hot-update is not yet confirmed. Do not treat a new-tab
  check alone as Product Owner-visible browser acceptance.
- **Next:** continue M7.5 Stage 1 Product Owner review of the Calendar interface. Stage 2 needs
  explicit authorization.

### 2026-09-18 — LOG-109 — M7.5 Calendar four-view correction

- **Scope:** Product Owner identified excess title spacing, mismatched pager controls, a vertical
  Agenda, Day's large empty-state overlay, Month's extra October-only week and weak outside-month
  contrast, and lime selection in the view switch. Agenda and Month also did not collapse the page
  header on wheel input.
- **Outcome:** reduced the title-to-panel gap, copied the Demo's plain arrow and bold Today control,
  seven-column desktop Agenda and horizontal-date mobile cards, and centered Day timeline with the
  weekday in its date title. Removed
  the empty overlay so availability remains visible on a day without lessons. All four views share
  the expanding planner and wheel-triggered header collapse. Month now ends after its last
  intersecting week, advances by calendar month, dims entire outside-month cells including lessons,
  and keeps fixed-height cells with a `還有 N 堂` entry leading to Day. The selected view uses dark
  ink with white type; panel and timeline chrome are white.
- **Verification:** Web format/typecheck and 26 test files/100 tests passed; the final test pass
  used one worker after a transient four-worker startup timeout. Production build passed with the
  existing >500-kB advisory. Authenticated Chrome confirmed desktop seven-column Agenda,
  centered 620px Day without an empty overlay, Agenda and Month wheel collapse, September 2026's
  35 fixed-height month cells ending at October 4, and dark selected view. Exact 390×844 preview
  confirmed mobile Agenda's horizontal-date cards without overlap. Stage 1 remains local; no push
  or remote CI is claimed.
- **Next:** continue M7.5 Stage 1 Product Owner review; Stage 2 needs explicit authorization.

### 2026-09-18 — LOG-108 — M7.5 Calendar Demo presentation and scroll convergence

- **Scope:** Product Owner rejected LOG-107's partial Calendar visual copy: the collapsed header did
  not expand the planner, the document still had a scrollbar, the overdue palette was absent, and the
  panel was too narrow with the wrong background and cramped type.
- **Outcome:** matched the Demo's bounded viewport layout, expanding planner flex structure, and
  captured wheel gesture logic with a short tail lock. One downward wheel gesture anywhere on the
  day/week Calendar collapses the header; upward scrolling expands it only at the planner top. The
  page no longer scrolls separately. Matched the Demo's 48px page insets, white planner, compact
  typography, time labels, pastel availability/Session/Block palette, and drag grips. Added
  `逾時未完成` in the legend and classified scheduled Sessions as overdue once their end time passes;
  week, agenda, and month use the same visual state. Retained server-authoritative data and the
  existing scheduling operations.
- **Verification:** Web format/typecheck, 25 test files/98 tests, and Web production build passed
  with the existing >500-kB advisory. Authenticated 1440px Chrome showed planner and document widths
  equal their client widths, document height equal viewport height, and the planner growing from
  about 507px to 661px after the first downward wheel gesture. The next gesture scrolled only the
  planner; agenda showed three `逾時未完成` Sessions. Exact 390×844 mobile preview showed the bounded
  panel, visible controls, and readable agenda. `git diff --check` passed.
- **Known issue:** mobile Week view retains its Demo-style in-panel horizontal scroll for legible
  time blocks. This Stage 1 correction remains local; no push or remote CI is claimed.
- **Next:** continue M7.5 Stage 1 Product Owner review; do not begin Stage 2 or M8 without explicit
  authorization.

### 2026-09-18 — LOG-107 — M7.5 Calendar visual and sidebar identity correction

- **Scope:** Product Owner requested the formal Calendar adopt the Demo's clear seven-day visual
  presentation without desktop horizontal scrolling and reported a truncated sidebar account label.
- **Outcome:** combined the Calendar period, view switch, legend, date headers, shared time axis,
  availability bands, sessions, and blocks into a Demo-aligned planner panel. Seven desktop day
  columns now share the available width; the mobile default remains the readable agenda, with all
  four view controls visible at 390px. Removed three obsolete grid columns from the sidebar Coach
  card so its existing Workspace-name/Email fallback can render at full width.
- **Verification:** Web format/typecheck and 24 test files/94 tests passed; Web build passed with
  the existing >500-kB advisory. Authenticated Chrome at 1440px showed all seven columns in the
  planner (`1016px` client and scroll width), no document horizontal overflow, and full sidebar
  name/Email. The exact 390×844 mobile preview showed an uncut view switch and working agenda/week
  toggle. `git diff --check` passed.
- **Known issue:** mobile Week view retains its intentional in-panel horizontal scroll to keep
  time blocks legible; mobile opens in Agenda. Stage 1 remains local; no push or remote CI is claimed.
- **Next:** continue M7.5 Stage 1 Product Owner review; do not begin Stage 2 or M8 without explicit
  authorization.

### 2026-09-17 — LOG-106 — M7.5 Exercise Library CI delivery

- **Scope:** Product Owner authorized CI after closing the Exercise Library review.
- **Outcome:** committed and pushed Exercise Library, shared dropdown/dialog, optimistic favorite,
  save-feedback, and page-title corrections as `6f42cfc` (`feat: refine M7.5 exercise library interactions`).
- **Verification:** local `npm run check` passed: API 70 tests in 19 files and Web 94 tests in 24
  files. `npm run build` passed with the existing >500-kB chunk advisory. Linked development
  `npm run db:push:dry` reported the remote migrations up to date. GitHub Actions run
  `35205978389` for exact SHA `6f42cfc` succeeded: `verify` in 42s and `migration-dry-run` in 29s.
- **Known issue:** GitHub Actions emitted two informational notices that `actions/checkout@v4` and
  `actions/setup-node@v4` target deprecated Node 20 and were forced to run on Node 24. No project
  check failed.
- **Next:** continue M7.5 Stage 1 Product Owner review; do not begin Stage 2 or M8 without explicit
  authorization.

### 2026-09-17 — LOG-105 — M7.5 page-title size alignment

- **Scope:** Product Owner requested page titles to match the Today greeting size.
- **Outcome:** the shared page-header title now uses Today's `clamp(32px, 4vw, 52px)` desktop size and 34px mobile size. Removed the Student detail size overrides so Calendar, Students, Exercise Library, Settings, and detail titles follow the same scale.
- **Verification:** checked the title selectors and `git diff --check` passed. This focused CSS correction did not receive a broader browser or build run.
- **Known issue:** local Stage 1 review work; no push or remote CI is claimed.
- **Next:** continue M7.5 Stage 1 Product Owner review while retaining the LOG-100 push decision; do not begin Stage 2 or M8.

### 2026-09-17 — LOG-104 — M7.5 Exercise Enter, favorite convergence, and save feedback

- **Scope:** Product Owner reported intermittent Enter submission in the Exercise editor, forbidden
  cursor during favorite persistence, opaque favorite-button backing, illegible lime-button hover,
  and missing in-button saving feedback.
- **Outcome:** fixed Strict Mode's temporary effect cleanup restoring focus to the opener after the
  editor had opened. Enter now submits a dialog form whenever a text input is not active, including
  when a choice button retains focus; focused text input Enter still blurs first, and select controls
  retain their own keyboard handling. Favorite clicks remain available during persistence and update
  the Coach-scoped cache immediately. A per-Exercise queue coalesces rapid clicks, sends writes in
  order using each accepted server version, retries version conflicts after refreshing authority,
  and rolls back only when the final requested state cannot be saved. The heart backing is
  transparent. Lime primary buttons now hover to a slightly deeper lime while retaining dark text.
  The Exercise editor stays open with a disabled `儲存中…` button until the write finishes, keeping
  input in place on error. Existing Student, purchase, settings, and training save buttons now show
  their pending wording consistently.
- **Verification:** focused Strict Mode focus/Enter, in-flight save, rapid favorite, rollback, and
  version-conflict tests passed. Web format/typecheck and all 94 tests in 24 files passed; Web build
  passed with the existing >500-kB chunk advisory. Authenticated desktop review showed focus on the
  open editor and a transparent heart backing; favorite was toggled on/off and a reload confirmed
  its original off state on the server. `git diff --check` passed.
- **Known issue:** this remains local Stage 1 review work. No push or remote CI is claimed; the
  earlier checkpoint push remains blocked as recorded in LOG-100.
- **Next:** continue M7.5 Stage 1 Product Owner review while retaining the LOG-100 push decision;
  do not begin Stage 2 or M8.

### 2026-09-17 — LOG-103 — M7.5 Exercise Library interaction and dialog correction

- **Scope:** Product Owner requested roomier cards with recognizable transparent equipment icons,
  restrained lime emphasis and denser editor layout, reliable equipment-menu dismissal, immediate
  feedback for Exercise mutations, and consistent Enter/Escape/outside dismissal in popups.
- **Outcome:** put the equipment glyph on its own card row, restored card breathing room, and redrew
  barbell, kettlebell, pulley, and fixed-machine marks. The desktop editor puts name and equipment
  side by side, reserves lime for Save, uses consistent dark selections and field labels, and moves
  the snapshot note into its subdued footer. The equipment list opens on deliberate input/click
  rather than focus and closes on outside pointer action without blur/click reopening. Exercise
  create, edit, favorite, and delete now optimistically update the Coach-scoped TanStack cache,
  reconcile with the server response, and roll back on error; delete uses a styled confirmation.
  Shared dialog behavior removes default input autofocus, blurs text inputs on Enter, submits a
  form on a later Enter outside an input, and cancels on Escape or direct backdrop click, with
  focus restored to the opener. This is applied to Coach editor, student, scheduling, purchase,
  training picker, trend, and capability dialogs; public rescheduling confirmation also dismisses
  on backdrop click.
- **Verification:** focused editor/dropdown and optimistic cache rollback tests passed. Web format,
  typecheck, and all 90 tests in 24 files passed; Web build passed with the existing >500-kB chunk
  advisory. Authenticated desktop review confirmed three roomier cards per row and a non-scrolling
  editor at the observed desktop viewport; the 390 × 844 preview had no horizontal overflow.
  Equipment outside-click, editor Escape/focus, student Escape, and delete-confirmation backdrop
  dismissal were exercised in the live browser without permanent data changes. Favorite was toggled
  on and off and returned to its original value. `git diff --check` passed.
- **Known issue:** this remains local Stage 1 review work. No push or remote CI is claimed; the
  earlier checkpoint push remains blocked as recorded in LOG-100.
- **Next:** continue M7.5 Stage 1 Product Owner review while retaining the LOG-100 push decision;
  do not begin Stage 2 or M8.

### 2026-09-17 — LOG-102 — M7.5 Exercise Library cards and editor design correction

- **Scope:** Product Owner requested less repeated content in Exercise cards, equipment-specific icons,
  shorter three-column cards, consistent clickable controls, and a more coherent Exercise editor.
- **Outcome:** removed persistent success copy, catalog labels, and per-card performance copy;
  condensed the cards to 174px minimum height and added distinct glyphs for known equipment while
  leaving unrecognized custom equipment without a generic glyph. Reworked the editor with consistent
  field labels and spacing, two-option movement and metric controls, editable equipment with the full
  selection list, and styled body-part chips. Clickable buttons now show a pointer cursor.
- **Verification:** Web format/typecheck and all 86 tests in 22 files passed; production build passed
  with the existing >500-kB chunk advisory. Authenticated desktop review showed three compact cards
  per row and the equipment menu attached below its field. The 390 × 844 preview showed single-column
  cards and an editor without horizontal overflow; choosing a different equipment option updated the
  field, and the unsaved change was discarded. `git diff --check` passed.
- **Known issue:** this is local Stage 1 review work. No push or remote CI is claimed; the earlier
  checkpoint push remains blocked as recorded in LOG-100.
- **Next:** continue M7.5 Stage 1 Product Owner review while retaining the LOG-100 push decision;
  do not begin Stage 2 or M8.

### 2026-09-17 — LOG-101 — M7.5 shared dropdown styling and placement correction

- **Scope:** Product Owner requested FORM-styled dropdowns across the formal Web, then reported that
  the new menu sometimes appeared far from its field in the Exercise editor.
- **Outcome:** added one shared select with a white floating menu, lime selection, keyboard and
  pointer interaction, and viewport-aware placement; migrated every runtime native select in Coach
  routes. Replaced the Exercise equipment datalist with styled editable suggestions. The placement
  error came from using the menu's maximum available height when flipping a short menu upward;
  positioning now uses its content height and scrolls only the menu's own contents. Calendar's
  Student selection retains an explicit required-field check.
- **Verification:** Web format, typecheck, and all 86 tests in 22 files passed; Web production build
  passed with the existing >500-kB chunk advisory. A focused regression test covers upward menu
  adjacency. Authenticated desktop Exercise editor and 390 × 844 preview showed the open menu next
  to its trigger with no horizontal overflow in the visible mobile viewport. No data was changed.
- **Known issue:** this remains local Stage 1 review work. No push or remote CI is claimed for these
  files; the earlier checkpoint push remains blocked as recorded in LOG-100.
- **Next:** continue M7.5 Stage 1 Product Owner review while retaining the LOG-100 push decision;
  do not begin Stage 2 or M8.

### 2026-09-17 — LOG-100 — M7.5 early CI preflight complete; main push needs approval

- **Scope:** Product Owner paused Today review and asked for CI before Stage 2. Reconciled all 43
  pending files as accumulated Stage 1 corrections: Today, notifications, Auth, Calendar focus/link
  entry, local launcher/mobile preview, API support, and two already-applied development migrations.
- **Outcome:** created local checkpoint commit `18b0960a9ac62154ae511dfa5975d633dbc659f1` on `main`.
  An attempted push to `origin/main` was rejected by auto-review because the broad default-branch
  mutation lacked explicit authorization for that scope. No remote CI has run for this SHA, and no
  alternate push path was used.
- **Verification:** root check passed API 19 files/70 tests and Web 21 files/84 tests; root build
  passed with the existing >500-kB Vite advisory. Linked development migration dry-run was up to
  date, `app_private` lint reported no schema errors, and Supabase Security Advisor retained only
  the known leaked-password-protection warning. Performance Advisor retained existing informational
  index and policy findings. Staged `git diff --check` passed; `origin/main` matched the pre-commit
  local baseline `39009a4`. Existing desktop/390px Today acceptance is recorded in LOG-093–097.
- **Known issue:** the requested exact-SHA remote CI is blocked until the Product Owner explicitly
  approves a 43-file direct `main` push or chooses a narrower delivery scope.
- **Next:** obtain that decision, then run exact-SHA remote CI only for the authorized push; remain
  in M7.5 Stage 1.

### 2026-09-17 — LOG-099 — M7.5 Today quotation rotation completed

- **Scope:** Product Owner clarified that the supplied quotation list contained twelve sayings,
  not the five previously implemented.
- **Outcome:** added the seven missing sayings and kept a twelve-entry random rotation with concise
  credentials and source links. Direct English wording guided the Chinese copy. The supplied
  “iron is the best antidepressant” attribution was corrected from Jim Wendler to Henry Rollins,
  whose essay contains it; the rotation thus has twelve sayings by eleven named people. Dorian
  Yates's line uses the wording traceable to his book rather than the earlier interpretive version.
- **Verification:** a focused quote test asserts twelve distinct sayings with attributions and
  links. Web check passed 21 files/84 tests; Web build passed with the existing >500-kB chunk
  advisory. Stage 1 remains local; no push, remote CI, API, or schema change is claimed.
- **Next:** continue M7.5 Stage 1 Product Owner review; keep Stage 2 and M8 gated.

### 2026-09-17 — LOG-098 — M7.5 Today quotation translations

- **Scope:** Product Owner rejected interpretive rewrites of the five Today quotations and requested
  direct Chinese translations, specifically correcting the Dave Tate statement that had become a
  question.
- **Outcome:** replaced all five interpretive lines with close translations of their cited English
  wording, without added advice or conclusions. Attribution, random selection, compact layout, and
  existing source links remain unchanged.
- **Verification:** checked the available cited wording and the Product Owner-provided Dave Tate
  original; Web check passed 20 files/83 tests; Web build passed with the existing >500-kB chunk
  advisory. This copy-only Stage 1 correction remains local; no push, remote CI, API, or schema
  change is claimed.
- **Next:** continue M7.5 Stage 1 Product Owner review; keep Stage 2 and M8 gated.

### 2026-09-16 — LOG-097 — M7.5 Today notification row balance

- **Scope:** Product Owner flagged crowded read/time metadata, top-heavy notice rows, and a
  navigation arrow attached awkwardly to the message title.
- **Outcome:** vertically centered each notice's content and unread marker, expanded the space
  between read state/action and occurrence time, and anchored the subtle arrow at the right edge
  of navigable message space. Informational reschedules retain no arrow or destination. The
  existing three-row scroll viewport and notification behavior are unchanged.
- **Verification:** Web check passed 20 files/83 tests; Web build passed with the existing
  > 500-kB chunk advisory. Authenticated Chrome visual inspection covered desktop and 390px notice
  > layouts, including the right-aligned mobile metadata row; no overflow was visible. No schema,
  > API, push, remote CI, or production change is claimed.
- **Next:** continue M7.5 Stage 1 Product Owner review; keep Stage 2 and M8 gated.

### 2026-09-16 — LOG-096 — M7.5 Today notification alignment and quiet refresh

- **Scope:** Product Owner supplied a notification screenshot with explicit right-side alignment
  targets for read control/state and occurrence date/time, and asked how redeemed reschedules can
  appear without manually refreshing Today.
- **Outcome:** the desktop notice row keeps its message at left, read control/status near the right,
  and Workspace-local date plus time at the far right. The dismiss control stays upper-right; at
  390px the metadata moves to a right-aligned second line rather than squeezing the message. Today
  alone refreshes its server projection every 60 seconds while visible, immediately on entry,
  focus return, and reconnect. Hidden tabs and other routes do not poll. Cached content stays in
  place without a per-tick update banner; a failed background refresh explicitly says the last
  data is being shown. This is bounded polling, not instant push or a cross-route inbox.
- **Verification:** elevated Web check passed 20 files/83 tests, including the new Today refresh
  options check; Web production build passed with the existing >500-kB advisory. Authenticated
  Chrome showed one newly redeemed reschedule with original/new times, an unread control, three
  visible notices with internal scrolling, and right-side timestamps at desktop and exact 390px.
  No new redemption was initiated by this check. No schema, API, push, remote CI, or production
  change is claimed.
- **Next:** continue M7.5 Stage 1 Product Owner review; keep cross-route notification scope in
  the Stage 2 backlog and M8 gated.

### 2026-09-16 — LOG-095 — M7.5 Today notification actions and quotation copy

- **Scope:** Product Owner refined the Today inbox: redeemed reschedules are informational with
  original/new times, navigable reminders have a subtle arrow, each row can be marked read or
  dismissed separately, only three rows show before scrolling, and the newest 30 remain in the
  feed. Removed redundant read-count copy/zero padding and the manual quote control; updated the
  page description and quote attribution/length.
- **Outcome:** reschedule redemption now atomically stores the actual pre-change start time. New
  notices say `從…改至…` and do not navigate; older redemptions without a retained original time say
  `原時間未留存，改至…`. A Workspace-scoped read/dismiss state hides only the selected notice, never
  deletes its source event. A navigable message is a separate Link from the read and dismiss
  controls. Mobile keeps the three-row notification panel above the bottom navigation; the quote
  card selects one longer sourced paraphrase per page mount and credits its author with one title.
- **Verification:** elevated API check passed 19 files/70 tests; elevated Web check passed 20
  files/82 tests. Elevated root build passed with the existing >500-kB chunk advisory. Official
  migration `20260916151038` was applied only to linked development; read-only schema query
  confirmed the new columns, private-schema lint found no errors, and linked dry-run is up to date.
  Authenticated Chrome showed informational legacy reschedules without route arrows, a separate
  dismiss control, three visible rows, unpadded zero count, revised header and attribution, and
  desktop/390px panel placement. `git diff --check` passed. No new live redemption was performed,
  and no push, remote CI, production, or Stage 2 claim is made.
- **Known issue:** historical redeemed links cannot be backfilled with an original time from the
  existing schema. Their notices remain truthful rather than reconstructed from a later Session.
- **Next:** continue M7.5 Stage 1 Product Owner review; keep consolidated Stage 2 and M8 gated.

### 2026-09-16 — LOG-094 — M7.5 mobile preview entry added

- **Scope:** Product Owner requested a separate way to enter the formal application from a phone-sized perspective for visual review.
- **Outcome:** root `start-gym-assistant-mobile.cmd` reuses the existing API/Web startup checks and opens a development-only `mobile-preview.html`. Its same-origin iframe keeps the formal app interactive at a 390 × 844 viewport; the normal launcher still opens Today directly.
- **Verification:** the new batch entry exited successfully while reusing healthy API/Web services and opened `/mobile-preview.html`. Browser inspection showed the formal sign-in route inside the iframe with `innerWidth=390`, `innerHeight=844`, and body `scrollWidth=375`. Preview HTML passed Prettier; `git diff --check` passed. No phone hardware, touch-event, full root check/build, push, or remote CI evidence is claimed for this focused Stage 1 correction.
- **Next:** continue M7.5 Stage 1 Product Owner review; keep the consolidated Stage 2 and M8 gates unchanged.

### 2026-09-16 — LOG-093 — M7.5 Today notifications and compact fitness quotations

- **Scope:** Product Owner set low-balance attention to <=1, removed training-plan reminders from
  notifications, retained schedule conflicts, added redeemed Student reschedules, and moved the
  read/unread feed into the fourth Today signal. The separate attention panel's principle quote was
  replaced with rotating sourced fitness quotations.
- **Outcome:** a single expandable `待處理與課程提醒` signal counts unread notices, displays four rows at
  a time with internal scrolling and newest first, and dims a row after an acknowledged open. The
  server derives active low-balance and current-day conflict occurrences plus recent redeemed-link
  events, and persists only idempotent read receipts in `app_private` under verified Workspace RLS.
  Training readiness remains on Session rows. The compact quote card rotates five source-checked
  Chinese paraphrases on mount or `換一句`, with author and source links. The bounded interaction and
  30-day reschedule window are recorded in `M7.5-TODAY-NOTIFICATIONS-CONTRACT.md`.
- **Verification:** elevated API tests passed 19 files/69 tests after updating the <=1 contract;
  Web check passed 20 files/82 tests after restoring an empty-state icon import. Root build passed
  with its existing >500-kB advisory. Linked development dry-run identified only migration
  `20260916140649`, which was applied with Vault changes skipped; a read-only query confirmed RLS,
  no anon select, API insert, and one policy. Private-schema lint found no errors; dry-run then
  reported up to date. Authenticated Chrome showed the real redeemed-reschedule notice and persisted
  read style, dropdown/Escape, quote rotation, and 390×844 no horizontal overflow; extra mobile
  bottom space makes quote attribution reachable. No push, remote CI, production, or broad Stage 2
  claim is made.
- **Known issue:** the current feed is a focused Today surface, not background push or an all-route
  inbox. A source occurrence can age out or resolve without deleting the historical read receipt.
- **Next:** continue M7.5 Stage 1 with the next Product Owner-reported issue; keep the broader
  notification taxonomy in Stage 2 and do not enter M8 without authorization.

### 2026-09-16 — LOG-092 — M7.5 Calendar editor input focus repaired

- **Scope:** Product Owner's recording showed the Schedule editor moving focus from the location
  field to the upper-right close button after every character; requested a check of other editable
  fields and interaction options.
- **Outcome:** `SchedulingDialog` now initializes and restores focus only for its mount/unmount
  lifecycle, while Escape uses the latest close callback. The parent can update a controlled draft
  without restarting the focus effect. Audited the other formal Web dialogs and focus effects; no
  other text-input dialog repeats autofocus on every controlled-field update.
- **Verification:** the focused DOM regression failed before the fix with `activeElement` on the
  close button after typing `F`, then passed afterward. Additional note, date, select, and checkbox
  focus cases passed. Elevated root check passed API 18 files/68 tests and Web 20 files/82 tests;
  root build passed with the existing >500-kB advisory; `git diff --check` passed. Authenticated
  Chrome at `5173/calendar` kept location focused across `F`, `o`, `r`, `m`, and Block note focused
  across `N`, `o`; Exercise search retained focus across `P`, `a`, and Student creation name across
  `T`, `e`. Unsaved drafts were cancelled and the modal opener regained focus. No push or remote CI
  is claimed for this local correction.
- **Known issue:** unrelated Stage 1 edits remain in the shared worktree; preserve them for their
  own review and delivery.
- **Next:** continue M7.5 Stage 1 Product Owner review with the next reported issue. Do not begin
  Stage 2 or M8 without the stated phase decision.

### 2026-09-16 — LOG-091 — M7.5 Today Demo fidelity and authoritative course readiness

- **Scope:** Product Owner compared the first Today correction with the Demo again and requested
  closer typography, spacing, markers, hover motion, a “今日課表” heading, training readiness, and
  planned duration. They also questioned duplicated low-balance signals and a broader reminder feed.
- **Outcome:** Today now matches the Demo's compact greeting, signal-strip/panel proportions,
  typographic hierarchy, numbered timeline, status pills, and subtle pale-lime row hover/shift,
  while retaining the formal Session location. The fourth signal is today's courses needing a plan
  instead of duplicating the low-balance list. A workspace-scoped Training summary adds
  `待規劃`/`規劃中`/`已就緒` from persisted exercise/set plans, and the row shows duration from scheduled
  start/end. The side panel groups existing low-balance, schedule-conflict, and unplanned-training
  attention. Existing low-balance <=2 is unchanged; redeemed-link event notifications and the
  proposed <=1 rule await Product Owner decision in the Stage 2 backlog.
- **Verification:** elevated root `npm run check` passed Prettier, API typecheck/18 files/68 tests,
  and Web typecheck/19 files/80 tests. Root production build passed (existing >500-kB advisory).
  Authenticated Chrome at 2048px and exact 390×844 showed live session status/duration, the plan
  signal, and no mobile horizontal overflow; the supplied Demo recording confirmed the row-hover
  motion used here. No schema migration, push, or remote CI is claimed for this Stage 1 correction.
- **Next:** continue M7.5 Stage 1 Product Owner review. Freeze notification-event and low-balance
  threshold decisions before broadening the Today reminder feed.

### 2026-09-16 — LOG-090 — M7.5 Today hierarchy converged with Demo

- **Scope:** Product Owner compared the formal `/today` against the Demo and identified a scattered
  three-card dashboard, oversized heading, dark schedule block, and low-priority reminders occupying
  a full-width section. This is an immediate Stage 1 visual correction, not the Stage 2 cross-route
  audit.
- **Outcome:** Today now has a compact date/heading, one lime-and-ink four-signal strip, a white
  schedule timeline, and a distinct reminder panel. Desktop uses a schedule/attention grid; mobile
  stacks a 2×2 strip and the two panels. The formal projection remains authoritative: real recorded
  income, lesson-balance attention, and scheduled/completed sessions only; no Demo seed facts or
  invented training status. Existing local API-error recovery is preserved.
- **Verification:** elevated Web check passed formatting, typecheck, and 19 files/80 tests; Web
  production build passed with the existing over-500-kB advisory. Authenticated Chrome inspection
  confirmed the current Today projection at desktop and 390×844; mobile document width stayed below
  the viewport, and schedule/reminder links remained exposed. `git diff --check` passed. No push,
  migration, remote CI, or complete Stage 2 regression is claimed.
- **Next:** continue M7.5 Stage 1 with the next Product Owner-reported issue. Do not begin Stage 2 or
  M8 without the respective Product Owner handoff.

### 2026-09-16 — LOG-089 — M7.5 local entrypoint recovered for Product Owner debugging

- **Scope:** Product Owner could not debug because the formal Web remained at 5173 while its local
  API at 3000 had stopped; the prior separate-service procedure was only temporary. Prioritized this
  concrete Stage 1 interruption without changing M7.5 scope or starting the consolidated Stage 2.
- **Outcome:** the Windows launcher now reuses healthy services, starts a missing API through a
  simple dedicated batch entry, waits for `/health`, and refuses to open a Web-only half-start.
  Vite refuses silent 5174 fallback. Today distinguishes a local proxy 502 from ordinary failures
  and tells the Coach to reopen the application and retry. The API was restored for this session.
- **Verification:** reproduced `5173/today` 200 + proxy 502 + API refusal; stopped the temporary API
  and reproduced the red state; actual launcher cold start restored API/proxy health 200 and left
  formal Web at 5173. Unauthenticated Today returned 401, and duplicate formal Vite failed on
  occupied 5173. Elevated root check passed API 66/Web 80 tests; elevated root build passed with
  the existing bundle-size warning; whitespace check passed.
- **Known issue:** the cause of the original API process exit was not captured from its old window;
  the launcher prevents startup half-state but does not supervise later API exits. Cross-route
  service recovery remains Stage 2; no authenticated Today read or remote CI is claimed.
- **Next:** continue M7.5 Stage 1 Product Owner review; Stage 2 retains persistent-runtime and
  cross-route recovery work. Do not enter M8 without its authorization and decisions.

### 2026-09-16 — LOG-088 — M7.5 Auth hierarchy corrected; broader IA queued

- **Scope:** Product Owner identified an unconditional verification-help action on sign-in, weak
  separation between password and Google, unclear brand copy, and broader cross-route hierarchy
  concerns. Inspected the existing six-digit signup/verification/resend operations and Auth layout.
- **Outcome:** sign-in keeps only contextual password recovery and account creation; `或者` separates
  the alternate Google method. Verification help lives after code delivery with a 60-second resend
  wait and safe pending/error feedback; an unconfirmed-email sign-in offers the verification route.
  The left panel now uses the Product Owner's headline and subtitle. A cross-route hierarchy audit
  is recorded in the Stage 2 backlog, not prematurely redesigned in Stage 1.
- **Verification:** elevated Web check passed 19 files/79 tests; Web build passed with the existing
  chunk-size advisory; `git diff --check` passed. Desktop and 390×844 browser inspection found no
  mobile horizontal overflow. Intercepted signup and resend requests showed the countdown and
  renewed wait without development account or email side effects.
- **Known issue:** live SMTP/OTP delivery and the conditional unconfirmed-account error path were
  not exercised against a real account; the existing M2 acceptance remains the baseline. Stage 1
  remains local; no push or remote CI is claimed.
- **Next:** continue M7.5 Stage 1 with the next Product Owner-reported issue. Keep the cross-route
  audit and Windows entrypoint in Stage 2 until the Product Owner ends review; do not enter M8.

### 2026-09-16 — LOG-087 — M7.5 reschedule-link entry exposed from Calendar

- **Scope:** Product Owner could not find the Demo's `改期連結` in the formal product. Compared the
  Demo Session header, M6 Contract, formal Session action, and the Calendar session editor.
- **Outcome:** retained the existing server-authoritative link dialog on the Session route and added
  a direct Calendar editor entry for future scheduled Sessions. The route opens that dialog without
  issuing a link; closing removes the route hint and returns focus to its Session action.
- **Verification:** elevated Web check passed 19 files/79 tests; Web production build passed with the
  existing chunk-size advisory; `git diff --check` passed. Authenticated Chrome verified the path
  at desktop and exact 390×844, with no horizontal overflow (390px viewport/390px content).
- **Known issue:** no link issuance or public redemption was exercised in this UI-only correction;
  existing M6 behaviour and its verification remain the baseline. Stage 1 remains local.
- **Next:** continue M7.5 Stage 1 with the next Product Owner-reported issue; defer Stage 2 and M8
  until their respective Product Owner decisions.

### 2026-09-16 — LOG-086 — M7.5 performance fixtures prepared

- **Scope:** the Product Owner requested weight-and-repetition records for every established Student
  Session in the current development test Workspace.
- **Outcome:** created a complete Training Record for each of the 47 completed temporal Sessions.
  Each Record contains high-bar back squat, barbell bench press, and sumo deadlift snapshots, with
  three completed kg-based sets, recorded repetitions, and progressive loads; future Sessions and
  the open scheduled-session draft were untouched.
- **Verification:** read-only database query returned 47 Records, 141 exercise entries, 423 Sets,
  and exactly the three requested catalog exercises. An authenticated reload showed Student
  performance cards for all three series and their personal bests.
- **Known issue:** all weights, repetitions, and RPE values are fabricated development fixtures.
- **Next:** continue M7.5 Stage 1 with the next Product Owner-reported issue; keep Stage 2 and M8
  gated by the existing Product Owner decisions.

### 2026-09-16 — LOG-085 — M7.5 review test data prepared

- **Scope:** the Product Owner requested realistic Availability and established Student schedules
  before continuing Stage 1 review. Confirmed the currently authenticated test Coach against the
  linked development Workspace and checked that it held only one Student and no Availability.
- **Outcome:** added 11 weekday Availability windows and five marked fictional Students, each with a
  Purchase, active fixed Series, 6–11 historical completed Sessions, and four upcoming Sessions.
  Retained the original Student and its existing Sessions/Purchase, moved only its Series anchor back
  to July, and added eight historical completed Sessions. No other Workspace was targeted.
- **Verification:** one guarded database transaction; read-only post-write query returned six active
  Students/Series, 47 completed Sessions, 21 future Sessions, and zero temporal Session overlaps.
  Authenticated browser verified the six-row roster, derived entitlement, full Student history and
  next Session, active rhythm, and Calendar entries for the current week. No code/schema checks were
  applicable to this data-only setup.
- **Known issue:** these are fabricated development fixtures, including the original Student's
  backdated history; they must not be treated as real coaching or payment records.
- **Next:** continue M7.5 Stage 1 with the next Product Owner-reported issue; keep Stage 2 and M8
  gated by the existing Product Owner decisions.

### 2026-09-16 — LOG-084 — M7.5 Stage 1 interim checkpoint delivered

- **Scope:** Product Owner explicitly requested an interim push and CI run for the current M7.5
  Stage 1 checkpoint, including Student course-record composition, the two-stage workflow, route
  prefetch/cache correction, and client-side Exercise filtering.
- **Outcome:** commits `120f867` and `f5996f1` are on `origin/main`; the interim delivery does not end
  Stage 1 or start the deferred Stage 2 backlog. No schema, migration, production, or M8 scope changed.
- **Verification:** root check passed API 18 files/66 tests and Web 19 files/79 tests. Root production
  build passed with only the existing Web >500-kB advisory; linked migration dry-run reported
  `upToDate:true` with no migrations, seeds, or roles pending; `git diff --check` passed.
- **Delivery:** GitHub Actions CI #26 / run `35065072206` completed successfully in 55 seconds for
  exact SHA `f5996f1b25454dca3f7b186d801123ebe8bdcce8`; Verify passed in 28 seconds and
  migration-dry-run passed in 20 seconds. The two annotations are the tracked Node 20 action
  compatibility warnings.
- **Next:** resume Stage 1 with the next Product Owner-reported issue; keep the Windows-entrypoint
  correction in the Stage 2 backlog and do not enter M8.

### 2026-09-16 — LOG-083 — M7.5 route prefetch and local Exercise filtering complete

- **Scope:** corrected the Product Owner-reported fragmented route loading, frequent background
  refresh, and server-bound Exercise Library filtering during Stage 1.
- **Outcome:** the authenticated shell prefetches Today, current-week Calendar, Students/income,
  Exercise Library, account lifecycle, and Training preference after Workspace settings resolve.
  Cached route data stays fresh for five minutes and retained for thirty; the former window-focus
  invalidation sweep is removed while accepted mutations keep their targeted invalidations. Both
  the Exercise Library route and Session picker filter one complete Coach-authorized library in the
  browser, so typing and filter changes no longer create query keys or API requests.
- **Verification:** the red-capable focused suite failed against the prior 30-second cache and
  missing prefetch/filter seams, then passed 8/8 after correction. Full Web check passed 19 files/79
  tests; Web build passed with only the existing bundle-size advisory; `git diff --check` passed.
  Fresh authenticated Chrome acceptance confirmed prefetched Calendar/Exercise navigation without
  skeletons, local 101-to-one search filtering, and no console warning/error.
- **Next:** continue M7.5 Stage 1 with the next Product Owner-reported issue; keep push, remote CI,
  and the Windows-entrypoint backlog deferred to Stage 2.

### 2026-09-16 — LOG-082 — M7.5 two-stage workflow frozen

- **Scope:** incorporated the Product Owner's operating model for the extended pre-deployment review.
- **Outcome:** Stage 1 is iterative issue discovery and immediate local correction; deferrable findings
  enter the explicit Stage 2 backlog. Stage 2 begins only on Product Owner instruction and owns the
  combined backlog, full regression, cohesive delivery, push, and exact-SHA remote CI.
- **Verification:** Roadmap and Status consistency plus targeted formatting and `git diff --check`;
  no product implementation changed in this clarification.
- **Next:** remain in Stage 1, accept the next Product Owner-reported issue, and avoid push/remote CI
  until Stage 2 or an explicit earlier delivery request.

### 2026-09-16 — LOG-081 — M7.5 opened; Student course records locally complete

- **Scope:** added the Product Owner-approved M7.5 pre-deployment hardening milestone and corrected
  the Student-detail course-record hierarchy against the archived Demo.
- **Outcome:** `課程紀錄` is now a dedicated prominent panel containing exactly the nearest future
  scheduled Session followed by every completed Session in newest-first order. Cancelled Sessions
  are excluded, the former four-row limit is removed, and fixed rhythm remains a separate section.
- **Verification:** focused Student selection tests passed 6/6; final root check passed API 66/Web 74;
  production build passed with only the existing bundle-size advisory. Authenticated desktop and
  exact 390×844 Chrome acceptance passed with no horizontal overflow or console warning/error.
- **Known issue:** the first root check ran concurrently with build and two unrelated API HTTP tests
  exceeded their five-second timeout; isolated API 66/66 and the final sequential root check passed.
- **Next:** continue Stage 1 with the next Product Owner-reported issue. Keep the local-entrypoint
  half-start correction in the Stage 2 backlog; defer push and remote CI.

### 2026-09-15 — LOG-080 — M7 delivered with exact-SHA remote CI

- **Scope:** delivered the cohesive M7 Contract/Terra/Sol implementation and observed the remote CI
  result for the exact delivery commit.
- **Outcome:** commit `8885404` is on `origin/main`; Local resilience and Demo migration is Done and
  the protected baseline is now M0–M7. No M8 deployment or production scope was entered.
- **Verification:** GitHub Actions CI #24 / run `34976808273` succeeded in 1 minute 9 seconds for
  exact SHA `888540469df530432c9ca62031742257900f077f`; `verify` passed in 37 seconds with API 66 and
  Web 72 tests, and `migration-dry-run` passed in 24 seconds. Its two annotations are the already
  tracked Node 20 action compatibility warnings.
- **Next:** stop at the M7 milestone boundary. Product Owner authorization and a frozen M8 Contract
  are required before hosting, secrets, recovery, observability, or production security work.

### 2026-09-15 — LOG-079 — M7 Terra and Sol complete; CI delivery pending

- **Scope:** implemented the frozen M7 Contract across Coach-scoped local resilience, Demo exact
  backup, deterministic migration planning, private-schema run/ledger persistence, five-phase API
  execution, rollback, Settings recovery UI, and archived Demo backup affordance.
- **Outcome:** offline Training changes now survive and replay with stable operation IDs; incomplete
  imports resume without retaining raw source; import previews redact private notes and secrets;
  legacy Capability Links are safely rejected; Workspace-salted IDs and version checks protect
  tenant boundaries and rollback. A live E2E exposed JSONB key-order rollback misclassification,
  which was corrected with explicit version comparisons before the final passing run.
- **Verification:** root check passed API 66/Web 72 tests; root and Demo production builds passed;
  Demo check passed 61 tests; migration dry-run and `app_private` lint passed. Final isolated live
  E2E import `6ed27a15-04d9-42ee-b198-0ccd40048842` passed five phases, two-Coach isolation,
  redaction/rejection, and exact rollback. Authenticated desktop and exact 390×844 acceptance passed
  with no page overflow or browser console warnings/errors.
- **Next:** commit/push M7 and observe GitHub Actions `verify` plus `migration-dry-run` for its exact
  SHA; do not enter M8 without a new Product Owner decision.

### 2026-09-15 — LOG-078 — M7 Contract frozen and Terra authorized

- **Scope:** entered M7 after the Product Owner confirmed M6 completion; inspected the Demo storage
  graph, delivered M3–M6 authority seams, local Training draft/receipts, architecture, and current
  Supabase migration/security guidance.
- **Outcome:** [`M7-CONTRACT.md`](M7-CONTRACT.md) freezes the local allowlist, idempotent operation
  queue, exact backup, validation/preview, phased import, safe legacy-link rejection, retry, and
  rollback experiences. Server authority and `form-coach-mvp-v1` remain protected.
- **Verification:** Contract is mapped to every M7 Roadmap criterion; no implementation, migration,
  live/browser evidence, or delivery claim is made at this gate.
- **Next:** implement M7 Terra from Contract section 10, beginning with local adapters and pure Demo
  normalization before creating the serialized database migration.

### 2026-09-15 — LOG-077 — M6 delivered with exact-SHA remote CI

- **Scope:** deliver the cohesive M6 implementation and observe, rather than infer, its remote CI
  result.
- **Outcome:** commit `658ce1a` is on `origin/main`. Public Capability Links is Done and the M0–M6
  baseline is protected.
- **Verification:** GitHub Actions run `34966898151` completed successfully for exact SHA
  `658ce1a6f59007f7ad9f709445b5989dd69d778b`; job `verify` succeeded in 30 seconds and
  `migration-dry-run` succeeded in 25 seconds.
- **Next:** stop at the M6 milestone boundary and await Product Owner authorization to enter M7
  Contract.

### 2026-09-15 — LOG-076 — M6 cleanup recovered and every local/live gate passed

- **Scope:** execute the Product Owner-approved recovery of the exact interrupted M6 fixture, then
  rerun M6 and the complete pre-delivery verification matrix.
- **Outcome:** removed only Student `3d5b9269-94b9-4021-a506-b9298439ebc5`, restored weekdays 5–7
  of the same isolated test Coach from `06:00–22:00` to the verified inactive sentinel, corrected
  the M6 E2E Session-detail assertion, and completed a new full run through its `finally` cleanup.
- **Verification:** post-cleanup SQL reports zero `M6 E2E %` Students, zero linked Capability Links,
  and zero `06:00–22:00` Availability fixture windows. M6 live E2E passed result
  allowlist/consent/revocation, Coach isolation, lifecycle, secure headers, fresh-slot conflict, and
  exactly-once parallel redemption. Final root check passed API 60/Web 66 tests; root build,
  `git diff --check`, linked migration dry-run, and `app_private` lint passed. The existing Vite
  > 500-kB advisory remains unchanged.
- **Next:** create/push the cohesive M6 commit and confirm GitHub Actions Verify plus
  migration-dry-run for its exact SHA.

### 2026-09-15 — LOG-075 — M6 Terra/Sol implemented; delivery paused for exact test cleanup

- **Scope:** implemented the frozen Public Capability Links contract through private-schema
  persistence, Public Access orchestration/repository/HTTP boundaries, Coach management, standalone
  Training Result and Reschedule pages, PNG export, focus refresh, service-worker exclusion, and
  responsive FORM presentation.
- **Outcome:** linked migration `20260915111114_m6_public_capability_links` is applied and its final
  dry-run is up to date. Public secrets are 256-bit base64url values stored only as SHA-256 digests;
  responses use purpose-specific allowlists, no-store/no-referrer headers, IP/token rate buckets,
  immutable Training Note consent, automatic resource-change revocation, and serializable
  exactly-once rescheduling with a `40001` loser retry to the recoverable Used state.
- **Verification:** root check passed API 16 files/60 tests and Web 15 files/66 tests; root build and
  `git diff --check` passed with only the existing >500-kB Vite advisory. Linked `app_private` lint
  found no errors. M4 and M5 isolated live regressions passed. M6 live exercised Coach isolation,
  active/revoke/reissue, tampered/wrong-purpose/consent allowlists, stale-slot refresh, and parallel
  200/409 redemption. Chrome desktop/exact 390×844 accepted long names, no overflow, PNG download,
  keyboard/Escape focus restoration, and public routing without Auth UI.
- **Known issue:** stopping the final redundant E2E rerun terminated its `finally` midway, leaving
  the clearly named isolated Student `3d5b9269-94b9-4021-a506-b9298439ebc5` and weekdays 5–7 of the
  same test Coach at the fixture window. Read-only SQL confirmed the exact residue. The requested
  cleanup mutation was denied pending explicit authorization. Supabase security advisor retains
  only the accepted leaked-password warning; performance advisor retains pre-existing notices plus
  fresh/unused M6 index and multiple-permissive-policy warnings, with no security finding.
- **Next:** obtain explicit cleanup approval, restore/delete only the verified fixture, rerun M6
  E2E through cleanup and final checks, then commit/push and observe remote Verify plus
  migration-dry-run.

### 2026-09-15 — LOG-074 — M6 Contract frozen and implementation authorized

- **Scope:** Product Owner approved the complete M6 Contract and requested continuous engineering.
- **Outcome:** [`M6-CONTRACT.md`](M6-CONTRACT.md) is frozen. Terra may implement its schema, Module,
  HTTP, Web, and evidence package, followed in order by Sol convergence and CI delivery.
- **Verification:** the approved document and exact handoff were recorded. No M6 implementation,
  migration, live/browser acceptance, commit, push, or remote CI evidence is claimed at this gate.
- **Next:** execute M6 Terra from Contract section 9; return only missing product decisions to a
  Contract amendment.

### 2026-09-15 — LOG-073 — M6 Contract prepared for approval

- **Scope:** Product Owner authorized entry into M6 Contract after confirmed M5 delivery. Inspected
  the Demo public Training/Reschedule flows, formal M4 Scheduling and M5 Training authority seams,
  current Auth/PWA routing, ADRs, and current Supabase private-schema/Data API guidance.
- **Outcome:** [`M6-CONTRACT.md`](M6-CONTRACT.md) freezes for approval two 24-hour capability
  purposes, digest-only secrets, issue/revoke/reissue rules, Training Note consent, recursive public
  allowlists, conflict-free ±3-local-day reschedule slots, single-use transactional redemption,
  rate limiting, no-store/log-redaction boundaries, exact public states/copy, responsive acceptance,
  and the Terra/Sol/CI evidence matrix. Architecture now reflects the delivered M4/M5 seams. No M6
  implementation is authorized until Product Owner approval.
- **Verification:** the M5 `5afa212`/CI `34956661567` baseline and clean starting worktree were
  observed. Targeted Prettier check and repository `git diff --check` passed after the Contract and
  Architecture/Status alignment. No schema/API/Web implementation, migration, live or browser
  write, commit, push, or remote CI evidence is claimed.
- **Next:** Product Owner reviews and approves the complete M6 Contract. Then mark it frozen and
  execute M6 Terra from section 9 without reopening settled product decisions.

### 2026-09-15 — LOG-072 — M5 Training delivered

- **Scope:** implemented the frozen M5 Contract through Terra and Sol: private Training schema,
  tenant-scoped Module/repository/HTTP operations, formal catalog bootstrap, typed Coach-scoped Web
  queries, IndexedDB draft coordination, and FORM-converged Session/Exercises/Student/Settings UI.
- **Outcome:** Coaches can manage a stable 100-item/custom Exercise Library, record and recover
  Session Training with immutable snapshots and explicit conflicts, complete/reopen Sessions, edit
  completed records, choose display units, and inspect qualified Student performance without
  exposing private notes. Dedicated-role RLS uses verified transaction-local Workspace context.
- **Verification:** root check/build, deterministic preview, linked migrations/dry-run/lint,
  security/performance advisors, M4 regression, isolated M5 live E2E, authenticated desktop, and
  exact 390×844 acceptance passed. All isolated browser/E2E fixtures were removed. The Web build
  retains the existing bundle-size advisory; leaked-password protection remains the accepted
  development warning. Commit `5afa212` is on `origin/main`; GitHub Actions CI #19 / run
  `34956661567` completed successfully with Verify and migration-dry-run green for the exact commit.
- **Next:** stop at M5. Request Product Owner authorization to begin and freeze the M6 Contract
  before implementing any public Capability Link behavior.

### 2026-09-15 — LOG-071 — M5 Contract frozen and implementation authorized

- **Scope:** Product Owner approved the complete M5 Contract and requested Sol as the implementing
  agent.
- **Outcome:** [`M5-CONTRACT.md`](M5-CONTRACT.md) is frozen. Sol may execute the required Terra,
  Sol, and CI gates continuously without reopening settled scope or skipping gate evidence.
- **Verification:** the approved document and Status handoff were updated; implementation evidence
  is not claimed at this gate.
- **Next:** Sol implements M5 Terra from Contract section 9, proves that gate, then proceeds through
  Sol convergence and CI delivery.

### 2026-09-15 — LOG-070 — M5 Contract prepared for approval

- **Scope:** Product Owner authorized entry into the M5 Contract gate. Inspected the archived
  Session/Library/Student performance flows, domain rules, catalog, and formal M4 Module seams.
- **Outcome:** [`M5-CONTRACT.md`](M5-CONTRACT.md) specifies private definitions and immutable
  snapshots, set/history rules, unit conversion, versioned operations and atomic completion,
  identity-scoped draft recovery, route copy/states, responsive acceptance, and the evidence matrix.
  Explicit formal decisions are collected in section 2; this document awaits approval to freeze.
- **Verification:** M4 baseline commits and clean starting worktree were observed; GitHub connector
  rechecked run `34947956256`, with Verify and migration-dry-run successful. Contract consistency
  review, targeted Prettier check, and `git diff --check` passed. No M5 implementation, migration,
  live/browser acceptance, commit/push, or remote CI is claimed.
- **Known issue:** Architecture section 6.2 still describes the pre-M4 starting point. M5 uses
  the delivered M4 Contract, implementation, and LOG-069 as the current dependency evidence.
- **Next:** Product Owner approves the concrete Contract, then freeze it and begin M5 Terra.

### 2026-09-15 — LOG-069 — M4 Scheduling delivered

- **Scope:** delivered the complete frozen M4 Scheduling slice after its local, live database, Demo
  preview, desktop, and exact-mobile evidence passed.
- **Outcome:** M4 is Done on `main`; the protected M0–M4 baseline now includes the dated Course
  Session read/write contract required by M5 without adding any Training data or behaviour.
- **Verification:** commit `dc83d92` pushed to `origin/main`; GitHub Actions CI #17 / run
  `34947956256` completed successfully in 58 seconds. Verify passed API 12 files/43 tests and Web 14
  files/61 tests; migration-dry-run also succeeded. The two annotations are the tracked Node 20
  action compatibility warnings, not job failures.
- **Next:** freeze the M5 Training and Exercise Library Contract; do not begin Terra before Product
  Owner approval.

### 2026-09-15 — LOG-068 — M4 Scheduling locally complete

- **Scope:** completed the frozen M4 Contract through Terra and Sol without adding M5 Training
  behaviour: schema/migration, Scheduling Module and Postgres adapter, HTTP and typed Web bindings,
  Calendar/Today/Student/Session surfaces, Demo migration preview, and the required evidence paths.
- **Outcome:** Coaches can manage dated Sessions, recurring Series and Blocks, and availability from
  Demo-converged responsive routes. UTC/IANA conversion, version-current conflicts, warning-only
  overlaps, reconciliation horizons/effective boundaries, tenant isolation, scoped cache
  invalidation, lifecycle actions, and accessibility/focus behaviour remain server-authoritative
  and covered.
- **Verification:** root check passed (API 12 files/43 tests; Web 14 files/61 tests); root builds and
  `git diff --check` passed; linked migration dry-run is up to date and linked schema lint has no
  errors. Deterministic Demo preview and isolated live M4 two-Coach E2E passed with zero residual
  test Blocks. Authenticated desktop and exact 390×844 browser acceptance passed with no horizontal
  page overflow or console errors.
- **Known issue:** the Web build retains the existing over-500-kB chunk advisory. Remote CI evidence
  is not yet claimed.
- **Next:** commit and push M4, confirm GitHub Actions Verify and migration-dry-run, then record M4
  Done and hand off M5 Contract.

### 2026-09-14 — LOG-067 — M4 Series horizon and effective-boundary delivery

- **Scope:** Product Owner amended the frozen M4 Series contract with a selected future occurrence
  boundary and bounded automatic scheduling; implemented the authorized schema, Module, private
  Postgres adapter, typed client, test, and live-evidence changes.
- **Outcome:** `effective_from_session_id` limits a Series PATCH to that own future scheduled
  occurrence and later linked scheduled occurrences; omission starts at the first future linked
  occurrence. `auto_schedule_horizon` supports `NONE`, `1_WEEK`, `2_WEEKS`, and six-month
  `MAX_WINDOW`, and reconciliation will never create beyond its rolling cap.
- **Verification:** migration `20260913164133_m4_scheduling` applied to linked development;
  live M4 two-Coach E2E passed (horizon retention, selected-boundary update, isolation, cleanup).
  API 40 tests, Web 56 tests, root build, migration dry-run, and `git diff --check` passed.
  Local Supabase lint remains intentionally skipped because the local database is not running.
- **Known issue:** M4 is not yet a delivered milestone: Sol Calendar/Today/Student interaction
  convergence, browser acceptance, remote CI, and cohesive commit/push remain.
- **Next:** perform the M4 Sol gate against the completed Terra data contract; do not add M5
  Training behaviour.

### 2026-09-14 — LOG-066 — M4 typed mutation and reconciliation binding

- **Scope:** completed the independent Terra client binding and focused state coverage around the
  existing Scheduling HTTP contract; no Sol presentation or copy was introduced.
- **Outcome:** the Web API now types Session, Series, Block, and Availability operations; successful
  mutations invalidate Coach-scoped Calendar, Today, Student, Series, and Session projections.
  Accepted Series updates now re-run authorized reconciliation and report generated IDs. Calendar
  state selection has Loading, Error, Empty, Ready, and Refreshing tests.
- **Verification:** elevated API check passed (11 files, 36 tests); elevated Web check passed
  (12 files, 56 tests); root check/build and `git diff --check` passed. Supabase `db lint` could
  not connect because the local database at `127.0.0.1:54322` is not running. No migration, live
  database, browser, push, or remote-CI result is claimed.
- **Known issue:** future-only linked-occurrence edits need a selected occurrence/anchor input not
  present in the frozen request shape; availability version readback and all live PostgreSQL,
  two-Coach, Sol, and CI evidence remain outstanding.
- **Next:** amend the Series edit request boundary, then implement and transaction-test future-only
  persistence; do not choose that boundary in Terra.

### 2026-09-14 — LOG-065 — M4 reconciliation trigger coverage

- **Scope:** completed the frozen trigger wiring for the existing transactional Series reconciler.
- **Outcome:** creating a manual Session, completing/reopening/cancelling/deleting a Session, and
  creating/correcting/deleting a Lesson Purchase now re-run authorized Student reconciliation so
  future coverage remains derived from current entitlement and future scheduled Sessions.
- **Verification:** elevated API check passed (11 files, 34 tests) and `git diff --check` passed.
- **Known issue:** M4 Terra remains in progress; future-only Series edit persistence, Student
  schedule projections, typed Web mutations, PostgreSQL live evidence, and Sol/CI gates remain.
- **Next:** implement the frozen Student schedule projections and their allowlist/isolation tests.

### 2026-09-14 — LOG-064 — M4 transactional Series reconciliation wired

- **Scope:** wired the frozen Series reconciliation planner through the private Postgres adapter and
  the authorized explicit reconcile operation; no Sol work was added.
- **Outcome:** reconciliation now takes a transaction-scoped advisory lock per Workspace/Student,
  reads current entitlement and future Sessions, inserts only the planner's required future Series
  occurrences, and returns generated IDs. The API rejects cross-Workspace Student reconciliation
  with `404`.
- **Verification:** elevated API check passed (11 files, 34 tests) and `git diff --check` passed.
- **Known issue:** M4 Terra still needs direct PostgreSQL concurrency evidence, future-only Series
  edit persistence, Student schedule projections, typed mutations, and remaining state tests.
- **Next:** implement future-only Series edit persistence and its PostgreSQL-focused tests.

### 2026-09-14 — LOG-063 — M4 Series reconciliation rule isolated

- **Scope:** continued the frozen M4 Terra Series reconciliation work at its pure-rule boundary.
- **Outcome:** added a tested reconciliation planner: it counts all future scheduled Sessions for
  entitlement coverage, fills only the positive deficit after the latest Series occurrence, never
  backfills, and produces no duplicates once its proposed rows exist. Deactivated Series generate
  nothing.
- **Verification:** API typecheck and elevated focused reconciliation tests passed (3 tests).
- **Known issue:** persistence must still call this planner under a transaction/retry lock before it
  can create occurrences; Series updates must also apply the frozen future-only edit semantics.
- **Next:** wire the planner into transactional repository reconciliation and prove concurrent-safe
  persistence before any Sol work.

### 2026-09-14 — LOG-062 — M4 Terra Series creation boundary

- **Scope:** continued the frozen M4 Terra gate with the initial fixed Schedule Series operations;
  no Sol visual, interaction, or end-user-copy work was added.
- **Outcome:** Series list/create/update HTTP operations now resolve the verified Coach Workspace.
  Series creation derives its local cadence from the Workspace IANA time zone and atomically writes
  the Coach-drawn anchor Session with the new Series. Series updates are versioned and return the
  current authorized Series under the existing `409` conflict envelope.
- **Verification:** elevated API check passed (10 files, 30 tests); elevated Web check passed
  (11 files, 51 tests); root Prettier and `git diff --check` passed.
- **Known issue:** M4 Terra remains incomplete: reconciliation and future-occurrence edits, Student
  schedule projections, complete typed mutation bindings, live migration evidence, Sol convergence,
  and the CI delivery gate are unclaimed.
- **Next:** implement future-only Series reconciliation and its idempotency/coverage tests before
  any Sol work.

### 2026-09-14 — LOG-061 — M4 Terra scheduling-boundary correction

- **Scope:** continued the frozen M4 Terra implementation without entering Sol presentation work.
- **Outcome:** Calendar availability is now projected by local date and correctly applies a date
  override (including an intentionally empty unavailable date); Session and Block create/edit
  inputs require 15-minute boundaries. Added the contracted private Session read operation and
  versioned Calendar Block deletion with single/future/all recurrence scope. The replacement
  migration now enforces that a Series-linked Session belongs to a Series in the same Workspace.
- **Verification:** elevated focused Scheduling tests passed (2 tests); elevated API check passed
  (10 files, 29 tests); elevated Web check passed (11 files, 51 tests); root build passed with only
  the existing Vite >500-kB chunk advisory; root Prettier and `git diff --check` passed.
- **Known issue:** M4 remains Terra in progress. Schedule Series creation/reconciliation, Student
  schedule projections, complete typed mutation bindings, live migration evidence, Sol convergence,
  and the CI delivery gate remain unclaimed.
- **Next:** implement the frozen Schedule Series operations and reconciliation tests before any Sol
  work.

### 2026-09-14 — LOG-060 — M4 Terra started

- **Scope:** began the frozen M4 Terra gate without reusing the removed starter.
- **Outcome:** Supabase CLI generated migration `20260913164133_m4_scheduling`; its initial schema
  preserves date-less M3 Course Sessions as legacy entitlement rows and introduces the private M4
  Scheduling tables. A separate Scheduling Module/Postgres adapter, initial private Calendar and
  Session HTTP operations, M4 schedule augmentation on Today, and a Coach-scoped Calendar
  query/state skeleton are in the worktree. Calendar date boundaries now derive from Workspace time
  zone rather than assuming UTC.
- **Verification:** API and Web TypeScript checks passed. Elevated API check passed (9 files/27
  tests) and elevated Web check passed (11 files/51 tests). These existing suites do not yet prove
  the incomplete M4 operations.
- **Known issue:** Series reconciliation, M4-specific focused tests, Student schedule projection,
  complete mutation bindings, and all Sol/CI work remain. Availability replacement now has its
  initial transaction path, but still needs its focused conflict/override tests.
- **Next:** complete the remaining frozen Terra operations and focused tests before any Sol work.

### 2026-09-14 — LOG-059 — M4 Scheduling Contract frozen

- **Scope:** Product Owner authorized the move from completed M3.5 into M4's Contract gate. The
  contract defines the replacement Scheduling model, routes, authority boundaries, interactions,
  state recovery, migration treatment, and delivery evidence without changing code or schema.
- **Outcome:** [`M4-CONTRACT.md`](M4-CONTRACT.md) freezes temporal Course Sessions, Schedule Series,
  Availability Rules/Overrides, finite recurring Calendar Blocks, warning-only conflicts,
  versioned concurrency, Calendar/Today/Student projections, exact interaction/mobile behaviour,
  and M3/M4 Today authority separation. Existing date-less M3 Course Sessions remain preserved
  legacy entitlement rows—no timestamp or location will be invented.
- **Verification:** Roadmap, Status, Architecture, M3 data seam, Demo Calendar/domain interactions,
  and the prior M4 rollback boundary were reviewed. This is a documentation-only Contract gate;
  no implementation, migration, browser, live, push, or remote CI result is claimed.
- **Next:** execute M4 Terra only as frozen; return any required product/visual/copy decision to a
  new Contract amendment.

### 2026-09-13 — LOG-058 — M3.5-A5 delivered; M3.5 complete

- **Scope:** pushed the A5 product-convergence commit and checked its exact GitHub Actions run.
- **Outcome:** commit `e403170` is on `origin/main`; M3.5 is complete. All currently supported
  M0–M3 Web surfaces have passed their A5 product/interaction convergence and CI delivery without
  adding a Scheduling model, Course Session calendar operation, or fake unavailable feature.
- **Verification:** GitHub Actions CI #14 / run `34766425884` completed successfully. `verify`
  succeeded (API 9 files/27 tests; Web 11 files/51 tests), and `migration-dry-run` succeeded.
- **Next:** freeze M4's complete Scheduling Contract; do not implement M4 before it defines the
  replacement model, projections, interactions, concurrency, and migration boundary.

### 2026-09-13 — LOG-057 — M3.5-A5 Sol and local integration complete

- **Scope:** converged the supported-data Auth, Shell, Today, Student, Student Detail, and Settings
  surfaces without changing the API, database, authorization, query contract, or M4 boundary.
- **Outcome:** unavailable Calendar, lesson, and Exercise routes now state only `此功能尚未提供。`;
  Today and Settings remove implementation-facing labels; the Create-Student and Purchase editor
  now preserve the existing modal scroll lock, Escape dismissal, and opener-focus return. The
  existing reduced-motion rule and destructive-confirmation focus were revalidated.
- **Verification:** focused elevated Web check passed (11 files/51 tests). Full root check passed
  (API 9 files/27 tests; Web 11 files/51 tests); root build passed with only the existing Vite
  over-500-kB advisory; `git diff --check` passed; migration dry-run is up to date; linked advisors
  report only the accepted development `auth_leaked_password_protection` warning. Live M3 E2E
  passed two-Coach isolation/Today allowlist and deleted its isolated Student. Browser acceptance
  passed at 1440×675 and exact 390×844 with no console errors: Auth, Today, Settings, Students,
  unavailable-route boundary, mobile Settings/navigation, modal Escape/focus restoration, and
  destructive-confirmation initial focus all passed.
- **Next:** create/push the cohesive A5 commit and confirm remote Verify plus migration-dry-run.

### 2026-09-13 — LOG-056 — M3.5-A5 Contract frozen

- **Scope:** Product Owner authorized the final M3.5 package. The Contract inventories Auth, Shell,
  Today signals, Students, Student Detail, Settings, and unavailable-route boundaries against the
  archived Demo without changing production code, API, schema, or Scheduling ownership.
- **Outcome:** A5 is strictly a Sol presentation/interaction convergence followed by CI delivery;
  its exact copy, focus, modal, cached-refresh, reduced-motion, desktop, and 390×844 acceptance
  rules are frozen in [`M3.5-A5-CONTRACT.md`](M3.5-A5-CONTRACT.md). Calendar, lesson, Exercise,
  and public-capability work remains M4–M6 and is represented only by the honest static boundary.
- **Verification:** documentation comparison against the Demo/formal supported-route boundary is
  complete. Formatting and Git whitespace checks are required before recording Contract evidence;
  no product implementation, browser, live, migration, commit, push, or remote CI evidence is
  claimed yet.
- **Next:** Sol implements only the frozen A5 Contract, then completes M3.5 CI delivery.

### 2026-09-13 — LOG-055 — M3.5-A4 delivered

- **Scope:** pushed the cohesive M3.5-A4 Today-signal implementation and checked the exact commit's
  GitHub Actions run.
- **Outcome:** commit `ae6b764` is on `origin/main`; A4 is delivered with no Scheduling schema,
  Course Session operation, calendar behaviour, or M4-dependent UI.
- **Verification:** GitHub Actions CI #13 / run `34764878712` completed successfully in 57 seconds;
  Verify reported API 27/27 and Web 51/51, and migration-dry-run completed successfully.
- **Next:** freeze the M3.5-A5 product-convergence Contract; keep all Scheduling-dependent work in
  M4 or later.

### 2026-09-13 — LOG-054 — M3.5-A4 Sol and local integration complete

- **Scope:** converged the M3-only Today signal surface on the existing FORM workbench language and
  completed its local integration matrix. Corrected amount display to preserve the existing
  minor-unit presentation and formatted the server-owned local date without a second time-zone
  conversion.
- **Outcome:** desktop presents a restrained three-signal strip and entitlement worklist; exact
  390×844 stacks the cards above the safe-area bottom navigation. Zero signals remain a Ready state,
  attention items are keyboard links, and no copy implies Course Session or Calendar facts.
- **Verification:** root check passed (API 9 files/27 tests; Web 11 files/51 tests); root build passed
  with only the existing over-500-kB Vite advisory; migration dry-run is up to date; linked
  `app_private` schema lint found no errors; live M3 E2E verified Today allowlist/two-Coach isolation
  and deleted its isolated Student. Desktop 1440×675 and exact 390×844 browser acceptance passed,
  with no horizontal overflow or console errors and keyboard focus reaching mobile Settings/nav.
- **Next:** create/push the cohesive A4 commit and confirm remote Verify plus migration-dry-run.

### 2026-09-13 — LOG-053 — M3.5-A4 Today signals Terra locally complete

- **Scope:** implemented the frozen M3-only Today projection without a migration or Scheduling
  interface. The server derives Workspace time zone/current local month and returns only active
  Student count, per-currency recorded income, and active Student low/negative-balance attention.
- **Outcome:** `/today` now uses a Coach-scoped, memory-only TanStack Query with Loading, Error,
  Ready, and cached Refreshing boundaries. Student, Purchase, and Workspace-time-zone changes
  invalidate it. The screen contains no Course Session, Calendar, location, conflict, availability,
  Training, or no-sessions assertion.
- **Verification:** API typecheck passed; elevated API tests passed (9 files, 25 tests); elevated Web
  check passed (9 files, 45 tests); `git diff --check` passed. No root build, live/browser,
  migration dry-run, commit, push, or remote CI evidence is claimed yet.
- **Next:** Sol performs desktop/exact-390×844 acceptance, then run the A4 CI delivery gate.

### 2026-09-13 — LOG-052 — M3.5-A4 scope corrected and Contract frozen

- **Scope:** Product Owner explicitly ruled that every capability requiring M4 must remain in M4 or
  later. The former A4 Today schedule projection therefore could not proceed against the preserved
  M3 entitlement-only Course Session schema.
- **Outcome:** A4 is now a server-owned M3 signal projection for active Students, local-calendar-
  month income by currency, and active Student low/negative lesson-balance attention only. It has no
  date/time-based Course Session facts, session counts/rows, location, conflicts, availability, or
  no-sessions assertion. M4 now owns the complete Today schedule projection after its Scheduling
  Contract freezes the required Course Session model.
- **Verification:** Demo/formal route and M3 schema boundary were rechecked. The Contract and
  Roadmap amendment require documentation formatting and whitespace verification; no Terra, Sol,
  API, schema, browser, migration, commit, push, or CI evidence is claimed.
- **Next:** Terra implements only [`M3.5-A4-CONTRACT.md`](M3.5-A4-CONTRACT.md).

### 2026-09-13 — LOG-051 — M3.5-A3 Student parity delivered

- **Scope:** delivered the approved existing-data Student roster/detail parity contract without
  adding Scheduling or Training data. Added server-owned roster entitlement summaries, versioned
  Purchase correction, active/archive/search states, and Demo-led Student detail composition.
- **Outcome:** desktop uses a restrained Coach workbench; exact 390×844 uses PWA-style sticky tools,
  compact tap-first Student rows, fixed safe-area bottom navigation, route scroll reset, and mobile
  bottom sheets. Dialogs lock background scroll, close with Escape, and return focus to their
  opener. Purchase corrections preserve recoverable conflict state and refresh affected
  projections.
- **Verification:** root check passed (API 24 tests; Web 45 tests), root build passed with only the
  existing over-500-kB Vite advisory, linked migration dry-run is up to date, M3 two-Coach live E2E
  passed and removed its isolated Student, database lint found no schema errors, and the Git
  whitespace check passed. Supabase advisors show the accepted leaked-password warning plus two existing
  development-only unused Workspace indexes. Fresh desktop and exact 390×844 browser acceptance
  passed with no horizontal overflow or console errors; Purchase editor focus/Escape restoration
  also passed.
- **Delivery:** commit `26bc036` pushed to `origin/main`; GitHub Actions CI #11 / run `34706580673`
  completed successfully with Verify and migration-dry-run jobs green. The run reported only the
  hosted Node 20 action compatibility warnings already tracked above.
- **Next:** freeze the M3.5-A4 Today projection Contract before implementation.

### 2026-09-13 — LOG-050 — M3.5-A3 Terra data boundary in progress

- **Scope:** implemented the frozen A3 Purchase version migration, server-owned roster entitlement
  projection, versioned Purchase update/delete Module, repository, HTTP, and typed query bindings.
- **Outcome:** `lesson_purchase.version` initializes historical rows to `1`; successful corrections
  increment only that Purchase; stale corrections return an authorized current Purchase under `409`.
  The roster derives each Student's lesson summary server-side. No scheduling fields or projections
  were added.
- **Verification:** elevated API check passed (22 tests), Web check passed (38 tests), and focused
  Student Module correction/summary test passed (5 tests). `git diff --check` passed.
- **Next:** finish the frozen semantic roster/detail state bindings and focused HTTP/Web evidence;
  do not begin Sol convergence or declare A3 Terra complete.

### 2026-09-13 — LOG-049 — M3.5-A3 Contract gate frozen

- **Scope:** froze the existing-data Student roster/detail and Lesson Purchase correction contract
  against the archived Demo, with explicit Product Owner approval to defer nearest future session
  and dated Course Session history to M4.
- **Outcome:** A3 adds only a roster entitlement summary, editable versioned Purchase ledger, and
  the corresponding tenant-safe route states. The preserved M3 `course_session` schema has only a
  Student reference and status, so no date/time-based session projection is invented or represented
  as available. No Scheduling, Training, schema, API, or product implementation changed at this
  gate.
- **Verification:** documentation consistency review and `git diff --check` remain required before
  the Contract documentation delivery is recorded. No Terra, Sol, browser, live, migration, commit,
  push, or CI evidence is claimed.
- **Next:** Terra implements only [`M3.5-A3-CONTRACT.md`](M3.5-A3-CONTRACT.md); Sol then performs
  the specified product convergence.

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
