# M8-C status — Production deployment and internal Alpha

> State: Production foundation delivered; acceptance and release carry-over remains open for M8-D.
> Last verified: 2026-10-09.

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
- M8-D must enable and retain required GitHub `production` Environment reviewers before Beta.
- A push, a docs-only green run or an app deploy that skipped required migration state is not
  complete release evidence.

## Delivered evidence summary

- Production foundation, exact-SHA Fly deployment automation, public landing/legal pages, PWA icon
  and multiple mobile corrections reached Main through observed GitHub Actions runs recorded in the
  legacy Status.
- The current remote Main is `ce57f826d83bd28f374854c660c083be6d2c2635`.
- M8-D implementation reached Main through `92519d0402ec87ded6a05aa438334775462909ea`, but its
  Production gate did not complete.
- `/api/ready` and the public routes were observed healthy after earlier exact-SHA deployments.

Use the [legacy Status](../archive/PROJECT_STATUS-legacy-through-2026-10-09.md) only when exact
commit, run, asset-hash or route-check evidence is required.

## Carry-over into M8-D

- Production migrations `20261006145359` and `20261008063726` are unapplied.
- The scoped Production PAT lacks `Connection Pooling: Read`, blocking authoritative pooler/history
  validation.
- Installed iOS/Android acceptance remains incomplete for the current accumulated mobile version.
- Production reviewer controls, backup/restore evidence and real-Coach admission belong to M8-D.
- Credentials issued with the Alpha setup use the recorded 90-day rotation window ending before
  2027-01-05; rotation is not implicitly authorized by this status.

This file is a direct dependency only for Production, release, Auth/legal admission and installed-
PWA work. Ordinary M8-D UI/domain work does not load it by default.
