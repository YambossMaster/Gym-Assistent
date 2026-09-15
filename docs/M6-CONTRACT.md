# M6 Contract — Public Capability Links

> Frozen 2026-09-15. Product Owner approved section 2 and the complete Contract and authorized
> continuous M6 implementation through Terra -> Sol -> CI. M4 Scheduling is delivered at `dc83d92`
> and M5 Training is delivered at `5afa212` (Status LOG-069 and LOG-072).

## 1. Student job, Coach job, scope, and evidence sources

A Coach needs to give one Student temporary access to one named outcome without creating a Student
account: either read one completed Training Result or choose one safe new time for one scheduled
Course Session. A Student needs a calm standalone page that explains the one permitted action and
does not expose the Coach workspace around it.

| Surface                | M6 responsibility                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `/sessions/:id`        | Issue, inspect, copy, revoke, and reissue the two link purposes with explicit Training Note consent.                         |
| `/t/:token`            | Read one immutable-version, allowlisted completed Training Result and download that same projection as a PNG.                |
| `/r/:token`            | Read eligible replacement slots and redeem exactly one slot once, with transactional revalidation.                           |
| Public Access Module   | Resolve hashed capabilities, derive terminal state and allowlists, rate-limit reads/writes, and coordinate owned Modules.    |
| Scheduling integration | Supply candidate-slot authority and atomically move one Session without changing its duration, Student, location, or Series. |
| Training integration   | Supply an accepted completed-record version and revoke its active public result when that accepted content changes.          |

Evidence inspected at the M5 baseline:

- `demo/src/pages/PublicPages.tsx` and the link controls in `demo/src/pages/SessionPage.tsx`;
- Demo `CapabilityLink`, `findAvailableSlots`, public Training projection, note opt-in, issuance,
  and redemption rules in `types.ts`, `domain.ts`, and `store.tsx`;
- formal M4/M5 Contracts, Scheduling/Training types and repository seams, Session UI, Auth routing,
  query cache, PWA service worker, `CONTEXT.md`, Architecture, ADR-0001/0002, Roadmap, and Status;
- current Supabase changelog and Data API security guidance. M6 keeps all tables in the existing
  unexposed `app_private` schema and adds no browser Data API access.

M6 excludes Student accounts, messaging or automatic delivery, reminders, notifications, link
analytics, QR codes, custom domains, custom expiry choices, permanent links, public exercise
history/performance, public location, online payments, external calendars, and M7 offline/import
work. A Coach copies the generated link and sends it outside Gym Assistant.

## 2. Deliberate formal-product decisions

Approval of this Contract includes these explicit choices. They deliberately refine the Demo where
server authority, concurrency, or privacy requires a stronger rule.

| Concern                     | Proposed formal rule and Demo relationship                                                                                                                                                                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Link lifetime               | Preserve the Demo's simple promise: every link expires exactly 24 hours after issuance. V1 offers no custom duration and never extends an existing link. Reissue creates a new 24-hour grant.                                                                                 |
| Training Result eligibility | Unlike the Demo's unrestricted button, issue only for a temporal, completed Course Session with an accepted Training Record. An atomically completed empty record is eligible and renders an honest empty result. Legacy, scheduled, reopened, or cancelled Sessions are not. |
| Stable shared result        | Bind a Training Result link to the accepted Training Record version at issuance. Any later content change, reopen, cancel, or deletion revokes the active link; a Coach deliberately reissues the corrected result.                                                           |
| Training Note consent       | Default off. Consent is immutable per link and shares the accepted `privateNote` only for that exact record version. Changing consent requires reissue. No other Coach/Student note can enter a public response.                                                              |
| Reschedule eligibility      | Preserve the Demo's original-date radius: one future scheduled temporal Session, candidate local dates from three days before through three days after, and only starts later than server now. The original start is never a candidate.                                       |
| Public scheduling safety    | Coach scheduling conflicts remain warnings, but a Student capability offers only slots fully inside effective Availability with no non-cancelled Session or Calendar Block overlap. The slot set is recalculated on every read and redemption.                                |
| One current link            | Keep at most one nonterminal link per Session and purpose. Initial issue refuses while one is active; reissue explicitly revokes it and returns a new secret. Expired/used/revoked history remains metadata, not a reusable grant.                                            |
| Secret handling             | The server generates 32 random bytes and returns their base64url token once. PostgreSQL stores only its SHA-256 digest. The token travels from the public route to API only in a redacted capability header, never another URL, query, log, analytic event, or error.         |
| Public identity             | Both pages may show the intended Student display name and Coach Workspace display name. They expose no email, phone, private context, lesson balance, location, Workspace/Student IDs, or account data.                                                                       |
| Redeem result               | One transaction locks the link and Session, revalidates every rule, moves the Session once, increments its version once, and records the chosen instant/use. Parallel attempts yield one success; the loser sees the already-used terminal state.                             |
| Coach refresh               | M6 adds no Realtime or notification system. After public redemption, an authenticated Coach focus or explicit refresh must bypass the ordinary 30-second freshness window for affected Scheduling projections and display the authoritative new time.                         |

