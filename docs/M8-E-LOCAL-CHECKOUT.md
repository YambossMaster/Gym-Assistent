# Local authenticated checkout development

## Current release hold — 2026-10-14

Latest PO direction: backend-only delivery. No frontend files or prices are part of this release.
Frontend components described below remain in the primary local working tree, not this Main commit.

Released through PR #21 as `f550daaca73de3b5cc4656aae270fea0a68e7073`.
[Main CI #194](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38558499766) passed
verification/build, browser checks, Development dry-run, no-pending Production preview and Fly
deployment/readiness. Independent API readiness and browser `Accept: text/html` root/login checks
returned 200; billing current/records returned 404. `apps/web` and shared migrations are identical
to the preceding Main commit. Frontend and merchant activation remain deferred.

PO requested commit/Main/CI/deployment with payment entry closed. `localBillingEnabled` and the
API startup release gate are now hard-closed even if old environment flags remain. `/plans` is a
read-only comparison; checkout and synthetic review deep links return to Settings. Components and
unit fixtures remain in source for resuming development after merchant approval. The earlier run
instructions below describe development capability and cannot override this hold.

Applied Development checkout SQL is preserved in `supabase/development-only`; the unapplied event
ledger is under `supabase/drafts/billing`. Neither is in Production's migration sequence. Use
`npm run db:push:dry:development` for the linked Development history check. No schema or history
repair is performed by this release. See the Development history README and the dated ADR.

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

### Offline lifecycle foundation added 2026-10-14

PO deferred actual merchant tests until review approval. No Lemon Squeezy request was made for this
slice. `BILLING_PROVIDER_TESTS_APPROVED` now defaults off for checkout as well as lifecycle adapters;
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

Prepared migration: `20261014103416_billing_event_ledger.sql`, created by the Supabase CLI. It creates
private event/subscription/invoice/cancellation tables with RLS, owner grants and a separate no-login
worker role. **Not applied to Development or Production; SQL execution/RLS/advisors are unverified.**
No worker credential or role membership was provisioned. Do not infer DB behavior from memory-store
tests. After the review gate, check the migration on Development with real User JWTs and the worker
role, including lease takeover and refund concurrency, before enabling the runtime.

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
