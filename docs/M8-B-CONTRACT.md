# M8-B Beta plan access and promotional eligibility contract

> Beta release sequence revised 2026-10-03 by the Product Owner. M8-B prepares Free and
> promotional access; M8-D opens real-Coach Beta and M8-E develops paid checkout before the
> first offer expires. Contract frozen 2026-10-03 after the Product Owner confirmed the
> over-limit write rule.
> M8-A is complete. M8-B remains local development and verification; M8-C owns production
> deployment, published terms, the support address, and installed-phone acceptance.

## Coach job and release boundary

The Beta is the real product, with paid checkout added during its first 60 days. Every verified
Coach can sign in and use the Free Workspace immediately. An optional Beta code grants Advanced
access at 100% off for 60 days without collecting a payment method. The code is an offer, not
admission control; a Coach without one starts on Free. Paid Basic/Advanced checkout is implemented
in M8-E, starting at Beta launch. Once available, the Coach may actively subscribe; without a
verified paid subscription, offer expiry returns the Coach to Free. The offer never silently
charges or creates a paid subscription. Existing Coaches keep their Workspace and data.

M8-C must complete production and truthful published legal/support setup before M8-D invites real
Coaches. M8-E must finish merchant, backup/restore and paid-subscription gates before charges.

## Code and eligibility rules

- A private operator command issues a cryptographically random code with a required positive
  redemption limit and stop-redemption instant. Show the raw code once; store only its digest.
  The operator can list metadata and revoke future redemption. Revocation does not shorten an
  existing trial.
- A successful redemption starts exactly 60 × 24 hours from the server UTC instant. The code's
  stop date limits new redemption only. Before expiry, show clear notices at 14 and 3 days that
  the offer ends, with a subscription action only after checkout is live. If there is no verified
  active paid subscription at expiry, the Coach returns to Free. No data is deleted or
  automatically charged; the over-limit write policy below applies. M8-D must freeze an extension
  contingency before admission so no real Coach is write-locked while checkout is unavailable.
- The earlier development test grant and its redeemable code were revoked at the Product Owner's
  direction. Do not migrate that test account's old 90-day eligibility or issue a replacement until
  this Contract is frozen and the 60-day plan policy is implemented. Preserve its redemption ledger;
  the test account starts again on Free and needs a fresh code for later eligibility tests.
- A verified Coach can redeem one code. The server transaction serializes redemptions for the
  Coach, locks the code, checks remaining capacity, and atomically creates the eligibility.
  Retrying the same successful code is idempotent. A different code cannot silently extend or
  replace an existing promotional or permanent grant. Free Coaches who have never redeemed can
  redeem from Settings at any time while a code remains valid.
- A redeemed seat is irreversible. Account deletion never restores capacity. Re-registering the
  same verified Email cannot redeem that same code again. Keep only the keyed Email/code digest
  needed for this rule, separate from the deleted Workspace; M8-C must publish its retention
  policy. Other Coaches may use remaining seats.
- A private operator command may assign at most ten permanent Advanced-access grants to verified Coaches
  who already have a Workspace, whether they currently have a trial or ordinary free access.
  It records actor, target and reason. Revoking a grant restores its prior promotional period
  when one exists; otherwise the Coach returns to ordinary Free access. Neither operation
  deletes data.
- A normal paid Basic or Advanced subscription will renew monthly until cancelled after M8-E
  checkout is live. M8-B does not create a payment method, charge, or paid subscription. M8-E
  freezes the named provider's cancellation, failure, refund, invoice and reconciliation rules.

## Plan access approved for M8-B

| Capability                                                              | Free      | Basic (planned NT$199/month) | Advanced (planned NT$259/month) |
| ----------------------------------------------------------------------- | --------- | ---------------------------- | ------------------------------- |
| Active Students                                                         | Up to 5   | Up to 15                     | Unlimited                       |
| Active Venues                                                           | Up to 1   | Unlimited                    | Unlimited                       |
| Student lesson counts, scheduling, Training Records                     | Available | Available                    | Available                       |
| Venue expense settings and records                                      | Available | Available                    | Available                       |
| Entire `本月收支` route, including historical months and finance ledger | Locked    | Available                    | Available                       |
| Student `個人運動表現` directory and all `成長軌跡` views               | Locked    | Available                    | Available                       |

The Free lock covers the whole `本月收支` page, not individual Venue expense settings or
Lesson Purchase amounts. The Student performance directory and both Student/Training trend
entry points must share one entitlement rule; ordinary Training Record entry and session history
remain available. Locked entry points may show a concise upgrade explanation and a link to
`方案與帳單`. Direct URLs and corresponding API projections must enforce the same restrictions.
Existing public capability links retain their prior scope and never expose a Coach's plan.

Per-area PDF/CSV/JSON exports for Training Records, finance details, performance trends and
Calendar are planned for a later contract. Export is unavailable to Free when implemented, but
M8-B must not display controls or copy implying that an export exists now. Export formats,
selection scope and delivery evidence are deferred to that later contract.