## 3. Ownership, persistence, and lifecycle

Public Access owns the grant, its secret digest, public status, purpose-specific allowlists,
rate-limit policy, and orchestration. Scheduling remains sole authority for Session placement,
Availability, Blocks, conflicts, time zone, and Session version. Training remains sole authority
for the accepted record, immutable snapshots, and record version. Workspace remains sole authority
for the Coach display name. Public Access copies no private aggregate into a general public model.

All M6 tables live in `app_private`, have RLS enabled as defense in depth, revoke browser-role
access, and grant only the dedicated API role. The public HTTP adapter uses the trusted API role and
transaction-local capability-digest context to resolve exactly one link; it never accepts a
Workspace from the browser and does not require a `SECURITY DEFINER` function or expose a schema to
the Supabase Data API.

| Entity                   | Frozen fields and invariants                                                                                                                                                                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `capability_link`        | Workspace and Session composite ownership; UUID `id`; purpose `training_result` or `reschedule_session`; unique 32-byte `tokenHash`; `expiresAt`; nullable `revokedAt`, `usedAt`, and `redeemedStartsAt`; `includeTrainingNote`; positive `resourceVersion` and link `version`; timestamps. |
| Public rate-limit bucket | Purpose/operation, HMAC-SHA-256 request-key digest, five-minute bucket start, count, and update time. It stores neither raw token nor raw IP. Entries older than 24 hours are removed opportunistically and may be pruned by later operational maintenance.                                 |

The database enforces purpose/consent/use consistency: only `training_result` may include the
Training Note; only `reschedule_session` may have `usedAt`/`redeemedStartsAt`; those two redemption
fields are both null or both present. `resourceVersion` is the Training Record version for a result
and the Course Session version for rescheduling. Token hashes are globally unique. Composite foreign
keys prevent cross-Workspace Session references. Link metadata cascades with explicit Session,
Student, Workspace, or account deletion.

Public state is derived, not a mutable status string:

1. malformed token, unknown digest, or purpose/route mismatch -> `invalid`;
2. `revokedAt` present -> `revoked`;
3. a reschedule link with `usedAt` present -> `used`;
4. server time at or after `expiresAt`, or the original Session is no longer in the future ->
   `expired`;
5. otherwise the link is `active`, subject to purpose-specific resource revalidation.

The selected precedence makes a successful redemption recoverable after expiry while an explicit
Coach revocation remains final. Deletion removes the row and therefore becomes indistinguishable
from an invalid token. Terminal metadata may remain until its owning Session is deleted; M6 adds no
public access history screen or purge job.

Accepted Training content changes that increment its record version revoke every nonterminal
Training Result link for that Session in the same transaction. A no-op save does not. Reopen and
cancel revoke it in the transition transaction. Any Coach timing/status mutation or deletion of a
scheduled Session revokes its nonterminal reschedule link in that same transaction. Availability or
Block changes do not revoke a reschedule link because its candidates are always derived live.

Every M6 write follows one lock order: owning Course Session, accepted Training Record when needed,
then Capability Link rows in ID order. Public token lookup may identify the candidate row before the
locks, but it must revalidate the digest and complete state after acquiring them. Issuance and
reissue serialize on the owning Session/purpose so concurrent calls cannot create two active links.
This extends M5's Session-before-record order and prevents link revocation from introducing a
reverse lock path.

## 4. Token, request, logging, and rate-limit contract

The raw token is exactly 32 cryptographically random bytes encoded as unpadded base64url (43 ASCII
characters). The server validates that format before hashing with SHA-256. It never truncates the
token or uses a database UUID as the secret. A digest match still requires purpose, lifecycle, and
resource revalidation. Hashing is sufficient because the token has 256 bits of server-generated
entropy; no raw-token lookup or recoverable encryption is stored.

