# M8-C status — Production deployment and internal Alpha

> State: Done — Production internal-Alpha acceptance complete; M8-D owns Beta opening.
> Last verified: 2026-10-11.

## Durable outcome

- The selected topology is Local plus one Production environment: one same-origin Fly Web/API app
  and a separate Supabase Production project. There is no staging environment or custom ops panel.
- `https://formcoachdesk.com` serves the public landing, `/login`, bilingual Terms and Privacy,
  authenticated PWA routes and `/api`; `/api/ready` is the readiness endpoint.
- Public operating identity is `Form Coach Desk Studio`, Taipei, Taiwan, with
  `support@formcoachdesk.com`. Paid checkout remains unavailable.
- Email/password signup, verification/recovery and Google sign-in are open during Alpha. First-use
  legal acceptance and tenant isolation remain server-owned requirements.
- Production contains synthetic Alpha data only. M8-C deployment never authorized real-Coach
  admission.

## Release contract carried into M8-D

- A green non-documentation, non-migration Main change may deploy automatically only after its
  required verify, browser and development-migration jobs pass.
- Any pending or changed Production migration requires a successful Production preview and holds
  deployment. Apply uses the exact reviewed SHA and literal `APPLY`, followed by same-SHA deploy.
- M8-D's approved single-developer exception uses protected PRs and required CI checks instead of
  human Environment reviewers; its saved ruleset and pending-then-green behavior passed.
- A push, a docs-only green run or an app deploy that skipped required migration state is not
  complete release evidence.

## Delivered evidence summary

- Production foundation, exact-SHA Fly deployment automation, public landing/legal pages, PWA icon
  and multiple mobile corrections reached Main through observed GitHub Actions runs recorded in the
  legacy Status.
- The latest M8-D release and CI outcome are tracked in `M8-D.md`. Main CI #153 deployed exact SHA
  `809dd164ee43bcc697f1069e35cc7ef668fbf0e6` after verify, browser and migration-preview jobs;
  its readiness check passed. A Main push alone remains insufficient evidence.
- The Product Owner's first installed-phone Alpha round covered the core path; the final
  version-specific iPhone Coach Notes recheck passed on 2026-10-11. Android remains untested as
  permitted by the Roadmap.
- Production red-line smoke with two synthetic User JWT accounts passed cross-account isolation
  and Free-plan boundaries; exact test fixtures were deleted and read back as zero. The first
  `main` backup and isolated restore passed. These are Alpha-to-Beta safety evidence, not a
  first-real-Coach claim.

Use the [legacy Status](../archive/PROJECT_STATUS-legacy-through-2026-10-09.md) only when exact
commit, run, asset-hash or route-check evidence is required.

## Carry-over into M8-D

- The old M8-C handoff listed `20261006145359` and `20261008063726` as unapplied. Current Production
  history contains both and the legal-acceptance table and private role grants are present. The
  exact historical apply run for `20261006145359` is still unknown, but current schema and runtime
  controls passed. The Production PAT's missing `Connection Pooling: Read` permission was corrected
  during M8-D; old-PAT revocation remains separately authorized maintenance.
- The Product Owner completed the first installed-phone Alpha core-path round and on 2026-10-11
  confirmed that the current Production iPhone PWA Coach Notes correction passes short-tap entry,
  immediate keyboard focus, contained header/toolbar drags and keyboard-close operation. Do not
  repeat those Happy Paths with agent-operated E2E. Android was not tested and is recorded as an
  untested platform, as the Roadmap allows. Later M8-D Settings and local PWA update corrections
  have their own changed-flow acceptance; they do not retroactively invalidate M8-C's Alpha round.
- Production Supabase was `ACTIVE_HEALTHY` on 2026-10-11. The current database size was 15,103,667
  bytes (about 14 MB). The organization Usage view showed the Production project on a 2 GB
  provisioned disk with zero current-period disk overage; Billing showed Free plan and spend cap
  enabled. Production migration history includes `20261006145359_m8_legal_acceptance`, the table
  exists, the API role can read it, and `anon`/`authenticated` cannot. Two email-provider Auth
  users were confirmed and had signed in. These are current-state checks; the exact historical
  application run for `20261006145359` remains unknown.
- The Product Owner signed into the Fly account owning `formcoachdesk`. The App overview showed one
  deployed/running Tokyo Machine (`shared-1x-cpu@512MB`, release v28). Metrics showed last-hour
  p95 HTTP response 272 ms and memory used about 123 MB of 459 MB. The 2026-10-05–11 Cost Explorer
  showed US$0.74 estimated spend (US$0.43 CPU, US$0.30 additional RAM; displayed line items are
  rounded), Billing showed Good Standing, US$0.74 upcoming invoice and a billing email recipient.
  The organization Machine limit showed 1/20. No custom spend-alert control was visible on the
  inspected Fly App, organization or account pages; this does not claim a custom threshold alert.
  Supabase Free spend cap, usage and capacity dashboards were verified separately. This satisfies
  the available provider-cost/usage visibility check without inventing an unavailable alert.
- First real-Coach admission belongs to M8-D Beta opening and is not an internal-Alpha test.
- Credentials issued with the Alpha setup use the recorded 90-day rotation window ending before
  2027-01-05; rotation is not implicitly authorized by this status.

This file is a direct dependency only for Production, release, Auth/legal admission and installed-
PWA work. Ordinary M8-D UI/domain work does not load it by default.
