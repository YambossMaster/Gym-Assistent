# M8-B Beta product and pre-release contract

> Frozen 2026-10-03 after Product Owner review of admission, continued free access, redemption
> abuse protection, irreversible deletion, and disclosure audit rules. M8-A Contract, Sol and CI
> are complete. The Roadmap governs scope and order; Project Status records evidence. No production
> service or real-Coach admission is authorized by this document.

## Coach job and release boundary

An invited Coach can redeem a shareable Beta code, use the full private workspace during a 90-day
promotional period, see when that period ends, and continue using the existing core product on a
free plan afterward. During M8, both states allow all existing core operations. The Product Owner
can issue bounded codes and at most ten permanent free grants without a Coach-facing
administration surface. Settings offers a simple external feedback email link. M8-B is a local
product and security package; M8-C owns production setup and installed-phone acceptance.

The code controls **workspace activation**, not Supabase Auth identity creation. Email/password
verification and Google OAuth may create an Auth identity before redemption. An authenticated but
unactivated identity cannot create a Workspace, read or write Coach data, or access private
projections. It can redeem a valid code, sign out, or request account deletion. A client-side code
check is only guidance; the Fastify Module and private PostgreSQL transaction own admission. The
server must establish a verified Email from trusted Auth provider state before activation; a
browser-submitted address or editable Auth metadata is not evidence of Email ownership.

## Code and grant rules

- A private operator command issues a cryptographically random shareable 90-day code with a
  required positive redemption limit and a required stop-redemption instant. The raw code is shown
  once to the operator and distributed privately by the Product Owner. Store a digest, never the
  raw code. The command can inspect metadata and revoke further redemption, with confirmation and
  an audit record. Revocation does not shorten existing grants.
- The code's stop-redemption time controls **new redemptions**. Each successful Coach redemption
  starts that Coach's fixed 90 × 24-hour promotional period; it does not inherit the code issuance
  date. Store the UTC start and end instants. There is no grace period; the server clock alone
  decides whether the account displays the promotional or free-plan state.
- An authenticated identity redeems once for one owned Workspace. The transaction locks the code,
  checks digest, revocation, deadline and remaining capacity, creates/links the Workspace and grant,
  increments use count, and commits atomically. Parallel attempts cannot exceed the limit or make
  two Workspaces for one identity. Retrying an already completed redemption returns the existing
  grant without consuming another seat. A different code cannot silently extend or replace an
  active grant; that requires a separate operator grant action.
- A successful redemption permanently consumes one seat. Deleting the Coach account or Workspace
  never decrements the code's use count or reopens that seat. If the same verified Email registers
  again after deletion, it cannot redeem the same code, even if that shareable code still has seats
  for other Coaches. A new Auth user ID or a second sign-in method does not restore the old grant.
  Retain only a keyed digest of the normalized verified Email and code ID needed to enforce this
  rule after account deletion; keep it separate from the deleted Workspace and do not retain the
  raw Email in the redemption ledger. M8-C must disclose the retained anti-abuse record and its
  retention policy before real-Coach admission. Another code or an explicit operator grant is a
  separate decision.
- An operator command may assign a permanent free grant to a verified, activated Coach identity.
  At most ten distinct active permanent grants exist at once. The command records actor, target,
  time and reason; it is idempotent for the same Coach. A grant replaces the time-limited state for
  that Coach without deleting data. Revocation or correction is an explicit audited operator
  action and cannot silently change the Coach's current core-product access.
- No amount, payment method, billing intent or renewal charge is collected in M8-B. The app never
  deletes Coach data automatically because a promotional period ends. M9 owns plan differences,
  pricing and any later transition; a M9 change cannot be inferred from this contract.

## Access after the promotional period

The grant projection has `unactivated`, `promotional` (with end instant), `free`, and `permanent`
states. At the end instant, `promotional` becomes `free` automatically. In M8, `free` Coaches may
sign in, read and write their own existing core product data, use account security and deletion
controls, issue capability links, and contact support about applicable data-rights requests. No
existing core operation is disabled or rate-limited solely because the 90 days elapsed. Future
free-versus-paid feature limits require the separate M9 Contract and product notice. Permanent
grants remain distinct because they protect the promised free access in that later decision.

Existing public Training Result and reschedule links keep their normal purpose-specific expiry,
revocation and authorization rules when the Coach moves to `free`. Neither public page discloses
the Coach's plan. Sign-out and account deletion remain available. Admission checks still reject
unactivated identities; grant expiry alone is not a reason to reject a core-data mutation in M8.

## Module, API and persistence boundary

Add a private Beta-admission Module with separate in-memory and PostgreSQL adapters. Private tables
record code digest/limit/use count/deadline/revocation, the one current grant per Coach Workspace,
an account-deletion-surviving redemption ledger, rate-limit buckets, disclosure acceptance, and
operator actions. Keep all tables in `app_private`; browser and Auth metadata are not grant
authority. Scope projections to the verified identity and derive the Workspace server-side.