The Web route reads the token from `/t/:token` or `/r/:token` and sends it to the same-origin API in
`X-Capability-Token`. Public API paths contain no token:

| Public HTTP operation               | Behaviour                                                                                                   |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `GET /v1/public/training-result`    | Resolve only a `training_result` capability and return its allowlisted result or public terminal reason.    |
| `GET /v1/public/reschedule`         | Resolve only a `reschedule_session` capability and return its original summary plus current eligible slots. |
| `POST /v1/public/reschedule/redeem` | Accept only `startsAt`; revalidate/lock/move/use atomically and return the accepted public success summary. |

These operations never treat a Supabase bearer session as broader authority. `X-Capability-Token`
and request bodies are redacted from structured logs; access logs use the route template, status,
duration, and request correlation ID only. Error tracking, analytics, traces, metrics labels, and
client console output contain no token, digest, Student name, Training Note, or public response
body. Coach issuance responses containing a raw token receive the same body redaction.

Every public response sets `Cache-Control: no-store, private`, `Pragma: no-cache`,
`Referrer-Policy: no-referrer`, and `X-Robots-Tag: noindex, nofollow`. Public pages load no
third-party script, font, image, embed, or analytic endpoint. The service worker must not cache
`/t/`, `/r/`, public API responses, capability headers, or response bodies; offline navigation may
load the static shell but renders a network Error rather than cached Student data. Tokens and public
payloads never enter localStorage, IndexedDB, persisted TanStack cache, URL query parameters,
download filenames, or DOM/clipboard telemetry. The visible URL and an explicit Coach copy action
are the intended transport boundaries.

Rate limits use trusted client IP (honour forwarded headers only from configured trusted proxies)
and token digest as independent keys:

| Operation                     | IP limit            | Token-digest limit  | Result                                        |
| ----------------------------- | ------------------- | ------------------- | --------------------------------------------- |
| Either public projection read | 60 per five minutes | 30 per five minutes | `429` with integer `Retry-After`              |
| Reschedule redemption attempt | 10 per five minutes | 5 per five minutes  | `429` with integer `Retry-After`; link unused |

Malformed and unknown tokens count against the IP limit. A well-formed token counts against its
digest limit whether valid or not. Rate limiting runs before private resource projection and
returns the same public-safe body for every purpose. Coach-authenticated issuance management keeps
the existing authenticated API boundary and is not weakened by a public token.

## 5. Coach issuance, revocation, and reissue

All Coach operations verify identity, derive Workspace, return `404` for missing/cross-Workspace
Session or link IDs, and expose metadata only for that Workspace. They accept no token hash,
Workspace, expiry, use timestamp, resource version, or public projection fields from the browser.

| Coach HTTP operation                            | Frozen behaviour                                                                                                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /v1/sessions/:sessionId/capability-links`  | Return the latest metadata for each purpose: ID, purpose, status, expiry, note consent, issued time, link version, and allowed actions. Never return a token or digest.              |
| `POST /v1/sessions/:sessionId/capability-links` | Accept purpose and `includeTrainingNote` where applicable. Validate eligibility, issue once, and return metadata plus raw token exactly once. Active same-purpose link -> `409`.     |
| `POST /v1/capability-links/:linkId/reissue`     | Require current link version and explicit note consent for Training. Revalidate current resource, revoke any nonterminal same-purpose link, create a new link, and return one token. |
| `POST /v1/capability-links/:linkId/revoke`      | Require current link version. Set server revocation time and increment link version; already terminal returns its current metadata without generating a token.                       |

Training issuance requires a completed temporal Session and existing accepted Training Record;
empty accepted records remain eligible. Reschedule issuance requires a future scheduled temporal
Session. Link expiry is server time plus 24 hours. Reissue does not reuse an ID, digest, expiry, or
secret and cannot reactivate a terminal link.

Issuance and reissue are deliberately not automatically retried because the raw token is not stored
for replay. If the response is lost, the Coach UI refreshes metadata. When it finds the accepted
active link but has no secret, it says `連結已建立，但無法再次顯示。請重新建立連結。` and offers
explicit reissue. A repeated initial issue therefore returns `409 active_link_exists`; it never
silently creates several live secrets. Revocation is safe to retry against current terminal state.

The Session page uses one `分享訓練結果` action only when Training issuance is allowed and one
`建立改期連結` action only when reschedule issuance is allowed. Its management dialog shows
purpose, expiry, current status, and note-consent state; uses `建立連結`, `複製連結`, `撤銷連結`,
and `重新建立連結`; and explains that reissue immediately invalidates the previous URL. Training
Note uses an unchecked control labelled `一併分享教練筆記` with helper text
`只有這個連結會顯示本堂筆記。` The raw URL remains selectable after copy failure. Closing the
dialog discards the only in-app copy of the raw token.

## 6. Public Training Result projection

An active Training Result link revalidates that the Session remains completed and the accepted
Training Record version equals `resourceVersion`. Its projection is purpose-built and never reuses
the authenticated Session Training response:

```text
coachDisplayName
studentDisplayName
session: startsAt, endsAt, timeZone, durationMinutes
exercises[]:
  position, definitionName
  sets[]: position, plannedWeight, actualReps, unit, rpe, result
