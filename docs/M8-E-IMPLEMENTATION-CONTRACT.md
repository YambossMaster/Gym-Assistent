# M8-E local implementation contract

2026-10-14: PO authorized starting development/design after reviewing the policies. This freezes
the independent local checkout/UI and provider-boundary foundation below. It does not freeze the
remaining subscription/event persistence, provider change execution or live-activation contracts.
The later checkout persistence and subscription lifecycle policy slices below are frozen separately.

## Scope and authority

### Offline lifecycle foundation — approved 2026-10-14

PO explicitly deferred merchant testing until MoR review completes and requested all independent
local development continue. Freeze durable signed event intake, allowlisted subscription/invoice
snapshots, leased reconciliation, owner-scoped billing reads and durable cancellation intent.
Use fake provider responses for focused tests; do not call the merchant, activate checkout or apply
new migrations to Production. The prepared migration and provider adapters are not merchant evidence.

- Authenticate raw webhook bytes before parsing. Accept only the configured Test Mode store and
  documented subscription/invoice events. Persist a hash and minimal notification, not raw PII or
  signed URLs. Acknowledge only after durable insert; duplicate payloads are harmless.
- Workers claim with a renewable/recoverable lease, fetch current resources using the server API,
  validate mode/store/resource IDs, and commit a version-checked snapshot before completing work.
  Older snapshots cannot overwrite newer state; equal-version conflicts are quarantined. Transient
  failures get bounded retry/backoff, then an inspectable dead-letter state. A stale worker cannot
  commit after another worker takes its lease. Do not log raw provider errors or payloads.
- Workspace ownership must come from an existing checkout intent or subscription mapping; email is
  never an ownership key. Invoice ownership must agree with subscription/customer/store mapping.
  Unknown mappings remain retryable for out-of-order events, then quarantined; never create a tenant.
- Persist each invoice once by provider ID. Preserve original total/currency and cumulative refunded
  amount; reject inconsistent totals, decreasing refunds and identity changes. Refund synchronization
  changes invoice facts only; internal access decisions remain separate and audited.
- A subscription status alone must not grant a paid period. Verified invoice/period reconciliation,
  trial eligibility consumption, final checkout confirmation and PlanAccess wiring remain a distinct
  authority step. Keep the existing app's entitlement behavior until that step is verified locally.
  Implement its independently testable access evaluator and optional PlanAccess source seam now:
  an explicit verified trial/paid period caps access, cancelled never extends that period, and a
  past-due grace requires a prior paid period whose end matches the fixed renewal due time. Permanent
  and active promotional grants remain independent and take precedence. The runtime must not inject
  this source until persisted period evidence and account-first trial consumption are implemented.
- Cancellation is an owner-scoped durable operation before external dispatch. Serialize concurrent
  requests; uncertain results stay pending and recover by GET, not blind DELETE repetition. Confirm
  only when the provider returns cancelled/expired, retaining the provider's end date. Never delete
  data or infer a refund. No caller-selected provider ID or return URL is accepted by Coach routes.
- Required focused evidence: raw-byte signatures, mode/store rejection, duplicate intake, storage
  failure acknowledgment, lease takeover, out-of-order versions, refund invariants, tenant ownership,
  cancellation concurrency/unknown outcomes. Migration application/advisors and merchant acceptance
  remain reported separately after the applicable review gate.

### Release hold — approved 2026-10-14

Latest PO correction narrows delivery to backend only. Exclude all `apps/web` changes and preserve
the released frontend. The following frontend assets remain local; only disabled API foundations,
Development-history repair and their evidence are included in this release.

PO subsequently requested commit, Main CI and deployment while disabling payment selection and
entry. Preserve development assets but hard-close checkout/review routes and API startup regardless
of environment flags. Preserve read-only plan comparison and existing grants. Keep applied
Development-only history identifiable without promoting it to Production; leave unapplied ledger
SQL outside the migration runner. This supersedes default local frontend availability below and
authorizes this release's verification/remote delivery. Merchant tests and payment activation remain
deferred; there is no authorization to apply payment schema to Production.

### Normal local frontend integration — approved 2026-10-14

PO requested that the accepted frontend be available through the ordinary local launcher now,
while merchant testing waits for MoR approval. The normal DEV app includes Settings invoice
presentation, existing Plans selection and standalone checkout without a manual billing flag.
The existing flag opts into the unfinished HTTP service only; it defaults off. Production routing
and paid access remain closed.

