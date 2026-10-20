# M8-E local implementation contract

> 2026-10-19 結帳中斷修正：最新端到端節點、判定與例外路徑見 [支付流程與狀態路徑圖](M8-E-PAYMENT-FLOW-STATE-MAP.md)。本分支候選改為關閉 Lemon 視窗後留在結帳頁，按返回放棄本站意圖，成功訊號後才進結果頁；下方較早「先進 status」描述是歷史版本。發布狀態與待驗證項目見專屬 workstream Status。

## 2026-10-19 PO decision — no paid discount codes

The paid Lemon Squeezy checkout offers only the existing native one-month trial for an account's
first Pro or Prime subscription. Do not accept a paid discount code in the app quote API, display
a code field in the app or provider checkout, or use the unreleased C01 introductory price flow.
This supersedes the C01 candidate sections below; they remain historical implementation evidence,
not active release requirements. Existing card-free Beta entitlements and permanent Prime grants
are separate and remain valid. R01–R17, including R09 and R14, keep their existing gates.

## C01 local candidate implementation note — 2026-10-19 02:38

The branch-local candidate now reserves `drinkmorewater` by verified workspace and environment
when an intent is created. A zero-value initial trial invoice never consumes it. A positive `paid`
subscription invoice consumes it only after the existing invoice/period authority validates the
90% first-charge price within the already approved FX tolerance. A durable worker then changes
the same subscription from the introductory variant to the standard variant, with prorations and
immediate invoicing disabled. It reads the subscription again before retrying a lost response;
plan changes wait until that switch is confirmed. A cancelled introductory subscription remains
cancelled and cannot be switched while inactive. Uncertain/abandoned checkout intents remain
unresolved until provider reconciliation; the reservation is not marked consumed merely because
the URL expires. A later eligible checkout can reuse a reservation only if no subscription bound
to that prior intent. These fail-closed conditions preserve the once-per-account rule.

The provider checkout's native subscription preview would repeat the temporary custom price
forever until the switch. For introductory checkouts, the candidate hides that misleading preview
and states the first positive charge and later catalog renewal in the provider product description;
the site's quote shows the same two amounts. Live promotion entry is hidden unless the server
has the required introductory variant for the selected tier and interval and the account is
eligible. Live still has no introductory catalog configuration, migration application or release
authorization. Focused local checks are recorded in M8-E Status; Development database and actual
provider switch verification remain for the approved later gate.

## C01 drinkmorewater addition — PO decision 2026-10-19; local design

The Product Owner requested `drinkmorewater`: 10% off the account's first actual positive payment
after the code is used, strictly once per Form Coach Desk account. A zero-amount trial order does
not consume the economic benefit. Later paid renewals return to the normal plan price. The
account-scoped eligibility, reservation and consumption rule is server-owned; Lemon must calculate
the charge and produce the matching invoice. An abandoned checkout must not consume the benefit;
two concurrent checkouts or a resubscription by the same account must not obtain it twice.

This is a new addition to the earlier Lemon-native discount ruling. The shared public code must
not be enabled as a Live Lemon discount until the account limit is enforced. An isolated Test Mode
10% `duration=once` code initially previewed NT$0 now, NT$103.50 after the one-month Pro trial,
and NT$115 on later months. The later provider invoice evidence below supersedes that preview.
No Production provider setting, migration or checkout activation follows from this decision alone.

The 2026-10-19 Test Mode trial exposed a provider mismatch: the `duration=once`, max-one coupon
redeemed on the initial NT$0 order (redemption amount 0), while the first later positive invoice
showed no discount. Its quoted subtotal and total were NT$114.89 and discount total NT$0; its
`pending` status means settlement is unverified, but does not erase the clear discount-allocation
result. The test subscription's future renewal was cancelled. Therefore the tested native once
coupon cannot satisfy this Contract for trial subscriptions. Keep the public code and app entry
closed.

A second isolated Test Mode trial with a 10% `repeating` discount for two months also redeemed
against the NT$0 order; its first positive invoice likewise showed NT$0 discount and was `pending`
when read. Its future renewal was cancelled without forcing another charge. This alternative also
fails the first-positive-charge gate; do not infer provider behavior from the checkout preview.