trainingNote: present only when includeTrainingNote is true
```

Exercise/set positions are response order, not internal IDs. The projection excludes Workspace,
Student, Session, record, occurrence, set, and Definition IDs/versions; email/phone; location;
private Student context; lesson entitlement/Purchases/income; planned reps; library metadata;
previous/personal/history performance; timestamps other than Session start/end; and every note
except the explicitly consented Training Note. Empty/missing values remain null and are rendered as
`—`; zero remains zero. All accepted exercise occurrences and sets retain their stored order and
snapshot name/unit/result. An accepted empty record is Ready with `這堂課沒有動作紀錄。`

The page uses FORM's standalone public layout, not the Coach App Shell. It shows the local date,
weekday, time, duration, Student name, ordered exercises/sets, completion labels, and the optional
section `教練給你的話`. Exact wording:

| State/slot    | Required wording and behaviour                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Loading       | `正在載入訓練結果…`                                                                                                      |
| Network Error | `暫時無法載入訓練結果。` + `重試`                                                                                        |
| Invalid       | `找不到這個分享連結。` / `請向教練確認連結是否完整。`                                                                    |
| Expired       | `這個分享連結已過期。` / `請聯絡教練取得新的連結。`                                                                      |
| Revoked       | `這個分享連結已撤銷。` / `請聯絡教練取得新的連結。`                                                                      |
| Ready heading | `{studentDisplayName} 的訓練結果`                                                                                        |
| Set results   | `已完成`, `未完成`, `未記錄`; weight unit is `kg`/`lb`, repetitions render `× {actualReps}`, RPE renders only if present |
| Download      | `下載圖片` -> pending `正在製作圖片…` -> success `圖片已下載` or recoverable `無法下載圖片，請再試一次。`                |

PNG generation is client-side from exactly the allowlisted response already in memory. It performs
no new data read, embeds no remote asset, token, URL, hidden ID, or metadata, and uses a neutral
filename such as `FORM-訓練結果-YYYY-MM-DD.png`. The image contains the same visible values and
optional note—never additional fields. Download failure leaves the page readable.

## 7. Public reschedule slot and redemption contract

An active reschedule link revalidates a future, scheduled, temporal Session whose version equals
`resourceVersion`. The read projection contains only:

```text
coachDisplayName, studentDisplayName, timeZone, expiresAt
originalSession: startsAt, endsAt, durationMinutes
slots[]: startsAt, endsAt
```

No link/Workspace/Student/Session/Series/Block/Availability IDs or versions, location, notes,
conflict details, other Student names, or busy ranges enter the response. Slot order is ascending by
instant. The server derives local dates from the Workspace time zone and considers each effective
Availability window from original local date minus three through plus three, inclusive. Candidate
starts advance by 30 minutes from the beginning of each window, preserve the original duration,
fit fully inside the half-open window, start strictly after server now, differ from the original
start, and overlap no Calendar Block or non-cancelled other Course Session. There is no silent
truncation within this seven-local-day window.

Redemption accepts one RFC 3339 `startsAt` from the displayed set. In one database transaction it:

1. rate-limits and resolves the candidate link by digest without accepting it as current;
2. locks the owning Session and then the Capability Link under the shared lock order; rechecks
   digest, purpose, expiry, revocation, use, future scheduled status, and captured Session version;
3. recalculates the complete candidate set from locked/current Scheduling facts;
4. rejects a missing candidate with `409 slot_unavailable`, keeps the link unused, and returns a
   newly allowlisted projection/slot set;
5. otherwise preserves duration, Student, location, and Series membership; moves the Session,
   increments its version once, records `usedAt` and `redeemedStartsAt`, and returns Success.

Public redemption creates no new Session, entitlement, Series reconciliation, Block, Availability,
or Training mutation. It never applies Scheduling's Coach-only warning acknowledgement: a public
candidate must have zero overlap/outside-availability warnings at commit. A concurrent second
redemption sees the locked used link and returns `409 used_link` with the allowlisted used summary;
it does not run a second move. A lost success response is recoverable because reopening the same URL
returns Used with the accepted `redeemedStartsAt`, even after the 24-hour expiry.

| State/slot       | Required wording and behaviour                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Loading          | `正在載入可改期時段…`                                                                                                   |
| Network Error    | `暫時無法載入可改期時段。` + `重試`                                                                                     |
| Invalid          | `找不到這個改期連結。` / `請向教練確認連結是否完整。`                                                                   |
| Expired          | `這個改期連結已過期。` / `請直接聯絡教練安排時間。`                                                                     |
| Revoked          | `這個改期連結已撤銷。` / `請直接聯絡教練安排時間。`                                                                     |
| Used             | `這個改期連結已使用。` / `已選擇 {local date and time}。`                                                               |
| Ready heading    | `{studentDisplayName}，選一個更適合的時間。`                                                                            |
| Original summary | `原課程：{local date} {local start–end}`                                                                                |
| No slots         | `目前沒有可用時段` / `請直接聯絡教練討論其他安排。`                                                                     |
| Submit           | Selecting a slot opens confirmation `改到這個時間？`; confirm `確認改期`; pending `正在改期…`; Cancel retains selection |
| Slot conflict    | `這個時段剛剛已被安排，請重新選擇。` Fresh slots remain visible; if none remain, transition to No slots.                |
| Success          | `改期完成。` / `{coachDisplayName} 已收到最新安排，你可以關閉這個頁面。` plus accepted local date/time                  |
| Rate limited     | `操作太頻繁，請稍後再試。` Retry is disabled until `Retry-After` elapses.                                               |

Dates are grouped and labelled in the Workspace time zone; times use 24-hour format. The first date
with slots is initially selected. A slot button has a complete accessible date/time label; visual
morning/afternoon/evening grouping is presentation only. No optimistic success appears before the
transaction commits. Refreshing keeps the last readable original summary but disables stale slot
submission until current slots return.

## 8. HTTP status, route, cache, and accessibility boundaries

Malformed/unknown/wrong-purpose public tokens return `404 invalid_link`. Known expired and revoked
links return `410 expired_link` or `410 revoked_link`; a read of a used reschedule returns
`410 used_link` plus only its used summary. Public redemption races return `409 slot_unavailable` or
`409 used_link`. `429` is rate limiting. Validation is `400`; transport/operational failures are
`5xx` with no SQL, stack, identifiers, token, digest, or private state. A missing/deleted owning
resource is intentionally `404 invalid_link`.

`/t/:token` and `/r/:token` mount outside Coach Auth and before Supabase session bootstrap. Opening
them never waits for, creates, refreshes, links, or signs out a Coach session; an existing Coach
session grants no additional field. Unknown public paths do not fall through to Coach sign-in.
Public pages use a separate in-memory query client with no persistence, `gcTime: 0`, no prefetch,
and no retry for terminal/429 responses; one transport retry may be user initiated. Unmount removes
all public data from memory.

Coach link metadata uses Coach-scoped in-memory keys. Issue/reissue/revoke invalidates only that
Session's metadata and updates allowed actions. Public redemption updates official Scheduling
projections on the server. The authenticated app refetches Session, Calendar, Today, Student detail,
roster/lesson summary, and link metadata on focus after a public mutation, even if their ordinary
stale window has not elapsed. No private query response crosses into the public query client.

Both public pages provide a visible FORM identity, one `<main>`, logical heading order, keyboard and
touch operation, visible focus, 44 px targets, polite non-terminal status announcements, and focus
movement to the terminal/updated heading after state transitions. Dialogs trap focus, close with
Escape/Cancel, and restore the selected slot or opener. Honour reduced motion and system text size.
At desktop and exact 390×844 there is no App Shell, Auth panel, horizontal page overflow, hidden
action behind a safe area, hover-only information, or layout dependence on a Student name length.

## 9. Terra evidence and exit

Terra implements only the serialized migration, Public Access Module/repository/HTTP adapters,
Scheduling/Training invalidation seams, typed clients/query state, public route composition,
semantic unstyled skeletons, deterministic fixtures, and the exact supplied wording. Terra does not
choose layout, typography, color, spacing, motion, responsive composition, or different copy.

Required evidence before Sol:

1. Domain/Module tests prove token format/hash lookup, purpose mismatch, state precedence, 24-hour
   edge, one-current-link rule, eligibility, immutable note consent, version capture, revoke/reissue,
   lost issuance response, and automatic revocation from Training/Scheduling changes.
2. Public allowlist tests enumerate keys recursively and prove exclusion of every ID/version,
   contact/private-context/lesson/location field, all unconsented notes, other Student/busy data,
   and private error detail. PNG input equals the accepted allowlist and contains no token.
3. Slot tests cover Workspace DST/time-zone conversion, local ±3-day bounds, 30-minute generation,
   duration/window edges, past/original exclusion, override/empty Availability, Blocks, other
   Sessions, ordering, no slots, and availability changes between read/redeem.
4. PostgreSQL concurrency proves Session/record/link lock order, exactly one parallel redemption, one
   Session version increment, preserved duration/location/Series, unused conflict, deletion races,
   digest-only persistence, composite ownership, RLS exact-token context, rate bucket concurrency,
   and cascade cleanup.
5. HTTP tests prove Coach isolation and all status/reason/header/body-redaction rules; public calls
   need no Auth and Auth adds no fields. Rate tests prove both independent limits, trusted-proxy
   handling, `Retry-After`, and no raw IP/token persistence.
6. Web tests prove routing before Auth bootstrap, Loading/Error/terminal/Ready/Refreshing/Mutating/
   Conflict/Success selection, no automatic issuance retry, clipboard failure, focus restoration,
   public-memory cleanup, service-worker exclusion, Coach focus refresh, and image success/failure.

Add deterministic M6 fixtures without importing Demo persistence. Add and document
`npm run e2e:m6 --workspace @gym-assistant/api`; the command does not exist at Contract time. Live
E2E must create two isolated Coaches and prove Coach A issue/list/revoke/reissue, Coach B isolation,
valid/tampered/wrong-purpose/expired/revoked/used cases, note allowlist, slot conflict refresh, and
parallel redemption, then remove every created link, Session, Student, Workspace, and Auth fixture.

## 10. Sol and CI acceptance

After Terra evidence passes, Sol converges the Session link-management dialog and both standalone
public pages against the Demo and this Contract. Desktop and exact 390×844 acceptance covers:

- eligible/ineligible Training and reschedule controls; note off/on; copy failure; lost-response
  recovery; active metadata; revoke/reissue warning and focus restoration;
- Training result normal/empty/null/zero/mixed-unit/RPE/note states, terminal states, image download,
  long names, keyboard, reduced motion, and no private-field/network leakage;
- reschedule date/period navigation, no slots, confirmation, pending, stale-slot conflict and fresh
  slots, success, used reload, parallel use, expired/revoked/invalid/rate-limited states;
- public opening while signed out and while a Coach session exists, no Auth redirect/bootstrap,
  no horizontal overflow, safe-area reachability, no console errors, and no capability cache entry;
  then authenticated Coach focus refresh showing the accepted new time.

CI requires root `npm run check`, `npm run build`, `git diff --check`; M4 and M5 live regressions for
touched transitions/records; isolated M6 live E2E; linked migration dry-run and `app_private` lint;
relevant Supabase security/performance advisors; and inspection that production bundles/source maps,
logs, storage, Cache Storage, browser console, and generated PNG contain no test token or private
payload. Create migrations only through the official Supabase CLI after discovering current syntax.
Use only verified isolated development fixtures and clean them up.

Finish with a cohesive commit/push and observe GitHub Actions Verify plus migration-dry-run for the
exact commit. Record only observed evidence in Status. M6 is complete only after Contract approval,
Terra, Sol, and CI all pass.

## 11. Approval and next gate

**Contract state:** frozen. Execute M6 Terra exactly from section 9, then Sol and CI without skipping
gate evidence. Any missing product, privacy, visual, interaction, or copy decision returns to a
Contract amendment; Terra does not invent it.
