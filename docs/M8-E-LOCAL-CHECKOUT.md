# Local review continuation — 2026-10-17

> **Latest PO clarification, 2026-10-17:** the existing Promotional code grants Prime for
> 60 days on the Plans page without a card, Lemon subscription or automatic renewal. The paid
> 60-day code path and DEMO60 checkout examples below are historical Test Mode evidence only.
> Current paid checkout offers ordinary monthly/yearly plans; the active R05 definition is in
> `status/M8/M8-E.md`.

> **Current complete launch checklist:** [`status/M8/M8-E.md`](status/M8/M8-E.md) R01–R17.
> This file preserves provider transaction details and historical handoffs. Its older `Next` and
> `pending` paragraphs are not a second open-gate list. The fixed register is the next-agent entry.

## Latest R14 refund repurchase — 2026-10-18

After the Product Owner approved full R14 verification, the isolated Coach whose original annual
subscription `2614493` had been canceled, fully refunded (invoice `8746552`) and audited current
period revoked signed in to the real local Coach UI. Pro annual confirmation at desktop and 390px
showed NT$1,150 due today, NT$1,150 per year afterward, and no repeat trial. One official Test Mode
card payment returned Lemon success. The original checkout intent
`2fd82678-ec06-440a-8efa-33d8c8049b9e` became confirmed/paid, new subscription `2615693`
and paid TWD invoice `8750596` total 115016 minor units (NT$1,150.16). Six related signed webhook
inbox events finished `done/attempts=1`.

The old refunded period and new paid period both remain unsuperseded in the ledger. Applied
revocation excludes the old period from effective access and management selection: the API and
390px UI showed only the new Pro/year entitlement through 2027-10-18, while billing history showed
both paid and refunded invoices. Coach UI cancellation then marked the new subscription canceled
for future renewal; its paid access remains until that end. The old subscription remained canceled.
The restored original webhook URL is unreachable; the temporary Cloudflare tunnel, webhook-only
proxy, API and Web services were stopped after verifying the hook restore.

The hosted checkout showed card, PayPal and a Cash App Pay option. Only card was transacted.
Lemon's published subscription payment-method list does not include Cash App Pay and the documented
checkout creation API has no payment-method exclusion option. R14 payment-method applicability and
R02 Live merchant method availability remain open; no further test charge is implied.

## Latest isolated Test Mode evidence — 2026-10-17

The Product Owner explicitly authorized temporary Cloudflare transit of isolated Test Mode
buyer Email, subscription and invoice metadata after an automatic review had rejected opening
another public Quick Tunnel. The webhook-only proxy exposed no other app routes (root 404,
unsigned POST 401). After real purchases, the existing 11-event Test Mode webhook `142825`
was restored to its previous URL and the tunnel, proxy and local API were stopped.

- Clean first ordinary checkout: Pro month subscription `2614857`, intent
  `92f4e925-d3c8-4d08-963d-815ddfdd6eef`, paid TWD 0 initial invoice `8747726`,
  original signed `subscription_created` delivery 200, three Development inbox events
  `done` with one attempt each, owner Pro trial through 2026-11-17.
- Prime annual 60-day promotion: subscription `2614961`, intent
  `f052a282-3300-4de4-a1ad-5c96201baa44`, paid TWD 0 invoice `8748210`,
  `advanced_year_60_days` variant, three original signed webhook deliveries 200 / inbox
  `done` with one attempt each. The owner Prime/year trial runs from
  2026-10-17 12:04:48 UTC to 2026-12-16 12:04:47 UTC, about 60×24 hours.
  Lemon buyer Email matched the isolated fixture, not Chrome autofill. The buyer saw
  TWD 0 today and TWD 1,450/year after trial before submitting in Test Mode.

Both purchases were created from server fixtures, so normal Coach UI initiation remains open.
The second purchase proves one 60-day provider path, not code-reuse, hidden-variant or
Production campaign issuance controls. See the active R04/R05/R12 rows in M8-E Status.
The subsequent direct-link probe found that Lemon's ordinary product checkout still lists
both published 60-day variants without an app code. Prime annual could be selected with
TWD 0 today and TWD 1,450/year after 60 days; no second checkout was submitted. Product
storefront hiding and custom checkout `enabled_variants` do not prevent this route. R05
remains a Live blocker pending a verified mitigation.
The Product Owner clarified that the Promotional code is the only way an eligible Coach should
receive Prime's 60-day trial; without it, the existing ordinary one-month trial applies.
Local Test Mode now stores a random proof with each new promotional intent and sends it only
to Lemon's custom checkout data. First binding requires that proof; an untrusted promotional
subscription reaching the webhook worker is cancelled after provider confirmation and left
as a dead inbox record. This still needs a real direct-checkout cancellation probe, a
missed-webhook audit and customer notice before R05 can pass.

## CURRENT HANDOFF — owner paid-change control and fresh-account webhook, 2026-10-17

The Product Owner approved the exact immediate-charge confirmation copy and a new short-lived
Cloudflare Tunnel test. A Development-only owner-scoped paid-change command now persists a
two-minute server estimate and one `dispatching` claim before any Lemon PATCH. It permits only the
provider-proven card transitions Pro month → Prime month and Prime month → Prime year. The UI shows
`預估升級費用約 NT$…。按下『確認變更並付款』後，系統會送出變更並嘗試立即扣款；實際金額、稅額及續訂日期以 Lemon Squeezy 完成後的帳單為準。`
with `確認變更並付款`; the frontend latches rapid clicks and the database blocks a second
provider request across browser retries/process restarts. An unresolved result stays pending for
provider read-back and cannot be silently retried. New Development-only migration
`20261017085708_billing_paid_change_command.sql` was dry-run, applied and read back on Development;
Production schema and billing remain unchanged. Focused API paid-change 2/2, lifecycle 25/25,
Web paid-change 1/1, API/Web typechecks passed. Full package CI, remote delivery and Product Owner
UI acceptance remain open.

Fresh-account signup and Email verification completed in an isolated Development account. The
Product Owner submitted its normal Prime-month Test Mode checkout with the official test card;
subscription `2614688` started a **one-month trial** with NT$0 due today. The first real
`subscription_created` delivery returned 401: our temporary receiver had loaded a stale local
signing secret instead of the existing hook's runtime secret. After that receiver was corrected,
Lemon's dashboard resent the **real signed provider event**. The Development inbox completed it,
confirmed the original checkout intent, bound the subscription to the new account and created one
verified Prime trial period. The signed-in Settings page then showed Prime monthly, trial through
2026-11-17, and unlocked Coach access. This proves automatic owner binding from a real event on
retry; **first-attempt delivery did not pass**. Other initial events were not needed to establish
the binding. The temporary Test Mode hook URL was restored to its previous value with all 11
events preserved, and the tunnel, receiver and billing-enabled local API were stopped. Test Mode
form fields, including Taiwan/postal code and official card details, were filled by the agent;
only the final browser transaction submit was performed by the Product Owner.

The historical annual `subscription_updated` and `subscription_payment_success` deliveries for
`2614493` had originally gone to a previous tunnel URL and returned 400. Both were resent from
Lemon's Test Mode dashboard to this test's signed tunnel route. The **new** delivery records at
09:33:38 and 09:34:25 UTC each returned HTTP 200 `{"received":true}`. The Development inbox
processed the real resends (`done`), and read-back after both showed paid invoice `8746552`, one
unsuperseded Prime-year period through 2027-10-17 and owner Prime access. This proves the real
annual webhook delivery and replay path using an existing Test Mode transaction; it does **not**
prove an entirely new annual payment initiated from the Coach confirmation UI. That UI-to-provider
case remains open. The fresh account is on trial, so it would first need a separate isolated paid
monthly subscription or a controlled Test Mode trial-to-paid transition.

Lemon's official subscription guide says a variant PATCH changes the plan immediately, even with
`disable_prorations=true`; that option only changes when the price is charged. Therefore native
"paid downgrade at period end" is unavailable. A durable app-owned command, near-boundary job,
provider read-back and a safe renewal-failure/cancellation fallback might deliver the desired
behavior, but are unimplemented and unverified. No paid midterm downgrade is exposed. The approved
cancel-to-Free-at-end path remains available. See the older evidence below for provider invoices
and previous decisions.

## Earlier handoff — payment rule resolution, 2026-10-17

The Product Owner resumed focused Development/Test Mode work after the earlier stop. The earlier
STOP handoff below is historical and its pending-invoice, unexecuted-smoke and seven-day-grace
claims are superseded by this section. Production payment remains hard-off; no Production change,
remote push or full M8-E CI gate is authorized.

**Decisions:** The Lemon renewal invoice `8737652` settled as `paid` after initially showing
`pending`; provider settlement latency is not a product feasibility failure. The Product Owner
removed the seven-day renewal grace rule. A `past_due` renewal cannot extend an already verified
paid period; after that end, PlanAccess falls back to another valid grant or Free until a matching
paid invoice establishes the next period. Retry timing alone grants nothing. Trial plan/cadence
changes and cancellation to Free remain feasible. One paid Pro-month to Prime-month upgrade is now
provider- and backend-proven. One Prime-month to Prime-year paid switch is also provider- and
backend-proven below. A signed-in Coach-initiated paid-switch control and deferred paid downgrades
remain unimplemented.

**Completed focused evidence:** The owner-scoped trial-change acceptance script ran twice against
isolated Test Mode subscription `2609277`: one subscription, unchanged original trial end, one
zero-total paid `updated` invoice per change, no positive immediate charge, correct PlanAccess and
no new invoice on replay. A human completed a separate returning Pro month Test Mode checkout.
Lemon returned subscription `2614493`, paid initial invoice `8746247`, TWD 11489 minor units,
USD 354 minor units, and invoice `currency_rate=0.03081322`. The buyer used a different email from
the isolated Development account. The checkout success page is visible, but the local endpoint
received no provider webhook. A locally signed recovery event fetched the actual provider objects,
confirmed the isolated Development intent, created one verified paid period and yielded owner-scoped
Pro access; rerun passed. That initial checkout is **manual recovery proof, not webhook-delivery
proof**. A later paid upgrade produced real signed Lemon webhook events through a temporary
webhook-only Cloudflare Tunnel: the Development API received `subscription_updated` and
`subscription_payment_success`, and the worker stored the paid invoice. The existing Test Mode
hook was restored to its prior URL and the temporary tunnel closed after verification.

