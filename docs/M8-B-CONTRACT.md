# M8-B Open Beta access and promotional eligibility contract

> Revised and frozen 2026-10-03 after the Product Owner corrected the role of Beta codes.
> M8-A is complete. M8-B remains local development and verification; M8-C owns production
> deployment, published terms, the support address, and installed-phone acceptance.

## Coach job and release boundary

Every verified Coach can sign in and use the free Workspace immediately, with all current core
features and writes. An invitation or promotional code is optional. It marks a distinct 90-day
paid-plan trial eligibility for later plan rules; M8 has no paid-feature difference and charges
nobody. The code is an offer, not admission control. A Coach without a code never sees an
activation gate. Existing Coaches keep their Workspace and data.

The current Beta is a release phase, not a closed cohort. M8-C still must complete production
setup and truthful published legal/support information before M8-D invites real Coaches.

## Code and eligibility rules

- A private operator command issues a cryptographically random code with a required positive
  redemption limit and stop-redemption instant. Show the raw code once; store only its digest.
  The operator can list metadata and revoke future redemption. Revocation does not shorten an
  existing trial.
- A successful redemption starts exactly 90 × 24 hours from the server UTC instant, with no
  grace period. The code's stop date limits new redemption only. On expiry the Coach displays
  `free`; existing data and all M8 core reads and writes continue.
- A verified Coach can redeem one code. The server transaction serializes redemptions for the
  Coach, locks the code, checks remaining capacity, and atomically creates the eligibility.
  Retrying the same successful code is idempotent. A different code cannot silently extend or
  replace an existing promotional or permanent grant. Free Coaches who have never redeemed can
  redeem from Settings at any time while a code remains valid.
- A redeemed seat is irreversible. Account deletion never restores capacity. Re-registering the
  same verified Email cannot redeem that same code again. Keep only the keyed Email/code digest
  needed for this rule, separate from the deleted Workspace; M8-C must publish its retention
  policy. Other Coaches may use remaining seats.
- A private operator command may assign at most ten permanent free grants to verified Coaches
  who already have a Workspace, whether they currently have a trial or ordinary free access.
  It records actor, target and reason. Revoking a grant restores its prior promotional period
  when one exists; otherwise the Coach returns to ordinary free access. Neither operation
  deletes data or silently blocks current core features.
- No payment method, charge, paid-plan feature set or automatic paid subscription is introduced in
  M8-B. M9 owns pricing, feature differences and commerce.

## Identity, API and persistence boundary

Supabase Auth verifies identity; the Fastify API resolves Workspace from that identity. Existing
Workspace creation on the first private operation remains available to every authenticated Coach.
`GET /v1/beta/status` returns `free`, `promotional` or `permanent`; ordinary free status requires
no grant row. The optional `POST /v1/beta/redeem` is the only code input route. Existing public
Training Result and reschedule links retain their purpose-specific expiry and projection rules
regardless of the Coach's eligibility. Neither public page reveals plan status.

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
Privacy acceptance flow before real-Coach admission. The no-scheduled-backup and possible
irrecoverable-loss risk must be plainly explained in those complete terms and an accessible
Settings data notice, without a standalone defect checkbox in the first-use path.

## Coach-facing routes and copy

- Email/password and Google signup/sign-in lead directly to the free Workspace after Auth
  verification. Remove the code field from signup and the full-page activation gate. Keep account
  deletion and sign-out in Settings, in their existing account context.
- Settings has a distinct `方案與帳單` category, separate from account security. Show the current
  free or 90-day promotional state, Taiwan-time end date, permanent-free qualification, and
  automatic return to free after expiry. The comparison shows what is actually available now:
  free access to all current core features, with paid-plan contents and price clearly pending.
  Only ordinary free Coaches who have never redeemed may apply an optional code; update the state
  in place, retain typed input on recoverable failure, and clear private cache/input on Auth subject
  change. Present empty billing history, no payment method and no active paid subscription as
  explicit states. The management section explains that no paid change or cancellation is possible
  yet; do not expose dead checkout, billing or cancel controls or invent a price or entitlement.
  M9 will complete payment, plan change, cancellation and invoice operations under its contract.
- Keep the existing Demo-aligned Settings layout. Raise the low-contrast `FORM COACH DESK`
  eyebrow to readable contrast wherever it appears on the former gate/entry surface. No giant
  warning or standalone risk checkbox belongs between sign-in and the Workspace.
- Settings `資料與裝置` includes a concise, non-binding data notice that there is currently no
  scheduled database backup and a service/database failure may make Student and Training data
  unrecoverable. M8-C must integrate the same fact into complete published Beta Terms.
- Settings `協助與回饋` uses a dedicated `mailto:` address chosen in M8-C. Until configured, show
  honest unavailable guidance. Do not request passwords, capability links or unnecessary Student
  data; do not promise an individual reply time.

## Acceptance and handoff

Focused tests cover unrestricted free Workspace access, optional free-to-promotional upgrade,
the exact 90-day transition and continuing writes, permanent grants, one-Workspace ownership,
parallel bounded redemption, same-Email deletion/re-registration, durable rate limits, tenant
isolation, public-link allowlists and production Demo-import absence. Verify prior development
grants remain readable after the forward migration. Run linked-development migration dry-run,
lint/advisors and isolated live tests; then root check/build and exact-SHA remote `verify` plus
`migration-dry-run`.

At desktop and 390×844, inspect signup/sign-in without a code, immediate free Workspace,
Settings plan overview, billing/management states and optional redemption, Session/Training save/reload, one public result,
and sign-out. Google return should land in the same free Workspace. Physical installed-device
touch, keyboard and safe-area acceptance belongs to M8-C. No production resource or real-Coach
admission is authorized by this contract.
