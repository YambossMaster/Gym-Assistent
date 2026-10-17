# M8-D Beta single-lesson billing and unrestricted Venue scheduling contract

> **Contract frozen: 2026-10-17, by Product Owner review and approval.** M8-D Beta-feedback
> correction to the delivered Student purchase, Venue, Scheduling and Finance behavior. M3, M4 and
> M7.5 remain protected baselines. Sol implementation, local full verification, Production migration
> and remote delivery retain their separate gates and authorizations.
> **Product Owner correction, 2026-10-17:** Missing Student price is represented by an annotated
> zero-income row in the ordinary Finance ledger, edited there. This supersedes the earlier
> separate pending-record UI wording.

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
  there is no separate `待處理單堂紀錄` card or Coach-facing billing queue. An internal source marker
  distinguishes absent price from an explicitly set zero price. This does not ask whether payment
  was received.
- The Coach edits that exact zero-income row to enter or confirm its amount. The server creates one
  linked generated purchase and replaces the zero source with the authoritative amount; explicit
  zero is valid. The row offers a link to the Student profile, where the Coach may independently set
  `學生課堂單價` for future lessons. Editing the historical row never changes that default, and changing
  the default never silently rewrites or prices earlier zero-income rows.
- This correction uses the existing versioned settlement command for one Session at a time. It
  validates Workspace ownership, completed/unpriced state, Session version and amount before one
  atomic write; retrying the same successful request is idempotent and a conflicting retry returns 409. The Web preserves the Coach's entered amount on a recoverable conflict. The server may retain
  bounded multi-item support internally, but the Finance UI presents ordinary individual rows only.
- Venue cost remains tied to the completed Session. A fixed per-Session fee and prepaid Venue-lesson
  consumption can be recorded at completion even while Student income is pending. A percentage
  commission that needs the missing Student price stays pending rather than being calculated from
  an invented zero; settling the price produces the corresponding cost in that Session's month.
- A Coach may correct a generated amount from purchase history or the matching Finance income row.
  Both surfaces must show the same authoritative amount afterward. Price correction is versioned
  and does not alter the Student's default price or Session date.

### Reopen, delete and corrections

- Reopening a completed Session releases its explicit package allocation, removes that Session's
  generated single-lesson purchase and derived Finance income, or removes its unpriced zero-income row.
  Deleting a completed Session has the same source cleanup. This is atomic with the Session
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
  `姓名・單堂計費` at zero or below. Venue picker shows all active Venues, including in-context create.
  Do not add a separate billing-source or price line to the Session form or Session detail.
- Purchase history: distinguish manual packages from generated `單堂計費`, show source Course Session
  link. Finance income uses the same label, amount, currency and source link. A completed Session
  missing a price appears directly in `收支明細` as `+$0` with `尚未設定學生課堂單價` and can be edited
  there. Its Student link leads to the profile where future-lesson price can be set separately.
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
- An unpriced row correction is one versioned, Workspace-scoped Module command and one PostgreSQL
  transaction, including its generated purchase and Finance source. The Web invokes it from that
  row's editor. The existing server command also accepts bounded multi-item requests internally;
  this does not add a batch UI. Same-key replay with a different payload is rejected.
- Finance source amounts and purchase amounts must agree for generated single lessons. A Finance
  edit that changes the generated income amount must update its source amount atomically rather than
  storing an unrelated display override. Preserve the existing general Finance edit behavior for
  unrelated entries.
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
  included. The earlier pending-list API may remain for compatibility but has no Coach-facing UI.
- `POST /v1/finances/pending-single-lessons/settle` accepts `{ requestId, items }`, where `requestId`
  is a client-generated UUID and `items` contains 1–50 unique
  `{ sessionId, expectedVersion, amountMinor, currency }` entries. The server resolves Workspace from
  verified Coach identity, validates the entire set, and writes all or none. Same Workspace,
  request ID and identical payload return the saved result; a changed payload with that ID returns 409. Success returns each Session ID/new version and generated purchase ID/version. A stale,
  already settled or concurrently changed item returns 409 with affected IDs and current states;
  invalid shape returns 400; an out-of-Workspace ID is not disclosed as another Coach's resource.
- `PATCH /v1/sessions/:sessionId/single-lesson-price` accepts expected Session and purchase versions
  plus the corrected amount/currency. Both purchase history and Finance income edit call this same
  operation, which updates their common source atomically. The generic Finance override operation
  must not create a separate amount override for these generated income rows.
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
   `尚未設定學生課堂單價`. Editing that row creates the correct linked purchase and amount; explicit zero
   is valid. Setting Student price separately affects future lessons only. Stale or unauthorized
   corrections write nothing; same-payload retry never duplicates income.
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
