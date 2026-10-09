# Calendar subscription security — 2026-10-10

## Decision and release boundary

The Product Owner rejected a split release and requested expiry interception. Finance exports and
calendar integration were released together in Production release #3 after exact-SHA CI #137,
literal APPLY and a matching single-migration preview. No additional migration was needed for expiry.

## Findings

- The subscription URL is a bearer credential. Application logs already use route templates and
  generic calendar error codes; regression tests must cover success, failure and unmatched paths,
  including Authorization and Cookie suppression. This does not sanitize upstream provider logs.
- [Fly staff guidance](https://community.fly.io/t/where-are-platform-logs-stored-for-an-nrt-app-data-residency-follow-up-to-a-closed-thread/28598)
  says ordinary request logs are not stored, but debugging can retain them. This is an assurance
  gap, not an observed credential leak. Do not enable support request capture with live tokens.
- [Apple supports subscription credentials](https://support.apple.com/en-gb/guide/deployment/dep950bfdb6/web),
  but [Google From URL](https://support.google.com/calendar/answer/37100?hl=en-IN) does not document
  equivalent Basic Auth support. Basic Auth is not a verified cross-client replacement. Putting
  credentials in URL userinfo is [deprecated](https://www.rfc-editor.org/rfc/rfc9110.html#section-4.2.4).
- Generate/copy HTTPS URLs only. A webcal launch does not establish that the first request uses TLS;
  an HTTP redirect cannot protect a token already sent in plaintext. Private calendars require
  [HTTPS](https://www.rfc-editor.org/rfc/rfc7986.html#section-8). Apple/Google real-client acceptance
  is still required, including SSL settings and refresh behavior.

## Structural alternative — not authorized; design only

Use the existing Fly app/Machine with raw TCP passthrough on 443 and a controlled Caddy TLS entrypoint.
No Fly HTTP or TLS handler may terminate this connection. Caddy proxies to loopback Node; its own
access/error logging also needs credential-redaction tests. This affects all HTTPS routes, not just
calendar paths. Do not introduce another TLS-terminating proxy in DNS.

Dependencies and operational consequences:

1. [Dedicated IPv4](https://docs.fly.io/networking/services), currently
   [US$2/month](https://fly.io/pricing/); update DNS A and verify AAAA/TTL before switching handlers.
   Shared-IP and dedicated-IP coexistence is not a zero-downtime guarantee.
2. [Persistent Caddy certificate storage](https://caddyserver.com/docs/automatic-https#storage):
   a Fly volume costs US$0.15/GB-month, plus applicable snapshot storage. A single Machine/volume is
   not high availability. Do not assume Fly-managed private keys can be exported.
3. Initial ACME issuance and renewal: HTTP-01/TLS-ALPN require public DNS/ports reaching Caddy.
   Pre-issuance via DNS-01 adds a scoped DNS credential and provider adapter. Establish a cutover
   and rollback window before changing Production.
4. Fly health probes come from the private network, not loopback. Use a verified HTTPS service
   readiness check through Caddy; top-level checks alone do not gate routing.
   See [health configuration](https://docs.fly.io/reference/configuration).
5. Recheck readiness, login, subscription redaction, certificate renewal, memory on the 512 MiB
   Machine, and DNS rollback. Do not allocate paid resources or alter ingress without PO approval.

## Expiry contract and implementation

- Entitlement is checked before schedule reads and again before sending generated real data.
  Lookup failure fails closed. Request cache validators cannot bypass authorization.
- First observed expiry/downgrade retains the hashed capability only for a single all-day notice,
  `Prime 方案已到期`. Its UID and contents remain stable; it is transparent, has no alarm, private
  details, location, or original event identifiers. Its date is the UTC day expiry was observed.
  Published real-event history is cleared; existing source schedules are untouched.
- The notice calendar replaces the full feed on successful client refresh. A single VEVENT satisfies
  [RFC 5545 component requirements](https://www.rfc-editor.org/rfc/rfc5545.html#section-3.6).
  Offline copies, imported files and client refresh timing cannot be remotely guaranteed. Do not
  promise immediate removal; [refresh interval](https://www.rfc-editor.org/rfc/rfc7986.html#section-5.7)
  is advisory, and iTIP cancellation is not a universal subscription wipe.
- Renewal never revives the old URL; the owner creates a new subscription. Explicit disable/reset
  invalidates old tokens with 404. Expired owners can inspect and disable the notice-only link.
- Tests cover notice format, no schedule reads after expiry, mid-generation downgrade, failure
  rollback, renewal non-revival, disable, HTTP cache validators and application logs. Development
  SQL verification uses rollback-only savepoints and stub entitlement; it is not real-client proof.

## Final subscription decision and release gate

The PO accepted the residual possibility that Fly upstream logs contain request paths. Use a
256-bit cryptographically random secret at `/api/v1/public/calendar/:token.ics`; store only SHA-256
in the private database. Application logs, error reporting and analytics must never include the
raw path, token or headers. No new ingress infrastructure or fee is required. Capability reset,
disable, expiry interception, HTTPS, `no-store` and `no-referrer` remain binding. Users must treat
the private URL like a password and can rotate it when needed.

The bounded Basic Auth test passed on Apple, but Google did not fetch the protected feed. The PO
therefore explicitly replaced Basic Auth with the private URL contract. At 2026-10-10 04:23 Taipei,
Google fetched the new synthetic private path with HTTP 200 and its calendar showed the synthetic
event. This proves initial Google subscription compatibility. External refresh timing remains
client-controlled. Exact-SHA CI, Production migration preview and same-version joint release passed;
installed-PWA and external refresh-timing acceptance remain separate.

## Authorized synthetic client probe — completed and stopped

On 2026-10-10 the PO authorized a temporary public synthetic-only endpoint. The isolated
`scripts/calendar-auth-probe.mjs` loads no env files, application modules or database. Port 5187
exposes only Google Basic, Apple Basic, the private-path probe and unauthenticated positive-control
ICS routes. Port 5188
is loopback-only control/status; public `/setup` and `/status` return 404. Secrets live in memory,
events are synthetic and diagnostics record only route labels, auth booleans and client categories.
The server also stops automatically after one hour; it was stopped manually after verification.

Official cloudflared 2026.10.0 download matched the release SHA256. HTTP/2 tunnel registration failed;
QUIC registered successfully. Public checks proved missing Basic 401, correct Basic 200, control 200,
and no exposed control endpoints. This is protocol plumbing evidence, not calendar compatibility.

Google browser accepted both subscriptions. At 2026-10-10 03:44:12 Taipei the control endpoint
received a Google fetch; the UI subsequently displayed `FORM BASIC AUTH TEST public-control` on
October 9 (the probe's UTC date). The credential-URL calendar has not produced a Google request or
event in the current observation window. A created calendar-list entry is not a passing result.
The PO's screenshots confirm Apple preview and an event in the real calendar. The server observed
Apple-like requests at 03:45:49 and 03:46:41 Taipei, each challenging with 401 then authenticating
successfully with 200. At 04:02:02, Google Basic still had zero client requests approximately
18 minutes after subscription, while the public control had one successful Google fetch and a
visible event. Chrome reload and the subscription settings check did not establish successful
Basic fetching. This bounded acceptance fails; it is not proof of universal permanent incompatibility.
At 04:02 the original synthetic feed switched to expiry-only; Apple existing-subscription refresh
was not confirmed. The local probe was restarted with a new disposable key and an exact private-path
route. Its Google calendar fetched successfully and displayed the synthetic event. The three
disposable Google subscriptions were removed and the probe and tunnel stopped. Production, DNS,
paid resources, migration history and real user events are unchanged.