**Paid upgrade resolution:** The isolated paid Pro-month subscription `2614493` was changed once
to Prime month with `invoice_immediately=true`. Lemon kept its original 2026-11-17 renewal date
and generated a paid TWD 3018-minor-unit `updated` invoice (`8746384`). Initially our worker
dead-lettered the subscription event as `period_variant_mismatch`: it compared every later
provider variant with the original checkout variant. Development-only migration `20261017074143`
and a narrow worker rule now accept only this same-cycle basic-month to advanced-month change
when a matching positive paid `updated` invoice, coherent USD/TWD amounts and unchanged period end
are present. The failed event was requeued after exact provider read-back; ledger, verified period
and owner PlanAccess now all show Prime. An exact-subscription replay finished without a duplicate
evidence row. This proves provider settlement, automatic webhook delivery and backend rights
reconciliation for this one upgrade shape. It does not yet prove the Coach confirmation UI or paid
downgrades.

**Monthly-to-annual resolution:** On the same isolated subscription, a Test Mode Prime-month to
Prime-year PATCH with `invoice_immediately=true` first returned the new variant while an immediate
read still showed the old renewal date and no new invoice. A subsequent exact provider read showed
paid `updated` invoice `8746552` for TWD 130528 minor units (NT$1,305.28) and a new renewal date
of 2027-10-17 08:21:39 UTC. This is a real provider charge in Test Mode with no live card. The
Development worker now accepts this _one same-tier monthly-to-annual shape_ only after a matching
positive paid invoice, coherent USD/TWD values, plausible prorated subtotal and a roughly annual
new boundary. Migration `20261017082340` preserves the old paid month as superseded history and
creates one invoice-linked annual period. The actual provider objects were fetched after locally
signed notifications: the invoice, subscription ledger, owner billing projection and PlanAccess
show Prime year through that new boundary. An independent replay finished with only one annual
period. The prior public tunnel was not reopened, so automatic Lemon webhook delivery for this
annual event was not re-proved; the earlier same-cadence upgrade did prove the delivery channel.
Pro-month to Pro-year and cross-tier month-to-year have not been separately probed.

**FX finding and fix:** The NT$115 TWD catalog price became NT$114.89 on the provider invoice due
to USD-cent conversion. Initial and renewal period authority now compares the invoice's USD/TWD
subtotals at its own exchange rate and accepts a catalog difference up to the greater of 2% of
catalog price or one USD cent converted at that rate plus two TWD minor units. A paid invoice,
positive total, matching variant, store, customer, subscription, currency and invoice reason are
still required. The original exact-11500 renewal comparison would have rejected a real paid invoice.
API Billing focused tests passed 121/121 after the same-cycle paid-upgrade rule and API typecheck
passed. Web BillingPanel passed 7/7 and Web typecheck passed after the grace UI change. A focused
signed-in browser inspection showed the isolated Coach's Prime annual trial on the plan comparison
page at 390px, with Free-at-end and Pro-annual-after-trial choices; cards scroll horizontally as
intended. This did not exercise a paid Coach switch or fresh checkout. Broader package checks
remain gated.

**Pre-charge disclosure decision:** The Product Owner accepts an explicitly approximate prorated
amount. The API's existing `upgradeSettlementReference` uses the verified creditable paid amount,
paid-period timestamps and the new catalog price; the frontend will display that server estimate
as `預估`, never as a quote or maximum. For the observed annual switch, it predicted NT$1,305.17
and Lemon charged NT$1,305.28, a difference of NT$0.11. The Coach confirmation must say that
pressing the final button may immediately trigger Lemon's charge, with the actual amount and tax
on the Lemon invoice; it must not promise a further checkout confirmation step. Lemon documents
that a variant PATCH can charge immediately
and can move the billing date when cadence changes. Its update endpoint returns the changed
subscription, not a pre-update prorated amount. The documented checkout total preview is for a
checkout, not an existing subscription change. Keep the paid-switch control unavailable until an
owner-scoped, repeat-safe command and this explicit estimate/charge confirmation are implemented
and inspected.

**Next executable sequence:** (1) Verify the full signed-in account path and a fresh normal
checkout's automatic owner binding; the human checkout buyer email differed from the isolated
Coach and the original checkout needed manual recovery. (2) Design and verify the
owner-scoped paid-change command and approximate-charge disclosure before exposing a paid-switch
control; the provider/backend Pro-month to Prime-month and Prime-month to Prime-year cases are
proven, but the direct API probes did not exercise a Coach confirmation screen. Verify other annual
shapes separately. (3) Keep paid downgrades unavailable until durable end-of-period execution and
annual-to-monthly Test Mode proof exist; the working cancellation/Free path is the approved
fallback. (4) Repeat automatic webhook and owner binding on a fresh normal checkout without
local recovery. Present the reviewable version before the full browser/live/CI gate; obtain
separate remote authorization before any push.

## Historical STOP handoff — interrupted trial-change and renewal integration, 2026-10-17

The Product Owner explicitly stopped further execution and requested a complete Status handoff.
Do **not** infer completion from the code or from the applied Development migrations. The exact
resume point is the unexecuted integrated Test Mode smoke described below. Production payment is
still hard-off; no Live product, Production migration, remote push or release was authorized.
All lower-dated sections in this file are chronological evidence; when they conflict with this
STOP handoff, this handoff is the current source of truth.

### Decision summary: feasible, alternative, and still open

| Rule or action                                    | Decision now                                                                                                     | Evidence and implementation state                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Free → Pro/Prime month                            | **Feasible and already provider-proved**                                                                         | Test Mode Pro trial, returning Pro payment and Prime trial have provider invoice/subscription plus Development PlanAccess evidence.                                                                                                                                                                                                                     |
| Free → Pro/Prime year                             | **Feasible by the same checkout contract**                                                                       | Published yearly Test Mode variants, amounts, intervals and local quote/checkout preparation were read back. A completed yearly card checkout is still not separately observed; this is accepted as a reasonable same-mechanism inference, not a blocker to design.                                                                                     |
| First trial, one month / Prime promotion, 60 days | **Feasible; configuration proved**                                                                               | Six published Test Mode variants match price/cadence/trial settings. Ordinary one-month Prime trial completed. A completed 60-day checkout remains open.                                                                                                                                                                                                |
| Trial paid-plan/cadence change                    | **Provider mechanism proved; product integration implemented locally but final integrated smoke is interrupted** | Isolated subscription `2609277` stayed on one ID and exact original trial deadline through Prime month → Prime year, Prime year → Pro month, and Pro month → Prime year. New invoices `8737876`, `8737879`, and `8737882` were `updated`, `paid`, total `0`; no early positive charge. Owner ledger/route/UI code and Development migrations now exist. |
| Trial Pro → Prime                                 | **Feasible**                                                                                                     | Provider changes the same subscription with no positive invoice and keeps first-charge date. Product code grants Prime only after read-back confirmation.                                                                                                                                                                                               |
| Trial Prime → Pro                                 | **Feasible**                                                                                                     | Provider target changes on the same subscription; product code preserves Prime rights through the original trial end and records Pro as the first renewal target.                                                                                                                                                                                       |
| Paid/trial → Free at original end                 | **Feasible and already provider-proved**                                                                         | Cancellation preserves the original `ends_at`; two cancelled Test Mode subscriptions and Development verified periods match. Actual calendar expiry on 2026-11-15 has not occurred, but the provider contract plus current access-source boundary are enough to accept the rule.                                                                        |
| Paid immediate upgrade                            | **Feasible by documented provider settlement; product execution still not implemented**                          | Use the same subscription with `invoice_immediately=true`; grant upgraded paid rights only after provider read-back of a matching `updated` invoice in `paid` state and the resulting subscription period. Do not promise a fresh full cycle or our calculated credit.                                                                                  |
| Paid same-cadence downgrade at end                | **Feasible with app-owned deferred execution; not implemented**                                                  | Persist the target, keep original higher rights, PATCH near the verified end with `disable_prorations=true`, and accept the new lower renewal only from a paid provider invoice.                                                                                                                                                                        |
| Paid cross-interval downgrade at end              | **No native Lemon schedule; feasible with an app-owned scheduler plus fallback**                                 | Lemon cannot natively schedule a future variant change. Execute shortly before the verified end. If the target cannot be confirmed before the safety cutoff, cancel renewal so the old plan is not charged and require a new checkout after expiry. This fallback is the approved alternative; do not call the action impossible.                       |
| Renewal success                                   | **Rule is now exact; real diagnostic renewal is still unpaid**                                                   | Required evidence is one owner-bound provider invoice with `billing_reason=renewal`, `status=paid`, expected store/customer/subscription/variant/currency/amount, plus the next subscription boundary. Webhook is a trigger to fetch, not authority by itself.                                                                                          |
| Failed/recovered renewal                          | **Policy defined; end-to-end provider recovery remains open**                                                    | Seven-day grace uses the persisted original due time and never resets from a retry or moved `renews_at`. A recovered period needs the matching paid invoice and original scheduled boundaries.                                                                                                                                                          |

Lemon-native limitations are narrow: there is no documented future-effective variant schedule and
an expired subscription cannot be silently reused as a newly charged subscription. The practical
alternatives are the app-owned deferred command with a cancellation safety cutoff, or cancellation
to Free followed by a new checkout. Everything else above has either direct Test Mode evidence or
a documented same-mechanism inference accepted for product planning.

### Renewal finding and payment-proof rule

Daily diagnostic subscription `2609055` produced renewal invoice `8737652` for TWD 115. The latest
provider read-back in the interrupted turn still returned `billing_reason=renewal`, `status=pending`,
while the subscription remained `active` and `renews_at` had already advanced from
2026-10-16 07:17:17 UTC to 2026-10-17 07:17:17 UTC. Lemon defines `pending` as waiting for payment.
Therefore this is proof that renewal generation ran, but **not** proof of payment or a new paid
period. `active`, an advanced `renews_at`, browser success, or a success-looking webhook payload
must never extend access without the provider-fetched paid invoice.

`period-authority.ts` now encodes this in `renewalPeriod()`: only an exact paid renewal invoice with
the expected scope, variant, currency, amount and next boundary can create a new verified period.
`pending`, `void`, refunded states, wrong amount/variant/currency/reason, and dates outside the next
period fail closed. The Development schema now accepts `renewal:<invoice-id>` periods and prevents
one invoice from being reused.