Capacity counts active Students and active Venues in the verified Workspace. Archived records do
not consume capacity. Creating or reactivating a Student/Venue is rejected if it would exceed the
current tier's limit; simultaneous requests cannot exceed the limit. A Coach who returns to Free
with more than five active Students or one active Venue keeps every record visible and preserved.
Operational writes, including new or changed Training Records, Session/Purchase records and Venue
expense records, are locked while either Free limit is exceeded. The Coach may archive active
Students/Venues to get within both limits, manage their plan/account and request account deletion;
the lock then lifts without an operator action. Paid activation also lifts it. No automatic
archiving, deletion or reassignment occurs. The Product Owner confirmed that the write lock also
covers changes and deletion of existing operational records. The exact API policy follows.

### Capacity and over-limit operation policy

The API resolves the effective tier and active counts from the authenticated Workspace for each
operation. A Free Workspace at exactly five active Students or one active Venue may continue
working with existing records, but cannot create/reactivate another active item of that type. If
either count is **above** its limit after an offer expires, ordinary operational writes stop until
both counts return within Free limits or Advanced access becomes active. Basic's fifteen-Student
limit applies at paid activation/change in M8-E; M8-B must represent the tier in the policy model
without inventing payment authority. An archived Student/Venue counts zero even if its history
remains; capacity checks for creation/reactivation serialize per Workspace so parallel requests
cannot both take the last seat.

| Operation group                                                                                                                                                                                                                                                                                   | Free within both limits                                                                                 | Free above either limit                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| All authorized ordinary reads, including archived Students, Training history, Calendar, Venue settings and course records                                                                                                                                                                         | Allow                                                                                                   | Allow                                                                       |
| Finance monthly/current/history/deleted projections and manual finance-ledger entry commands; Student performance directory/trend projections                                                                                                                                                     | `403 plan_required`                                                                                     | `403 plan_required`                                                         |
| Create or reactivate active Student/Venue                                                                                                                                                                                                                                                         | Allow only if the resulting active count stays within that tier's limit; otherwise `403 capacity_limit` | `403 capacity_limit`                                                        |
| Archive an active Student/Venue through its versioned update                                                                                                                                                                                                                                      | Allow                                                                                                   | Allow, with no other field changes in the same request                      |
| Student profile and Lesson Purchase writes; Schedule Series, Session, Calendar Block and availability writes; Exercise library/preference/metric writes; Training Record saves/completion; Venue expense/rule/history writes; capability-link issuance/reissue; Demo import/continuation/rollback | Allow under existing validation and authorization                                                       | `403 capacity_limit`, including edit/delete of existing operational records |
| Settings/profile/security, Beta-code redemption, plan management, notification read/dismiss, account-deletion request/cancel and account deletion                                                                                                                                                 | Allow                                                                                                   | Allow                                                                       |
| Existing capability-link reads, revocation and public result/reschedule actions                                                                                                                                                                                                                   | Allow under existing capability rules                                                                   | Allow under the same rules; do not expose Coach plan state to the Student   |

An over-limit Coach may also read and delete an already archived Student/Venue through the existing
manual deletion rules, but deleting an active record is not the recovery path. Any versioned archive
must still reject stale versions and preserve existing history; the lock check must not turn a
conflict into a successful archive. A Student/Venue update that sets `active: false` while also
changing name, expense settings or other fields is treated as an operational edit and remains
locked. A failed Training save keeps the local draft and offers retry after capacity recovery or
upgrade; no client-side disabled control is the sole enforcement point. On an entitlement or count
change, invalidate plan and affected route caches before showing newly available actions, and
clear previously cached premium projections immediately when access ends.

Free Coaches see the `本月收支` entry on Students and Today with a lock/upgrade explanation; no
finance report content is rendered. Free Coaches see the Student performance-directory entry and
Training `成長軌跡` action with the same upgrade explanation. The wording names the unavailable
capability, identifies Basic or Advanced as unlocking it, and links to `方案與帳單`, which states
when checkout is available. Entry points are keyboard and touch accessible at desktop and
390×844. The server returns an explicit authenticated `403 plan_required` for premium finance and
performance projections and `403 capacity_limit` for blocked Student/Venue creation/reactivation.
The Web handles these responses without losing a recoverable form draft or exposing cached premium
data after an entitlement change. Free Coaches within both capacity limits may use Venue expense
settings and ordinary Student/Training operations under their existing authorization and conflict
rules. An over-limit Coach receives an explicit `403 capacity_limit` on locked operational writes.

## Identity, API and persistence boundary

