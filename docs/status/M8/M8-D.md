# M8-D status — Open real-Coach Beta

> State: active. Last verified: 2026-10-18. This is the working brief for M8-D; approved scope and
> completion criteria remain in `docs/ROADMAP.md` and the frozen Contract documents.

## Package position

| Gate                     | State                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| Contract                 | Two-code Beta plan-access correction is frozen; admission, backup and restore gates remain binding |
| Sol                      | Two-code correction is deployed; Production User-JWT red lines and isolated backup restore passed  |
| CI                       | Exact-SHA CI, release, `main` backup/restore and required PR checks passed                         |
| Admission                | No real Coach admitted; the two dedicated Production synthetic users were deleted                  |
| Single-lesson correction | PO accepted local UI; PR #35, exact-SHA Main CI and Production migration release passed            |

The PO reported a post-release purchase-history gap on 2026-10-18: two completed lessons without
a Student price were absent from purchase history, while a third priced lesson appeared. The PO
also directed that either the purchase record or Finance amount edit update both effective views,
without changing the original missing-price source or Student default price. The follow-up Sol is
in isolated `codex/m8d-single-purchase-records`, based on released Main. Student detail now projects
each completed unpriced source as a one-lesson purchase-history row with the effective Finance
entry-state amount and version. The existing purchase editor handles both priced and unpriced
single lessons, locks count to one and omits the currency control. Unpriced edits use the ordinary
Finance entry override, so Finance and purchase history share the amount. No schema or Production
change has been made for this follow-up. Focused API regression reproduced the missing two records
before the fix and passed afterward; focused Web list/editor checks and both typechecks passed.
PO UI inspection and the later live/browser/CI gate remain open for this follow-up.
The subsequent PO review required a quieter editor: static `1 堂` beside the amount, a button
to view the source Session from the editor's lower-left action area, no generic eyebrow or boxed source card,
and a `單堂計費` / `扣除已購堂數` switch submitted through the same `儲存` button.
The purchase-history row no longer links to the Session. An error now appears as a dismissible
overlay instead of shifting the fields. Focused Web tests 7/7 and Web typecheck passed after this
revision. A read-only Development query under Workspace RLS found two pending sources and one
generated source for the reported Student; this branch's Student detail projection returned all
three. The first unscoped diagnostic query falsely showed no sources and was discarded. The
5173 now serves this isolated branch's latest Web through API 3002. Initially, 5173 served the new
Web but still proxied to an older API; the PO's refreshed screen therefore showed only one record.
After restarting Vite with `API_PROXY_TARGET=http://127.0.0.1:3002`, the isolated API logged the
authenticated Student detail request and the PO confirmed the screen shows all three records
($1,500, $60 corrected from an original $0, and $0). The unused 5188 preview was stopped.
The subsequent editor typography correction follows the existing Settings dialog scale: the three
field labels are 14px/700, and the fixed count, amount and billing state are 14px/500. Computed
styles and the rendered dialog were checked on 5173 at desktop and 390px; no data behavior changed.
The next local follow-up excludes Students with no manual Lesson Purchases from low-lesson attention
and bases the notice event time on manual purchases and manual lesson use only, so single-lesson
record edits do not reissue the notice. Mobile notification links no longer inherit the header icon
link size, and the Finance source buttons use `前往來源紀錄` and `設定單價` on one line at 390px.
Focused API/Web tests passed 9/9 and both typechecks passed. On 5173, the PO's single-lesson-only
Student's low-balance notice disappeared after a successful Today refresh; the unrelated reschedule
notice remained. The Development pool briefly hit its session-connection limit during this check and
then recovered without changing other running branches or Production.
The PO accepted the current 5173 version and explicitly authorized Main CI/deployment. Root
36/36, API 298/298, Web 373/373 and API/Web builds passed locally. PR #37's first exact-head CI
run `39057368440` passed `browser-ui` and the migration no-op but failed `verify`: the new Web
purchase test imported the Supabase client without a mock and depended on local Vite values.
That test now mocks the client; its four cases passed with Vite values absent, along with Web
typecheck and changed-file formatting. Corrected PR run `39057739156` passed all three required
checks and merged as `aaa5a929a8e7e2b5543dd3ee93d3f20b18d729d0`. Main CI `39058008147`
passed verify, browser UI, migration no-op and Production history comparison with no pending
versions, then deployed the exact commit to Fly and passed readiness. Independent requests to the
Production custom domain returned HTTP 200 for `/api/ready`, `/` and `/login`. This follow-up
introduced no schema migration or payment change; installed-device acceptance remains open.

M0–M7.5, M8-A, M8-B, M8-B-Export, M8-B-Plan-Choice and M8-C internal Alpha are protected
delivered baselines. M8-D owns the real-Coach Beta opening and its remaining checks; see the
completed [`M8-C.md`](M8-C.md) for Alpha evidence. M8-E owns paid checkout and must not be pulled
into this package.

## Single-lesson correction local handoff

