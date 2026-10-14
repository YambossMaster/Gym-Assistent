# Preserve applied billing history outside the Production release sequence

PO requested release with payment entry closed and removal of its migration interference with
other tasks. Development has already applied `20261014100438`; Production has not. Main previously
contained neither that SQL nor the remote history, which broke Development migration checks.

Preserve the original SQL in `supabase/development-only`. A project-pinned dry-run wrapper verifies
that it is already applied, stages it temporarily beside the shared migrations, and cleans up. All
unknown drift still fails. Production's migration directory, complete-history comparison and
explicit APPLY requirement remain unchanged. The unapplied ledger is a draft, never auto-staged.

Rejected alternatives: deleting remote history would conceal real schema; adding unfinished SQL
to shared migrations would force an unrelated Production schema release; skipping migration checks
would leave later tasks blocked. No database changes are required for this repair. Future payment
activation must reconcile/promote the Development-only baseline before it can become shared schema.