Supabase Auth verifies identity; the Fastify API resolves Workspace from that identity. Existing
Workspace creation on the first private operation remains available to every authenticated Coach.
`GET /v1/beta/status` returns `free`, `promotional` or `permanent`; ordinary free status requires
no grant row. Promotional and permanent states grant Advanced access. The optional
`POST /v1/beta/redeem` is the only code input route. Existing public
Training Result and reschedule links retain their purpose-specific expiry and projection rules
regardless of the Coach's eligibility. Neither public page reveals plan status.

M8-B effective access derives from the server-owned grant and expiry. M8-E extends this into one
server-authoritative plan projection combining promotional/permanent grants and provider-verified
subscriptions. Coach-facing plan labels, cache invalidation and all write checks must use the
current effective projection. The 100%-off code appears in the Advanced selection flow with a
clear zero-charge confirmation; no payment-provider checkout is required to redeem it.

Private tables store code digest/limit/count/deadline/revocation, one optional promotional or
permanent grant per Workspace, the irreversible redemption ledger, durable rate-limit buckets,
and operator events. Keep them in `app_private`. Browser data and Auth metadata are not grant
authority. The verified Email used for anti-reuse comes from the trusted Auth provider, never a
browser field. Preserve tenant isolation at the API, Module, adapter and database boundaries.

The redemption endpoint consumes at most five attempts per verified identity and 30 per trusted
client IP in each five-minute server-time bucket, including malformed attempts. HTTP 429 includes
`Retry-After` and consumes no seat. Derive the IP from the server connection or configured trusted
proxy, never arbitrary client forwarding headers. Keep subject digests and limits across restarts.
Stable errors distinguish invalid, exhausted, revoked/closed and already-used codes without
logging raw codes. An existing promotional/permanent grant is returned idempotently only for its
own code; otherwise show a clear already-has-eligibility result.

The earlier M8-B prototype stored a standalone no-backup checkbox acknowledgment with trial
activation. New redemptions require no such checkbox or acknowledgment. A forward migration makes
those legacy columns nullable; retain historical development records as historical facts, without
pretending they represent acceptance of later terms. M8-C owns the complete Beta Terms and
Privacy acceptance flow before real-Coach admission. The actual verified backup cadence,
retention and possible recovery loss must be explained in those terms and an accessible Settings
data notice, without a standalone defect checkbox in the first-use path.

## Coach-facing routes and copy

- Email/password and Google signup/sign-in lead directly to the free Workspace after Auth
  verification. Remove the code field from signup and the full-page activation gate. Keep account
  deletion and sign-out in Settings, in their existing account context.
- Settings has a distinct `方案與帳單` category, separate from account security. Show the current
  Free, 60-day Advanced offer or permanent Advanced state, Taiwan-time offer end date and the
  downgrade effect. The comparison shows Free, planned Basic NT$199/month and planned Advanced
  NT$259/month, with an honest checkout-unavailable state until M8-E goes live.
  Only ordinary free Coaches who have never redeemed may apply an optional code; update the state
  in place, retain typed input on recoverable failure, and clear private cache/input on Auth subject
  change. Show honest empty billing/payment states until M8-E. Do not expose dead checkout or
  cancellation controls. M8-E will add real provider-verified payment/subscription states and
  cancellation; a browser checkout return is never payment authority.
- Keep the existing Demo-aligned Settings layout. Raise the low-contrast `FORM COACH DESK`
  eyebrow to readable contrast wherever it appears on the former gate/entry surface. No giant
  warning or standalone risk checkbox belongs between sign-in and the Workspace.
- Settings `資料與裝置` includes a concise development-state data notice. The Product Owner now
  requires a verifiable backup and restore process before charging real Coaches. M8-C publishes
  the initial no-charge Beta recovery boundary; M8-E selects backup method, cadence, retention
  and protected storage and proves an isolated restore before enabling live checkout.
- Settings `協助與回饋` uses a dedicated `mailto:` address chosen in M8-C. Until configured, show
  honest unavailable guidance. Do not request passwords, capability links or unnecessary Student
  data; do not promise an individual reply time.

## Acceptance and handoff

Focused tests cover Free Workspace access and its capacity/feature locks, optional
Free-to-Advanced promotion, the exact 60-day transition and over-limit write lock, permanent
Advanced grants, one-Workspace ownership,
parallel bounded redemption, same-Email deletion/re-registration, durable rate limits, tenant
isolation, public-link allowlists and production Demo-import absence. Verify the revoked development
grant remains absent and its code cannot be redeemed. Run linked-development migration dry-run,
lint/advisors and isolated live tests; then root check/build and exact-SHA remote `verify` plus
`migration-dry-run`.

At desktop and 390×844, inspect signup/sign-in without a code, immediate Free Workspace,
Settings plan overview, unavailable checkout and empty billing states, optional redemption,
Session/Training save/reload, expiry/over-limit recovery and one public result,
and sign-out. Google return should land in the same free Workspace. Physical installed-device
touch, keyboard and safe-area acceptance belongs to M8-C. No production resource or real-Coach
admission is authorized by this contract.
