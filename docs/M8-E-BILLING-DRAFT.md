# M8-E billing decision draft

> Product review draft, 2026-10-06. This is not a frozen Contract and does not activate checkout.
> The approved interval and prices are recorded in [ROADMAP.md](ROADMAP.md).
> The 2026-10-08 [M8-D Beta plan-access correction](M8-D-BETA-PLAN-ACCESS-CONTRACT.md)
> supersedes general production use of the zero-price selection phase. That lifecycle remains
> unavailable to Coaches until paid checkout is delivered; owner testing uses isolated fixtures or
> an individually authorized backend operation rather than a redeemable entitlement.

## Approved for the first paid release

- Offer Pro at NT$199/month or NT$1,990/year and Prime at NT$259/month or NT$2,590/year.
- Keep the no-card 60-day Prime offer. Its expiry never starts a charge or subscription.
- Keep billing and access authority behind the API. A zero-price subscription is activated by an
  authorized server operation; a charged subscription requires verified provider events.

## Payment-provider direction — Lemon Squeezy candidate

Lemon Squeezy is the **preferred candidate** for M8-E, not a selected, configured or approved
payment provider. Its merchant-of-record model, hosted checkout, subscription variants, customer
portal and signed webhooks fit the required monthly/annual Pro and Prime flow. The API remains the
authority for Gym Assistant entitlement: return URLs and portal navigation never unlock a plan;
only signature-verified, deduplicated provider events may do so.

Before freezing M8-E, pass account review/KYC and W-8 requirements, confirm Taiwan payout for this
specific merchant account, test the NT$ price presentation and customer payment methods in Test Mode,
and determine the Taiwan income, receipt/invoice and public-identity obligations. Merchant of record
does not by itself establish those local obligations. Platform cost belongs to each successful
transaction, not a fixed monthly infrastructure charge. The detailed evidence, fees and outstanding
risks are in [M8-E Lemon Squeezy 可行性研究](M8-E-LEMON-SQUEEZY-RESEARCH.md).

## Official zero-price subscription phase before payment integration

The Product Owner proposes making every plan selectable at NT$0 first, so Coaches can exercise
plan selection, switching and cancellation through the real server-owned subscription lifecycle.
This can be official subscription state, including a production deployment; it is not restricted
to synthetic accounts or a development-only adapter. The API records tier, billing interval,
period instants, scheduled next state and entitlement source. Web and API permissions use that
server result. A zero-price activation records amount due and collected as NT$0; it does not claim
that a payment provider collected money or issued an invoice.

Verify Free to Pro/Prime, Pro to Prime, scheduled downgrade, monthly/annual changes,
cancellation, withdrawal of a scheduled change, period rollover, over-capacity Free recovery,
refresh/sign-in continuity and two-Coach isolation. Use synthetic Coaches and controlled time for
repeatable automated and browser acceptance, then let real Coaches use the same official rules
only after the normal release gates. The page must state that the selected interval currently
costs NT$0 and disclose the future listed price without suggesting a card has been charged.

The later paid-price cutover must not silently convert a zero-price subscription into a charge.
Require an explicit confirmation and payment setup for any paid renewal. Freeze the treatment of
existing zero-price periods and of Coaches who do not opt in before announcing the cutover; keep
their data and communicate the access outcome. The approved paid catalog prices remain recorded
separately from the current zero-price offer, so changing the offer does not rewrite historical
subscription amounts. When a provider is selected, integrate its checkout and events, then test
actual amount, proration, tax, payment failure, invoice and reconciliation in its sandbox. A
controlled live charge remains a separate final gate.

## Proposed paid-phase subscription behavior for Contract review

| Action                                              | Proposed effective time          | Proposed payment and access result                                                                                                |
| --------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Free or expired offer to paid                       | After confirmed first payment    | Start a new monthly or annual period; unlock the paid tier only after verified payment.                                           |
| Pro to Prime                                        | After confirmed prorated payment | Credit unused paid Pro time and charge the difference immediately. Preserve the current renewal anchor for the same interval.     |
| Monthly to annual at the same or higher tier        | After confirmed payment          | Credit unused paid monthly time, charge the annual price less credit and start a new annual period.                               |
| Prime to Pro, or annual to monthly at the same tier | At the current paid period end   | Keep present access until then; show the scheduled next plan and amount. No mid-period refund.                                    |
| Cancel renewal                                      | At the current paid period end   | Keep paid access until then; then return to Free without a new charge. Existing data remains.                                     |
| Payment failure                                     | Provider-verified failure        | Show the amount, recovery action and actual access state. Retries and final access transition need provider and policy decisions. |

The exact timestamp is stored as a UTC instant. The UI shows a date in the Coach's Workspace time
zone, with clear wording for when an entitlement changes. Checkout must show the provider's final
preview of today's amount, credit, tax, next payment date and selected plan before confirmation.
The return URL alone never grants access.

The current `方案與帳單` page shows an honest unavailable state. Once payment is implemented, the
selection control should open a focused provider-hosted checkout or a dedicated checkout view. Put
the cancel action in the current-plan card only when an active paid subscription exists. Confirm
its actual end date and Free consequences, including any capacity write lock. Allow withdrawal of
scheduled cancellation or downgrade before its effective instant if the provider supports it.
Display billing history and a payment-method update action from provider-verified data. A failed
payment notice should offer the update action and state the retry deadline and access outcome.

## Decisions required before freezing M8-E

1. Subject to the documented account/Test Mode checks, freeze Lemon Squeezy or select another payment
   provider; record the merchant entity and supported Taiwan tax-invoice/receipt path.
2. Decide how to classify cross-interval changes such as annual Pro to monthly Prime, and whether
   a scheduled downgrade may be replaced or withdrawn.
3. Freeze the renewal anchor, credit rounding, taxes, coupons, refund exceptions and zero-amount
   invoice treatment against the provider's preview and local law.
4. Freeze retry cadence and the final unpaid transition. A three-day, three-retry window is a
   proposal, not a provider default. Confirm whether access stays paid during retry and what
   happens to over-capacity Free workspaces afterward.
5. Verify provider webhook deduplication, out-of-order handling, reconciliation, invoice delivery
   and payment-method update in sandbox. Complete the required backup and restore gate before any
   live charge.

Lemon Squeezy documents subscription plan changes with configurable proration and immediate-invoice
behavior, but the exact paid product mapping, upgrade timing and customer-portal result must be
validated in Test Mode before the Contract adopts these proposed rules. See its
[subscription guide](https://docs.lemonsqueezy.com/help/products/subscriptions),
[plan-change guide](https://docs.lemonsqueezy.com/guides/tutorials/change-subscriber-plan) and
[webhook event reference](https://docs.lemonsqueezy.com/help/webhooks/event-types).