- Preserve the actual PlanAccess card and plan-comparison banner. Never replace a permanent or
  legacy promotional grant with a simulated subscription. Reuse the invoice presentation component
  without nesting another Settings layout; unavailable records are not an asserted empty ledger.
- Checkout preparation uses only the display catalog and the signed-in account identity. Monthly
  and annual selection, coupon entry, consent and legal navigation work. Do not fabricate a quote,
  current eligibility, first-charge date, invoice, checkout intent or success. Payment stays disabled
  with a visible unavailable state. Coupon validation is explicitly deferred, not reported invalid.
- Draft payment notice, terms and privacy are available on normal DEV routes. Keep published legal
  pages and legal acceptance versions unchanged. No service request or provider SDK is invoked by
  the preparation path. The synthetic full-flow harness stays separate from signed-in account data.
- Focused evidence covers normal Plans-to-checkout navigation, annual selection, consent/coupon
  interaction, zero payment network calls and preservation of permanent access. PO inspects this
  normal entry before the broader acceptance/release gate.

### Subscription lifecycle policy slice — approved 2026-10-14

PO confirmed the following behavior after the checkout preparation slice. Freeze these pure API
policies now; provider execution, durable scheduled changes and entitlement application still need
their integration contract and Test Mode evidence.

- Annual-to-monthly changes are unavailable, including a simultaneous tier change. This explicit
  restriction takes precedence over the earlier suggested year-to-month period-end alternative.
- Pro to Prime takes effect immediately after verified payment, credits unused paid time and starts
  a new full period. Within the same tier, month to year follows the same rule. Prime to Pro takes
  effect at the current period end, including Prime monthly to Pro annual. Identical selections are
  a no-op. No new trial is awarded. Trial-time changes remain unavailable pending their contract.
- The settlement reference uses the old period's verified, creditable paid amount and exact remaining
  duration; it never credits an unpaid invoice or the nominal list price of a discounted period.
  Round once to the nearest minor unit (half up), in a single currency. This is an internal reference,
  not permission to charge or a promise of provider rounding. Reject currency mismatches, invalid
  periods and excess credit for reconciliation instead of inventing a wallet or cash refund.
- For a failed renewal, the existing paid source lasts strictly before original verified renewal
  due time plus 7 x 24 hours. That original due time is persisted per renewal invoice; neither event
  arrival nor later retries reset it. Verified unpaid/expired ends that source immediately. Missing
  or inconsistent due-time facts require reconciliation and cannot grant a fresh grace period.
  Other legitimate grants are evaluated separately; no Coach data is deleted. Successful recovery
  requires the matching verified payment and period, never a browser callback or stale active event.
- Pure helpers consume reconciled server facts only. Focused checks cover all 16 selection pairs,
  rounding/date/currency boundaries, exact grace expiry and early terminal states. No HTTP mutation,
  automatic provider PATCH, new database schema or production access change is enabled by this slice.

