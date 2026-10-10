# M8-D Beta plan access correction contract

> Product Owner decisions, 2026-10-08 and 2026-10-10. This correction is required before admitting
> real Coaches. It narrows Beta access without changing paid prices or activating checkout. The
> 2026-10-10 amendment removes the plan-tester code and self-service test switching.

## Beta access policy

Every verified Coach starts on Free. Until M8-E paid checkout is live, an ordinary Coach cannot
select Pro or Prime directly. The comparison page may show the approved monthly and annual prices,
but its paid actions state that payment is not yet available.

Two code classes are available through the existing authenticated redemption operation:

| Code class     | Global redemption rule            | Result                                                                                                                     |
| -------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Permanent free | Exactly one successful redemption | The redeemed Workspace receives Prime access without an end date.                                                          |
| Beta trial     | No global redemption cap          | Each verified Email may redeem once for Prime access lasting exactly 60 x 24 hours from the server UTC redemption instant. |

The Product Owner supplies the two approved raw code values at issuance time. Raw values are not
committed, returned by list operations or stored in PostgreSQL; only SHA-256 digests are stored.
The single-use codes are exhausted after their first successful redemption. The shared Beta code
remains revocable and has an operator-selected stop-redemption instant even though it has no seat
limit. Existing per-identity and per-IP rate limits, verified-Email checks, irreversible redemption
ledger and same-Email anti-reuse remain unchanged.

## Owner testing boundary

Owner testing is not a redeemable entitlement or Coach-facing product capability. It uses isolated
fixtures or an individually authorized backend operation against the Product Owner's own Workspace.
It creates no shareable code, public or authenticated plan-mutation API, payment-provider event,
invoice or paid-renewal authority. Each state-changing backend operation requires the Product
Owner's explicit request and must preserve the existing audit and tenant boundaries.

Previously stored zero-price plan selections and historical tester codes do not grant effective Pro
or Prime access to ordinary Beta Coaches. The migration revokes tester codes, removes their active
grants and retains the code/redemption ledger as historical Alpha/test evidence. Zero-price rows are
never converted into a paid subscription.

## Coach-facing behavior

- `/plans` keeps the Free, Pro and Prime comparison, prices and monthly/annual views.
- Ordinary Free Coaches see that Pro and Prime become selectable after payment launches; no dead or
  client-only selection control is rendered.
- The optional code form accepts the permanent and promotional code classes and reports the
  resulting permanent Prime or 60-day Prime state.
- Settings shows the effective plan and truthful source. No pre-payment self-service plan switching
  control or authenticated plan-mutation endpoint is available.
- Promotional expiry returns to Free without a charge. Existing data remains visible and the
  established over-capacity write policy applies.

## Evidence before delivery

- Unit and HTTP cases cover both code classes, uncapped Beta redemption, one-use codes,
  verified-Email reuse, absent pre-payment plan mutation and ignored historical zero-price and
  tester states.
- Migration verification covers existing promotional codes/grants and the private-schema grants.
- Desktop and exact 390x844 review covers ordinary Free, promotional Prime and permanent Prime
  states without horizontal overflow or test-switching controls.
- Full CI, development migration application, Production migration, code issuance and remote
  delivery require the existing Product Owner review and authorization gates.