### Code completed locally in the interrupted turn

- `apps/api/src/billing/trial-change.ts` now reads invoices before claiming the command, persists a
  pre-PATCH baseline, recovers a timed-out PATCH by provider read-back, allows expected zero-total
  `updated` invoices, and rejects any new positive invoice.
- `apps/api/src/billing/postgres-trial-change.ts` is the owner-scoped durable repository. It
  serializes one pending command, revalidates the provider version, stores the baseline invoice IDs,
  confirms the provider response, grants an immediate Pro → Prime trial upgrade, preserves Prime
  rights for Prime → Pro until the original end, and changes cadence for the first charge.
- `trialChangeRoutes` is wired through `ServerDependencies`, `createLocalLifecycle()` and `start.ts`.
  It remains Development/Test Mode-only behind the existing billing gates.
- `postgres-inbox.ts` accepts the latest confirmed trial target instead of permanently requiring
  the checkout's original variant. It can create a renewal verified period only through
  `renewalPeriod()` and a paid renewal invoice.
- Billing management projects a confirmed Prime → Pro trial target as `scheduledChange`; renewal
  amount/cadence use that target while the current Prime rights remain visible.
- The Web billing gateway exposes `changeTrial`. `/plans` now offers the non-current trial choices,
  uses a consequential confirmation dialog, states that no charge occurs now, distinguishes
  immediate Pro → Prime rights from Prime → Pro at the original trial end, and invalidates billing
  plus PlanAccess after success. Paid-period switches remain unavailable.
- Added `apps/api/src/billing/test-mode-trial-change-acceptance.ts`. It is intended to reconcile the
  retained isolated subscription to its original Prime-month ledger state, run the real owner route
  to Prime year, prove replay, persisted invoice baseline, verified rights, same subscription,
  unchanged trial end and zero positive invoice. **This script has not been executed.**

### Development migrations

The exact dry run passed and listed only:

1. `20261015093501_billing_trial_change.sql`
2. `20261016163000_billing_renewal_periods.sql`

Both were then applied successfully to the linked Development project
`yvhijxhtelujfsaplzpi`. Production was not touched. The first migration adds the owner-scoped trial
command, persisted invoice baseline and restricted verified-period update grant. The second permits
renewal periods with paid invoice ownership and timing constraints.

`scripts/development-migration-apply.mjs` was changed for this one exact two-migration application.
Because both migrations are now remote-applied, do not rerun that apply script as-is: its exact
preview assertion expects those two migrations to be pending. First update it or retire the one-off
target. A new read-only Development dry run should now report up to date.

### Verification actually completed

- API billing tests: **117/117 passed** outside the Windows sandbox after the renewal and trial
  authority changes. The sandbox cannot reliably run Vitest because its temp-file rename returns
  `EPERM`.
- Renewal/trial authority subset: **17/17 passed**.
- Web Plans, Free change and checkout subset after the new trial UI: **17/17 passed**.
- API and Web typechecks passed after route/repository/management/UI wiring. The final acceptance
  script was added after that API typecheck, so rerun API typecheck before executing it.
- Development migration dry run passed and both exact migrations applied successfully.
- Direct provider trial probes passed as listed above.
- Latest provider renewal read-back still showed invoice `8737652` pending.

No browser inspection of the new trial-change dialog, no full affected check/build, no integrated
owner route smoke, no renewal paid/recovery smoke, no Production verification and no remote CI were
performed after these changes.

### Exact interrupted point and required next sequence

1. Fix or supply the auth API key used by
   `test-mode-trial-change-acceptance.ts`: current `apps/api/.env` has `SUPABASE_SECRET_KEY` but no
   `SUPABASE_PUBLISHABLE_KEY`, while the new script currently reads the missing publishable name.
   Do not print either key. Then rerun API typecheck.
2. Run the acceptance script with `.env`, `.env.billing-worker`, and
   `.env.billing-acceptance-ux`. It must first prove that this credential owns subscription
   `2609277`; the script intentionally aborts otherwise. Do not substitute another user silently.
3. Inspect the resulting provider subscription, zero-total invoice delta,
   `billing_trial_change`, `billing_verified_period`, billing snapshot and PlanAccess. Confirm the
   second identical request is `unchanged` and does not PATCH again.
4. Start the local API/Web with lifecycle gates enabled and inspect `/plans` on desktop and 390px:
   current choice omitted, Prime → Pro end-date wording, Pro → Prime immediate-rights wording,
   pending/error recovery, scheduled target, and no layout shift.
5. Re-read renewal invoice `8737652`. If still `pending`, record the diagnostic as a provider
   non-settlement and test application reconciliation with a separate signed fixture; do not turn a
   simulated webhook into payment evidence. If it becomes `paid`, run the worker and prove exactly
   one `renewal:8737652` period plus replay/RLS/PlanAccess boundaries.
6. Implement paid-period upgrade and deferred-downgrade ledgers separately. Immediate upgrades
   require a paid `updated` invoice. Deferred downgrades require scheduler, safety cutoff,
   cancellation fallback, old-rights retention and target-price renewal proof. Keep their UI hidden
   until each focused Test Mode gate passes.
7. Run the affected checks and present the UI/evidence to the Product Owner. Full browser/live/CI
   and any remote action still require the normal gate; no push is authorized.

### Files owned by this interrupted slice

API: `period-authority.ts`, `period-authority.test.ts`, `trial-change.ts`,
`trial-change.test.ts`, `postgres-trial-change.ts`, `test-mode-trial-change-acceptance.ts`,
`postgres-inbox.ts`, `management.ts`, `postgres-management.ts`, `local-lifecycle.ts`, `server.ts`,
and `start.ts`.

Web: `PlansPage.tsx`, `PlansPage.test.tsx`, `PlansPage.free-change.test.tsx`, billing `types.ts`,
`http-gateway.ts`, review gateway, and the checkout test gateway fixture.

Database/scripts: `20261015093501_billing_trial_change.sql`,
`20261016163000_billing_renewal_periods.sql`, `development-migration-dry-run.mjs`, and the one-off
`development-migration-apply.mjs`.

The shared worktree remains heavily modified with unrelated M8-D, mobile/PWA, operations and other
billing work. Preserve all unrelated changes and do not use a blanket reset or cleanup.

## Payment-rule verification — 2026-10-16

> Superseded by the STOP HANDOFF above. This older snapshot is retained as chronological evidence;
> its statements that trial changes were untested/unavailable and migrations were unapplied are no
> longer current.

| Rule or customer action                                                     | Current verdict                                                              | Evidence / remaining condition                                                                                                                                                                                       |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Free → Pro or Prime monthly                                                 | Test Mode initial checkout proved; local Development only                    | Provider-confirmed Pro trial, returning Pro payment and Prime trial, invoices and PlanAccess were read back. Production remains off.                                                                                 |
| Free → Pro or Prime yearly                                                  | Variant/quote/checkout preparation proved; completed purchase not yet tested | Published Test Mode yearly variants have the expected amount, interval and trial; no annual payment/rights acceptance claim.                                                                                         |
| One-month first subscription and Prime 60-day variant configuration         | Configured and read back; 60-day completed purchase still open               | Six published Test Mode variants have the expected price, cycle and trial settings. A 60-day quote alone is not a purchase.                                                                                          |
| Paid/trial → Free at original end                                           | Cancellation and original `ends_at` proved in Test Mode                      | Two isolated subscriptions are cancelled with their original 2026-11-15 boundaries; Development verified-period ends match. The actual expiry/Free transition has not happened yet.                                  |
| Trial → another paid tier/cadence on the same subscription, no early charge | Not tested or available                                                      | Lemon allows variant PATCH but warns cross-cycle/trial changes can charge or move billing dates; draft route and rights reconciliation are incomplete.                                                               |
| Paid upgrade with immediate settlement                                      | Not tested or available                                                      | Lemon documents immediate variant change and optional immediate prorated invoice. Exact charge, credit, success/failure and next period require provider read-back.                                                  |
| Paid downgrade at original period end                                       | No native scheduled variant change established; product flow not available   | An app-owned durable schedule and pre-renewal provider action are only a hypothesis. Annual → monthly needs separate proof of no early charge/date move.                                                             |
| Renewal and failed/recovered payment access                                 | Provider created a renewal invoice; not verified end to end                  | Invoice `8737652` was pending at 07:19 UTC while the subscription remained active and its next due date moved forward. App must await paid invoice proof; the verified-period schema accepts only the initial cycle. |

The five-choice matrix remains the Product Owner's desired policy, not an executable provider
contract. Current Lemon documentation confirms immediate variant changes and default proration.
`invoice_immediately=true` attempts an immediate difference invoice; it does not promise a fresh
full cycle. A month/year change can charge immediately or move `renews_at`, including when
`disable_prorations=true` is requested. Cancellation keeps access through `ends_at` and an expired
subscription cannot be resumed. The implementation Contract and pure paid-choice classifier now
avoid encoding a guaranteed new period or credit. The internal settlement calculation remains a
reference only and cannot authorize a customer quote or paid access.

The current executable subset is first checkout, provider-confirmed initial trial/payment,
invoice read-back, and owner-scoped cancellation to Free at the original verified end. Trial
switches, paid upgrades, and paid downgrades remain unavailable because the draft trial route has
no durable pre-PATCH invoice baseline, worker variant reconciliation, or verified-rights update;
paid switches lack provider settlement and scheduling evidence. No draft migration or provider
variant PATCH was applied in this review. The isolated daily Test Mode subscription `2609055`
was read at 2026-10-16 06:57 UTC: it was still active with only initial paid invoice `8728674`,
and `renews_at` remained 2026-10-16 07:17:17 UTC. Just after the due time, Lemon still showed
the original state. At 07:18 UTC it created renewal invoice `8737652` for NT$115 with status
`pending`, left subscription status `active`, and advanced `renews_at` to 2026-10-17 07:17:17 UTC.
The 07:19 UTC read still showed the invoice as pending. `active` and an advanced due date alone
are insufficient for the next paid access period; settlement and an owner-bound verified renewal
period remain required.
The six configured catalog variants were read back at 07:02 UTC: all six were published Test Mode
variants. Pro month/year remain NT$115/1,150 and Prime month/year NT$145/1,450; the two Prime
promotional variants have a 60-day trial and their matching monthly/yearly recurring interval.
Read-only recheck of the cancelled Test Mode subscriptions `2608871` and `2608914` confirmed their
provider `ends_at` still equals the original 2026-11-15 trial/paid boundary. A scoped Development
worker read showed matching initial verified-period ends for both; the active isolated Prime trial
`2609277` also matched its provider trial end. The normal API role returned zero rows without an
owner Workspace, as required by its RLS policy; the worker read supplied the scoped audit evidence.
The applied `billing_verified_period` table accepts only `period_key='initial'`, so a real renewal
cannot yet create a second verified period. The draft trial-change table also has no separate
effective-rights boundary for Prime-to-Pro at trial end. These are schema/runtime gaps, not
missing configuration; keep renewal and trial switching fail-closed until their own migration and
reconciliation checks pass.

