-- Synthetic paid row set for the offline restore drill only. Run against the
-- network-disconnected restored database, never against a linked project.
insert into app_private.billing_checkout_account (workspace_id, environment)
values (:'fixture_workspace'::uuid, 'test');

insert into app_private.billing_checkout_quote
  (id, workspace_id, environment, quote, expires_at)
values
  ('f1500000-0000-4000-8000-000000000001', :'fixture_workspace'::uuid,
   'test', '{}'::jsonb, '2027-01-01T00:00:00Z');

insert into app_private.billing_checkout_intent
  (id, workspace_id, environment, quote_id, status, intent, created_at)
values
  ('f1500000-0000-4000-8000-000000000002', :'fixture_workspace'::uuid,
   'test', 'f1500000-0000-4000-8000-000000000001', 'confirmed', '{}'::jsonb,
   '2026-10-18T00:00:00Z');

insert into app_private.billing_subscription_ledger
  (environment, store_id, provider_id, workspace_id, intent_id, customer_id,
   resource, reconciled_at)
values
  ('test', 'r15-restore-fixture', 'r15-paid-subscription',
   :'fixture_workspace'::uuid, 'f1500000-0000-4000-8000-000000000002',
   'r15-synthetic-customer', '{}'::jsonb, '2026-10-18T00:00:00Z');

insert into app_private.billing_invoice_ledger
  (environment, store_id, provider_id, subscription_id, workspace_id,
   resource, reconciled_at)
values
  ('test', 'r15-restore-fixture', 'r15-paid-invoice',
   'r15-paid-subscription', :'fixture_workspace'::uuid, '{}'::jsonb,
   '2026-10-18T00:00:00Z');

insert into app_private.billing_verified_period
  (environment, store_id, subscription_id, workspace_id, period_key, origin,
   tier, billing_interval, starts_at, ends_at, original_due_at,
   subscription_version, invoice_id, invoice_version)
values
  ('test', 'r15-restore-fixture', 'r15-paid-subscription',
   :'fixture_workspace'::uuid, 'initial', 'payment', 'basic', 'month',
   '2026-10-18T00:00:00Z', '2026-11-18T00:00:00Z', '2026-11-18T00:00:00Z',
   '2026-10-18T00:00:00Z', 'r15-paid-invoice', '2026-10-18T00:00:00Z');
