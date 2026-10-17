# M8-E payment workstream — branch-local handoff

> Handoff recorded 2026-10-18 for the next M8-E conversation. This Status is the remote-readable
> entry, not proof that payment code has merged. The next payment branch takes ownership after
> isolating its code; Main's release router changes only at verified integration.

## Scope and baseline

R01–R17 remain the fixed release register under the M8-E Roadmap. The detailed, frozen
`docs/M8-E-IMPLEMENTATION-CONTRACT.md` and `docs/M8-E-LOCAL-CHECKOUT.md` exist in the original
**unmerged** checkout described below; they are not Main documents yet. M8-D is Done by Product
Owner acceptance, including the single-lesson and purchase-history releases through `aaa5a929`.
PR #39 later placed a separate mobile Settings correction on Main at `d54658b`. No M8-D Next is
inherited by payment.

**Source checkout:** `D:\Programs, Codes, Projects\Projects\Gym Assistent`, branch
`codex/landing-footer-studio`, HEAD `d249476` when inventoried. It is heavily dirty, behind
remote Main `d54658b`, and includes payment drafts plus unrelated UI/operations edits. Its
`docs/status/M8/M8-E.md` contains the detailed 2026-10-18 payment evidence and an older STOP
section explicitly superseded by its newer R15 section. Its local engineering log reaches
LOG-629. Preserve that checkout; do not stage or push it as one diff. Recheck both HEADs at
resume because the working trees may have changed after this record.

**Environment:** Development database and Lemon Squeezy Test Mode hold the observed transactions.
Production billing is hard-off; no M8-E billing migration, Live secret, catalog or webhook is
confirmed released. The old Test Mode webhook URL was restored but is unreachable; temporary
tunnel, webhook proxy, API and Web processes were stopped. Before any new provider event, establish
a reachable, signature-verified Test Mode receiver. No Live transaction is authorized by this
handoff.

**Approved product rules:** the existing promotional code grants card-free Prime for 60 × 24 hours
on the Plans page, with no Lemon subscription or automatic charge. Ordinary checkout offers Pro
NT$115/month or NT$1,150/year and Prime NT$145/month or NT$1,450/year. A first subscription may
have one month of trial; repurchase after an approved full refund and current-period revocation
charges immediately without a second trial. Free has no cancellation action. Automatic paid
downgrade is hidden; cancel-to-Free at the verified original end is the accepted fallback.
The Product Owner accepted the temporary risk of direct provider access to 60-day variants;
do not reopen that as a release gate. The existing card-free code stops new redemptions on
2026-12-01 00:00 Asia/Taipei; the approved variant closure follows the existing campaign rule.

## Fixed R01–R17 inventory

The states below are **source-checkout evidence**, not checks repeated against current Main.
Eight items passed their Development/Test Mode criteria; R08 has a verified fallback; eight
items remain partial or unverified. Do not add a new gate for an observation already owned by one
of these items. See the source Status and local checkout document for exact transaction IDs and
provider/ledger read-backs.

| ID  | State       | Decisive evidence or remaining gap                                                                                                                                                                                                                                                               |
| --- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R01 | Partial     | M8-D prerequisite is complete; reconcile M8-E's later product decisions, frozen Contract slices and same-version behavior.                                                                                                                                                                       |
| R02 | Unverified  | Live store showed no Products or Webhooks and still prompted activation; four approved variants, merchant readiness and available Live methods need read-back.                                                                                                                                   |
| R03 | Partial     | Local 115/145 catalog and FX rule have focused checks; final price, consent, legal draft and provider amount must agree in one version.                                                                                                                                                          |
| R04 | Passed      | Coach UI Pro annual first trial and Pro monthly paid repurchase each reached original intent, signed webhook, invoice and owner entitlement; buyer Email differed from owner.                                                                                                                    |
| R05 | Passed      | Card-free code and paid subscription are isolated; Development API role rejected paid-account redemption and cross-owner period reads; checkout concurrency was checked.                                                                                                                         |
| R06 | Passed      | Coach UI Pro annual trial changed to Prime annual on the same provider subscription without moving the original trial end or charging a positive amount.                                                                                                                                         |
| R07 | Passed      | One Coach UI paid Pro monthly → Prime monthly change produced one PATCH, one paid updated invoice and matching Prime period; focused retries covered late webhook completion.                                                                                                                    |
| R08 | Conditional | Automatic paid downgrade remains unavailable; verified cancellation keeps access to the original end, then Free.                                                                                                                                                                                 |
| R09 | Partial     | Paid initial/updated invoice checks and fail-closed rules exist, but no ordinary trial-end first-charge or natural paid renewal invoice has proved the owner/period transition. A manually moved billing anchor is not that proof.                                                               |
| R10 | Passed      | Coach UI canceled representative trial and paid subscriptions; provider cancellation retained original ends, then clock-based Free and data/capacity behavior passed.                                                                                                                            |
| R11 | Passed      | Partial/full refund, owner-only receipts, approved full annual refund with audited current-period revocation and replay-safe apply passed in Development/Test Mode.                                                                                                                              |
| R12 | Passed      | Signed webhook persistence and bounded missing-event recovery passed; a scanner regression was repaired and replayed. First webhook never delivered still has the Contract's investigation/retry boundary.                                                                                       |
| R13 | Passed      | Two real Development Coach identities, cross-owner HTTP/RLS denial, eight concurrent checkout begins and paid-change retries established one intent/provider action.                                                                                                                             |
| R14 | Partial     | PO reviewed desktop/390px flow; a fully refunded, revoked owner repurchased Pro annual from Coach UI, with new paid invoice and correct entitlement, billing history and cancellation. Card worked; displayed PayPal/Cash App Pay subscription applicability and Live methods remain unresolved. |
| R15 | Partial     | Isolated PostgreSQL/RLS and exact CLI dry-run passed. Actual encrypted artifact restore, measured ≤48-hour recovery point, Production-baseline migration and Production role evidence remain open.                                                                                               |
| R16 | Unverified  | Controlled Live first purchase/cancellation and real invoice/webhook/owner checks await separate Product Owner authority and earlier gates.                                                                                                                                                      |
| R17 | Unverified  | Same-version CI, authorized migration/deployment, independent readiness and first-transaction observation have not happened for M8-E.                                                                                                                                                            |

