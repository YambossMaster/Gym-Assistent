# M8-D Beta single-lesson billing and unrestricted Venue scheduling contract

> **Contract frozen: 2026-10-17, by Product Owner review and approval.** M8-D Beta-feedback
> correction to the delivered Student purchase, Venue, Scheduling and Finance behavior. M3, M4 and
> M7.5 remain protected baselines. Sol implementation, local full verification, Production migration
> and remote delivery retain their separate gates and authorizations.
> **Product Owner correction, 2026-10-17:** Missing Student price is represented by an annotated
> zero-income row in the ordinary Finance ledger, edited there. This supersedes the earlier
> separate pending-record UI wording.
> **Product Owner correction, 2026-10-18:** Every completed single lesson appears as one row in
> the existing Student purchase history, including lessons completed before the Student price was
> set. An unpriced lesson begins at $0; Finance and purchase-history amount edits share its effective
> ledger amount while preserving the original missing-price source. The existing purchase editor is
> reused with lesson count fixed at one and no currency selector. This supersedes the contrary
> purchase-history and separate-editor wording below.

## Coach job and scope

A Coach can schedule a Student at an active Venue without first recording a package purchase. A
Student may have a package usable at that Venue, may pay per completed lesson, or may alternate
between the two. Package lessons usable at the completed Session's Venue are consumed first. When
none is available, completion records single-lesson income at the Student price, or an ordinary
zero-income Finance row annotated `尚未設定學生課堂單價` when no price exists. Scheduling never records
income or grants a lesson.

This concerns Coach Student create/edit, purchase create/edit/history, Calendar one-off Sessions,
fixed Series, completion/reopen/delete, Venue records and Finance. It does not introduce online
payment collection, receipt verification, debt tracking, a separate Student billing mode or an
unbounded schedule horizon. Student private notes remain private.

## Product rules

### Student price and manual package purchases

- `學生課堂單價` is optional on Student create/edit and consists of a nonnegative amount in integer
  minor units and an ISO currency. The Student form accepts only the amount; new prices use the
  Coach's current Finance currency from Settings, with no second currency selector. Changing that
  preference does not convert an existing Student price or purchase; an existing price retains its
  saved currency when edited.
- A saved Student price pre-fills `每堂參考價` **only when creating** a manual package purchase. The
  Coach may override it; `堂數 × 每堂參考價` determines the new purchase total using the existing
  rounding rule. Leaving Student price empty preserves the current blank create form.
- Editing a manual package purchase always starts from that purchase's own saved lesson count,
  total, currency and derived reference price. The current Student price never pre-fills or changes
  an existing purchase. Only a Coach's direct price/total edit changes its historical amount;
  changing a note, date or other field must leave that amount untouched.
- Changing or clearing the Student price affects future generated records and future purchase-form
  defaults. It never silently reprices completed Sessions or existing purchases.

### Scheduling and Venue choice

- Every active Student can select any active Venue for a new one-off Session or fixed Series,
  including a Student who has never purchased lessons. The selector may suggest a Venue where the
  Student has usable package lessons, but it cannot restrict the list to purchased Venues. A purchase
  bound to Venue A can be consumed only at A; it does not prohibit a Session at Venue B.
- Scheduling, editing, and Series generation neither reserve package lessons nor create provisional
  purchase or Finance records. A Session's billing source is not persisted as a scheduled-time fact.
- Once a Venue is selected, Student options use **that Venue's** currently usable manual-package
  balance (Venue-bound plus general). At zero or below, label the Student `王小明・單堂計費`; otherwise
  show the usable lesson count for that Venue. Changing the Venue updates the labels immediately.
  Before a Venue is selected, show the Student's total remaining manual lessons across Venues,
  or `單堂計費` when none remain. After Venue selection, immediately replace this overview with
  that Venue's usable balance (including general lessons). This is
  a scheduling-time hint; the source is decided again at completion. Do not add a second
  billing-source or price field elsewhere in the Session form or Session detail.
- Existing `NONE`, `1_WEEK`, and `2_WEEKS` Series horizon choices remain. Within the chosen horizon,
  future occurrences continue to generate when package lessons reach zero. Remove the additional
  balance-based generation cap while retaining bounded, chronological, idempotent reconciliation.
  Existing future Sessions are never deleted or backfilled merely because the balance changes.