Next verify whether the real renewal invoice settles. Complete isolated
same-cadence, cross-interval and trial-change Test Mode probes without mutating the retained PO
review subscription. Only provider-confirmed mechanics may be turned into a durable transition
contract; keep unproved actions unavailable. Production billing and remote delivery remain off.

## Five choices, Lemon fit and focused provider verification — 2026-10-16

**Decision history and scope.** The PO rejected a cancellation action on Free and clarified five
customer choices: Free, Pro monthly/yearly, Prime monthly/yearly. The current exact choice is never
offered as a target. Free has no paid subscription or renewal to cancel; all four paid choices can
cancel renewal or select Free under “change at end”, which are the same provider cancellation and
retain the original verified paid/trial access until its end. The PO then clarified that paid
year-to-month is a deferred downgrade, not a forbidden change. Before the first charge, trial
cadence is freely changeable; Pro-to-Prime rights rise immediately, Prime-to-Pro rights wait for the
original trial end, and no trial change resets that end or charges immediately. After discussing
Lemon's native behavior, the PO preferred native provider settlement for paid upgrades rather than
inventing a separate refund/recheckout sequence, while retaining the desired end-of-period behavior
for paid downgrades. The PO explicitly prefers a durable pending choice followed by an automatic
change to the **same** card subscription near expiry. If that cannot be made reliable, do not show
paid-downgrade actions; show cancel renewal / end in Free instead. Credit-card subscriptions are
the current payment scope; do not make PayPal a blocker for this plan.

**Desired action matrix.** “Immediate” applies only to a paid upgrade after successful settlement,
or to an allowed trial tier increase after provider confirmation. “At end” means keep current
verified access through its original end. Exact current choice is omitted in every row.

| Current choice | Immediate paid-period choice                     | At original paid-period end       | Cancel renewal |
| -------------- | ------------------------------------------------ | --------------------------------- | -------------- |
| Free           | New checkout: Pro month/year or Prime month/year | None                              | None           |
| Pro month      | Pro year; Prime month/year                       | Free                              | Free at end    |
| Pro year       | Prime year                                       | Pro month; Prime month; Free      | Free at end    |
| Prime month    | Prime year                                       | Pro month/year; Free              | Free at end    |
| Prime year     | None                                             | Prime month; Pro month/year; Free | Free at end    |

For an unpaid first trial, keep the same provider subscription and exact `trial_ends_at`:
Pro month/year may select the other cadence or either Prime cadence, with Prime rights effective
after verified provider change. Prime month/year may select its other cadence immediately; either
Pro cadence is a scheduled _rights_ downgrade at the original trial end. Any trial may cancel to
Free at that original end. The first charge must use the last confirmed paid variant and cadence;
there is no second trial or immediate trial-switch invoice.

