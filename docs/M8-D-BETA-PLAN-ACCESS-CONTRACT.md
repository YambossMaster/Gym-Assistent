# M8-D Beta plan access correction contract

> Product Owner decision, 2026-10-08. This correction is required before admitting real Coaches.
> It narrows Beta access without changing paid prices or activating checkout.

## Beta access policy

Every verified Coach starts on Free. Until M8-E paid checkout is live, an ordinary Coach cannot
select Pro or Prime directly. The comparison page may show the approved monthly and annual prices,
but its paid actions state that payment is not yet available.

Three code classes are available through the existing authenticated redemption operation:

| Code class     | Global redemption rule            | Result                                                                                                                     |
| -------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Plan tester    | Exactly one successful redemption | The redeemed Workspace may immediately switch only its own effective plan among Free, Pro and Prime for testing.           |
| Permanent free | Exactly one successful redemption | The redeemed Workspace receives Prime access without an end date.                                                          |
| Beta trial     | No global redemption cap          | Each verified Email may redeem once for Prime access lasting exactly 60 x 24 hours from the server UTC redemption instant. |

The Product Owner supplies the three approved raw code values at issuance time. Raw values are not
committed, returned by list operations or stored in PostgreSQL; only SHA-256 digests are stored.
The single-use codes are exhausted after their first successful redemption. The shared Beta code
remains revocable and has an operator-selected stop-redemption instant even though it has no seat
limit. Existing per-identity and per-IP rate limits, verified-Email checks, irreversible redemption
ledger and same-Email anti-reuse remain unchanged.

## Plan tester boundary

Plan tester eligibility is not a product plan and grants no capability except changing the effective
plan of the same authenticated Workspace. Switching takes effect immediately so Free, Pro and Prime
feature/capacity states can be exercised without waiting for a billing-period boundary. It creates
no provider payment, invoice, coupon redemption or paid-renewal authority. The UI labels this state
as testing rather than a subscription.

The API rejects plan-change requests from every Workspace without active plan tester eligibility.
Previously stored zero-price plan selections do not grant effective Pro or Prime access to ordinary
Beta Coaches. They are retained as historical Alpha/test data until the approved synthetic-data
cleanup and are never converted into a paid subscription.

## Coach-facing behavior

- `/plans` keeps the Free, Pro and Prime comparison, prices and monthly/annual views.
- Ordinary Free Coaches see that Pro and Prime become selectable after payment launches; no dead or
  client-only selection control is rendered.
- The optional code form accepts all three code classes and reports the resulting 60-day Prime,
  permanent Prime or plan tester state.
- Settings shows the effective plan and truthful source. Only the plan tester sees self-service
  switching controls. A tester switching to Free takes effect immediately.
- Promotional expiry returns to Free without a charge. Existing data remains visible and the
  established over-capacity write policy applies.

## Evidence before delivery

- Unit and HTTP cases cover all three code classes, uncapped Beta redemption, one-use codes,
  verified-Email reuse, ordinary-plan rejection, tester-only switching and ignored historical
  zero-price selections.
- Migration verification covers existing promotional codes/grants and the private-schema grants.
- Desktop and exact 390x844 review covers ordinary Free, promotional Prime, permanent Prime and
  plan tester states without horizontal overflow.
- Full CI, development migration application, Production migration, code issuance and remote
  delivery require the existing Product Owner review and authorization gates.