## R15 precise handoff

The Product Owner inspected the R15 local candidate and explicitly approved its **full
verification Gate** on 2026-10-18. This remains valid after isolation. The Contract froze a
single server-side mode/store/API-key/signature-secret binding, empty Live billing rows, ordered
additive migrations, narrow API/worker roles and RLS, encrypted backup with isolated paid-data
restore, and Production billing disabled until release. This approval did not include Production
migration, formal secrets, M8-E remote delivery or Live payment.

- **Candidate files in source checkout:**
  `supabase/migrations/20261017181022_billing_live_test_foundation.sql`, ten
  `supabase/development-only/*billing*.sql` historical sources,
  `.github/workflows/production-logical-backup.yml`, `scripts/r15-billing-paid-restore-fixture.sql`,
  `apps/api/src/billing/` and the billing-related server startup/config changes. Many are untracked
  locally and absent from Main. Copy only payment-owned content after reviewing each diff.
- **SQL and role evidence:** the 13-table candidate ran in isolated PGlite PostgreSQL. Synthetic
  paid owner→intent→subscription→invoice→period joins, cross-environment and cross-owner FK
  negatives, and API/browser/worker RLS/role boundaries passed. API billing tests 161/161 and
  API typecheck passed in the source checkout. This did not execute on Production's Supabase schema.
- **Migration preview:** `supabase migration list --project-ref` showed the candidate only locally.
  The first Production CLI dry-run stopped on three remote-only historical versions; after
  temporarily supplying exact Development-only copies, the same `db push --dry-run --skip-vault`
  listed only `20261017181022` with `dryRun:true`. Temporary copies were removed. This proves the
  pending list, not successful application or Production schema compatibility.
- **Backup evidence:** an offline six-table synthetic paid-data COPY export/delete/import and join
  read-back passed. The manual workflow now proposes a fixture and ≤48-hour assertion. No actual
  encrypted GitHub artifact was downloaded and restored into an isolated Supabase database; no
  measured Production recoverable point was established. Empty-table assertions do not close R15.
- **Integration risk:** compare the formal migration and server interfaces against current Main's
  delivered M8-D schema and its migration history before any apply. Preserve the original
  Development Test Mode history and rows; do not copy them to Live or rerun a whole dirty worktree.

## Authorization and stop boundaries

The current authorization covers local isolation, focused checks and the already-approved R15
full verification Gate. This documentation push does **not** authorize pushing M8-E code,
applying a Production migration, changing formal secrets, enabling billing or performing Live
payment. Keep those actions at their existing separate approval points. For any Test Mode checkout
requiring a human final submission, prepare the isolated account, variant, visible checkout and
fields first; request only that final action. No one needs to act for the next local isolation step.

## Next within this workstream

Create a dedicated clean M8-E worktree from freshly verified Main, then inventory and transfer
only payment-owned code, migration, Contract and evidence from the preserved source checkout.
Compare the extracted diff with Main's M8-D Student/Scheduling/Finance interfaces and versions.
**Pass criterion:** a bounded, reviewable payment-only diff; an owned Status updated with its new
branch/HEAD, dirty-file list, exact R15 checks and remaining R register. Do not start by rerunning
provider transactions or by taking an old M8-D Next.

Once isolated, run the smallest focused integration checks, then complete the already-authorized
R15 verification and continue the fixed R register. A new mismatch becomes a concrete payment
risk with one decisive check. The payment workstream owns its next action thereafter; the Main
router receives only verified integration facts.
