# Applied Development-only history

`20261014100438_billing_checkout_intents.sql` was applied to Development project
`yvhijxhtelujfsaplzpi` during local payment development. It has never been applied to Production.
Its exact SQL is preserved here; do not delete or rewrite the remote migration history.

Use `npm run db:push:dry:development` after linking Development. It checks the project and exact
already-applied remote-only version list. Eight later M8-E versions remain only in Development:
`20261015045150`, `20261015045333`, `20261015063738`, `20261015093501`, `20261016163000`,
`20261017074143`, `20261017082340` and `20261017085708`. The command fetches their historical
SQL into a separate temporary directory, stages only these eight plus the preserved file above
for the ordinary Supabase dry-run, then removes every temporary copy even on failure. Unknown
remote versions still fail. It never applies schema and refuses Production. CI uses it whenever
shared or Development history changes. Production continues to use only `supabase/migrations` and
its existing strict preview.

For a separately authorized Development migration apply, stage this same historical file alongside
the shared migrations, use the normal CLI, then remove only the staged copy. Do not stage drafts.
Payment activation will require an explicit promotion/reconciliation plan and the usual Production
preview/APPLY gate. The lifecycle ledger remains an unapplied draft under `supabase/drafts/billing`.