The authenticated API exposes a narrow grant/status read and a code-redemption operation. The
unactivated path may call only the operations needed to redeem, sign out and delete its Auth
identity; it cannot trigger legacy automatic Workspace creation. Every private write route,
including autosave/import paths, and every public write path must use a shared server activation
check. Both `promotional` and `free` states pass that check during M8.
Read access remains tenant-scoped. Stable errors distinguish invalid, exhausted, revoked and
closed codes without logging raw code values. Responses and logs must not expose code digests,
other Coaches' grants, private notes, capability tokens or operator secrets. Administrative
commands run outside the browser with server-only credentials; no `/ops` UI is added.

The redemption endpoint enforces durable limits before code lookup: at most five attempts per
verified Auth identity and 30 attempts per trusted client IP in each five-minute server-time
bucket. Exceeding either returns HTTP 429 with `Retry-After`; it neither consumes a code seat nor
reveals whether the submitted code exists. Derive IP only from the server connection or a
configured trusted proxy, never an arbitrary client-supplied forwarding header. Store keyed
digests of rate-limit subjects, not raw IPs or submitted codes. Apply the same limits to malformed
requests, and retain the bucket across process restarts so restarting the app cannot reset an
attack. The local production-mode test must prove the configured proxy boundary and 429 behavior.

The migration must account for existing development Coach Workspaces and synthetic Alpha setup
without granting production users unintended access. Explicit fixture grants for development
must never be copied to production. If a required Auth/account-deletion seam cannot preserve this
boundary, return that seam to Contract before implementation.

## Coach-facing route and copy contract

- The existing email/password and Google sign-in paths remain. Signup collects the Beta code and
  presents the no-backup disclosure before activation; a Google-first or already-authenticated
  identity sees the same activation screen after Auth returns. Verify the email before redemption
  where the current Auth flow requires it. Never display a successful workspace state before the
  server confirms the grant.
- On activation, show the promotional end date/time in Taiwan time and current plan state in
  Settings. Show the same state after reload. No new notification subsystem is required.
- Before the end, say: 「90 天體驗期間至 {date}。目前所有功能皆可使用。」 Afterward say:
  「體驗期間已結束，已轉為免費方案。你可以繼續使用目前的功能與資料。」 This must not imply that
  paid features already exist or that the service will always remain free. A permanent grant says
  「永久免費使用資格」, with no promise of permanent service or data retention.
- Before activation, disclose plainly: 「目前沒有定期資料庫備份；若服務或資料庫發生故障，學員與訓練紀錄可能無法還原。」
  Require an explicit acknowledgment as an input to redemption. In the same private PostgreSQL
  transaction that activates the Workspace, record the server-generated UTC acceptance timestamp,
  server-selected disclosure version and verified Coach identity; reject activation if
  acknowledgment is absent. The client supplies only the affirmative choice, never the recorded
  timestamp or authoritative version. Do not call it a waiver of privacy rights.
  M8-C must reconcile final Terms/Privacy, operator/contact and actual providers before real-Coach
  admission.
- Settings includes 「意見回饋」 with an email link to the dedicated support address selected in
  M8-C. Supporting text says: 「可回報問題或提出建議。請勿寄送密碼、分享連結或非必要的學員資料。」
  No in-app receipt or individual reply-time promise appears. Until the address is configured,
  the action is unavailable with honest guidance, rather than a placeholder destination.

## States and acceptance

Cover initial loading, invalid/exhausted/revoked/closed code, network retry, concurrent redemption,
already redeemed, promotional, free and permanent states. Keep entered code on a recoverable error;
clear it on successful redemption and on Auth subject change. Keyboard focus and announcements
must identify the result. At desktop and 390×844, inspect signup, Google return activation,
Settings grant/feedback, and the 90-day transition without horizontal overflow. Compare the
existing Demo Settings layout and keep established formal route patterns. Physical installed
phone, touch keyboard and safe-area acceptance remain M8-C evidence.

Focused automated cases must cover code entropy/digest handling, deadline/limit/revocation,
parallel atomic redemption, one-Workspace ownership, idempotency, permanent-ten limit, tenant
isolation, unactivated private/public operation guards, continuing free-plan writes, and Auth
subject cache reset. Prove same-Email deletion/re-registration cannot reclaim a seat or reuse its
code, while other invited Coaches can still redeem remaining seats. Prove the five-minute identity
and trusted-IP limits, malformed attempts, process restart persistence, 429/`Retry-After`, and no
seat consumption on denial. Verify missing acknowledgment rejects redemption and successful
activation records the server UTC timestamp and disclosure version in the same transaction. Also
prove production Demo-import absence. Run migration dry-run and security/advisor checks, root
check/build, then a local production-mode manual path for sign-in, Session and Training save/reload,
one public result link, post-90-day continued write access and sign-out. CI confirms both jobs for
the exact delivered SHA. No staging load fixture or rollback drill is required.

## Contract handoff

Sol implements the complete package above. M8-C retains the actual support address, final domain,
published legal text, production provisioning and installed-phone acceptance. M8-D retains
real-Coach admission.
