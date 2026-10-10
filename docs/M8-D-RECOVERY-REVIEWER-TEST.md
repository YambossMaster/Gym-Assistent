# M8-D logical recovery and PR/CI gate

Product Owner decision (2026-10-11): Beta stays on Supabase Free, accepts no PITR, and uses a
scheduled GitHub Actions logical backup. A single developer uses a protected `main` branch with PRs
and required CI checks instead of Required Reviewers. This is an approved gate substitution, not a
claim that the scheduled workflow is already active on `main`.

## Production red-line evidence

- Release [#5](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38064919971)
  applied only `20261010110051`, deployed `d12edc70942a96e7c73e8c7d86e3135de2b66ba0`, and
  passed `/api/ready`.
- On 2026-10-11, two dedicated, auto-confirmed synthetic Production users signed in through
  Supabase Auth. API requests carried each user's `authenticated` JWT, never a `service_role` key.
  Cross-account Student list/detail/update/delete and Session creation were denied, owner data
  remained intact, ordinary accounts remained Free, and the removed plan-mutation route returned 404. Exact synthetic Student cleanup and global sign-out passed. Both Auth users were deleted;
  independent read-back for their exact IDs and marker showed zero Auth users, Workspaces and
  Students. No real Coach record was used as a fixture.

## 1. Logical backup and isolated restore

The tested workflow is
[`production-logical-backup.yml`](../.github/workflows/production-logical-backup.yml). It runs daily
at 02:17 UTC and on manual dispatch. It uses the existing scoped Production Supabase credentials,
the locked CLI, and `supabase db dump` to capture roles, schema, data and separate migration history.
It encrypts the bundle with AES-256 through GPG before uploading a seven-day GitHub Actions
artifact. `PRODUCTION_BACKUP_PASSPHRASE` must be a randomly generated secret of at least 32
characters, saved as a GitHub Actions secret **and independently retained by the Product Owner**.
Never put the passphrase in source, job logs or a backup artifact. The workflow fails closed when
the secret is missing. Only an encrypted artifact is uploaded; runner plaintext is removed.

### Activation and evidence

1. Review the local workflow and obtain authorization for a dedicated test-branch Actions run;
   keep `main` and Production deployment untouched until the whole M8-D gate is reviewable. Add a
   temporary exact-branch `push` trigger for the drill, then remove it before the PR merges. Set
   `PRODUCTION_BACKUP_PASSPHRASE` through GitHub Secrets and preserve a separate recovery copy.
   The first run is a **single backup-and-restore drill**, not a backup-only demonstration.
2. The drill dumps Production, uploads the encrypted artifact, downloads that same artifact,
   decrypts it and checks `SHA256SUMS`. It starts a fresh local Supabase Postgres container in the
   ephemeral Actions runner, disconnects every Docker network **before** applying SQL, and verifies
   the container has no network attached. Production currently has an inactivity-deletion cron job
   that posts to an Edge Function through `pg_net` using Vault; the restored job must have no path
   to that endpoint. Do not log decrypted Vault secrets.
3. The drill applies roles, schema, data and migration history in Supabase's documented order with
   `ON_ERROR_STOP`. It reads back nonzero Auth users and Workspaces plus the exact latest migration
   version. A red run means the gate failed and the workflow must be corrected and rerun; merely
   producing an artifact cannot pass. Record the run URL, dump UTC time, artifact size/hash,
   network-disconnect proof, checksum output, restore/read-back result and Production health.
4. After one successful drill, remove the temporary branch trigger, re-run PR checks, and obtain
   Product Owner authorization to merge through the protected PR path. This non-Markdown merge is
   classified as a release candidate by `scripts/ci-scope.mjs`; the existing `main` CI will run
   full checks and automatically deploy the same SHA to Fly if its Production preview has no
   pending migration. Observe that release and readiness. Then manually dispatch the backup
   workflow on `main` to establish a fresh encrypted artifact immediately and repeat its isolated
   restore. Confirm the next scheduled run separately. Before real-Coach admission, confirm the
   latest successful encrypted artifact is at most 48 hours old. A daily schedule can be delayed
   or fail; alert and stop admission if freshness exceeds 48 hours. Repeat restore drills after
   material schema or backup-tool changes and at an agreed operational cadence.

### First completed drill — 2026-10-11

[Actions #9](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38077980013) on
`codex/m8d-backup-drill` at `ff6eb6516cfb0012d38dd3d8412590847daecae1` passed the
Production dump, AES-256 encryption, artifact upload/download, decryption and all five SQL
checksums. Artifact
[`11678627959`](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38077980013/artifacts/11678627959)
was created at 2026-10-10 19:01:10 UTC, is 61,610 bytes, expires 2026-10-17 19:01:09 UTC, and
has GitHub artifact digest
`sha256:09a3d39b871882b27dae797a030a98af18bc3bff3e148c119d59c65bce278480`.
The data dump completed at 19:00:46 UTC. The separate dumps are not one atomic database snapshot;
the conservative recovery time for this drill is the dump start at 18:59:42 UTC.

The job confirmed exactly one local Supabase DB container, removed every Docker network before
SQL, and confirmed no network remained. Roles, schema, data and migration history restored with
`ON_ERROR_STOP=1`. Read-back returned **3 Auth users, 3 Workspaces and one latest migration
`20261010110051`**. The diagnostic and final drill showed one Production-managed
`GRANT SET ON PARAMETER "log_min_messages"` that the local CLI `postgres` role cannot replay. After
checking the untouched source artifact hashes, the disposable restore copy omits exactly that
grant. A real recovery must review and apply that operational logging grant with the destination's
appropriate administrator if needed; the restored application data and RLS SQL were not omitted.
The temporary diagnostic workflow was removed, and the final branch dropped its push trigger.
An independent Production `/api/ready` check returned HTTP 200 and `{"status":"ready"}`.

Production aggregate recheck after the drill found zero Storage objects, zero Storage buckets,
zero Vault secrets, 3 Auth users, 3 Workspaces and one active cron job. Backup freshness is within
48 hours as of the drill. **Scheduled protection is not active until this workflow reaches
`main` and a first `main` artifact succeeds.** The separate recovery passphrase must remain
available to the Product Owner for real disaster recovery.

**Current scope check (2026-10-11, after drill):** Production read-only aggregate queries found zero
`storage.objects`, zero `storage.buckets`, and zero `vault.secrets`. The one active `pg_cron` job
contains a `pg_net` outbound call, so the restore target must remain disconnected before any SQL
is applied. Recheck these counts at the drill and before real-Coach admission; if Storage objects or
Vault secrets appear, extend and test their recovery before calling the backup gate passed.

**Scope limits:** A database dump does not contain Storage object bytes. Migration history is a
separate dump. Customized Auth/Storage managed-schema objects can need separate restoration.
Manual logical restore of Supabase Vault data requires handling the source encryption root key;
decrypted secrets must not be exposed. Realtime publications, Auth provider/SMTP settings, Edge
Functions, Fly runtime secrets and custom role passwords require separate inventory/reconfiguration.
Logical backups provide restore points only at completed dumps, with possible data loss since the
last point; no PITR is claimed. The documented restore must prove the chosen target is actually
recoverable before this gate passes.

## 2. PR and required CI as reviewer-gate substitute

GitHub `production` Environment Required Reviewers remain off for the single-developer Beta. The
prepared branch ruleset targets the default `main` branch, with no bypass actors, PR required,
zero required human approvals, up-to-date branch required, force pushes/deletion blocked, and
`verify`, `browser-ui`, `migration-dry-run` required from GitHub Actions. These three checks run on
PRs. `production-migration-preview` runs only on a `main` push, so requiring it on PRs would make
merges impossible. Deployment still requires same-SHA post-merge checks; migration release still
requires a fresh preview and literal `APPLY`.

**Verification:** Save and reopen the GitHub ruleset after access confirmation. Confirm it is
Active, targets `main`, has no bypass, has zero human approvals, and names the three exact checks.
Then open a harmless PR and observe pending or failing required checks block merge, followed by a
green up-to-date run allowing merge. Do not use a Production migration or Fly deploy as the rule test.
Only after saved-rule and PR behavior are observed is the reviewer-gate substitution counted as
passed. The Product Owner still authorizes remote delivery per `AGENTS.md`.

**Observed PR behavior:** [PR #2](https://github.com/YambossMaster/Gym-Assistent/pull/2)
was moved from Draft to Ready after exact-head [CI run
`38078488044`](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38078488044)
passed `verify`, `browser-ui` and `migration-dry-run`; GitHub displayed **Ready to merge** with
an enabled merge button and no human review requirement. An empty test-branch commit
`ee43614` then triggered [CI run
`38078731251`](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38078731251).
While its three required checks were queued, the Ready PR showed **Checks pending** and a disabled
merge button. After `verify`, `browser-ui` and `migration-dry-run` all passed for `ee43614`, GitHub
showed **Ready to merge** and enabled the merge button again. Production preview and deployment
were correctly skipped on the PR. No merge was performed.

## Current gate ledger

| Gate                          | Current result                                                                                  | Remaining proof                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Production User-JWT red lines | Passed and synthetic data cleaned                                                               | None for this bounded smoke                              |
| Backup method decision        | Approved: daily encrypted logical dumps, seven-day retention, no PITR                           | Merge workflow to `main`; dispatch first `main` run      |
| Recoverable point             | Test-branch artifact from 2026-10-10 18:59:42 UTC verified                                      | Keep a successful `main` artifact no older than 48 hours |
| Isolated restore              | Passed in [Actions #9](https://github.com/YambossMaster/Gym-Assistent/actions/runs/38077980013) | Repeat after material backup/schema changes              |
| Reviewer substitution         | Passed: active rule, Ready PR blocked pending checks and enabled after all three passed         | Preserve rule on `main`                                  |

Official references: [Supabase CLI backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore),
[Supabase CLI dump](https://supabase.com/docs/reference/cli/supabase-db-dump), and
[GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).
