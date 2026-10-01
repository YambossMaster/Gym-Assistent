# M8-A lean release contract — Local + Production

> Frozen 2026-10-01 by the Product Owner's MVP direction. This Contract covers local release
> preparation only; production provisioning and real-Coach admission belong to M8-C and M8-D.
> [ROADMAP.md](ROADMAP.md) governs scope and order; [PROJECT_STATUS.md](PROJECT_STATUS.md) records
> implementation evidence.

## Product goal and boundaries

The immediate goal is to let a small number of real Coaches sign in and reliably save Student,
Session and Training data, then learn from actual use. This is a single-developer MVP. Prefer a
short manual verification path over staging infrastructure, custom operations software and
automated disaster exercises. Do not weaken verified Workspace isolation, private data boundaries,
secret handling, or truthful data-loss disclosure to save time.

The runtime shape is **Local + Production**. Local uses the existing development Supabase project
and Vite/Fastify processes. Production will use a separate Supabase Free project and one Fly.io app
serving the built Web and Fastify API under one HTTPS origin. There is no staging project, project
pause rotation, or synthetic staging cohort. No production service is provisioned in M8-A.

M7.5 Stage 2 reached Main at `1f653d5`; GitHub Actions run `36804355951` passed `verify` and
`migration-dry-run` for that SHA. The M8-A local routing experiment is in
[`../prototypes/m8-a/`](../prototypes/m8-a/). It is evidence for path shape, not a production
server or a Fly memory size decision.

## Release decisions

- **Budget:** approximately USD 30/month is the planning target, informed by the separate
  [operating-cost note](M8-OPERATING-COST-ESTIMATE.md). Check current Fly, Supabase, domain and mail
  charges before enabling billing. Use provider spending controls where they actually exist and
  available usage/billing alerts; review the estimated invoice manually each month. Do not call
  an alert a hard cap. Supabase Free does not charge for overage; quota restrictions can interrupt
  the service. Supabase's configurable Spend Cap applies to Pro, not Free.
  [Supabase cost controls](https://supabase.com/docs/guides/platform/cost-control),
  [Fly pricing](https://fly.io/docs/about/pricing/).
- **Operational view:** use the Fly and Supabase dashboards. Do not build `/ops`,
  `/api/v1/ops/summary`, aggregate reporting tables, custom alert orchestration or retention
  machinery in M8. Inspect API errors, current Fly usage and Supabase database size before opening
  the cohort and during Beta. Free projects become read-only above 500 MB of **database size**;
  consider Pro before existing writes are affected, with a separate purchase decision.
  [Supabase database-size guide](https://supabase.com/docs/guides/platform/database-size).
- **No backup:** the Product Owner accepts no scheduled database backup during the initial Free
  Beta and possible permanent loss of Coach/Student records. Registration or first use must say
  this plainly; do not promise recovery time, a restore point, or permanent retention. A brief
  manual response is enough if a loss occurs: stop unsafe writes/new admissions, check the
  provider state, tell affected Coaches what is known, and decide how service resumes. This is
  not a claim that notice eliminates data-protection duties or statutory rights.
- **Pause:** do not build a daily login/write bot. A simple external `/api/ready` check may detect
  an outage. A `/api/health` check alone does not generate Supabase database activity and cannot
  guarantee that a Free project stays awake. Watch Supabase warning email; manually resume a
  paused project and verify a database-backed Coach action.
  [Supabase pausing guide](https://supabase.com/docs/guides/platform/free-project-pausing).
- **Support and feedback:** the Product Owner will choose the public support/privacy-rights email
  later, before real-Coach admission. M8-B may use a `mailto:` link or an approved external form.
  No feedback database, two-day digest, review dashboard, reply store or Today reply notification
  is in M8. Do not display a false in-app receipt for an external submission.
- **Policy:** an adapted template can be the drafting starting point. Before real Coaches join,
  replace placeholders with the actual operator/contact, providers, data uses, retention and
  rights-request method; show the specific no-backup risk in onboarding. A paid Taiwan-counsel
  review is not an M8 gate. The Terms/Privacy draft remains unpublished until its facts match the
  deployed service. A disclaimer does not waive statutory rights or replace reasonable security.

## M8-A engineering contract

1. Build a production-capable same-origin Node process for the compiled Fastify API and Vite
   assets. Preserve the local Vite proxy. Map `/api/v1/*` to Fastify `/v1/*`, expose the existing
   `/health` as `/api/health`, and add database-backed `/ready` as `/api/ready`. Liveness must not
   claim database readiness.
2. Serve Web SPA deep links, including unauthenticated `/t/:token` and `/r/:token`. Keep unknown
   API paths JSON 404. Use immutable caching only for content-hashed assets; revalidate index.html
   and the service worker. Prevent path traversal and keep private/API/capability responses
   uncached by the service worker. Do not log Auth headers, capability tokens or secret values.
3. Keep environment separation simple: development and production Supabase project refs, Auth
   issuer/callbacks, database credentials and Web publishable values must differ. Production
   secrets stay in server/hosting configuration and out of the browser and repository. The release
   must reject an obvious development-to-production project mismatch before writes.
4. Provide a repeatable local production-mode build/start/smoke and a short Fly configuration and
   migration command sequence. Do not create a provider account, paid resource, production
   database or public deployment in this package. Keep migrations serial and reviewed; a failed
   migration stops the release. Fix forward for application bugs. Do not add an automated app
   rollback or database-loss drill.

## Verification and handoff

M8-A Sol demonstrates the built Web with real Fastify routes locally, `/api/ready` 200/503,
same-origin API JSON and SPA behavior, secret/config validation, and API write forwarding with
synthetic in-memory data. A real Coach's Session and Training save/reload is the short manual
Alpha check in M8-C, after the production environment exists.
Root check/build, diff hygiene and the repository's CI jobs remain required. A linked migration
dry-run is recorded when available; if local Supabase CLI login fails, report it and use the
existing remote CI evidence without calling it a local pass. Exact-SHA CI verifies the delivered
commit. No production, installed-device or real-Coach acceptance is claimed by M8-A.

The M8-B Contract freezes Beta-code and external-feedback copy. M8-C selects the final domain,
public support address, Auth sender, real provider accounts and actual billing settings before
production activation. M8-D approves the first real-Coach cohort after a short manual Alpha
check. The Product Owner's goal of rapid market validation governs those later gates.