- New choices exclude archived Venues. Existing Sessions at an archived Venue remain readable and
  follow the established correction path; archiving does not erase history.

### Completion and immutable source decision

- Completion is one server-authoritative, Workspace-scoped transaction. Lock or otherwise serialize
  competing completions and purchase edits for the Student; check the Session version and status;
  then allocate one usable **manual package** lesson at the Session's Venue. A Venue-bound package at
  that Venue takes priority over a general package; within each class use the established oldest
  eligible purchase ordering. A purchase must be dated no later than the Session's local date to
  cover it. Unrelated Venue-bound lessons are not usable even if the Student's overall balance is
  positive. Scheduling overlaps remain warnings.
- If an eligible unused package lesson exists, record an explicit Session-to-purchase allocation and
  complete the Session without creating income. If none exists **and a Student price exists**,
  atomically complete the Session and create exactly one generated single-lesson purchase linked
  uniquely to it. The generated purchase is for one lesson, usable only by its source Session; it
  cannot grant future Venue eligibility, reserve future capacity or be reallocated to another
  Session. It appears as `單堂計費` in Student purchase history and produces one ordinary
  purchase-income source in Finance.
- The actual source is chosen at completion. A manual package added after scheduling but before
  completion is used first if eligible. A package added or backdated **after** completion does not
  silently replace an already recorded source. Changing Student price likewise cannot reprice it.
- A generated purchase's financial date is the Session's date in the Workspace time zone, based on
  the Session end time; its creation/completion timestamp is also retained. Late completion therefore
  places the Student income and the Venue's completed-Session expense in the same Session month.
- If Student price is absent, completion still succeeds and the ordinary Finance ledger immediately
  shows `收入 +$0` for that Session, annotated `尚未設定學生課堂單價`. The row uses the Workspace Finance
  currency and the Session's local date. It appears in the month's rows and zero-valued totals;
  there is no separate `待處理單堂紀錄` card or Coach-facing billing queue. The same completed Session
  appears as a one-lesson row in Student purchase history even when no physical purchase row exists.
  An internal source marker distinguishes absent price from an explicitly set zero price. This does
  not ask whether payment was received.
- The Coach may edit that exact zero-income **Finance row** using the established versioned ledger
  override, either from Finance or the corresponding Student purchase-history row. Both views show
  the same effective amount after either edit. Its original source remains zero and marked
  `尚未設定學生課堂單價`; the Finance row remains `已修改`, shows the original zero in source explanation,
  supports `取消修改`, and retains its Student-profile link. Setting `學生課堂單價` on that profile affects
  future lessons only. Neither action silently rewrites the Student price.
- Editing a generated single-lesson Finance income row likewise creates an independent ledger
  override, never a purchase/source price update. Purchase-history source correction remains a
  separate explicit command; existing Finance overrides survive later source changes and identify
  that the source changed. The Finance editor preserves entered amounts on recoverable conflicts.
- Venue cost remains tied to the completed Session. Fixed rent and prepaid Venue-lesson consumption
  apply at completion even without a Student price. For a commission Venue, show a matching `支出 -$0`
  row alongside the unpriced income row, both marked `尚未設定學生課堂單價`. A Finance override of that
  income recalculates the commission row at the configured rate without changing the Student source.
  If the Coach overrides the commission row itself, that expense amount stays fixed until its own
  `取消修改`, even if the income override changes again.
- A Coach may correct the generated purchase source from purchase history; that source correction is
  versioned and does not change the Student's default price or Session date. Finance row edits remain
  independent overrides with their own source explanation and reset action.

### Reopen, delete and corrections

- Reopening a completed Session releases its explicit package allocation, removes that Session's
  generated single-lesson purchase and derived Finance income, or removes its unpriced zero-income row.
  Its income and Venue expense ledger overrides are cleared so a later re-completion cannot revive
  historical manual amounts. Deleting a completed Session has the same source cleanup. This is atomic with the Session
  transition, so failure leaves both sides unchanged. Re-completion makes a fresh source decision
  from the then-current eligible balance and Student price. Retry and double-click cannot create
  duplicate generated purchases or zero-income rows.
- Manual package edits are blocked only when they make an **already fixed allocation invalid**:
  deleting a used purchase, reducing its lesson count below the number of linked completed Sessions,
  moving its purchase date after a linked Session, or changing its Venue so a linked Session can no
  longer use it. Increasing lesson count, moving the date earlier, changing notes or explicitly
  correcting the amount remain allowed and never silently reassign completed Sessions. A safe
  decrease down to the allocated count is also allowed. Stale versions and invalidating edits return
  an explicit conflict with the current source.