The frozen 2026-10-17 [Contract](../../M8-D-SINGLE-LESSON-CONTRACT.md) is implemented on
isolated branch `codex/m8d-single-lesson`. Port 5173 serves this branch's Web through its local
API on 3001; the primary checkout and API on 3000 remain separate. Student create/edit stores
optional price in Settings currency without another currency control. Desktop phone, age range and
price share one row; the 390px layout wraps cleanly. Calendar shows total remaining manual lessons
before Venue selection and that Venue's usable lessons afterward, falling back to `單堂計費`.
Any active Venue, including an in-context new Venue, is available without a purchase. One-off
and bounded Series scheduling no longer require a package. Completion fixes Venue-aware manual
capacity first, otherwise creates a linked single purchase or an annotated zero-income row. Finance,
purchase history, reopen/delete, settlement, correction and explicit re-evaluation use
Workspace-scoped server sources. Free can schedule and complete; after-the-fact zero-row correction
and generated-price correction are Pro/Prime-only on both API and UI, as confirmed by the PO.
The focused Finance test now directly checks a generated single lesson against percentage commission,
fixed per-Session rent and prepaid Venue-credit consumption. All 22 Finance tests pass locally.
The later PO correction keeps Finance edits separate from purchase/zero-income sources. Unpriced
commission Sessions now show income `+$0` and expense `-$0` together; an income ledger override
recalculates commission, while an independently overridden expense stays fixed until reset. Finance
rows retain their original source explanation, `已修改` marker, `取消修改`, and the Student price link.
Calendar and Session Venue choices show the selected date's short cost kind in parentheses; income
precedes expense for the same time, and the two source links share a desktop row. Focused Finance
23/23 and affected Web interaction 16/16 tests plus API/Web typechecks passed. The isolated
Development API test verified zero source, zero commission, income 600 to commission 420, a manual
expense of 100 staying fixed after income moved to 800, and expense reset to 560. The exact test
Sessions, Venue and synthetic Coach were removed. The revised UI still awaits PO inspection;
exact-SHA CI and Production remain unverified and unauthorized.
The latest Venue-record correction shows zero commission as a calculated `$0` expense, identifies
`單堂計費` without claiming a missing purchase source, and reads effective Finance income/expense
after ledger edits while retaining the original missing-price explanation. The Venue dropdown's
untracked label is shortened to `不計`. Focused Venue-record and Calendar tests passed 9/9;
Finance tests passed 23/23 and both API/Web typechecks passed.
On 2026-10-18 the PO reviewed the local happy path, accepted the version and authorized Main,
CI and deploy. The full local gate passed root 36/36, API 297/297 and Web 369/369; API and Web
builds passed. [PR #35](https://github.com/YambossMaster/Gym-Assistent/pull/35) passed its final
verify, browser UI and Development migration dry-run jobs, then merged as
`8090bf80e6740043a5fb22dec1c252d53affba21`.
[Main CI #39049692349](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39049692349)
passed verify, browser UI and migration dry-run; Production preview listed only M8-D versions
`20261017105438` and `20261017110659`. The PO supplied literal `APPLY` for that exact preview.
[Production release #39049953196](https://github.com/YambossMaster/Gym-Assistent/actions/runs/39049953196)
applied both versions, deployed the same SHA and passed readiness. Production migration-history
read-back confirms both versions. Existing aggregates remained 4 Workspaces, 8 Students, 4
purchases and 4 Sessions; all 3 completed Sessions have a source, with zero orphan sources and
zero generated purchases. Independent `/api/ready`, `/` and `/login` checks returned HTTP 200.
The release gate for this correction is complete. M8-D real-Coach admission and installed-device
checks remain open; this release alone does not close the overall package.

PR #35's first Development CI history guard rejected eight already-applied Development-only M8-E
versions. The corrected guard accepts only those exact versions, fetches their historical SQL
into temporary storage for the official dry-run and removes it afterward. Local guard tests and
the real Development dry-run passed with no pending migration; the final PR CI passed. No M8-E
migration was committed or applied to Production.
Reopen/delete now clears the affected Session's income and expense entry-state overrides in the
existing scheduling transaction so re-completion cannot revive an old manual amount; the focused
Finance plus scheduling-adapter checks passed 27/27.

Development project `yvhijxhtelujfsaplzpi` applied only M8-D migrations `20261017105438`
and `20261017110659`. The project had eight applied remote-only M8-E versions, so a temporary
external history audit fetched all 61 applied migrations and staged only these two M8-D files.
The official CLI dry-run listed exactly these two files, and remote migration history then
confirmed both applied. No M8-E file entered the isolated branch. Existing counts stayed 16
Students, 23 purchases, 158 Sessions and 8 Venues. Backfill created 139 fixed sources (132
manual, 7 legacy-unallocated); old and new remaining-balance formulas matched all 16 Students.
No live negative-balance Student existed. Underlying purchases and aggregate amount were unchanged;
a pre-migration monthly Finance snapshot was not captured.

Authenticated Development tests passed: Free priced no-purchase Session save/completion; Prime
two-item missing-price settlement including zero, stale all-or-nothing, replay and changed retry;
Venue-bound/general allocation priority; no-package two-week Series generation and idempotent
reconciliation; Prime 500-to-750 generated-price correction matching Finance, backdated manual
purchase without silent rewrite, explicit re-evaluation, reopen, re-completion and deletion.
Two concurrent completion requests returned one 200 and one 409 with one generated purchase;
a second Workspace received 404 for both Session read and completion.
Free pending read, settlement and generated correction API calls returned 403. Browser review on
5173 checked Student create, desktop and 390px layout, Calendar hints, in-context Venue creation,
no-purchase Session save and persisted Calendar display. A synthetic Prime browser pass settled a
pending item for 500, observed its removal and the matching Finance income, corrected it to 750
from Finance and then to 800 from purchase history, and read back the same 800 in both surfaces.
The earlier pending form and save control were visually checked at 390px without horizontal overflow.
Exact synthetic data and accounts were removed; Development aggregate counts returned to baseline.

Final `npm run check` passed root 36/36, API 295/295 and Web 367/367; `npm run build` passed.
The final local fixes add Student price to the Fastify HTTP schema, correct a PostgreSQL date alias
that caused a live completion 500, and enforce the Pro/Prime correction gate. Focused regressions,
typechecks and `git diff --check` passed. Exact-SHA remote CI, Production migration and release
remain unverified; the branch has not been pushed.

The earlier zero-income ledger iteration removed the separate pending card and passed Development
and desktop/390px checks. Its settlement-based row edit was superseded by the PO's later requirement
to preserve source and use an ordinary Finance override; see LOG-603 and LOG-605 for exact evidence.
The earlier root 36/36, Web 368/368, API 295/295 and API/Web build checks preceded the latest
correction; the latest scoped checks and live API result are recorded above. Exact-SHA remote CI and
Production remain unverified; there has been no push.

Known separate defect: deleting a Development Auth user with Venue-linked financial records can
fail in the existing `app_private.refresh_changed_venue_balance()` trigger because
`supabase_auth_admin` lacks private-schema access. Exact synthetic records were removed via
versioned API operations first, after which account cleanup passed. This account-deletion path
is outside the frozen single-lesson scope and was not changed. Next: PO inspection of the corrected
local UI and separate remote-delivery authorization. Keep
M8-E and Production untouched.

## Binding Beta plan policy

- Ordinary verified Coaches start and remain on Free while checkout is unavailable.
- One single-use permanent code grants Prime without an end date.
- One shared promotional code grants one 60-day Prime trial per verified Email and is not globally
  consumption-capped.
- There is no plan-tester code or pre-payment self-service plan mutation. Owner testing uses
  isolated fixtures or an individually authorized backend operation against the owner's Workspace.
- Raw operational codes stay outside source control; PostgreSQL stores SHA-256 digests.
- API authorization and capacity enforcement own the policy. Hidden Web controls are never the only
  restriction.
- Historical zero-price plan choices do not grant ordinary Coaches paid-plan access.
- M8-E owns provider-backed paid activation; expiry never charges or deletes Coach data silently.

The detailed behavior and migration contract live in
`docs/M8-D-BETA-PLAN-ACCESS-CONTRACT.md` and
`supabase/migrations/20261008063726_m8d_beta_plan_access_policy.sql`.

## Current repository and environment state

- 2026-10-15: The Product Owner approved Main delivery of the Landing return-to-top control.
  The isolated Web change shows a 48px lower-right shortcut after 120px of scrolling on desktop
  and mobile, follows reduced-motion preference, and leaves mobile safe-area spacing. Desktop and
  390px local previews confirmed the interaction and footer clearance. Isolated affected checks
  passed 3 files/11 tests, Web typecheck, formatting and diff whitespace. [PR #33](https://github.com/YambossMaster/Gym-Assistent/pull/33)
  passed required checks and merged as `4f49ca666914d2b8e9cefe30a4cf72e65dbff2ad`.
  [Main CI #218](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38698764401)
  passed verify/build, browser UI, Development migration no-op, Production migration preview,
  exact-SHA Fly deployment and readiness. Independent `/api/ready`, `/` and `/login` returned
  HTTP 200; the Production 390px Landing button appeared on scroll and returned to the hero.
  Payment, API and schema changes were excluded. See LOG-575.

- 2026-10-15: The Product Owner accepted the public Landing redesign and authorized mobile review, Main delivery and deployment. The isolated release retained published Pro/Prime prices (NT$119/NT$149 per month) and changed only Landing Web files and their tests. Desktop, 390px and 320px previews checked heading breaks, plan order, FAQ expansion, overflow and 44px mobile footer link targets; affected checks passed 10/10 tests, Web typecheck, formatting and diff whitespace. [PR #31](https://github.com/YambossMaster/Gym-Assistent/pull/31) passed required checks and merged as `692b252cb37e3a52ede1e21d00be654f1479c761`. [Main CI #214](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38688575905) passed verify/build, browser UI, Development migration no-op, Production migration preview, exact-SHA Fly deploy and readiness. Independent `/api/ready`, `/` and `/login` returned HTTP 200; the Production 390px page shows the new copy and prices without horizontal overflow. No payment, API or schema change was released. Installed-device acceptance and M8-D real-Coach admission remain separate. See LOG-569.

- On 2026-10-15 the Product Owner accepted the desktop extension of the list scroll shortcut and
  authorized Main push, CI and deployment. Exercise Library now offers return to top after
  scrolling when at least five visible exercises make the desktop page meaningfully long. Students
  switches between monthly finance/venue links and page top when at least nine visible students
  make the desktop page meaningfully long. The desktop button sits at the lower right; the mobile
  PWA gate and raised button position are unchanged. Focused tests passed 11/11 and Web typecheck
  passed in the source checkout. Authenticated desktop review showed no shortcut with six students;
  Exercise Library showed the button while scrolling 109 exercises and returned to `scrollY=0`.
  The nine-student behavior is covered by the component test. Isolated `npm run check` passed root
  scripts 36/36, API 286/286 and Web 362/362; `npm run build` passed.
  [PR #29](https://github.com/YambossMaster/Gym-Assistent/pull/29) passed required checks and
  merged as `d3d5b287740f5e5d4d1b06632851e579dd8c674c`.
  [Main CI #209](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38678469173)
  passed verify, browser UI, Development migration dry-run, Production migration preview,
  exact-SHA Fly deployment and readiness. Independent requests returned HTTP 200 for
  `/api/ready` (`{"status":"ready"}`), `/` and `/login`. No schema or API change is included.

- On 2026-10-15 the Product Owner accepted the single-Student detail card spacing and explicitly
  authorized Main push and deployment. The isolated release changes only route-scoped Web CSS:
  four cards share 35px desktop and 29px mobile top insets, aligned eyebrow/title typography,
  and matched schedule/purchase add buttons. Authenticated local desktop and 390px preview
  measurements put all four eyebrow offsets at 35.7px/29.7px and title offsets at 57.7px/51.7px.
  Root 36/36, API 286/286, Web 360/360 and API/Web builds pass. Local Supabase dry-run lacked
  this clean worktree's linked project. [PR #27](https://github.com/YambossMaster/Gym-Assistent/pull/27)
  passed required checks and merged as `ce309d8554cdc7055bcd8f286cddcd6e2681e63f`.
  [Main CI #206](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38631358128)
  passed verify, browser UI, Development migration dry-run, Production migration preview,
  exact-SHA Fly deploy and readiness. Independent requests returned HTTP 200 for `/api/ready`
  (`{"status":"ready"}`), `/` and `/login`. Installed-phone acceptance remains separate.
  See LOG-551.

- On 2026-10-15 the Product Owner accepted the mobile PWA Students/Exercise Library scroll
  shortcut and authorized isolated Main delivery, CI and deployment. The Students button appears
  with at least five visible students on a long compact page, jumps to the monthly finance and
  venue links, then returns to top in the lower half. The Exercise Library button returns to top
  after scrolling with at least five visible exercises. Both use the right edge above mobile
  navigation and are restricted to installed mobile PWA in Production; local mobile browser
  previews can show them. The Students downward jump keeps the header and bottom navigation
  visible until the next manual gesture. Product Owner 390px review passed after a correction;
  the same local preview settled at `scrollY=737.5` with visible chrome and no transforms.
  Isolated branch local `npm run check` and `npm run build` passed. [PR
  #25](https://github.com/YambossMaster/Gym-Assistent/pull/25) passed required verify, browser UI
  and migration dry-run checks and merged as `7ea8283d2c2ff50043723859a6d0630948f73dc0`.
  [Main CI](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38618476830) passed
  verify, browser UI, migration dry-run and Production preview, then deployed that exact SHA to
  Fly and passed readiness. Independent Production requests returned 200 for `/api/ready`, `/`
  and `/login`; the deployed JS contains the shortcut event marker. No schema or API change was
  included. Installed-device touch acceptance remains unobserved.

- The Product Owner requested two in-app notices for newly registered Coaches and explicitly
  waived screenshot review before Main delivery. The existing `協助與回饋` getting-started guide on
  Main is the second notice's destination. Today derives stable welcome and guide notices from
  a new Workspace timestamp, reuses Today read/dismiss state, and leaves existing Workspaces
  ineligible. Migration `20261014113954` was applied to Development and Production; their four
  and three pre-existing Workspaces respectively remain unmarked, with `now()` as the new-row
  default. API affected tests passed 286/286; Web typecheck/build passed. One local Web worker
  timed out after 337 tests passed; the isolated 19-test rerun and remote verify passed.
  [PR #23](https://github.com/YambossMaster/Gym-Assistent/pull/23) passed required checks and
  merged as `e35af9a`. [Main CI #198](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38562585025)
  passed all four checks and previewed only this migration. With the Product Owner's literal
  `APPLY`, [release #8](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38563009700)
  re-previewed, applied and deployed the same SHA; readiness passed. Independent public requests
  returned 200 for `/api/ready`, `/` and `/login`. First real new-Coach receipt remains unobserved.

- A desktop `/login` colour regression was traced to the 2026-10-11 iPhone Auth document-surface
  fix: `body:has(.auth-layout)` became dark at every viewport width, while the desktop form panel
  remained transparent. The form panel now uses `--paper` above the 480px mobile breakpoint;
  mobile Auth was not changed. Local 1440×900 and 390×844 previews, focused formatting, Web
  typecheck and whitespace checks passed. [PR #19](https://github.com/YambossMaster/Gym-Assistent/pull/19)
  passed all required checks and merged as `776d7511875f7202b6cc190f917a5d4503c9c804`.
  [Main CI #190](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38556109452)
  passed verify/build, browser UI, migration no-op, no-pending Production preview, exact-SHA Fly
  deployment and readiness. Independent Production requests returned 200 for `/api/ready` with
  `{"status":"ready"}`, `/` and `/login`; a fresh 1440px Production browser view rendered the
  restored dark-left/paper-right split with `.auth-panel` at `rgb(242, 240, 233)`.

- Payment release hold (2026-10-14): PO requested Commit/Main/CI/deploy, then explicitly narrowed
  delivery to backend only. No `apps/web` changes are included. Frontend selection/checkout work
  stays local with entry closed; Production retains its current Main frontend. API billing startup
  is hard-disabled. Existing PlanAccess and published legal terms remain unchanged. The planned
  NT$115/145 monthly catalog and NT$1,150/1,450 annual prices are not deployed by this release.
  Development has applied `20261014100438`; Production has not. Its exact SQL is stored under
  `supabase/development-only`; project-pinned staging lets the Development dry-run validate its real
  history without concealing unknown drift. Unapplied ledger SQL stays in `supabase/drafts/billing`.
  No database mutation or Production schema release is included. PR #21 merged as `f550daa`;
  Main CI #194 passed all jobs, both migration checks and exact-SHA Fly deployment/readiness.
  Independent checks returned 200 for API readiness and browser-accepting root/login requests;
  billing current/records routes remain 404. See LOG-547/548 and `M8-E-LOCAL-CHECKOUT.md`.

- The Product Owner's installed-iPhone Calendar recording showed the view and header being dragged
  upward at the timeline's bottom edge, exposing a paper-colored strip. At 390×844 the document
  itself has no ordinary scroll range; the week timeline is the intended nested scroller. The
  isolated mobile Calendar correction fixes its outer shell to the viewport and clips outer
  overflow while retaining timeline scrolling. Local 390px checks keep the header at top 0 and
  bottom navigation at the viewport edge after the week timeline reaches its end; Day, Month and
  Agenda also fit. Physical iPhone acceptance remains pending.
- The Product Owner approved a Settings `協助與回饋` upgrade with two task-focused guides. `如何開始使用
Form Coach Desk？` now appears first and walks through Student, purchase, Venue, scheduling and the
  first Course Session in five card-based steps. The PWA guide explains the purpose before showing
  separate iOS and Android image steps, uses the current `顯示更多` recovery wording and retains the
  published support address. The isolated Help tests pass 3/3, root check passes API 44 files / 213
  tests and Web 80 files / 356 tests, production build passes, and Playwright passes the existing
  Plan Choice plus Help journeys at 1440px and 390×844 (4/4). This UI-only change has no migration;
  [PR #16](https://github.com/YambossMaster/Gym-Assistent/pull/16) merged as exact Main SHA
  `bff1f75f42f8c1c5ebe03d3ba9d6c1d48bdc6d29`. Main CI #184 passed verify/build, browser UI,
  migration-job no-op, no-pending Production history comparison, same-SHA Fly deployment and
  readiness. Independent requests returned 200 for `/api/ready`, `/`, `/login` and both new PWA
  image assets. Installed-device instructional accuracy remains Product Owner acceptance, not a
  browser/deployment claim.
- The Product Owner's follow-up iPhone recording confirmed the edge bounce but showed the mobile
  header moving with it and intermittently flashing on `今日`. The isolated correction fixes the
  header to the viewport on the seven bounce-enabled route families, reserves its content space,
  and removes transform promotion/transition from pinned chrome. Direction-based hide/show remains.
  Web typecheck, focused mobile tests (13/13), scoped formatting and whitespace checks pass;
  installed-iPhone acceptance remains pending.
- The Product Owner's installed-iPhone recordings showed the main `今日` document stopping at its
  vertical edges while a scheduling form's own scroll region rubber-banded. The scoped mobile CSS
  correction restores native edge bounce on `今日`, `學生`, `動作庫`, student detail, `本月收支`,
  `場地管理` and `設定`. Calendar and focused Training notes retain their separate boundaries.
  Installed-PWA recheck is pending after the isolated release; this CSS change has no migration.
- The Product Owner confirmed the revised future paid catalog on 2026-10-12: Pro NT$119/month or
  NT$1,190/year; Prime NT$149/month or NT$1,490/year. The public landing page and authenticated
  plan comparison show these amounts and the ten-month annual-price rule remains consistent.
  Beta self-service checkout remains unavailable; no payment amount or entitlement changed.
  [PR #9](https://github.com/YambossMaster/Gym-Assistent/pull/9) merged as
  `70c8982e9eda62513ad5b303b5720f3879192fbf`. [Main CI #167](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38210536364)
  passed verify/build, browser UI, both migration checks and exact-SHA Fly deployment/readiness.
  Independent Production requests returned 200 for /api/ready, / and /login; the public landing
  and authenticated plan comparison displayed both new monthly and annual amounts.
- Agent operations reporting is released. [PR #7](https://github.com/YambossMaster/Gym-Assistent/pull/7)
  merged as `9cafd3976450787f79402a306eda2a7a6fd6eb2f`; [Main CI #163](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38208317155)
  passed all four required jobs. [Production release #6](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38208563818)
  applied only private migration `20261012041429`, deployed the same SHA and passed readiness.
  The Product Owner's three existing verified Workspace owners are individually classified:
  owner `test/owner`, two Alpha accounts `test/manual`. Read-back found one audit event each,
  zero classification integrity errors, and no `authenticated` or `service_role` SELECT privilege.
  Reporting queries found zero real Coaches, two test Free and one test permanent Prime account;
  both issued Beta codes remain unused. The report remains Agent-only; no reporting UI, payment
  authority or schedule was added.
- The Product Owner rejected `unclassified` as an operational account state. Migration
  `20261012084858` assigns every Auth identity in the same transaction that creates it: public Web
  Email/Google registration becomes `real`. Development live verification then proved that custom
  Auth-admin app metadata is unavailable at the INSERT trigger boundary. Follow-up migration
  `20261014034039` replaces that unsafe assumption with a private, 10-minute, single-use test-account
  intent consumed atomically by Email. Unsupported creation paths, missing internal intents and
  invalid test kinds abort Auth creation.
  Existing missing labels are backfilled as `real` under the confirmed product rule; a remaining
  gap aborts the migration. Development fixtures now verify the trigger result instead of repairing
  it afterward, and report queries treat any missing label as an integrity defect. Final affected
  preflight passed API 44 files / 213 tests, Web 79 files / 353 tests, both typechecks, formatting
  and whitespace checks. Both migrations are applied in Development and Production. The three-path
  classification live E2E passed public
  Email as `real`, trusted intent as `test/automation`, unsupported creation fail-closed and exact
  cleanup. Existing password and Beta live E2E also passed with the new intent protocol. PR #11
  merged as exact main SHA `e802de47ce7119f57a958f9bde6e0683bc57214b`; main CI #169 passed all
  four required checks. Production release #7 re-previewed and applied only `20261012084858` and
  `20261014034039`, deployed that exact SHA, and passed readiness. Independent `/api/ready`, `/` and
  `/login` requests returned 200. Production read-back has three classified test Coaches, zero real
  Coaches and zero classification-integrity errors.
- **Alpha/Beta boundary:** M8-C internal Alpha uses the Product Owner and synthetic accounts;
  the Product Owner already ran its first core-path round on an installed phone. M8-D's first
  real-Coach observation occurs when Beta opens. It is not an additional Alpha test or a request
  to repeat the same Happy Paths with agent-operated PWA E2E. For already exercised flows, retain
  the Alpha evidence; check only unresolved version-specific device defects before release.
  Keep the M8-D Beta admission result open until a real Coach actually joins; do not claim that
  person or outcome existed during Alpha.
- The Product Owner approved a final Alpha red-line pass focused on tenant isolation and Beta
  business-rule integrity, with extreme load and autonomous exploit campaigns deferred until after
  Beta stabilizes. The [verification record](../../ALPHA-REDLINE-VERIFICATION.md) separates signed-in
  User-JWT API requests from privileged fixture administration and direct runtime-role RLS checks.
  A fresh two-Coach development probe passed cross-Workspace list/detail/update/delete/session
  denial, owner read-back, private-schema grants and Calendar subscription RLS, then confirmed exact
  fixture cleanup. The early Student table has no RLS; its protection is the private schema plus
  server-owned Workspace predicates, so no Student RLS pass is claimed. The isolated Beta live E2E
  passed, along with 63 focused Beta, plan, Calendar, export, public-link and HTTP tests. An older
  finance live script stopped at a Free venue-capacity response before its isolation assertion; its
  fixtures were cleaned and it supplies no passing evidence for this run. The later Production
  User-JWT smoke passed after release #5; see the Next handoff.
- A local PWA update correction is ready for Product Owner review. Production builds now emit a
  no-cache build marker and asset list; the running app checks on return to foreground, primary-route
  changes and a 15-minute visible interval, with a five-minute check floor. It prepares the new
  entry assets, then automatically reloads only from a primary route after four seconds without
  interaction. Form edits, active controls, dialogs, busy UI and Training detail defer the reload;
  navigation clears the route-local edit hold. The reload preserves the current URL and uses a short
  branded loading screen with reduced-motion support. Stale active queries now refetch in the
  background on return to foreground. The Service Worker excludes the version file and immutable
  assets from its own cache and deletes only its own older shell caches. Focused Web tests pass 2
  files / 9 tests, Web typecheck passes, and static desktop/390×844 loading visuals were inspected.
  A production build, running installed-PWA update across two real deployments, and full CI gate
  remain unverified pending Product Owner review; this local correction has not been committed or
  pushed and does not alter the pending two-code migration release.
- The Product Owner removed the former plan-tester code and self-service test switching on
  2026-10-10. Local Sol now exposes only permanent and promotional redemption classes, removes the
  authenticated plan-mutation route and tester UI/API states, and returns historical tester grants
  to ordinary Free behavior. Migration `20261010110051_remove_plan_tester_entitlement.sql` revokes
  historical tester codes, removes active tester grants while retaining their audit ledger, blocks
  new tester data, narrows the permanent-code index and removes tester-aware capacity rules. Focused
  API tests pass 3 files / 31 tests; focused Web tests pass 2 files / 10 tests; both typechecks,
  targeted formatting and whitespace checks pass. The full local gate passes API 43 files / 209
  tests and Web 78 files / 349 tests, followed by a successful production build. Development applied
  migration `20261010110051`; the isolated Beta live E2E then found that the operator-only direct
  permanent grant had been removed, so that owner-testing operation was restored without restoring
  a tester code or self-service mutation. Its focused checks and live E2E pass, and read-back confirms
  no active fixture code, tester code/grant or Beta E2E Auth user remains. Exact SHA
  `d12edc70942a96e7c73e8c7d86e3135de2b66ba0` is now on Main; CI #148 passed verify/build, Browser UI,
  development migration dry-run and Production preview. The preview lists only `20261010110051` and
  correctly held deployment for literal `APPLY`. Before this delivery, an isolated two-account
  Production browser matrix passed permanent single-use, shared promotional, repeat, cross-code and
  exact 60-day rules; both accounts, both codes and all related fixture rows were deleted and read
  back as zero. Production has now applied the correction through release #5. The local
  Plan Choice browser case passes at 1440px and 390px. Development security
  advisor has no new plan-access finding; leaked-password protection remains the pre-existing Auth
  warning, and performance advisor findings are informational/pre-existing.
- Delivered release-workflow hardening separates actual schema migrations from release-gate/Fly
  configuration changes. It validates declared Fly secret names before ordinary deploy and before
  Production migration apply, fails before SQL for missing startup-required values, warns for
  feature-required degradation, captures redacted bounded Fly logs plus machine state on failure,
  and prevents empty commits from deploying. Migration changes retain the preview and literal
  `APPLY` hold. Focused safeguard tests pass; Product Owner review and the broader delivery gate are
  complete locally: root check passes 33 release tests, API 43 files / 209 tests and Web 78 files /
  349 tests; production build and development migration dry-run pass. Exact SHA `8f8c480` is on
  Main; CI #146 passed every required job, deployed it to Fly and passed readiness. Independent
  external checks returned 200 for readiness, root and `/login`.
- GitHub job evidence corrects the incident interpretation: CI #143 for `e2e275f` successfully ran
  `deploy-production` and readiness. The empty `6073cf1` commit began while that workflow was still
  running, so it was not required by the safeguard. Release handling must wait for the exact-SHA job
  to reach a terminal state before deciding on a rerun or new commit.

- The Product Owner's calendar-integration review replaces the stacked collapsibles with two tabs,
  makes labels and all controls directly interactive, keeps the active private URL copyable across
  dialog sessions, uses Toast feedback and requires a destructive reset confirmation. The retained
  Google／Apple guide gives short device-specific steps, explains Google's desktop-only URL setup,
  sets honest refresh expectations and is now default-collapsed below the interactive management
  controls. Local Sol
  adds an HMAC-derived URL contract that stores only a random salt plus token hash, and migration
  `20261010054011_calendar_subscription_recoverable_url.sql`. It is applied to development and
  Production. Exact-SHA CI #139 passed the full gate, release #4 applied this migration, and
  recovery CI #144 deployed the corrected Fly auto-start configuration.
  Isolated Chromium review at desktop and 390×844 confirms Tabs, the portalled quick-range menu,
  date picker and checkboxes remain visible and interactive. Product Owner review and the broader
  CI gate passed. The development-only Calendar subscription secret remains configured in the
  ignored API environment; the normal Windows launcher passes API readiness and serves `/today`.
  Production still needs its own stable Calendar application secret. Until then, existing feeds
  remain readable while create/reset/recovery URL operations fail closed with 503.
- The shared setting-dialog continuation cue now applies at desktop as well as mobile widths. It
  measures each declared scroll owner, adds a shallow bottom fade / `向下滑看更多 ↓` affordance only
  while content remains, and clears it at the lower boundary or whenever the content fits. The
  Product Owner rejected the added scrollbar rail, so the established thin transparent-track style
  is restored. A higher-specificity inherited form margin was the real blank strip below the fixed
  header; the export form now starts exactly at the header boundary. Calendar sharing choices now
  persist without exposing implementation-status copy, and the unsupported reserved-time choice is
  removed from both subscription and one-time export. Changing Calendar tabs now resets the shared
  scroll owner to its true top. The collapsed guide follows URL and advanced management, and
  single-export options use a compact row with dark CTA. Redundant student-name explanation copy is
  removed; the mobile subscription URL and its accessible icon-only copy action remain on one row.
  The Product Owner approved this presentation correction for the combined Main delivery.
- Development migration `20261010054011` was applied after the local Calendar dialog reproducibly
  failed while the API remained ready. A read-only schema probe proved `token_salt` was absent before
  apply and present afterward; retrying the same authenticated Chrome flow then loaded both Calendar
  tabs. Production release #4 later applied the same migration.
- The Product Owner's installed-PWA review found the finance export form lacked scannable field
  hierarchy and that all three custom selects appeared inert. The local correction groups controls
  into Time, Filter and Export sections, exposes persistent labels and the private-note checkbox,
  de-emphasizes the footer summary, and raises portalled select menus above the dialog backdrop.
  Focused Web tests pass 3 files / 11 tests; isolated desktop and 390×844 browser review confirms
  the middle scroller, fixed footer and visible select menus. The Product Owner approved the
  accumulated correction for commit, Main push, CI and deployment; it is now deployed.
- On 2026-10-10 the Product Owner reported the first Alpha PWA test round finished and requested
  export redesign discussion, then approved local implementation of the two Settings specifications.
  Preserve its core-path evidence without repeating it; the separate Beta admission outcome and
  unresolved later-version device corrections are still open. The follow-up explicitly
  authorizes commit, push Main, CI and deployment after checks. On 2026-10-10 the Product Owner also
  stated `APPLY`; the release workflow still requires the final literal confirmation after its
  exact-SHA Production preview.
- The explicitly authorized owner-account Prime grant was applied to Production Workspace
  `0c541f3a-257f-49f6-8318-49611435bfe9`. A read-back confirmed `permanent`, no expiry and effective
  `advanced`; operator event `44c82ae1-aa27-4b9c-9a22-57c707ffa242` records the request. No code was
  consumed, payment created or subscription changed. Authenticated PWA display was not checked.
- The same verified owner Email was explicitly granted revocable, no-expiry Prime in the separate
  development project for local feature testing. Development read-back confirms Workspace
  `4ba6de2b-520d-4c65-88d0-1fd7d529ae0b` is `permanent` / effective `advanced`; its existing
  zero-price subscription row remains intact. Operator event
  `802e0c30-805d-45c8-8293-155be3272f78` records the request. Production was not touched.

- The Product Owner narrowed the next design to finance exports and calendar integration, both
  under Settings as separate features, and deferred training/performance export options. Existing
  click-triggered Prime Upsell remains for Free/Pro; do not add entrances or banners to their daily
  Finance/Calendar paths. Review drafts: [finance](../../FINANCE-EXPORT-DRAFT.md) and
  [calendar](../../CALENDAR-INTEGRATION-DRAFT.md). On 2026-10-10 the PO approved both specifications
  with Coach-prefixed filenames and arbitrary historical ranges (up to 366 inclusive days).
  The Roadmap records this follow-on correction without reopening the M8-B-Export baseline.

- Settings-data Contract is frozen in those specifications and
  [engineering contract](../../SETTINGS-DATA-IMPLEMENTATION.md). Local Sol includes two separate
  panels, XLSX/CSV exports, ICS downloads, hashed-token subscriptions and minimal cancellation
  history. Legacy API returns 410 when both replacements are installed. No underlying records
  are deleted. The draft TWD cents example was corrected against existing whole-dollar storage.
- Focused API 7 files / 37 tests and Web 2 files / 5 tests pass; both typechecks pass. Offline sample
  generator produces revised files in ignored `output/settings-data-review-v2/`. Native Excel
  read-only rendering and visual inspection now pass; the summary puts totals before compact notes.
- Development preview and apply completed for calendar migration `20261009171747` and its two
  reviewed baseline dependencies. Actual runtime-role rollback-only RLS test passes 9 assertions;
  no fixture rows remain. Production was not changed. Full and production-only dependency audits
  report 0 findings; actual ExcelJS resolves patched uuid 11.1.1 and focused tests pass afterward.
- The initial serializer blocker is corrected with an isolated, terminable Worker and streaming
  XLSX rows. Compiled-JS 20,000-row rerun: 14,216 ms / peak 203 MiB / max main-loop delay 94 ms
  (formerly 20,919 ms / 514 MiB / 13,741 ms). This is local serializer, not production-host/DB load.
  Background status survives route changes; duplicate guarding, cancellation, elapsed time,
  ready/save action and five-minute in-memory expiry are implemented. No fake ETA or closed-App
  continuation promise. Desktop/390x844 synthetic Chrome flow passed through file-ready state;
  the connector disconnected during download-event observation, so device saving is unverified.
  Apple and Google initial subscription checks now passed with synthetic feeds; installed-PWA
  acceptance remains separate. The PO accepted Fly upstream private-path log residual risk.
- Release preflight: API full run 200 passed / one existing PDF timeout; isolated unchanged format
  rerun 5/5 passed. Web 77 files / 342 tests, both typechecks and production builds pass. Real
  development calendar adapter lifecycle passes under rollback-only savepoints; independent readback
  confirms no fixtures remain. Latest streaming workbook passed native Excel/PDF visual recheck.
  Exact-SHA remote CI remains mandatory; this is not a claim that the initial full run was green.
- Main `13587f054e44ec370b89f6b9398b92cc199c2fea` is pushed; [CI #136](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37977614654)
  passed API 201 / Web 342, builds, browser UI and both migration checks. Production preview lists
  only `20261009171747`; PO supplied literal APPLY for that preview. Migration/deploy remain
  unstarted at that checkpoint, pending fresh exact-SHA CI and preview for the private-path
  correction. Release #3 later completed; see the Next handoff for current state and the engineering
  contract for the accepted upstream path-log residual risk.

- Latest deployed correction: `c5db63f3b315aa84ca606aafd3269d7ed112e531`.
- Product Owner-retained M8-D corrections, release safeguards and Status split were committed
  together. Reconcile any subsequent work with `git status --short`.
- Production is a healthy Tokyo Fly internal Alpha with no real Coach admitted. The two dedicated
  red-line synthetic accounts were deleted and exact residue read-back was zero.
- Production preview on CI #120 attempt 2 lists only plan-access migration `20261008063726` as
  pending. Legal acceptance `20261006145359` is no longer pending according to linked history and
  dry-run; its application provenance remains to be established.
- The new Production-scoped PAT has the four required Read scopes and passed the pooler/history
  pre-flight. It replaced only GitHub's Production access-token secret; the previous PAT remains
  valid pending separately authorized revocation.
- [Manual Production release #2](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37823400258)
  applied `20261008063726`, deployed exact SHA `fb75b7d878d8d50731e15fbcf1d771a451dbee30`,
  and returned `{"status":"ready"}` from `/api/ready` on 2026-10-09. The authenticated Web
  workspace loaded afterward. This is implementation delivery, not real-Coach admission.
- [CI #121](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37830139443) passed verify,
  browser UI, development migration dry-run and Production preview for `0632e04`, then automatically
  deployed the non-migration Coach-note correction. Public `/api/ready` and deployed JS/CSS marker
  checks passed afterward.
- [CI #126](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37833191147) passed verify
  (API 183 tests, Web 322 tests and build), browser UI, both migration gates and automatic Production
  deploy for `3afb556`. Public readiness returned `ready`; deployed JS/CSS markers confirm the shared
  header exit event and touch containment are present and the old viewport-top variable is absent.
- [CI #128](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37883138506) passed verify
  (API 183 tests, Web 325 tests and build), browser UI, both migration gates and automatic Production
  deploy for exact SHA `01423cd`. Public readiness returned `ready`; deployed JS/CSS markers confirm
  caret `preventScroll`, whole-focus touch containment and non-scrollable header/toolbar touch action.
- [CI #130](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37895583759) passed verify
  (API 183 tests, Web 326 tests and build), 2 browser UI cases, both migration gates and automatic
  Production deploy for exact SHA `cd34fcc`. Public readiness returned `ready`; deployed
  `/assets/index-DFzqqHzH.js` contains the focus root, viewport-height and mobile-note-canvas markers.

- [CI #133](https://github.com/YambossMaster/Gym-Assistent/actions/runs/37949502049) for exact SHA
  `c5db63f` passed verify (API 183 tests, Web 334 tests and production builds), browser UI and
  Production migration preview. Development migration linking failed with `Invalid access token`,
  repeating CI #132's credential rejection on attempt 1. After the authorized development token
  replacement, attempt 2 passed migration dry-run and deploy-production. Public readiness returned
  ready; index-6I3S6YCI.js and index-Dh6z7Ukn.css contain the new viewport-top markers, and the JS
  contains read-only entry and caret preventScroll. No migration was applied during this correction.

## Current local review inventory

| Area                    | Current fact                                                                                                            | Remaining evidence                                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Release safeguards      | CI #120 proved fail-fast 403 on attempt 1, passed pooler/history/dry-run on attempt 2, and release #2 applied/deployed  | Continue monitoring future releases; no current release blocker |
| Plan access             | Two-code local/development gates, pre-release Production matrix, CI #148, release #5 and User-JWT smoke pass            | Real-Coach admission gate remains separate                      |
| Mobile Training         | Completed-tap entry and visual-position compensation passed related tests, browser matrix and CI #133; deployed c5db63f | Installed-phone keyboard and lower-paragraph recheck            |
| Mobile dialogs/settings | Capability sheets, Student field scroller, required labels and hidden-content cues passed focused and combined CI tests | Authenticated/installed-phone rendering                         |
| Scheduling/Venue        | Fixed-schedule default/copy and Venue decision preview passed combined CI                                               | Combined browser/product review                                 |

Exact pre-split local test counts and diagnostic narratives remain in LOG-450–LOG-462 of the
[legacy Status](../archive/PROJECT_STATUS-legacy-through-2026-10-09.md). Load those entries only
when reviewing the matching change or evidence claim.

## Direct dependencies and conditional context

Always read:

- `docs/ROADMAP.md`: Delivery model, M8-D, Sequencing and change control.
- `docs/M8-D-BETA-PLAN-ACCESS-CONTRACT.md` for plan-access implementation or review.

Read [`M8-C.md`](M8-C.md) for Production, release workflow, legal/Auth admission or installed-PWA
work. For entitlement regressions predating M8-D, search the legacy M8-B and M8-B-Plan-Choice
records. For formal-Web route convergence, follow [`../DEMO.md`](../DEMO.md) and inspect only the
matching Demo route/components.

## Blockers and open gates

The former Coach-note credential delivery hold is resolved.
Read-only diagnosis found `GitHub_Actions_CI` marked Expired in Supabase and the development
GitHub secret last updated 2026-09-09; the separate Production secret was updated 2026-10-08 and
its current token expires 2027-01-07. The workflow and CLI lockfile did not change between the
successful CI #130 and failed correction runs. No token or secret was mutated during diagnosis.
The Product Owner authorized the replacement. A new development-project-scoped PAT with only
Project Settings, API Keys, API Key Secrets and Connection Pooling Read was created, expiring
2027-10-08. After the owner completed Confirm access, GitHub displayed Secret updated at
2026-10-09 23:41 Taipei. The one-time token display was closed; CI #133 attempt 2 passed and deployed.
Do not bypass a required database-boundary migration dry-run; the Production token/preview already
passed.

1. Keep the legal acceptance migration's historical apply-run provenance as an audit note; current
   Production history, schema and private grants are verified, so do not reapply it or repeat Alpha
   testing. Revoke the old PAT only after separate authorization; the new PAT expires 2027-01-07.
2. Monitor the active `main` backup's 48-hour freshness operationally; complete support/admission
   and real-Coach Beta gates before admitting the first real Coach. The isolated restore and PR/CI
   reviewer substitute have passed; a second trigger-mode test is not required.
3. Record installed-device coverage honestly: the Product Owner's current Production iPhone Coach
   Notes recheck passed on 2026-10-11; Android and later changed Settings/PWA-update flows are
   separate and unverified. Browser 390×844 evidence is not installed-PWA proof.

## Next handoff

[PR #2](https://github.com/YambossMaster/Gym-Assistent/pull/2) merged as `809dd164` after final
exact-head [PR CI](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38079713292)
passed all three required checks. [Main
CI](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38079958383) passed the full
verify, browser, migration dry-run, no-pending Production preview, exact-SHA Fly deployment and
readiness. The manually dispatched [backup
#10](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38080005792) produced the first
encrypted `main` artifact and passed isolated restore and aggregate read-back. Monitor the next
daily runs operationally and keep admission stopped if the latest recoverable point exceeds 48 hours.
The separate local PWA update and loading screen remain awaiting Product Owner review.

Release [#5](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38064919971) re-previewed
and applied only `20261010110051_remove_plan_tester_entitlement.sql`, deployed exact SHA
`d12edc70942a96e7c73e8c7d86e3135de2b66ba0`, and returned `{"status":"ready"}` from
`/api/ready`. Production migration history includes that version; aggregate read-back found zero
active tester codes or grants. The Product Owner then authorized two dedicated Production synthetic
accounts. Both signed in for the bounded User-JWT red-line smoke: cross-account Student and Session
access was denied, Free and removed plan-mutation boundaries held, owner data remained intact, and
exact Auth/Workspace/Student read-back after cleanup was zero. No `service_role` key was used in
test API requests. The Product Owner chose daily GitHub Actions encrypted logical dumps on Supabase
Free without PITR and PR plus required CI instead of human Required Reviewers. The backup workflow
was pushed to a dedicated test branch. After diagnostic corrections, [Actions
#9](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38077980013) uploaded and
downloaded the encrypted artifact, verified all five SQL hashes, disconnected the restore DB from
every network, and read back Auth users 3, Workspaces 3 and the latest migration once. Production
aggregate recheck matched the counts, found zero Storage objects/buckets and Vault secrets, and
confirmed the one active `pg_net` cron job; `/api/ready` returned HTTP 200. A local restore copy
omitted exactly one managed logging-parameter grant after source checksum verification. GitHub
ruleset `24849299` is Active on `main` with PR, zero human approvals, no bypass and three required
CI checks. PR #2 proved the pending-then-green gate at `ee43614`; it then merged as `809dd164` and
`main` backup #10 passed. Later scheduled runs are operational monitoring rather than an M8-D gate. See
[`M8-D-RECOVERY-REVIEWER-TEST.md`](../../M8-D-RECOVERY-REVIEWER-TEST.md). The broader
installed-device and real-Coach admission gates remain separate.

Release-workflow hardening is complete: exact SHA `8f8c480` passed CI #146 verify/build, browser,
development migration dry-run, fresh no-pending Production preview, runtime-secret preflight, Fly
deployment and readiness. Independent external checks returned 200 for `/api/ready`, root and
`/login`. Do not create a new commit merely to retrigger a still-running exact-SHA workflow.

Configure one stable, independently generated 256-bit `CALENDAR_SUBSCRIPTION_SECRET` in Fly
Production. It is an application cryptographic secret, not a Supabase access token. Fly will restart
the machine after the secret change; recheck `/api/ready`, root and `/login`, then verify an
authenticated Calendar subscription create, recover and reset flow. Never print the secret or a
private subscription URL in evidence.

Exact-SHA CI #139 passed for the approved Settings correction (API 208 / Web 349), and release #4
applied only `20261010054011`. The following deploy failure was unrelated to the missing Calendar
secret: CI #142 diagnostics proved the existing Fly machine was stopped while
`auto_start_machines = false`. The API was also changed to start fail-closed without the optional
secret, preserving existing feed reads and limiting only create/reset/recovery URL operations.
After enabling Fly auto-start, CI #144 deployed exact SHA `6073cf1` and passed readiness;
independent browser-equivalent checks returned 200 for root and `/login`, and `/api/ready` returned
`{"status":"ready"}`.

PO approved the 256-bit private path after the bounded Basic Auth Google test failed and explicitly
accepted Fly upstream path-log residual risk. The synthetic Google private feed returned 200 to
Google and its event appeared in the Chrome calendar. Apple initial ICS subscription passed;
third-party refresh timing remains unverified. See `docs/CALENDAR-SUBSCRIPTION-SECURITY.md`.
CI #137 passed for `ef347c4` (API 208 / Web 343, browser UI, migration dry-run and Production
preview). Release #3 re-previewed and applied only `20261009171747`, deployed the same commit,
and passed `/api/ready`; separate public readback returned 200. An invalid private feed returned
404 and `no-store, private`. Production migration history and RLS/private grants were read back;
security advisor has only the pre-existing Auth leaked-password-protection warning. The temporary
probe was stopped and all three disposable Google subscriptions were removed. Next is PO installed-
PWA acceptance of the two Settings tools; external subscription refresh cadence is unverified.
The remaining changed-flow installed-device and real-Coach admission gates stay open in M8-D;
recovery and reviewer-control gates passed. Legal-migration provenance is a historical audit note,
not an Alpha retest. Old PAT revocation remains separately authorized work.