Provider evidence: [update subscription](https://docs.lemonsqueezy.com/api/subscriptions/update-subscription)
supports immediate proration and resetting the anchor; the [management guide](https://docs.lemonsqueezy.com/guides/developer-guide/managing-subscriptions)
states a variant change takes effect immediately even with proration disabled. Therefore deferred
downgrades require a separate durable operation; do not PATCH early or promise a renewal-boundary
job is race-free. Test Mode must prove reset-period credit totals and payment-failure behavior before
the upgrade adapter is enabled. These are engineering constraints, not new commercial questions.

### Local checkout persistence slice — approved 2026-10-14

PO accepted the visual direction and authorized local product development. Freeze the next bounded
slice: authenticated quote, durable checkout intent, same-account serialized creation, retrieval and
HTTP Web gateway. Both general and 60-day promotional trials are first-subscription-only (PO reply).
Use private PostgreSQL tables; derive Workspace from verified identity; never accept price, trial,
provider identifiers or Workspace in browser input. Record quote/terms consent and preserve a single
unresolved intent across refreshes, concurrent requests and provider timeouts. An uncertain provider
create must not be retried automatically. Missing merchant configuration rejects creation before
claiming an intent. Only server-selected Test Mode variants may be requested in this slice.

This slice must not grant access, infer payment success, convert legacy promotional grants, or
activate Production checkout. Existing grants block purchases while active. New promotional-code
issuance/redemption, verified event reconciliation, entitlement/invoice persistence, cancellation and
existing-subscription changes remain subsequent contracts; unavailable operations fail explicitly.
Migration is prepared for the development database, with schema verification reported separately
from unit/HTTP checks. Existing review fixtures remain available independently.

- Build reusable formal React checkout, payment notice, confirmation and invoice components under
  `apps/web/src/pages/settings/billing`. Use existing typography/tokens, buttons and dialog behavior.
  A development-only review route supplies synthetic data without logging in or calling a merchant;
  no test fixtures, simulated payment controls or grants appear in Production.
- Server policy owns catalog 115/145 TWD monthly and 1150/1450 annually, first-account-subscription
  eligibility, trial selection and 45-day general request-window calculation. Client receives quote
  facts; it does not authorize access or derive repeat-trial eligibility from storage.
- Freeze the presentation gateway: quote(selection + optional code), begin(quote ID + consent),
  read intent, read billing, cancel renewal and get invoice receipt. These are typed operations for
  future verified HTTP wiring; this slice does not expose unauthenticated mutation endpoints.
- Build Lemon checkout payload validation and raw webhook-signature verification in the API workspace.
  Provider credentials/products are not available or inspected. No merchant API transaction is part
  of this slice. Durable idempotency, SQL, HTTP wiring, cancellation, reconciliation and entitlement
  application remain mandatory before enabling checkout.

## Frozen behavior

- Quote controls today due, renewal amount, period, trial and date. A repeat subscriber pays now;
  no general trial after cancellation, tier change or refund. Failed/abandoned checkout consumes
  no eligibility. Block checkout if a subscription or unresolved intent already exists.
- First trial is one calendar month. A valid authorized Prime promotion is 60 days, not an additional
  one-month trial; returning accounts are ineligible for either offer (confirmed by PO).
  The local UI may demonstrate the already-reviewed first-subscription promotional case.
- Code entry is in checkout. Invalid code preserves selection and input; applying/removing it obtains
  a new quote and resets consent. Pro -> Prime requires explicit confirmation of tier/renewal cost.
- PO detail review: coupon feedback uses a reserved two-line slot and an input clear control;
  retry uses the existing Apply action, without adding separate action rows. Consent stays interactive
  on invalid/expired quotes; the payment action remains blocked with a visible reason and refresh
  recovery. The consent sentence embeds notice/privacy/terms links, with no repeated links or renewal
  clause. Returning subscriptions omit the free-trial row. The payment notice has a separate preview
  page. Settings retains its original comparison banner, shared with the existing formal page.
- Checkbox is not preselected. Any quote change invalidates consent. Expired quote, failed refresh,
  unresolved checkout and changed terms block starting a new checkout. Pending cannot be treated as
  failure and blindly retried. Use one intent while recovering. Browser success only requests a
  server status refresh; only gateway-confirmed trial/paid can display success.
- Open provider overlay on the same page. SDK failure exposes retry and explicit hosted fallback for
  the same checkout URL. Close never implies cancellation. Confirmed success Done/close/Escape goes
  to billing via replace navigation. Old checkout navigation redirects existing subscribers.
- Payment notice leads with rights and rules, including possible small transaction fees causing the
  card bill to differ. Keep USD/issuer mechanics under optional detail. Legal links do not clear input.
- Notice contains cancellation, 45-day Email request window, case-by-case decision and legal/MoR
  exceptions. Internal refund matrix is never imported into the frontend. Live legal revisions and
  acceptance-version rollout are not silently activated by a review route.
- Billing shows current term, renewal/cancellation and invoices; no permanent card-management row.
  Refund preserves original amount, shows cumulative refunded and net; only verified server data
  controls status. Pending receipts are unavailable. Download uses the owning gateway operation,
  with per-invoice loading/error and retained list. Cancellation stops future renewal, keeps stated
  period and data; refund access remains an internal audited decision.

## Presentation and checks

PO clarified on 2026-10-14 that reuse does not mean nesting checkout inside Settings. Existing
Settings owns current-plan/billing management; the existing Plans page owns comparison/selection.
Selection proceeds to a separate checkout page, which opens the provider overlay in place and
returns to Settings billing after confirmation. Checkout has no workspace/sidebar/category shell.
Use the formal brand assets, typography, cream background, dark-green plan-card treatment and lime
accent; do not rebuild Settings or Plans as payment steps. Desktop checkout places the selected plan
beside account/coupon/charge confirmation; mobile stacks them without horizontal scrolling.
Accessibility: labelled inputs/dialogs,
focus trap/return, Escape, clear live status, no color-only state. Keep mock controls outside product UI.

Focused evidence: repeat-trial/duplicate guard policies, quote-consent reset, failed coupon recovery,
pending/confirmed transitions, refund/receipt display, signature and unsafe checkout URL rejection;
desktop and 390px visual review. Full browser/payment acceptance, database, remote CI, deploy and
actual merchant tests remain after PO inspection and their existing approval gates.

## Local implementation evidence — 2026-10-14

- PO accepted the latest design and authorized local development. Authenticated checkout preparation
  now uses a PostgreSQL repository and typed HTTP gateway; `/plans` opens `/settings/checkout` behind
  DEV/local flags. Test-only migration `20261014100438` is installed in Development, not Production.
- Checkout tests cover concurrent dispatch, unknown provider outcome, quote/terms changes, tenant
  ownership, calendar boundaries and missing configuration. Two isolated Development accounts used
  real User JWTs for bounded HTTP/Postgres verification: eight concurrent requests produce one intent
  and one fake-provider call, cross-account reads fail, a fresh module recovers state, and RLS blocks
  foreign rows. Test accounts/workspaces were removed afterward. This is not merchant acceptance.
- Both typechecks pass. API billing suites 19/19 and selected Web/gateway/plan checks pass, including
  restored checkout preventing a second quote/begin. Missing merchant configuration remains a clear
  unavailable result. Runtime instructions and exact remaining scope: [Local checkout](M8-E-LOCAL-CHECKOUT.md).

- Web components and DEV-only `/__review/payments/*` harness are implemented. Run Web dev server
  on port 4177 to review. Synthetic fixtures reset on reload; durable recovery remains future server
  work. Never cite this harness as proof of merchant checkout, cross-tab locking or webhook sync.
- API foundation implements server-input eligibility, 45-day request timing, checkout payload
  creation and raw-body signature verification. No route, merchant call, DB migration or paid access
  grant is enabled by these helpers.
- Focused Web 8/8 and API 6/6 pass; Web/API typechecks pass. Desktop and 390×844 local synthetic
  checks cover coupon confirmation, same-page simulated overlay, confirmed exit, returning due-now,
  pending-to-billing guard and partial-refund invoice detail. Mobile scroll width is 390px.
- Receipt URL validation retains failure recovery; a fetched receipt becomes an explicit secure link
  so a browser popup blocker cannot silently swallow the asynchronous response. Actual merchant
  receipts remain unverified. Public legal defaults have a regression check against draft activation.
- PO inspection, merchant tests, full CI/build, live/browser acceptance and remote delivery remain
  open. Local visual evidence is in `output/playwright/payment-react-*.png` (ignored artifacts).
- Follow-up: reviewed the actual Production Settings screen and reused formal components. The
  initial interpretation incorrectly nested checkout in Settings and was rejected by the PO.
  Checkout is now independent and retains only the formal visual language; existing Plans remains
  the selection entry and Settings remains the management destination.
  Public notice no longer says a refund request does not cancel
  renewal; it says the outcome is communicated by Email. The private current-period refund procedure
  explicitly includes stopping renewal and returning to Free, with approved exceptions retained.
  Focused Web checks now pass 10/10 including existing PlanPanel coverage; Web typecheck passes.
  Local synthetic success exits to billing; desktop and 390px layouts were inspected without
  horizontal overflow. Latest standalone checkout screenshots:
  `output/playwright/payment-independent-*.png`; the earlier checkout screenshots are superseded.
- Latest detail correction: focused Web 11/11 and typecheck pass. Invalid-code geometry remains
  stable and consent can be checked while payment stays blocked; returning checkout can be checked
  and submitted. The expiry regression covers explanatory recovery and fresh consent. Local desktop
  and 390px inspection covers notice-page navigation, redesigned success facts, confirmed exit and
  the restored comparison entry. Screenshots: `output/playwright/payment-detail-*.png`.