- A generated single-lesson purchase or an unpriced zero-income row offers `改用既有堂數` when a newly
  entered/corrected manual package dated no later than that Session can cover it. This is an explicit, one-Session
  re-evaluation, not an automatic historical resettlement. Preview which generated income or zero
  row will disappear; on confirmation, allocate the package and remove that source atomically.
  A stale version or concurrent use of the same last package lesson returns a recoverable conflict.
- Generated purchases cannot be directly deleted or have lesson count, source Session, Venue scope,
  or financial date changed in the ordinary purchase editor. Reopen/delete the source Session to
  remove them. Existing Finance hide/restore controls may affect presentation, but must not mutate
  the generated purchase or its allocation.
- Historical source allocation during migration must be established without changing existing
  visible balances, purchase income or Venue expenses. Legacy completed records with no eligible
  purchase remain visible and must not gain invented income.

## UI and feedback

- Student create/edit: optional `學生課堂單價`, with clear empty versus explicit zero. Use the
  Settings currency without adding a currency control or repeated currency label to the Student
  form. On wide dialogs, align phone, age range and price in one row.
- Purchase create: default the unit reference price from Student and preserve manual override.
  Purchase edit: show only the purchase's saved amount-derived reference price until the Coach
  deliberately changes it.
- Calendar Student picker: for the selected Venue, show its usable package count when positive or
  `姓名・單堂計費` at zero or below. Venue picker shows all active Venues, including in-context create,
  and appends a short fee-rule kind in parentheses (`不計`, `預購`, `單次`, `抽成`, `免費`).
  Do not add a separate billing-source or price line to the Session form or Session detail.
- Purchase history: distinguish manual packages from `單堂計費` and show one row per completed single
  lesson, including an unpriced `+$0` lesson. Show the source Course Session link and original
  missing-price note. Its effective amount reflects a Finance ledger override. Reuse the existing
  purchase editor with count fixed at one, source date and Venue fixed, and no currency selector;
  an unpriced amount edit calls the ordinary Finance override. A completed Session missing a price
  also appears directly in `收支明細` as `+$0` with `尚未設定學生課堂單價`. Its Student link leads to the
  profile where future-lesson price can be set separately.
- Venue course records distinguish the Venue expense from the Student billing source. A completed
  single lesson shows `單堂計費` and its effective Finance income, including an edited amount while
  preserving the original missing-price explanation. A zero commission is shown as a calculated
  `$0` expense, not as missing Venue data; later Finance edits update the displayed amounts.
- Loading, refresh, mutation and conflict states preserve the current draft and surrounding layout;
  stale Session or price edits explain the conflict and offer a safe retry. Do not expose schema or
  migration terminology to Coaches.

## Backend contract and data boundaries

- Extend Student create/update/read projections with nullable unit price and currency; preserve
  existing Student version tokens and Workspace isolation.
- Add a durable generated-versus-manual purchase discriminator, unique Session source link, internal
  unpriced marker for completed Sessions and stable Session-to-purchase allocation. The exact
  table/column design belongs to Sol, but the API must expose only route-shaped Coach projections.
  Keep data in the private schema; browser Supabase credentials remain publishable only.
- The completion/reopen/delete operation spans Scheduling, Student entitlement and Finance source
  facts in one database transaction. The Module interface must be versioned explicitly rather than
  having the Web compose a Session mutation followed by a purchase mutation. Database uniqueness and
  tenant-qualified foreign keys defend replay and cross-Workspace writes.
- Finance row edits use the existing versioned, Workspace-scoped entry-state command and leave
  source records intact. For an unpriced Session, Student purchase history shows that Finance
  entry's effective amount and original missing-price state. Generated priced-purchase source amounts
  remain authoritative in purchase history; Finance rows may carry independent overrides with
  `已修改`, immutable source explanation and reset.
- Package balance is manual package grants minus completed Sessions explicitly allocated to those
  grants. Generated single-lesson purchases and unpriced Sessions never contribute package
  capacity or Venue eligibility. Venue-specific balance and commission allocation use explicit
  source links for completed records so later purchases cannot retroactively reassign them.

### HTTP operations and conflict contract