**What official Lemon rules establish.** A subscription variant PATCH changes the provider plan
immediately. It prorates by default; `invoice_immediately=true` attempts a prorated payment now;
`disable_prorations=true` instead moves to the new price on the next renewal but does **not** defer
the provider variant change. Same-cadence examples retain the current renewal and credit unused
old-plan time. A cross-interval change (month/year) may move the billing date or charge immediately.
`billing_anchor=0` resets it to today but removes an active trial. Immediate downgrade issues a
credit for the next invoice, not an automatic card refund. The docs do not specify that unused
credit is cashed out on cancellation/Free; a partial/full invoice refund is a separate operation.
Cancellation preserves access until `ends_at`; an expired subscription cannot be resumed. No
provider `effective_at` variant schedule or automatic new-subscription charge using an expired
subscription was found in the documented API. Do not present either as an available capability.
Sources: [update subscription](https://docs.lemonsqueezy.com/api/subscriptions/update-subscription),
[manage subscriptions](https://docs.lemonsqueezy.com/guides/developer-guide/managing-subscriptions),
[change plan](https://docs.lemonsqueezy.com/guides/tutorials/change-subscriber-plan),
[subscription object](https://docs.lemonsqueezy.com/api/subscriptions/the-subscription-object),
[invoice refund](https://docs.lemonsqueezy.com/api/subscription-invoices/issue-refund).

**Working hypotheses, not provider results.** For a paid same-cadence upgrade, use the original
subscription with `invoice_immediately=true`; expect one prorated difference invoice and the
original renewal date, but do not grant a new paid period from PATCH alone. For paid month-to-year,
expect Lemon to account for unused monthly value and possibly charge/change `renews_at` immediately;
the exact total and period start come from its invoice/subscription read-back, not our calculator.
For a trial change, an explicit preserved trial end on the original subscription should leave no
positive invoice. For a paid downgrade, record the target in our database, then try a pre-renewal
PATCH of that same subscription with `disable_prorations=true`. Keep original higher-tier product
rights through the original verified end even if Lemon's variant changes earlier; expect the next
renewal to use the lower price. Cross-interval annual-to-monthly is a separate risk: the API may
charge or move `renews_at` immediately despite this flag. Sending PATCH at the exact renewal
instant is not a safe scheduling design. Never cancel and assume an expired subscription will
automatically restart or its card can be charged as a new subscription without checkout.

**Small discriminating Test Mode set (avoid all 16 pair permutations):**

1. Paid Pro month → Prime month with immediate invoice: read subscription ID/variant and
   `renews_at`, invoice reason/status/amount, webhook and verified access. Test a payment-failure
   response in the focused API fixture before enabling immediate rights. This checks the shared
   same-cadence upgrade mechanism.
2. Paid Pro month → Pro year: read the same facts immediately and after reconciliation. Resolve
   whether/when the annual invoice is collected, whether unused monthly value appears as credit,
   and the actual new `renews_at`/period start. Use those facts to amend the older “full new period”
   Contract wording before presenting customer amounts.
3. Trial Pro month → Prime year and trial Prime year → Pro month on disposable Test Mode
   subscriptions: require unchanged subscription ID and original `trial_ends_at`, no positive
   immediate invoice, correct current rights and correct first-charge variant at trial end. Use
   targeted pure tests for the other equivalent tier/cadence combinations.
4. Pre-renewal paid downgrade, same cadence first and annual → monthly separately: use a short
   diagnostic period where possible to observe the true renewal boundary. Read variant, invoice,
   `renews_at`, payment status, and rights before PATCH, after PATCH, and after renewal. Pass only
   if no unintended early charge/refund, original higher-tier rights last to original end, and the
   next verified payment is for the target price/interval. If annual-to-monthly cannot be simulated
   faithfully by a short interval, leave that transition unavailable until direct interval evidence
   exists; do not extrapolate the shorter-cycle result.
5. Cancellation / Free uses the existing cancellation path: verify original `ends_at`, no new
   renewal invoice, and Free access at expiry. No automatic new paid subscription is assumed.

These are provider probes, not a request to retest every UI permutation. Record exact Test Mode
request attributes (without secrets), before/after IDs and timestamps, invoice/renewal amounts,
webhook observations, and any failed hypothesis. Do not mutate the existing PO review subscription
or apply the incomplete trial-switch draft SQL for these probes. Isolated diagnostic subscriptions
can establish provider mechanics before the product transition route is finished; that exploratory
evidence must not be called end-to-end product acceptance. The durable owner-only transition and
reconciliation implementation, PO UI inspection and full browser/live/CI gate remain separate.
Production remains hard-off; no remote push is authorized. **Next handoff:** run the smallest safe
diagnostic Test Mode probes above, then reconcile `M8-E-IMPLEMENTATION-CONTRACT.md`'s old
full-period upgrade/settlement language with the observed provider policy and implement it. Enable a paid
transition control only after its own provider/ledger/rights gate passes; if paid downgrade fails,
keep only cancellation to Free.

## Free as an end-of-period destination and release audit — 2026-10-16

The Product Owner added Free to every paid plan's “change at end” choices. This is the existing
owner-scoped cancellation operation with a second, clearer entry point: keep the currently verified
paid/trial access to its original end, stop renewal/first charge, then use Free without creating a
Free subscription. The Free card now offers “期滿改用 Free” for a cancellable subscription, with an
end-date confirmation; it shows no action once cancellation is confirmed, and a Coach on Free has
no cancellation action. The Settings current-subscription cancellation remains available.

Focused local checks after the UI/contract correction: API billing suite 105/105, Web plans and
billing suite 38/38 (including confirmation-to-cancel wiring), and Web typecheck passed. These are code/test checks, **not** provider or
Production acceptance. The new Free path has not been inspected in a browser or exercised against
Lemon Test Mode. Existing draft trial-change SQL remains unapplied and the endpoint remains unwired.
The isolated review route now uses the same Free confirmation component with synthetic paid-plan
facts. Its gateway never calls Lemon. A Vite server started on port 5174, but the Codex in-app
browser could not connect to that loopback URL; the server was stopped. Browser/visual inspection
is still unverified. The Chrome bridge also failed to load its request-header policy, so merchant
Live configuration was not read back in this turn.

Release audit against the current implementation: both Web billing availability and API lifecycle
are hard-closed in Production (`apps/web/src/config.ts`, `apps/api/src/billing/release-gate.ts`);
only Test Mode variants and a Development-only ledger/runtime exist. The worker accepts the original
checkout variant, so a changed variant currently fails reconciliation; neither a safe trial switch
nor durable end-of-period paid switch is connected. Initial trial/paid activation and cancellation
have prior Test Mode evidence, but the first actual renewal and failed/recovered renewal mapping,
paid upgrade settlement/new period, downgraded first charge, refund access decision, controlled
Live checkout/cancellation, Production migrations, backup/restore and exact-SHA release gates are
still unverified. Lemon's documented PATCH is prorated and immediately switches plans; it does
not itself prove the PO's full-new-period settlement or deferred downgrade policy. PayPal plan
changes may require the customer portal. Do not enable Live payment on this evidence.

Next: finish the owner-scoped trial-change ledger with persisted pre-PATCH invoice baseline and
worker/verified-period reconciliation; build deferred and paid upgrade execution around provider
evidence; verify the scheduled first renewal and failure/recovery in Test Mode; obtain PO inspection
of the current UI before the full live/browser/CI gate; then complete merchant, Production and
exact-SHA release checks before opening Live checkout.

## Trial plan choices and Free — continuation, 2026-10-16

The Product Owner clarified that **Free has no paid subscription and no cancellation action**.
The cancellation action belongs to the current paid subscription in Settings. After confirmed
cancellation, the current paid/trial access stays through the original verified period end;
renewal stops, then Free takes effect. During a trial, paid plan/cadence changes must modify the
**same** Lemon subscription, retain the exact original trial deadline, create no second
checkout/trial and make no immediate charge. Cadence may change freely before first payment;
Pro-to-Prime access starts immediately after provider confirmation, while Prime-to-Pro takes
effect at the original trial end. Paid annual-to-monthly changes take effect at the paid annual
period end. Source contract:
`docs/M8-E-IMPLEMENTATION-CONTRACT.md` trial-time correction.

Observed defect: the isolated ordinary Prime monthly trial account's `/plans` showed Pro purchase
choices, no Free action and no Prime annual choice. Its Lemon subscription is `2609277`, initial
NT$0 invoice `8729223`, variant `2250110`, original trial end
`2026-11-15T09:09:08Z`; the same Development account is kept for later read-back. The account
credential remains only in ignored `apps/api/.env.billing-acceptance-ux`. Do not use the owner's
permanent-Prime account to test changes.

Current local changes are **partial**:

- `apps/web/src/pages/settings/PlansPage.tsx` reads the owner billing snapshot. The Free card
  has no cancellation button, including while a paid trial is active or cancellation is pending
  expiry. Active paid/trial subscribers have no alternate paid choice action until the provider
  transition and rights projection are implemented; the old blanket "annual-to-monthly unavailable"
  copy is removed. The loading/error interval withholds paid CTAs until owned billing, plan and grant
  reads succeed; a failed read offers retry.
- `apps/web/src/pages/settings/billing/BillingPanel.tsx` owns cancellation under the current
  paid subscription in Settings. Its confirmation states the original paid access end and Free
  transition; after confirmation, the paid plan remains current through that end. The obsolete
  `/plans` to `?action=cancel` shortcut has been removed. The earlier Chrome path opened this
  dialog with the original 2026/11/15 end and dismissed it without cancelling. No actual
  cancellation was submitted.
- `apps/api/src/billing/subscription-policy.ts` now classifies all 16 paid and 16 trial
  transitions separately. Paid annual-to-monthly and Prime-to-Pro are deferred; during trial,
  cadence is flexible, Pro-to-Prime rights upgrade immediately and Prime-to-Pro is deferred to
  the original trial end. `management.ts` also projects a cancelled on-trial subscription as
  cancelled while retaining the verified paid/trial period. The API has draft Lemon methods in
  `lemon-resources.ts` and an **unwired** `trial-change.ts`. Draft Development-only migration
  `supabase/development-only/20261015093501_billing_trial_change.sql` has **not** been applied.
  The draft route has no Postgres repository/runtime wiring or safe persisted pre-update invoice
  baseline; do not call it, apply the draft SQL, or mutate Lemon until it is complete/reviewed.
  Worker `postgres-inbox.ts` still rejects any provider variant different from the original quote,
  and PlanAccess/verified-period projection is not updated by a trial switch.

Focused evidence: the earlier PlansPage 3/3 and trial policy 45/45 passed. On 2026-10-16 a
regression test reproduced the loading CTA and another reproduced the misleading Free-card
cancellation. After correction the PlansPage/BillingPanel focused suite passed 13/13 and Web
typecheck passed. A separate API regression reproduced the cancelled-trial projection bug before
the fix; billing lifecycle and transition policy tests pass 68/68 afterward. The cancellation
dismissal test confirms no provider cancellation call, and the confirmed cancellation test retains
the Prime title until the original end. The current UI
has not had browser inspection. No full package CI,
Development migration dry-run/application, provider PATCH, new invoice, entitlement switch,
Production deployment or remote push was performed for this correction.
The existing `test-mode` heartbeat for diagnostic daily subscription `2609055` was paused at
the PO's request. It will not automatically read the first renewal due 2026-10-16 15:17
Asia/Taipei. Read that subscription and its invoices manually when due, or deliberately resume
the heartbeat if monitoring is wanted.

Next: (1) present the corrected Free, Plans loading/error and paid-subscription management for Product
Owner inspection; (2) complete the owner-scoped durable
trial-change claim/confirmation, persisted invoice baseline, provider read-back, worker variant
reconciliation, verified-period/PlanAccess projection, and HTTP/Web states; (3) review and
Development-only dry-run/apply the SQL, then run focused RLS/concurrency/negative tests;
(4) in Test Mode verify the **same** subscription ID, original trial end, no immediate positive
invoice and correct rights before enabling paid-switch controls; (5) exercise paid-subscription cancellation
on an isolated Test Mode subscription and confirm access until original end then Free. Keep
Production payment/runtime closed and obtain separate approval before any remote push.

## Successful Test Mode return correction — 2026-10-15

The second isolated Development Coach completed a Lemon Test Mode Prime monthly checkout.
Owner-JWT API read-back shows no unresolved checkout, a verified Prime trial through
2026-11-15, Prime PlanAccess, and paid NT$0 invoice `8729223`. The owned receipt endpoint
returned a Lemon URL. Lemon API independently reports paid invoice `8729223`, subscription
`2609277` on trial and ordinary Prime-month variant `2250110`. The earlier `DEMO60` quote
was not the variant ultimately purchased; this account has an ordinary one-month trial.

The provider return landed on `/settings/checkout/status`, but `current` intentionally omits
confirmed intents. The Web route had treated that null result as a reason to redirect to
`/settings/checkout`, which displayed another plan/payment form. The route now reads the owned
billing snapshot too: a verified subscription produces a completion page, and a direct attempt
to revisit checkout goes to Settings. If neither an unresolved intent nor verified subscription
is available at the status URL, the page holds a no-payment confirmation state with a retry
control. Focused route tests 2/2 and Web typecheck pass; the original Chrome showed the new
completion page and blocked a direct new checkout. No second payment was submitted. The
Production switch and remote delivery remain closed.

Next: inspect the revised result page, then continue the separate 60-day campaign,
failed/pending and renewal acceptance cases with disposable accounts. Do not reuse this
now-subscribed Coach for a new checkout. Retire the temporary webhook/tunnel after the
remaining live acceptance.

## Browser feedback and resumed acceptance — 2026-10-15

The PO found the original Test Mode overlay in Bulgarian, could not apply a code in our own
checkout page, saw an unchanged result after pressing 「查詢付款結果」, and wanted the local test in
their normal Chrome. Lemon's automatic checkout language follows browser/store preference; the
provider supports `zh-CN` but not `zh-TW`. New Test Mode checkout payloads now pin `zh-CN` and
set the supported checkout colors to the product palette. Lemon controls the overlay layout and
Test Mode banner, so those parts remain provider-owned. The new payload passed focused tests and
an actual unsubmitted Lemon Test Mode checkout creation; the rendered new overlay still needs the
PO's browser inspection. [Lemon language settings](https://docs.lemonsqueezy.com/help/online-store/customization)
and [checkout options](https://docs.lemonsqueezy.com/api/checkouts/create-checkout) define this limit.

Our code input is separate from Lemon discount codes. The original isolated Coach now has one
unresolved Pro checkout, so another quote/checkout is blocked to prevent duplicate subscriptions.
The temporary local Prime code is `DEMO60`, aligned with the synthetic review and now mapped to
the published Test Mode 60-day variants. A fresh isolated Development Coach returned a Prime monthly
`60_days` quote (HTTP 200); its normal Chrome UI showed 「Prime 60 天體驗」 and 60 days after
applying the code. This Coach later completed an ordinary Prime monthly checkout; see the result
above. Its credentials are only
in ignored `.env.billing-acceptance-ux`. The first Coach's pending intent remains for recovery.

The status page now says that closing the provider window pauses the checkout; it does not cancel
the server/provider intent. An explicit result query displays whether the same checkout is still
open, still unconfirmed, confirmed or unavailable. The local checkout page shows Lemon's official
dummy Visa and warns against a real card. [Lemon Test Mode](https://docs.lemonsqueezy.com/help/getting-started/test-mode)
requires a dummy card, future expiration and arbitrary three-digit CVC. A disposable real-provider
smoke verified the updated promotional checkout with eight concurrent begin requests resolving to
one intent, owner/RLS isolation and fixture cleanup. API provider tests passed 6/6, Web status/
checkout tests 8/8, API/Web typechecks passed. The no-payment state was superseded by the completed
Test Mode trial above.

The original Quick Tunnel URL had expired. A fresh webhook-path-only proxy and background Quick
Tunnel now point the existing Test Mode webhook `142825` to the local API. Lemon read-back confirms
the Test Mode store and updated URL; tunnel root returns 404 and bad signature returns 401. The
current URL and signing secret remain in ignored `.env.billing-runtime`. Production remains closed;
there has been no remote push. The subsequent payment and read-back are recorded above. Close the
temporary webhook/tunnel after the remaining acceptance.

## Runnable Development Test Mode handoff — 2026-10-15

The local API is now explicitly opt-in and pinned to Development Supabase
`yvhijxhtelujfsaplzpi`; Production remains disabled. It exposes `GET /v1/billing` as an
owner-only snapshot using a current verified period, plus per-invoice receipt retrieval that
rechecks the owned ledger against Lemon's Test Mode API before returning a validated Lemon URL.
The normal Settings route uses these operations under `VITE_LOCAL_BILLING=true`, preserves
independent promotional/permanent grants, and refreshes PlanAccess on checkout confirmation.
The 60-day Prime test code is digest-checked server-side, uses the 60-day provider variants and
is limited to first-subscription eligibility; it is not the final campaign issuance system.

API `127.0.0.1:3008` and Web `127.0.0.1:4178` are running for local acceptance. A temporary
Cloudflare Quick Tunnel reaches only a webhook-path proxy on `127.0.0.1:3009`; every other path
returns 404 and a bad signature returns 401. Lemon Test Mode webhook `142825` targets that
tunnel. Its ID/URL and signing secret are recorded only in ignored `.env.billing-runtime` for
cleanup. The original isolated Development Coach's credentials are in ignored
`apps/api/.env.billing-acceptance`; do not commit or quote the credentials. The local test code
is `DEMO60`.

Real Development login, empty owned billing snapshot, ordinary Pro trial quote and Prime annual
60-day quote passed. Two disposable-account tests each made one real provider Test Mode checkout
(ordinary and Prime 60-day), proved eight-way single-intent recovery and cross-owner HTTP/RLS
denial, then cleaned their Auth/Workspace fixtures. No final checkout payment was submitted by
these tests. The user-facing isolated account intentionally has no intent yet, so the Product
Owner can exercise selection and consent from the beginning.

The isolated account payment and result-page correction are recorded above. Further 60-day
campaign testing requires a fresh disposable account because this account now has a subscription.
Close and delete the temporary webhook/tunnel after browser acceptance, or rebuild them when
resuming later. Renewal/failure/recovery, production campaign issuance and Production release
remain separate open gates.

## Daily renewal Test Mode preparation — 2026-10-15

The current Development recheck passed real User-JWT checkout persistence,
eight-way single-intent concurrency, cross-owner HTTP/RLS isolation, restart
recovery and fixture cleanup. The worker SQL smoke initially failed because it
derived a claim timestamp from the local host clock, which trailed the
Development database clock. It now derives its virtual claim/retry sequence
from database time. The rerun passed worker lease takeover, invoice/refund and
cancellation handling, tenant isolation and fixture cleanup. Provider-fetched
replays of both existing Test Mode subscriptions also passed their trial/paid
initial-period, exact-expiry, HTTP and owner PlanAccess checks. API typecheck
passed. These checks do not open the runtime billing switch.

The old Chrome merchant tab repeatedly timed out during browser focus binding. A fresh
`@Chrome` tab successfully loaded the authenticated Lemon merchant page and confirmed its
Test mode switch. A separate storefront-hidden Test Mode product `1441471` was published
solely for daily renewal evidence. Lemon API read-back confirmed `test_mode: true`, its
default variant `2250530` bills NT$115 every day with no trial, and the product's official
checkout URL opened in Chrome with the Test mode banner and daily price. This
diagnostic variant is not mapped to the formal product catalog.

Browser control subsequently lost its debugger connection while inspecting the checkout
form; a fresh Chrome tab later completed the preparation. Lemon's
[webhook guide](https://docs.lemonsqueezy.com/guides/developer-guide/webhooks)
requires a real renewal before `subscription_payment_*` simulation can use renewal data;
the daily test is intended to shorten that wait to the following day. The existing
Development runtime and Production payment switches remain off.

The Product Owner personally submitted the diagnostic Test Mode checkout after browser
automation's final payment click was rejected by automatic approval review as a recurring
transaction requiring user handoff, despite explicit Test Mode confirmation. Lemon API
read-back now shows active subscription `2609055`, order `9762549` and initial paid
invoice `8728674`, all in Test Mode. The invoice is TWD `11500` minor units / USD `355`
minor units, has `billing_reason: initial`, no refund and an available provider receipt.
The subscription has no trial and schedules its first renewal for 2026-10-16 07:17:17 UTC
(15:17:17 Asia/Taipei). The first immediate invoice appeared through the subscription
relationship after the initial invoice-list request returned empty, so do not treat that
early empty list as absence of a charge. This checkout was a diagnostic merchant-side
purchase, not an intent-bound Development product checkout; it cannot grant product access.
The daily subscription remains active for the next-day provider event check. Annual pricing,
first-trial timing, leap-day boundaries, change classification, recovery and access cutoffs are
verified with immediate local scenarios; the annual subscription does not need a year-long wait.
Read-only Lemon API checks confirmed the published Test Mode annual variants: Pro
`2250108` at NT$1,150/year with a one-month trial, Prime `2250112` at
NT$1,450/year with a one-month trial, and promotional Prime `2250115` at
NT$1,450/year with a 60-day trial.
Lemon's documented Test Mode simulation requires one actual renewal for
`subscription_payment_*` samples. Its billing anchor changes a cycle and prorates, so it is
not an equivalent five-minute renewal test.

The actual checkout defaulted to English. Lemon's
[language documentation](https://docs.lemonsqueezy.com/help/online-store/customization)
lists `zh-CN` but no `zh-TW`; checkout-level and store-level locale controls cannot
promise a Traditional Chinese provider form. Formal pre-checkout amount, renewal and
consent wording remains Traditional Chinese. Before opening payments, inspect the
customer transition to the external language surface and disclose the language change
without presenting translated provider fields as authoritative.

## Actual Lemon Squeezy Test Mode evidence — 2026-10-15

Two isolated Development accounts completed real Test Mode checkouts with Lemon Squeezy's
documented dummy Visa card. The first Pro monthly checkout created a NT$0 one-month trial:
subscription `2608871` (`on_trial`), paid initial invoice `8728261` (total 0), and order
`9762041`. Its webhook was not yet configured at purchase, so the browser return alone left
the intent open and PlanAccess Free. After the temporary signed Test Mode webhook was installed,
Lemon's simulated `subscription_created` reached the Development inbox, was fetched from the
provider, and bound the subscription to the original intent. Repeated simulation left one ledger
binding. The owner cancellation operation was provider-confirmed and later actual cancellation
events updated the ledger; the trial ends on 2026-11-15 05:42:01 UTC without renewal.

A second isolated account used a **synthetically seeded prior-subscription marker** to exercise
returning checkout without a trial. Its Pro monthly checkout displayed immediate NT$115 and
completed successfully. Actual Test Mode subscription `2608914` became `active`, initial invoice
`8728367` and order `9762164` became `paid`, and signed subscription/payment webhooks reached the
Development inbox. The worker fetched current provider resources and persisted one owner-bound
subscription and invoice. PlanAccess remained Free because verified paid-period authority is not
implemented. The synthetic marker is fixture setup, not evidence of automatic first-subscription
consumption. The browser's Continue action reached local login because the fixture did not have an
authenticated browser session; it was not used as payment authority.

The provider's [order](https://docs.lemonsqueezy.com/api/orders/the-order-object) and
[invoice](https://docs.lemonsqueezy.com/api/subscription-invoices/the-subscription-invoice-object)
objects record `currency: TWD` and `total: 11498` (formatted NT$114.98), while the checkout
showed NT$115. A partial refund requested for 100 minor units returned a cumulative refund of 98. More importantly, its invoice changed from `paid` to `partial_refund` with `updated_at`
unchanged. The worker initially dead-lettered that event as `same_version_conflict`. The
allowlisted resource comparison now permits only a provider-fetched, owner/total-checked,
strictly increasing cumulative refund at an equal timestamp; a focused regression test and
Development replay passed. The ledger correctly shows the partial refund.

The subsequent full Test Mode refund returned `refunded_amount: 11499` against the original
`total: 11498`, although the provider's formatted total/refund are both NT$114.98 and their
USD totals both equal 355 cents. The worker initially quarantined the notification. After
checking the provider's [USD-processing](https://docs.lemonsqueezy.com/help/payments/currencies)
and [invoice field](https://docs.lemonsqueezy.com/api/subscription-invoices/the-subscription-invoice-object)
definitions, a bounded reconciliation exception accepts only a provider-declared full refund
with matching USD totals and at most one TWD cent of excess. The original TWD total stays
unchanged; the effective refunded amount is capped at it, and the raw `11499` plus USD evidence
remain in the private ledger for audit. All three invoice-related notifications now show `done`,
the owner projection shows a zero net invoice, and PlanAccess remains Free. The refunded Test
Mode subscription was separately cancelled; its cancellation webhook updated the ledger.
Both test subscriptions have future renewals cancelled. The cause is consistent with provider
conversion/rounding but is not independently confirmed by Lemon Squeezy, and no card-issuer
statement was available. Do not classify this one-cent API discrepancy as a customer fee.

The temporary Cloudflare Quick Tunnel, signed Development-only receiver and Lemon Test Mode
webhook `142807` were used with Product Owner authorization. The webhook was deleted (204,
subsequent GET 404), both processes were stopped, and port 8787 has no listener. Production
billing and Live products remained off. Focused billing tests pass 77/77 (including lifecycle
19/19) and API typecheck
passes. These transactions prove checkout, initial provider objects and reachable event intake;
the later authority slice below adds Development initial-period verification. Promotional
redemption, renewal-failure/recovery, receipt projection, upgrades/downgrades and the
complete Test Mode acceptance gate remain open.

## Initial-period authority — approved bounded Contract, Development verified

The Product Owner approved this slice on 2026-10-15. The initial trial/payment
boundary is frozen in `M8-E-IMPLEMENTATION-CONTRACT.md`; actual renewal mapping
remains fail closed until a provider renewal is observed. The Development-only
migration `20261015063738` is applied and its dry-run is now up to date. The worker
holds the subscription lock, consumes the account-first marker once, records one
owner-scoped initial period and confirms the same intent only after period proof.
The optional Postgres billing access source is wired behind the still-closed
Development runtime switch. Production payment remains off.

Both existing Test Mode subscriptions were fetched again from Lemon and reconciled:
the cancelled trial retained its original trial end; the paid initial invoice and
cancelled subscription retained their first renewal end. The two original intents
now show confirmed (trial/paid), each account has a durable marker, and owner-scoped
PlanAccess reports Pro until the verified end. Provider-fetched synthetic local
notifications were used to trigger this read-back; no new provider webhook or
checkout was created. Replay kept one period and did not increment the marker.
The API role saw its own period but not the other isolated Workspace's period;
the worker can insert periods and update only the marker/intent columns. This
does not prove runtime browser activation because `billingDevelopmentEnabled()`
still returns false. The refunded paid test account retains period access in the
isolated evaluator because refunds alone do not constitute an audited stop-access
decision; handling that decision remains open before general rollout.

The Development worker and existing isolated SQL smoke passed duplicate lease,
owner binding, invoice and cancellation checks; billing/PlanAccess focused tests
passed 97/97 and API typecheck passed. Renewal original-due persistence, payment
failure/recovery, promotional redemption, stop-access decisions, receipt facts,
upgrade/downgrade execution and normal browser activation remain to verify.
The full M8-E release gate and Production activation have not started.

**Provider evidence still needed for renewal mapping:** how `renews_at` changes across
failed/recovered payments, and whether a renewal invoice can be matched unambiguously
to the saved original due time. The [subscription API](https://docs.lemonsqueezy.com/api/subscriptions/the-subscription-object)
says `renews_at` can point to a retry during `past_due`; the
[invoice API](https://docs.lemonsqueezy.com/api/subscription-invoices/the-subscription-invoice-object)
does not provide explicit period bounds. Any missing or conflicting evidence
must remain pending for reconciliation instead of granting access.

## Historical checkout eligibility guard — 2026-10-15

The Development ledger smoke exposed that `PostgresCheckoutRepository.facts()` always
reported no current subscription and relied only on an unset account marker for
first-subscription history. The owner-scoped query now reads the intent-bound,
provider-fetched subscription ledger. A current subscription blocks a new quote;
one that is cancelled but still within its period remains current. An expired
subscription permits a returning checkout while still suppressing another first
trial. A foreign Workspace's ledger does not affect either decision. The live
Development smoke first reproduced the incorrect result, then passed these cases
after the read-only query correction; existing isolated checkout smoke, API
typecheck and 24 focused tests passed. A synthetic paid invoice in the ledger
still left the Coach on Free because no verified period source is wired. All
test fixtures were cleaned up.

At that time, this guard did not set the durable `first_subscribed_at` marker,
confirm an intent or grant paid access; the initial-period slice above now does
so in Development. The [Lemon Squeezy subscription object](https://docs.lemonsqueezy.com/api/subscriptions/the-subscription-object)
says `renews_at` can move to the next retry during `past_due`, while the
[subscription invoice object](https://docs.lemonsqueezy.com/api/subscription-invoices/the-subscription-invoice-object)
does not expose an explicit paid-period start/end pair. Therefore the original
renewal due time and matching paid period still need persisted reconciliation
evidence before the runtime can consume this ledger as PlanAccess authority.

## Development ledger verification — 2026-10-15

Development-only event ledger migration `20261015045150` and role-grant correction
`20261015045333` are applied and read back on project `yvhijxhtelujfsaplzpi`.
The correction was necessary because database default privileges initially gave
`gym_assistant_api` write rights to all four new tables. Read-back now shows the API
role has no access to the event inbox, read-only subscription/invoice ledgers,
and select/insert/update but no delete on cancellation commands. All four tables
have RLS; `anon` and `authenticated` cannot read them. The worker role is
no-login, non-bypass-RLS and has the intended table grants. Security advisors
reported no new billing issue; the pre-existing Auth leaked-password warning
remains. Performance advisors identified index and RLS-plan improvements for
later review.

The focused API billing suite passed 74/74 outside the Windows sandbox. The
isolated Development User-JWT checkout smoke passed, including concurrency,
cross-owner reads, restart recovery and cleanup. The first in-sandbox Vitest run
could not execute because of temp-file `EPERM`; that was an execution restriction,
not a test assertion failure. A missing Development-only source for remote version
`20261014034039_enforce_trusted_test_account_intent` was recovered from the exact remote
migration-history row. The read-only Development dry-run then passed with `upToDate: true`
and zero pending migrations; remote history was neither repaired nor bypassed.

After the PO authorized a Development-only worker, a dedicated login inherited
only `gym_billing_worker` and connected successfully. The isolated live SQL smoke
passed event deduplication, competing worker claims, expired-lease takeover,
stale-worker fencing, owner/foreign RLS reads, invoice partial refund and
cancellation command persistence. Its isolated Auth users and Workspaces were
deleted. The credential is stored only in ignored `apps/api/.env.billing-worker`
and expires on 2026-10-22 UTC. Automatic approval review had rejected an earlier
temporary grant to a privileged account; that grant was not made. No provider
payment, webhook or paid access was enabled. This verifies the Development ledger
boundary, not the complete payment integration gate.

A further isolated integration run exercised Fastify's raw-body webhook route
against the Development inbox with a synthetic signed event. An invalid signature
returned 401; a valid event returned 200 and a duplicate delivery was acknowledged
without a second inbox row. The existing worker/ledger assertions and cleanup passed
in that same run. A synthetic temporary provider-fetch failure left the invoice
uncreated; the worker retried after backoff, fetched the current resource and then
persisted it once. The runtime release gate was read back as off. This was Fastify
injection with a generated signing secret, not a
reachable Lemon Squeezy delivery or a real card payment.

The sections below preserve the earlier frontend and Test Mode preparation evidence;
their historical status statements are superseded by this ledger update.

The PO resumed local implementation after the backend-only release. The local frontend hold is
lifted only for Vite DEV; production builds cannot enable the payment routes. API startup remains
hard-closed. No schema, real payment, remote push or deployment is part of this iteration.

## Review now

- Use the normal `start-gym-assistant.cmd` launcher and open
  `http://127.0.0.1:5173/__review/payments/plans` for the complete synthetic flow.
- The signed-in `/plans` → `/settings/checkout` path still preserves the real account and offers
  **操作完整測試流程** to enter the isolated review. Real-account payment is unavailable.
- Choose Pro/Prime and month/year, then consent and open the same-page simulated authorization.
  `DEMO60` demonstrates first-subscription-only 60-day Prime. Returning/expired cases reject it.
- Use the development toolbar for first/returning subscription, invoices/refunds, delayed
  confirmation, overlay failure, cancellation pending/retry, renewal grace and expired Free.
  In the delayed case, **送達確認結果** supplies the simulated confirmation.
- Reload keeps the same checkout in this tab for 24 hours. Completed checkouts route back to billing;
  cancellation keeps the same expiry. **重設** clears only this review's progress. No account identity,
  credentials, provider URL or real ledger is stored. Synthetic selections/actions use sessionStorage;
  this is not cross-tab locking, durable server persistence or entitlement evidence.
- Dates are generated from the review start and calendar-month boundaries clamp correctly. The
  existing accepted visual components are reused; failure feedback and development controls are separate.

## Remaining before opening payments

These are implementation tasks, not merely missing API keys:

1. Persist verified trial/paid periods and atomically consume first-subscription
   eligibility before completing an intent.
2. Finish the server-owned UI projection, promotional-code redemption, receipt access and persisted
   upgrade/downgrade operations. Current `/records` is deliberately not the final UI projection.
3. Wire that projection to authenticated Settings while preserving existing permanent/promotional
   grants; implement missing-event recovery and operator handling of unresolved/refund cases.
4. Configure Test Mode credentials and webhook against the approved merchant store; verify actual
   amounts, trials, cancellation, refunds, delayed/duplicate events and prorated changes.
5. Only after the existing acceptance/release gates enable the production payment entry.

Focused evidence: Web typecheck and 20 related tests pass in aggregate. Local browser inspection
verified reload-to-original-checkout, confirmation dialog, completion-to-billing and reopening an old
checkout redirecting to billing; 390px grace-state presentation inspected. Merchant/DB/full CI gates
are not claimed. Older implementation notes below remain historical where superseded here.

## Merchant Test Mode preparation — 2026-10-15

The Product Owner supplied the activation/approval emails. The merchant dashboard independently
shows the store as Active. In Test Mode, product `1441189` (`FORM Coach Desk 訂閱（測試）`) is Published
but hidden from the storefront; Live has no product. The store currency is TWD and tax-inclusive
pricing was enabled and read back after a page reload. This is catalog setup, not a completed checkout.

| Test variant                | Variant ID | Price and trial        |
| --------------------------- | ---------: | ---------------------- |
| Pro monthly                 |  `2250101` | NT$115/month; 1 month  |
| Pro yearly                  |  `2250108` | NT$1,150/year; 1 month |
| Prime monthly               |  `2250110` | NT$145/month; 1 month  |
| Prime yearly                |  `2250112` | NT$1,450/year; 1 month |
| Prime monthly, 60-day offer |  `2250114` | NT$145/month; 60 days  |
| Prime yearly, 60-day offer  |  `2250115` | NT$1,450/year; 60 days |

All six use the SaaS business-use category. The local Test Mode adapter now accepts a trusted Prime
60-day quote and requires the two additional promotional variant mappings. It does not issue or
redeem the code: `CheckoutModule.quote` still rejects promotion codes. Keep the provider flags off.
No API key, webhook secret, Test Mode purchase, signed webhook, ledger migration, Live product or
payment entry was created/enabled in this step. The separate Lemon Squeezy email says payouts are
paused until the tax form is signed and verified; the Product Owner owns that identity/tax task.

---

# Local authenticated checkout development

2026-10-14: PO accepted the visual direction and requested local implementation. This implements
the checkout preparation/persistence slice in `M8-E-IMPLEMENTATION-CONTRACT.md`. It is not a
completed subscription or payment release.

## Available

- The ordinary local launcher now exposes Settings billing, `/plans` selection and independent
  `/settings/checkout` by default in DEV, without a feature-flag setup or a separate port.
- With the HTTP flag off, checkout is a preparation surface: catalog selection, coupon entry,
  interactive consent and draft legal links. It makes no billing requests, invents no eligibility
  or charge dates and cannot activate a subscription. Bills explicitly show service unavailable;
  the actual current grant and comparison banner remain in the existing Settings layout.
- `/payment-notice`, `/billing/terms` and `/billing/privacy` expose the payment draft on ordinary
  DEV routes. Published `/terms` and `/privacy` remain unchanged.
- Existing Auth/Beta gates remain in place. A typed HTTP gateway uses the signed-in Coach token;
  no private payment data is saved in browser storage.
- API calculates prices, first-trial eligibility and Taipei calendar dates. Quotes expire in five
  minutes and preserve the terms version. Unknown input fields and client-supplied prices fail.
- PostgreSQL serializes each Workspace; one unresolved intent is enforced by a unique index.
  Consent/quote is saved before contacting the merchant. Same-quote retries reuse the same intent;
  different simultaneous quotes conflict. Unknown external outcomes remain pending, including after
  checkout expiry. They are never automatically retried or treated as failed payments.
- `/checkouts/current` restores the persisted quote/intent on refresh or a new device.
- The merchant adapter always requests Test Mode, maps variants on the server, validates returned
  URLs and rejects live-mode responses. Missing configuration fails before creating an intent.
- Both first-month and 60-day trials are first-subscription-only by explicit PO decision. The policy
  is implemented; new campaign issuance/reservation/redemption still needs its own persistence step.

## Run locally

Use `start-gym-assistant.cmd` as usual and open `http://127.0.0.1:5173/plans`, or enter through
Settings → 方案與帳單 → 查看所有方案. Sign in with a Development account. Keep
`VITE_LOCAL_BILLING=false` (or unset) while merchant testing is deferred. The frontend is already
included; this flag now controls HTTP checkout, not frontend visibility.

On 2026-10-14 the existing 5173 server served the updated source and API 3000 `/ready` returned 200.
The opened in-app browser correctly required login and preserved `/plans` as its return target;
authenticated desktop/mobile visual review remains for the PO. No login or account mutation was
performed in that browser. Four affected test files pass 14 tests; Web typecheck passes.

### Optional HTTP integration environment (not needed for frontend review)

Migration `20261014100438_billing_checkout_intents.sql` was applied only to the **Gym Assistant**
Development Supabase project. The MCP-assigned migration version was read back and synchronized
with this filename. Production was not changed. Never apply all unrelated pending migrations just
to run this feature.

Start the API from `apps/api` in PowerShell (uses existing ignored `.env`):

```powershell
$env:BILLING_LOCAL_CHECKOUT = 'true'
$env:PORT = '3008'
node --env-file=.env --import tsx src/start.ts
```

Start Web from `apps/web` in a second PowerShell:

```powershell
$env:VITE_LOCAL_BILLING = 'true'
$env:API_PROXY_TARGET = 'http://127.0.0.1:3008'
npm run dev -- --port 4178
```

Open `http://127.0.0.1:4178/plans` and sign in with a Development account. Active legacy promotional
or permanent grants are protected and cannot start a second subscription. Missing merchant setup
shows an explicit unavailable result, with no payment request or entitlement change.

Server-only merchant variables are documented in `apps/api/.env.example`. Do not paste keys into
chat or add them to Web variables. Store/variant configuration and actual provider price, currency,
trial and event behavior must be verified before considering the merchant integration complete.

## Focused verification

`apps/api/src/billing/local-checkout-smoke.ts` is pinned to the Development project and creates two
isolated automation accounts, obtains real User JWTs, exercises the API with a fake provider, checks
concurrent requests and recovery in PostgreSQL, then deletes only its own accounts and workspaces.
It supports the current Development test-account reservation rule. It never calls Lemon Squeezy.

```powershell
# From apps/api, using the established ignored Development E2E credentials:
node --env-file=.env --env-file=.env.e2e --import tsx src/billing/local-checkout-smoke.ts
```

## Remaining work

### Test Mode verification — 2026-10-15

The ignored local `apps/api/.env` now holds a Test Mode API key and the six inspected test-variant
IDs; no secret or provider-enable flag is committed. A read-only API request returned HTTP 200 for
store `491074`. The storefront-hidden product `1441189` and all six variants report `test_mode=true`,
the intended TWD prices, monthly/annual intervals, and one-month/60-day trials. Seven uncompleted
Test Mode checkouts were created through the actual local Lemon adapter and read back: each used the
intended variant and `embed=true`; the returning Pro checkout used `skip_trial=true`. These objects
are checkout-creation evidence only, not payment, invoice, webhook, or access evidence.

Local `npm run check` passed (scripts 33/33, API 288/288, Web 390/390); `npm run build` passed.
The isolated Development JWT/Postgres checkout smoke passed concurrent single-intent dispatch,
cross-owner isolation, restart recovery and RLS, then removed its own test users/workspaces. Browser
tests passed at 1440px and 390px after updating stale plan-copy/price expectations; both confirm the
signed-in preparation route remains nonpayable. Development migration `20261014100438` was installed
at this point; the later ledger application is recorded at the top of this file.

**Payment opening remains blocked.** The runtime release gate is still hard-off, promotional code
redemption and verified period/invoice authority are not implemented. The temporary Test Mode
webhook, real first/returning card checkouts, refund and cancellation evidence are recorded at the
top of this file; the temporary endpoint was removed after testing. Renewal, payment failure and
recovery, full authenticated app access and remaining lifecycle tests have not passed. Payout tax
information was observed as Submitted, not verified as payout-ready. Keep Live payment entry
closed until these implementations and real Test Mode acceptance pass.

**Resume sequence for the next validation conversation:**

1. Preserve the shared dirty worktree. Read the active M8-D router, M8-E Roadmap gate and frozen
   implementation contract. The current local-checkout Contract does not freeze the remaining
   paid-activation/lifecycle slice; record that bounded contract before treating its tests as a
   release gate. Do not copy the ignored `.env` into source control.
2. The worker SQL verification for the Development-only ledger migrations has passed with isolated
   users. Next, implement provider-verified trial/paid-period authority, first-subscription
   eligibility, 60-day promotional redemption, invoice/receipt projection, reconciliation and
   lifecycle execution. Current `CheckoutModule.quote()` rejects every code and
   `billingDevelopmentEnabled()` returns false, so no full app payment path exists yet.
3. Reuse the completed first/returning checkout, signed webhook, refund and cancellation evidence;
   create a new temporary signed Test Mode webhook only when an unverified scenario requires it.
   Exercise renewal, retry, out-of-order/missing events, same-intent recovery, concurrent
   attempts, owner isolation and paid-access expiry. Verify the original renewal anchor through a
   successful grace-period payment. Keep signed URLs, credentials and customer details only in
   ignored private test evidence.
4. Keep `BILLING_LOCAL_CHECKOUT`, `BILLING_LOCAL_LIFECYCLE` and
   `BILLING_PROVIDER_TESTS_APPROVED` disabled until the Development dependencies are ready. Keep the
   Production runtime gate and public payment entry closed. Recheck payout tax-form verification
   separately; Submitted alone does not prove payouts are enabled. Remote CI/deploy and controlled
   Live payment need their separate gates and explicit delivery scope.

### Offline lifecycle foundation added 2026-10-14

At the time this offline slice was built, no Lemon Squeezy request had been made. The later
checkout-creation checks above do not validate the lifecycle. `BILLING_PROVIDER_TESTS_APPROVED`
defaults off for checkout as well as lifecycle adapters;
having credentials alone does not enable calls. Keep the current UI and existing Development runtime.

- `event-inbox.ts`: bounded raw-body signature verification, Test Mode/store/event checks, minimal
  durable notification, hash deduplication and acknowledgment after storage. New optional route:
  `POST /hooks/lemonsqueezy`. Other JSON routes retain their normal parser and auth boundaries.
- `resources.ts` / `postgres-inbox.ts`: fetch current provider resources through a replaceable
  adapter, strip PII/URLs, bind subscription to its existing checkout/quote, bind invoices through
  subscription/customer ownership, preserve totals/refund history and ignore stale versions. Equal
  timestamps with conflicting facts are quarantined; JSONB key order is not a conflict.
- SQL-backed leases, crash recovery, bounded backoff and dead-letter states are implemented. A lease
  takeover fences stale commits. Events that arrive before their owner binding retry; raw errors and
  payloads are not retained. Dead letters still require an operator recovery/reconciliation interface.
- `management.ts` / `postgres-management.ts`: owner-only `GET /v1/billing/records` (latest 100 invoice
  records; not the final paginated UI projection) and `POST /v1/billing/cancel`. Cancellation intent is
  durable before dispatch; unknown outcomes use GET recovery. Confirmed cancellation responses are
  retained while the event ledger catches up. External resume permits a new versioned cancellation,
  preserving prior commands. Receipts remain disabled until their owning secure-link flow is built.
- `access-source.ts` and the optional PlanAccess source seam implement verified-period expiry,
  bounded paid-renewal grace and independent legacy grants. The source is intentionally not supplied
  in runtime yet: subscription `active` alone cannot prove a paid period. No new paid access is granted.

The offline ledger draft was later applied to Development as
`20261015045150_billing_event_ledger.sql`, followed by
`20261015045333_billing_ledger_role_grants.sql`. These files now live under
`supabase/development-only`; the current verification result is at the top of this file.
That historical draft state is superseded: an expiring Development-only worker login was
provisioned with PO authorization, and the live SQL smoke verified leases and refund processing.
Do not infer complete provider integration from this local evidence.

`local-lifecycle.ts` wires optional services and a bounded background worker. Future enablement needs
the migration, a server worker connection in the same Development project, configured Test Mode
variants/webhook secret, `BILLING_LOCAL_CHECKOUT=true`, `BILLING_LOCAL_LIFECYCLE=true` and the explicitly
approved provider-test switch. Both lifecycle and checkout reject Production opt-in. Leave the new
flags off until PO resumes merchant testing; do not paste credentials into chat.

Focused offline evidence: billing and affected PlanAccess suites **80/80 passed**, including raw bytes,
duplicates, retries, lease fencing, stale resources, refund totals, owner isolation, cancellation
concurrency/recovery and expiry. API and Web typechecks passed. Existing UI visuals were not changed.

The confirmed lifecycle rules now have pure API policies in `subscription-policy.ts`: all 16
tier/interval transitions, a single-currency settlement reference and a fixed seven-day failed
renewal deadline with early unpaid/expired termination. Annual-to-monthly changes are rejected.
The 27 focused policy tests pass. These helpers are not wired to access grants or provider changes;
their passing tests do not establish real billing or scheduled-downgrade behavior.

Still needed before paid access: apply/verify the prepared persistence layer; derive and persist
verified trial/paid-period evidence; atomically consume first-trial eligibility and complete checkout
intents; wire the accepted billing UI to final owner projections; campaign issuance/redemption;
receipt links; periodic missing-event reconciliation and operator dead-letter/refund handling;
upgrade/deferred-downgrade execution. Existing-subscription changes must verify the provider invoice against
the consented amount and new period; deferred downgrades cannot use an immediate variant PATCH.
The HTTP gateway reserves these operation shapes; unsupported server operations are not enabled.
The synthetic `/__review/payments/checkout` harness remains separate (also available on the normal
DEV server). Local HTTP quote dates are estimates until
verified provider terms replace them; no successful payment is inferred from a browser callback.

Technical references: [Lemon Squeezy checkout API](https://docs.lemonsqueezy.com/api/checkouts/create-checkout),
[Supabase row security](https://supabase.com/docs/guides/database/postgres/row-level-security).