On 2026-10-19 the Product Owner authorized a **Test Mode and local Contract prototype only** of a
separate introductory variant: preserve the one-month trial, create a checkout with a server-owned
introductory custom price, then after a verified first positive payment move the same subscription
to its standard variant with prorations disabled so future renewal uses the standard price. Lemon's
[custom pricing guide](https://docs.lemonsqueezy.com/guides/developer-guide/taking-payments)
states that a subscription custom price persists until a different variant is selected; its
[subscription management guide](https://docs.lemonsqueezy.com/guides/developer-guide/managing-subscriptions)
describes next-renewal price changes without proration. Together with the observed Test Mode
introductory-price invoice below, these establish a supported provider mechanism for the local
design; another accelerated provider transaction is not a prerequisite to implement it. The
server must enforce one economic benefit per verified account, switch only after the first
**paid positive** provider invoice, handle retries/cancellation and apply the same rule to month
and year variants. Focused tests must cover those app-owned rules. A later natural paid renewal
remains useful operational evidence, not a blocker to local design. No Live variant, public code,
migration or app entry is authorized by this Test Mode prototype.

The isolated Pro monthly Test Mode variant `2250118` was published with a one-month trial and
NT$115 catalog price. Its checkout used a NT$103.50 custom price, but the provider rendered
NT$103.50 for **every** future month until a variant switch. The Product Owner submitted the
test checkout; the zero-amount initial invoice was paid. With the Product Owner's specific
authorization, the trial was accelerated. The first positive renewal invoice `8758783` was
`pending` for NT$103.53, with no discount line, against the checkout's NT$103.50 preview. The
NT$0.03 difference is within the existing transaction-rate FX tolerance below; **exact TWD
equality was never required**. `pending` only means actual collection was not proved. The
subscription `2618012` was cancelled and read back as cancelled, so no second renewal was forced
and the switch to the standard variant was not attempted. The provider's documented variant
behavior supports that next step; annual configuration and app-level account-once enforcement
remain implementation work, with natural paid renewal evidence tracked separately.
The three provider diagnostic subscriptions `2617960`, `2617986` and `2618012` all have future
renewals cancelled. C01 remains unavailable in Live and in the app.

## Release timing decision — Product Owner 2026-10-18

The Product Owner directed continued development and Live release even if R09's naturally timed
Test Mode first-charge or renewal result has not arrived. Preserve R09's original pass criterion
and reconcile its later provider invoice, signed webhook or documented recovery, original Coach,
verified period and access after the event. The existing short-interval Test Mode diagnostic
proves only the behavior it actually exercises; its one-day period mapped to a local month quote
does not prove the production month/year schedule or native one-month trial first charge.

This is a sequencing exception to the earlier complete-Test-Mode-before-Live instruction, not a
claim that R09 passed. Before opening paid checkout to all Coaches, still establish Live merchant/catalog/webhook
readiness, displayed-versus-actual charge and consent, environment/tenant isolation, encrypted
restore, a bounded controlled Live transaction and exact-commit deployment/health evidence. An
observed failure affecting charges or entitlements requires containment and correction. Remote
delivery, Production secret changes and the real payment retain their explicit action approvals.

2026-10-14: PO authorized starting development/design after reviewing the policies. This freezes
the independent local checkout/UI and provider-boundary foundation below. It does not freeze the
remaining subscription/event persistence, provider change execution or live-activation contracts.
The later checkout persistence and subscription lifecycle policy slices below are frozen separately.

## R15 Live activation contract — frozen by PO 2026-10-18

The existing Development billing schema and repositories accept only `test`; a Production migration
cannot be a file move or a relaxed runtime flag. Approved scope:

1. Keep provider mode, store ID, API credential, webhook signature secret and database environment
   bound together by one server-side configuration. A `live` process must reject Test Mode IDs,
   events and credentials; a `test` process must reject Live ones. The browser receives only public
   display configuration. Production starts with billing disabled until its exact-SHA release gate.
2. Create ordered, additive formal migrations for the existing checkout, event, invoice, period,
   change and refund tables. Production starts with **empty Live billing rows**. Existing Development
   Test Mode transactions are evidence, never imported into Live customer entitlements. Retain
   workspace-scoped API RLS, narrow worker writes and the original invoice/period foreign keys.
   Dry-run the exact files and verify role grants before any Production application.
3. Wire repositories to one validated environment parameter rather than SQL `test` literals;
   worker event intake and reconciliation use the same validated mode/store. Keep the current
   provider-verified invoice and period conditions, including revoked-period exclusion.
4. Extend the encrypted logical-backup manual restore drill after the formal schema exists: verify
   a billing table set and migration version, then restore an isolated paid test fixture and read
   subscription, invoice, period and owner joins without opening a network path to Production.
   Dump/upload success alone is not restoration proof. Verify the resulting recoverable point is
   within the Roadmap's 48-hour requirement before Live charging.

This Contract does not authorize Production migration, secret changes,
Live payment, remote push or a second Test Mode purchase. R09 renewal authority and R02 merchant
activation remain separate gates.

## Scope and authority

### Final PO ruling — 2026-10-18 (supersedes the Promotional sections below)

All four Pro/Prime monthly/yearly Lemon variants must have a native 30-day or one-month free trial.
**Later PO correction on 2026-10-18:** only the account's first paid subscription receives that
trial and zero due today. A returning subscriber pays on the new checkout: use the server-owned
first-subscription record to select `skip_trial:true`, and recheck eligibility when beginning.
The app may show a clearly labelled estimated first-charge date and plan price before checkout,
but must read the provider-confirmed period and invoice for actual access and billing; the
estimate must never grant access or set the subscription deadline. The app has no discount-code
field and rejects code input; Lemon checkout
shows its native discount field (`discount:true`) and alone validates and calculates any discount.
Delete the unexecuted hold/redemption migration and no longer map 60-day paid variants.
Reject paid downgrades, including during trial, at the API as well as the Web. Offer cancellation,
original verified end, Free, and a new checkout after expiry. Previously granted Beta access
remains valid to its original end; billing activation disables new card-free Promotional grants.
Keep payment Live and Production changes under their existing separate gates. Earlier sections
below are retained only as decision history and cannot override this final ruling.

Evidence reuse for this reset: retain R04's real zero-amount Lemon trial, signed webhook, invoice
and owner binding; retain R06's provider-confirmed unchanged trial end for an allowed upgrade,
R07 paid upgrades, R10 cancellation and R11–R13 refund, recovery and isolation evidence. Do not
repeat those purchases or rerun R01–R17 from the start. Check only changed quote/discount/
downgrade behavior and read back the native trial setting on each of the four actual variants.
The R09 natural first-charge/renewal gap, R02 Live merchant setup, R15 formal restore, R16
controlled Live transaction and R17 exact-SHA deployment remain their original open gates.

### Superseded: Existing Promotional code — earlier PO correction 2026-10-18

For new redemptions after payment activation, the existing Promotional code is entered on the
subscription confirmation page. The server validates the code and first-subscription eligibility,
then replaces the ordinary one-month trial with one Prime 60-day trial on the chosen monthly or
annual interval. The same owner-bound Lemon checkout obtains payment authorization; the app never
stores payment details. The confirmed provider subscription and signed reconciliation are required
before consuming the code and granting trial access. Abandoned or unresolved checkout retains the
code reservation until provider reconciliation establishes whether a subscription was created.
Invalid codes preserve the input and selection, clear consent and block payment with the stale
quote. The returned quote displays Prime, the actual renewal price, 60 days and first-charge date;
consent must be given again. The old no-charge grant remains valid for its original term.
While billing is disabled, keep the released Plans-page redemption path available in Production.
When billing is activated, promotional redemption must use this checkout route; the old direct
redemption endpoint may still serve permanent codes, but must not grant new card-free Promotional
access. This is a new product correction, not a statement that the old code path was implemented.

**Proposed minimal persistence boundary, awaiting implementation authority after automatic review:**
Keep the existing `beta_code` digest, close time, revoke flag, legacy redemption count and
email-use record as the source of code eligibility. Add a private checkout hold keyed to the
owner-bound intent and code ID; it contains no card data and consumes no code. At begin, lock the
code row, recheck eligibility and `(legacy redeemed + confirmed paid redeemed + unresolved holds)
< limit`, then insert the hold in the same transaction as the intent. Only a matching, signed Lemon
subscription with the server-issued proof and a verified initial trial period can convert that hold
into one paid redemption. The worker may write only this new paid-redemption table and mark its own
hold consumed; it need not update `beta_code` or insert into the legacy `beta_redemption` table.
Every quote and begin also checks legacy email use and paid email use. Provider create uncertainty
keeps the hold pending until reconciliation; no timeout alone releases it. Idempotent webhook replay
must not consume twice. The checkout API role gets no cross-owner subscription/intent read access;
the new hold table carries only opaque IDs needed for global code capacity. Before migration, verify
the exact table grants and RLS using the application and worker roles in an isolated database.

### Historical Promotional clarification — 2026-10-17 (superseded for new redemptions)

The existing Promotional code remains a no-card Prime 60-day grant redeemed on the Plans page.
It creates no Lemon subscription and no automatic charge. Ordinary paid checkout has no code
field and quotes only the selected Pro/Prime monthly or yearly subscription, with the applicable
one-month first-subscription trial. This later PO decision supersedes the paid 60-day code path
described in the historical Development browser-acceptance section below. Keep old Test Mode
transactions as evidence only; do not issue or enable a new paid promotional code. The Production
code already stops new redemption at 2026-12-01 00:00 Asia/Taipei. The separate Lemon 60-day
variants are to be disabled for new direct purchases at that time.

### Promotional direct-purchase recovery — PO decision 2026-10-17

**Later PO scope correction, same day:** A 60-day Prime trial obtained directly from a published
Lemon promotional variant during this short campaign is acceptable. Direct-purchase prevention,
copied-proof probes, provider cancellation of every direct order, and operator notification are not
launch gates. Preserve already implemented owner-bound app access and best-effort cancellation,
without expanding this temporary-offer investigation. The Production Beta code already stops new
redemptions at 2026-12-01 00:00 Asia/Taipei. No separate M8-E paid code will be issued;
disable both monthly and yearly 60-day Lemon variants for new purchases then. Do not disturb
existing subscriptions or their trial dates. This later decision supersedes the stricter acceptance
criteria in the historical paragraph below and does not authorize Production billing or a push.

The Product Owner accepts a bounded provider-side exposure: a published Lemon 60-day variant may
briefly create a subscription when bought from Lemon's public product checkout without a valid app
code. Such a purchase must never grant Form Coach Desk access or consume an app promotional code.
The signed webhook worker and an independent, continuously scheduled provider-list audit must
identify unowned promotional subscriptions, verify the Test Mode/Live store and variant before
canceling, and confirm provider cancellation. A possible legitimate app checkout with a missing
webhook is held for up to one hour for investigation and resend, never guessed from buyer email.
If it remains unbound after that limit, the provider-confirmed cancellation takes priority over
preserving an unverified checkout. The launch gate is no unowned app access and no unowned renewing subscription;
operator Email delivery is not part of this gate.

Ordinary paid checkout retains its one-month first-subscription eligibility and app ownership
rules. The no-card Promotional grant is separate. This decision replaces the prior requirement
that a direct Lemon transaction cannot be created at all. Local Test Mode evidence for paid
checkout remains required before Production activation. This decision does not authorize
Production changes, a remote push or payment launch.

### Development browser acceptance — PO direction 2026-10-15

The Product Owner requested a runnable local Test Mode payment path and offered to perform the
final checkout interaction personally. This authorizes an explicit, default-off Development runtime
for checkout, signed webhook processing, initial verified periods, owned billing snapshots and
receipt retrieval. It is pinned to the Development Supabase project, binds the local app only, and
does not change Production or remote delivery authority. Provider-confirmed initial trial/payment
is the only subscription access source; renewal periods remain fail-closed until the actual renewal
evidence resolves their mapping.

A temporary Development-only, unlimited Prime 60-day test code may be compared by server-side
SHA-256 digest. It selects the already-verified Test Mode 60-day variant, grants no access by code
alone, preserves first-subscription eligibility and never converts legacy card-free grants. A
production campaign issuance, limit and redemption ledger remains a separate unfinished contract.
The user may enter credentials and finish the Test Mode checkout; the resulting webhook, intent,
verified period, PlanAccess and receipt must be read back before calling acceptance complete.

### Development initial-period authority — approved 2026-10-15

The Product Owner approved the next authority slice in `M8-E-LOCAL-CHECKOUT.md` after the
actual Test Mode trial and immediate first charge. The bounded, frozen implementation
uses a provider-fetched intent-bound subscription to consume the account's first trial
once. An initial trial period requires the provider's original `trial_ends_at` and
matching `renews_at`; an initial paid period requires the same subscription's positive,
paid initial invoice and original next-cycle `renews_at`. A cancelled initial cycle may
be reconciled only while its original trial/renewal boundary and `ends_at` still match.
Periods retain owner, tier, interval, start/end, provider versions, invoice ID where
paid, and original due date. Only this verified period confirms the intent; missing or
conflicting evidence stays pending. PlanAccess reads owner-scoped periods, caps access at
the verified end and honors independent grants. Refund synchronization does not itself
revoke access; an audited case decision is a separate future operation.

**2026-10-17 FX correction:** Lemon charges USD cents and reports a store-currency subtotal
converted at the invoice's `currency_rate`. For initial and renewal paid periods, require the
provider's USD and TWD subtotals to agree within two TWD minor units after conversion. Accept a
catalog-price difference up to the larger of 2% of list price or one USD cent converted at that
invoice's rate plus two TWD minor units. This uses the transaction's rate rather than a fixed
exchange rate or a fixed number of TWD cents. Preserve
positive paid total and the exact variant, store, customer, subscription, currency and invoice reason
checks. Tax and discounts belong to the provider's final total. A buyer email change cannot establish
Workspace ownership; the checkout intent's signed webhook custom data remains the binding key.

Renewal, failed-payment and recovery period creation remains frozen as **fail closed**:
the Test Mode subscription API may move `renews_at` to the next retry and the invoice
API does not expose explicit period bounds. Until an actual renewal sequence establishes
the fixed original due time and invoice match, no renewal period is persisted
or granted. Development schema/worker/PlanAccess verification is allowed; Production
billing, provider runtime switch, Live products and remote delivery remain closed.

### Full-refund repurchase — approved 2026-10-18

After an approved current-period refund has been applied, provider cancellation is confirmed,
and the original invoice is fully refunded, the Coach may immediately buy a new paid
subscription. The old verified period stays in the audit ledger but cannot grant access or block
the new checkout. An ordinary cancellation without this full-refund decision continues to use
its original access end and blocks another checkout until then. A repurchase is never a second
trial: today's charge is the selected monthly or annual price. The new subscription requires its
own owner-bound paid invoice and verified period before paid access appears. Billing snapshot,
plan changes, and cancellation select the single current unrevoked period; invoice history keeps
the refunded old invoice visible. This decision does not authorize another provider transaction,
Production migration, Live payment, or remote delivery.

### Detail review and renewal recovery — approved 2026-10-15

PO requires successful late renewal to retain the original renewal date and scheduled period end;
the late-payment interval is included in that period, not added after payment. Persist that original invoice
period and bind its verified payment before activating recovery. Reject provider periods anchored
to the retry/payment date for reconciliation. The pure policy and optional access-source guard now
enforce this shape; persisted reconciliation/provider acceptance remain pending, not enabled runtime.

UI: Pro uses the dark button; Prime retains lime. Name Prime's report/calendar features explicitly.
Remove the two loose plan-page footnotes. Refund filtering exists only when invoice data contains
an actual refunded amount. Entire invoice rows support pointer/keyboard activation. Billing has one
right-aligned help link to Settings feedback/contact; no payment notice or per-invoice contact link.
Free has no duplicate plan CTA. Payment notice sections share one format. Consent reads exactly
「我已閱讀並同意付款須知、隱私權政策以及服務條款。」. Invoice rows show only a trailing arrow
once the whole row is interactive. After checkout begins, navigation goes to a separate status page;
pending confirmation and provider-window recovery do not occupy the checkout summary.

### Local workflow continuation — approved 2026-10-15

PO resumed local payment implementation and visual iteration. Restore DEV-only normal selection
and preparation, preserving the backend release hold and all Production gates. Extend the isolated
synthetic review with tab-local recovery, delayed confirmation, failed-renewal and expiry states,
and cancellation failure/retry. Store only synthetic review facts under a dedicated session key;
never copy signed-in account data or use this state to authorize access. Reload must recover the
same intent and confirmed checkout must not offer another purchase. Keep simulation controls in
the development toolbar, outside product content. Existing accepted styling remains the baseline.
Focused tests cover recovery, single-intent behavior, first-trial eligibility, cancellation recovery
and failure/expiry transitions. Merchant calls, schema application and remote release are deferred.

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
  **2026-10-15 Test Mode clarification:** an equal `updated_at` may still carry a strictly larger,
  provider-fetched cumulative refund; accept only that one-way transition after immutable fields
  pass. For a TWD full refund whose raw `refunded_amount` exceeds its original total by exactly
  one minor unit, accept only if the provider marks it fully refunded and `refunded_amount_usd`
  equals `total_usd`. Retain the reported amount and USD corroboration in private audit facts;
  cap only the effective same-currency refunded amount at the unchanged original total. All other
  overages remain quarantined. This is provider reconciliation, not a customer-fee decision.
- A subscription status alone must not grant a paid period. Verified invoice/period reconciliation,
  trial eligibility consumption, final checkout confirmation and PlanAccess wiring remain a distinct
  authority step. Keep the existing app's entitlement behavior until that step is verified locally.
  Implement its independently testable access evaluator and optional PlanAccess source seam now:
  an explicit verified trial/paid period caps access, cancelled and past-due never extend that period. Permanent
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
  and annual selection, consent and legal navigation work. Promotional-code redemption stays on
  the Plans page. Do not fabricate a quote, current eligibility, first-charge date, invoice,
  checkout intent or success. Payment stays disabled with a visible unavailable state.
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

- Annual-to-monthly changes, including a simultaneous tier change, take effect when the current
  annual period ends. The Product Owner replaced the earlier unavailable rule on 2026-10-16.
- Pro to Prime and same-tier month to year are desired immediate upgrades, effective only after
  provider settlement and verified access reconciliation. Lemon determines the actual credit,
  invoice and renewal anchor; a full new period is not guaranteed by the current provider API.
  Prime to Pro is a desired end-of-period change, including Prime monthly to Pro annual, and is
  unavailable until durable scheduling and provider execution are proved. Identical selections are
  a no-op. No new trial is awarded.

**Trial-time change correction — PO direction 2026-10-15 and 2026-10-16:** a Coach may change between
paid tiers/intervals during the original free trial on the **same provider subscription**.
The exact original `trial_ends_at` and first charge boundary remain fixed, no new checkout or
first-subscription trial is created, and the change must not produce an immediate charge.
Before the first payment, monthly/annual cadence may change freely: it sets the first charge at
the unchanged trial deadline, without changing current access. Pro-to-Prime grants Prime trial
access immediately after the provider confirms the same subscription and unchanged trial end.
Prime-to-Pro keeps Prime trial access until that original trial end, then begins Pro and its first
charge. If an annual trial changes to monthly, the first charge at trial end is monthly; no annual
charge occurs. Free has no
paid subscription or renewal action. A Coach manages cancellation on the current paid subscription
in Settings: cancellation stops the first charge, preserves the current trial access through its
original end, and then falls back to Free with data retained. This replaces
the earlier trial-time-unavailable sentence. Because the Lemon update API warns that a billing
cycle change or trial transition can charge immediately, a Test Mode change must prove the
same ID, unchanged trial deadline, intended variant, no unexpected invoice, and correctly
reconciled access before the UI enables paid switching.

**Five-plan action matrix — PO clarification 2026-10-16:** the current plan is never its own
choice. An immediate paid upgrade is the desired action, conditional on the provider's actual
settlement and period evidence; the current implementation does not promise a full new cycle.
During the first free trial, a change keeps the original trial deadline with no immediate charge.
A downgrade takes effect at the current period end. Cancellation is an action on the current
paid subscription, not an action on Free; it keeps current access until its end and then uses Free.

| Current     | Desired immediate upgrade                      | Desired change at period end      | Cancel renewal         |
| ----------- | ---------------------------------------------- | --------------------------------- | ---------------------- |
| Free        | New checkout: Pro month/year, Prime month/year | —                                 | —                      |
| Pro month   | Pro year, Prime month/year                     | Free                              | Free after current end |
| Pro year    | Prime year                                     | Pro month, Prime month, Free      | Free after current end |
| Prime month | Prime year                                     | Pro month/year, Free              | Free after current end |
| Prime year  | —                                              | Pro month/year, Prime month, Free | Free after current end |

During the first free trial, the paid-period cadence restriction above does not apply:

| Current trial         | Immediate choice before first charge                                 | Tier change at original trial end | Cancel renewal       |
| --------------------- | -------------------------------------------------------------------- | --------------------------------- | -------------------- |
| Pro (month or year)   | Pro month/year cadence; Prime month/year with immediate Prime access | Free                              | Free after trial end |
| Prime (month or year) | Prime month/year cadence                                             | Pro month/year, Free              | Free after trial end |

Selecting Free under “change at end” and “cancel renewal” are two entry points to the same
owner-scoped cancellation operation. Both preserve the existing verified access until its original
end and stop the next charge; neither creates a Free subscription. Once cancellation is confirmed,
do not offer the same Free change again.

The current exact selection is never offered again. Show only executable actions for the current
owner-verified plan. A scheduled change needs durable
provider execution and an effective-date projection before its control becomes available in Web.

- The settlement reference uses the old period's verified, creditable paid amount and exact remaining
  duration; it never credits an unpaid invoice or the nominal list price of a discounted period.
  Round once to the nearest minor unit (half up), in a single currency. This is an internal reference,
  not permission to charge or a promise of provider rounding. Reject currency mismatches, invalid
  periods and excess credit for reconciliation instead of inventing a wallet or cash refund.
- For a failed renewal, the existing paid source lasts only to its already verified end. A retry,
  `past_due` status or moved provider renewal date never extends it. Verified unpaid/expired ends
  that source immediately. Other legitimate grants are evaluated separately; no Coach data is
  deleted. Successful recovery
  requires the matching verified payment and period, never a browser callback or stale active event.
- Pure helpers consume reconciled server facts only. Focused checks cover all 16 selection pairs,
  rounding/date/currency boundaries, exact paid-period expiry and early terminal states. No HTTP mutation,
  automatic provider PATCH, new database schema or production access change is enabled by this slice.

Provider evidence: [update subscription](https://docs.lemonsqueezy.com/api/subscriptions/update-subscription)
supports immediate proration and resetting the anchor; the [management guide](https://docs.lemonsqueezy.com/guides/developer-guide/managing-subscriptions)
states a variant change takes effect immediately even with proration disabled. Therefore deferred
downgrades require a separate durable operation; do not PATCH early or promise a renewal-boundary
job is race-free. Test Mode must prove reset-period credit totals and payment-failure behavior before
the upgrade adapter is enabled. These are engineering constraints, not new commercial questions.

**2026-10-17 paid-change evidence and remaining contract:** A paid Pro-month Test Mode
subscription updated to Prime month on the same subscription with `invoice_immediately=true`;
Lemon issued a positive paid `updated` invoice and retained the original next renewal date.
Development reconciliation now requires that paid invoice before promoting the already verified
period to Prime and records the invoice as durable evidence. This is a provider/backend recovery
rule for the observed shape, not approval to expose an automatic customer-facing PATCH: an
owner-scoped command, repeat-safe dispatch and pre-charge disclosure are still required. A later
Prime-month to Prime-year Test Mode update produced a paid NT$1,305.28 invoice, reset the renewal
date to 2027-10-17 and reconciled an invoice-linked annual period in Development; the original
paid month remains superseded history. This proves that same-tier annual switch shape at the
provider and backend, including delayed invoice/read-back and replay. Other annual shapes and
deferred paid downgrades need separate evidence and execution contracts.

**Approximate charge disclosure — PO direction 2026-10-17:** The paid-change UI may show a clearly
labelled `預估` amount calculated on the API from verified creditable paid value, remaining paid
duration and catalog price. The observed annual switch's estimate was NT$1,305.17 against the
provider's NT$1,305.28 invoice. The final action must explicitly say it may immediately charge;
the actual amount and tax come from Lemon's invoice. Do not claim a later checkout screen will
calculate or confirm the charge: a subscription PATCH can directly attempt payment. Show no
estimate when required paid-period, currency or credit evidence is missing; keep that change
unavailable pending investigation. This disclosure does not authorize a browser-derived amount,
an unchecked provider mutation or Production activation.

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
- Open the provider overlay over a dedicated post-submit status page. SDK failure exposes a clear
  retry and hosted fallback for the same checkout URL. Close never implies cancellation. Only
  gateway-confirmed success offers completion to billing via replace navigation. Reload resumes
  the same intent without reopening the overlay automatically; old checkout navigation redirects
  an unresolved intent to status and an existing subscriber to billing.
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
Selection proceeds to a separate checkout page, then a separate status page for provider overlay,
confirmation and recovery, and returns to Settings billing after confirmation. These pages have no
workspace/sidebar/category shell.
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