- Existing Coach Student create/update/detail/roster operations add nullable `singleLessonPrice:
{ amountMinor: number; currency: string } | null`. Update preserves Student version conflicts.
- Existing `POST /v1/sessions/:sessionId/transition` performs the contracted completion/reopen
  transaction; the Web must not follow it with a separate purchase write.
- The monthly Finance projection includes the unpriced Session as an ordinary zero-income row with
  its Session version, Student profile route and missing-price annotation. No private Student note is
  included. The Student detail projection also includes that completed Session as a one-lesson
  purchase-history row using the current Finance entry-state amount and version. It does not grant
  package capacity or create an additional income source. The earlier pending-list API may remain
  for compatibility but has no Coach-facing UI.
- `POST /v1/finances/pending-single-lessons/settle` accepts `{ requestId, items }`, where `requestId`
  is a client-generated UUID and `items` contains 1–50 unique
  `{ sessionId, expectedVersion, amountMinor, currency }` entries. The server resolves Workspace from
  verified Coach identity, validates the entire set, and writes all or none. Same Workspace,
  request ID and identical payload return the saved result; a changed payload with that ID returns 409. Success returns each Session ID/new version and generated purchase ID/version. A stale,
  already settled or concurrently changed item returns 409 with affected IDs and current states;
  invalid shape returns 400; an out-of-Workspace ID is not disclosed as another Coach's resource.
  This retained internal operation is not called by the ordinary Finance row editor.
- `PATCH /v1/sessions/:sessionId/single-lesson-price` remains the purchase-history source
  correction operation. `PATCH /v1/finances/entries/:entryId` handles single-lesson Finance edits
  as ledger overrides without altering a purchase or the internal unpriced marker.
- `POST /v1/sessions/:sessionId/billing/re-evaluate` accepts the expected Session and current source
  versions. It rechecks package eligibility and capacity under the same Student lock, then replaces
  that Session's generated or pending source with one manual package allocation. If no package can
  cover it, return a recoverable 409 without changing the Session or Finance. The response returns
  updated source and versions. No operation accepts a browser-supplied Workspace ID.

## Focused evidence and acceptance

1. Never-purchased Student: choose or create an active Venue, schedule one-off and Series Sessions,
   complete at set price and at absent price, and inspect generated income versus the annotated
   zero-income Finance row.
2. Venue A package with no usable lessons at Venue B: schedule B; completing B produces one
   single-lesson record while A's package remains untouched. General package and B-bound package
   both take priority over single-lesson creation at B, with B-bound before general.
3. Schedule when balance is zero, then add an eligible manual package before completion: completion
   consumes that package and creates no single-lesson income. Adding or backdating a purchase after
   completion does not rewrite the fixed source.
4. A fixed Series with no package continues to its selected one- or two-week horizon; when package
   capacity runs out during that window, later completions use single lessons. Reconciliation stays
   idempotent under retries and cannot create beyond the selected horizon.
5. Concurrent completion, repeated request, stale version, reopen, re-complete and delete each leave
   exactly the expected allocation/purchase/Finance state. Cross-Workspace operations are denied.
6. A missing-price completion yields a completed Session and one ordinary `+$0` Finance row with
   `尚未設定學生課堂單價`; a commission Venue simultaneously shows `-$0` with the same annotation.
   Editing income produces `已修改` and a ledger amount override while source stays zero; a matching
   commission recalculates unless its own row was separately overridden. Both rows support
   `取消修改`. Setting Student price separately affects future lessons only. Stale or unauthorized
   ledger edits write nothing and retries never duplicate a source.
7. Migration comparison for existing Workspaces preserves visible balances and monthly Finance
   totals, including legacy, negative-balance, Venue-bound and manually adjusted entries.
8. Coach review on desktop and 390 × 844 covers Student create/edit, purchase create/edit, Calendar
   picker and Venue selection, completed purchase history, Finance correction and reopen recovery.
   Run only focused local checks before Product Owner inspection; live/browser, migration dry-run and
   exact-SHA CI gates follow the repository's explicit review and delivery checkpoints.

## Sol handoff

Implement this contract as the approved M8-D Beta-feedback correction. Start by presenting a small
desktop/390px UI review of Venue-aware labels and zero-income ledger correction. After Product Owner
inspection, complete the focused verification and then the separately authorized CI and remote
delivery gates. Keep M8-E checkout work, Production data and unrelated worktree changes isolated.
