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
   that passes a measured core journey. The tracked `deploy/fly.production.toml` contains only the
   non-secret production app shape; keep one Machine running. Use `deploy/fly.toml.example` for a
   different app. Do not call a usage alert a hard cap.
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
3. A `main` push that changes `supabase/migrations/**` runs the independent
   `production-migration-preview` job against Production and intentionally does not deploy the app.
   Review that exact commit's green `verify`, `browser-ui`, `migration-dry-run`, and Production
   preview jobs. Then manually run **Production migration release** with that full commit SHA and
   confirmation `APPLY`. The workflow proves the SHA is on `main`, requires those exact green jobs,
   previews Production again, applies pending migrations, and deploys the same SHA. Never include
   seed data. These are serialized release operations, not part of Fly app startup.
4. A non-documentation `main` push without migration changes automatically deploys only after the
   repository verification, browser and development migration jobs pass. The Fly remote builder
   builds the Docker image using the **public** `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_PUBLISHABLE_KEY` build arguments. Set the public `VITE_SUPPORT_EMAIL` to the
   dedicated rights/support address selected in M8-C and set `VITE_INTERNAL_ALPHA=false` to expose
   registration and Google sign-in. Check the resulting build's public URL matches the intended
   production project. Fly's repository auto-deploy remains off; GitHub Actions owns exact-SHA
   release sequencing.
5. Manually check `/api/ready`, sign-in, one Student/Session/Training save and reload, a public
   capability link, and sign-out. Inspect Fly usage/errors and Supabase database size. If a write
   or migration fails, stop new admissions and fix the cause before continuing; do not claim that
   redeploying an app restores lost database rows.

M8-C deployed the image through the Fly remote builder. Production now uses public Auth entry;
see `docs/PROJECT_STATUS.md` for the exact deployed commit, image, checks and remaining acceptance.

## One-time GitHub setup

Run `bash scripts/setup-production-cd.sh` from Git Bash or WSL. The guided setup creates no local
secret file. It writes the app-scoped Fly token and Production Supabase credentials to GitHub
Actions secrets, writes only browser-public build values to GitHub repository variables, and walks
through creating the `production` Environment. GitHub CLI must be installed and authenticated for
the writes; the wizard reports any value that still needs manual setup.

During Alpha, `production` has no required reviewer, so ordinary green `main` commits deploy
automatically. Before M8-D admits real Coaches, enable required reviewers on that same Environment.
Both ordinary deployment and the explicit migration release will then pause for approval without a
workflow rewrite. Keep this approval enabled after Beta and for all general-availability Production
releases.
