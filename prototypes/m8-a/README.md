# M8-A local same-origin prototype

This is a no-spend routing experiment, not the deployed Fastify/static server. It binds only to
`127.0.0.1` and refuses a nonlocal API target. It does not connect to Supabase, provision staging,
or exercise Auth and database access.

From the repository root:

```powershell
npm run build
node prototypes/m8-a/same-origin.test.mjs
node prototypes/m8-a/probe-build.mjs
```

The probe uses the current `apps/web/dist` and compiled Fastify routes with in-memory adapters and
a synthetic development identity. Its RSS number covers that Node process at idle; it excludes
PostgreSQL, Supabase Auth and load, so it cannot size a Fly Machine or establish the M8-A load
threshold. It checks `/api` JSON/no-store, private and public SPA deep links, a missing asset,
unauthorized private access, and an authorized synthetic read/write. The focused tests also check
write forwarding, immutable hashed assets, and service-worker revalidation. The selected production
server, real database readiness, staging load and failure drills belong to Sol after the Contract
is frozen.
