# M8 MVP release handoff

The production target is one Fly app and one separate Supabase Free project. M8-A prepares the
artifact locally; creating paid resources and inviting Coaches happen later under M8-C/M8-D.

## Local production-mode smoke

1. Run `npm ci`, `npm run check`, and `npm run build` from the repository root. The Web build writes
   `apps/web/dist/deployment-config.json` with its public Supabase URL and Alpha build flag.
2. With the existing **development** API `.env`, set `NODE_ENV=production`,
   `DEPLOYMENT_TARGET=local`, `HOST=127.0.0.1`, and a free `PORT`; start
   `node --env-file=apps/api/.env apps/api/dist/start.js`.
3. Check `/`, `/today`, `/t/<synthetic-token>`, `/api/health`, `/api/ready`, and an unknown `/api`
   path. Expect SPA HTML for navigation, JSON 200 for healthy API/readiness, and JSON 404 for the
   unknown API path. The readiness check must fail with 503 when its database connection fails.
4. Stop that local process. Do not use real Coach data for this smoke.

## Production preparation, when M8-C is authorized

1. Confirm actual Fly and Supabase pricing and billing notifications; choose the smallest Machine
   that passes a measured core journey. Copy `deploy/fly.toml.example` to a private release config,
   set the real app name, and keep one Machine running. Do not call a usage alert a hard cap.
2. Create a separate production Supabase project. Configure Auth URLs, custom SMTP and a runtime
   database role. Store `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`,
   `CAPABILITY_RATE_LIMIT_SECRET`, `BETA_ADMISSION_SECRET`, and
   `EXPECTED_SUPABASE_PROJECT_REF` only in the host's secret
   store. Set `NODE_ENV=production` and `DEPLOYMENT_TARGET=production`. The production startup
   compares the runtime URL, database connection target and Web build's public URL against the
   expected project ref before it listens publicly. Production requires the public Auth entry
   (`VITE_INTERNAL_ALPHA=false`), Email signup and confirmation, and Google OAuth configured
   for the production Supabase callback. No synthetic-account allowlist limits admission.
   First-use legal acceptance remains enforced by the API before workspace operations.
   Keep `BETA_ADMISSION_SECRET` stable: it keys the deletion-surviving same-Email redemption
   ledger. Rotating it requires a planned ledger migration before accepting new redemptions.
3. From an isolated release checkout, use the installed Supabase CLI's `migration list
--project-ref <production-ref>` and `db push --dry-run --project-ref <production-ref>` against
   the production target. Review the exact migration list and stop on unexpected history. Apply
   `db push --project-ref <production-ref>` only after that review, with credentials supplied
   through the CLI's protected prompt or secret environment, never inline in a saved command.
   These are serial release operations, not part of Fly app startup.
4. Build the Docker image using the **public** `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` build arguments. Set the public `VITE_SUPPORT_EMAIL` to the
   dedicated rights/support address selected in M8-C and set `VITE_INTERNAL_ALPHA=false` to expose
   registration and Google sign-in. Check the resulting build's public URL matches
   the intended production project. Deploy the exact approved commit with host auto-deploy off.
5. Manually check `/api/ready`, sign-in, one Student/Session/Training save and reload, a public
   capability link, and sign-out. Inspect Fly usage/errors and Supabase database size. If a write
   or migration fails, stop new admissions and fix the cause before continuing; do not claim that
   redeploying an app restores lost database rows.

M8-C deployed the image through the Fly remote builder. Production now uses public Auth entry;
see `docs/PROJECT_STATUS.md` for the exact deployed commit, image, checks and remaining acceptance.
