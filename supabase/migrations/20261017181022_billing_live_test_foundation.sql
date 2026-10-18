-- R15 additive billing schema; no provider runtime or Live payment activation.
-- Approved Contract 2026-10-18. Fresh Production ledger starts empty.
-- SQL order follows the verified Development Test Mode migrations.

-- Checkout foundation. Schema creation alone grants no paid access or Live activation.
create table app_private.billing_checkout_account (
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  environment text not null check (environment in ('test','live')),
  first_subscribed_at timestamptz,
  version integer not null default 1 check(version > 0),
  primary key(workspace_id, environment)
);
create table app_private.billing_checkout_quote (
  id uuid primary key,
  workspace_id uuid not null,
  environment text not null check (environment in ('test','live')),
  quote jsonb not null check(jsonb_typeof(quote)='object'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(id,workspace_id,environment),
  foreign key(workspace_id,environment) references app_private.billing_checkout_account on delete cascade
);
create index billing_quote_scope on app_private.billing_checkout_quote(workspace_id,environment,created_at);
create table app_private.billing_checkout_intent (
  id uuid primary key,
  workspace_id uuid not null,
  environment text not null check (environment in ('test','live')),
  quote_id uuid not null,
  status text not null check(status in ('creating','open','pending')),
  intent jsonb not null check(jsonb_typeof(intent)='object'),
  created_at timestamptz not null,
  unique(quote_id),
  unique(id,workspace_id,environment),
  foreign key(quote_id,workspace_id,environment) references app_private.billing_checkout_quote(id,workspace_id,environment) on delete cascade
);
create unique index billing_one_unresolved_checkout on app_private.billing_checkout_intent(workspace_id,environment)
  where status in ('creating','open','pending');

alter table app_private.billing_checkout_account enable row level security;
alter table app_private.billing_checkout_quote enable row level security;
alter table app_private.billing_checkout_intent enable row level security;
revoke all on app_private.billing_checkout_account, app_private.billing_checkout_quote,
  app_private.billing_checkout_intent from public,anon,authenticated,service_role;
grant select,insert,update,delete on app_private.billing_checkout_account, app_private.billing_checkout_quote,
  app_private.billing_checkout_intent to gym_assistant_api;
create policy billing_account_scope on app_private.billing_checkout_account to gym_assistant_api
  using(workspace_id=nullif(current_setting('app.current_workspace_id',true),'')::uuid)
  with check(workspace_id=nullif(current_setting('app.current_workspace_id',true),'')::uuid);
create policy billing_quote_scope on app_private.billing_checkout_quote to gym_assistant_api
  using(workspace_id=nullif(current_setting('app.current_workspace_id',true),'')::uuid)
  with check(workspace_id=nullif(current_setting('app.current_workspace_id',true),'')::uuid);
create policy billing_intent_scope on app_private.billing_checkout_intent to gym_assistant_api
  using(workspace_id=nullif(current_setting('app.current_workspace_id',true),'')::uuid)
  with check(workspace_id=nullif(current_setting('app.current_workspace_id',true),'')::uuid);


-- Worker ledger does not grant PlanAccess or enable Live billing by itself.
do $$ begin
  if not exists(select 1 from pg_roles where rolname='gym_billing_worker') then
    create role gym_billing_worker nologin;
  end if;
end $$;
grant usage on schema app_private to gym_billing_worker;

create table app_private.billing_event_inbox (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('test','live')),
  digest text not null check(digest ~ '^[a-f0-9]{64}$'),
  notification jsonb not null check(jsonb_typeof(notification)='object'),
  status text not null default 'queued' check(status in ('queued','processing','done','dead')),
  attempts integer not null default 0 check(attempts>=0),
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  unique(environment,digest)
);
create index billing_event_pending on app_private.billing_event_inbox(next_attempt_at,created_at)
  where status in ('queued','processing');

create table app_private.billing_subscription_ledger (
  environment text not null check (environment in ('test','live')),
  store_id text not null,
  provider_id text not null,
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  intent_id uuid not null unique,
  customer_id text not null,
  resource jsonb not null check(jsonb_typeof(resource)='object'),
  reconciled_at timestamptz not null,
  primary key(environment,store_id,provider_id),
  unique(environment,store_id,provider_id,workspace_id),
  foreign key(intent_id,workspace_id,environment)
    references app_private.billing_checkout_intent(id,workspace_id,environment) on delete cascade
);
create index billing_subscription_owner on app_private.billing_subscription_ledger(workspace_id);

create table app_private.billing_invoice_ledger (
  environment text not null check (environment in ('test','live')),
  store_id text not null,
  provider_id text not null,
  subscription_id text not null,
  workspace_id uuid not null,
  resource jsonb not null check(jsonb_typeof(resource)='object'),
  reconciled_at timestamptz not null,
  primary key(environment,store_id,provider_id),
  foreign key(environment,store_id,subscription_id,workspace_id)
    references app_private.billing_subscription_ledger(environment,store_id,provider_id,workspace_id) on delete cascade
);
create index billing_invoice_owner on app_private.billing_invoice_ledger(workspace_id);

create table app_private.billing_cancellation (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('test','live')),
  store_id text not null,
  subscription_id text not null,
  workspace_id uuid not null,
  status text not null default 'pending' check(status in ('pending','confirmed')),
  request_version timestamptz not null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmation jsonb check(confirmation is null or jsonb_typeof(confirmation)='object'),
  unique(environment,store_id,subscription_id,request_version),
  foreign key(environment,store_id,subscription_id,workspace_id)
    references app_private.billing_subscription_ledger(environment,store_id,provider_id,workspace_id) on delete cascade
);
create unique index billing_one_pending_cancellation on app_private.billing_cancellation(environment,store_id,subscription_id)
  where status='pending';

alter table app_private.billing_event_inbox enable row level security;
alter table app_private.billing_subscription_ledger enable row level security;
alter table app_private.billing_invoice_ledger enable row level security;
alter table app_private.billing_cancellation enable row level security;
revoke all on app_private.billing_event_inbox,app_private.billing_subscription_ledger,
  app_private.billing_invoice_ledger,app_private.billing_cancellation from public,anon,authenticated,service_role;
grant select,insert,update,delete on app_private.billing_event_inbox,app_private.billing_subscription_ledger,
  app_private.billing_invoice_ledger,app_private.billing_cancellation to gym_billing_worker;
grant select on app_private.billing_checkout_intent,app_private.billing_checkout_quote to gym_billing_worker;
create policy billing_worker_intent on app_private.billing_checkout_intent for select to gym_billing_worker using(true);
create policy billing_worker_quote on app_private.billing_checkout_quote for select to gym_billing_worker using(true);
create policy billing_worker_inbox on app_private.billing_event_inbox to gym_billing_worker using(true) with check(true);
create policy billing_worker_subscription on app_private.billing_subscription_ledger to gym_billing_worker using(true) with check(true);
create policy billing_worker_invoice on app_private.billing_invoice_ledger to gym_billing_worker using(true) with check(true);
create policy billing_worker_cancellation on app_private.billing_cancellation to gym_billing_worker using(true) with check(true);

grant select on app_private.billing_subscription_ledger,app_private.billing_invoice_ledger to gym_assistant_api;
grant select,insert,update on app_private.billing_cancellation to gym_assistant_api;
create policy billing_subscription_owner on app_private.billing_subscription_ledger for select to gym_assistant_api
 using(workspace_id=nullif(current_setting('app.current_workspace_id',true),'')::uuid);
create policy billing_invoice_owner on app_private.billing_invoice_ledger for select to gym_assistant_api
 using(workspace_id=nullif(current_setting('app.current_workspace_id',true),'')::uuid);
create policy billing_cancel_owner on app_private.billing_cancellation to gym_assistant_api
 using(workspace_id=nullif(current_setting('app.current_workspace_id',true),'')::uuid)
 with check(workspace_id=nullif(current_setting('app.current_workspace_id',true),'')::uuid);
-- No login, role membership or credential is provisioned here. Worker role is server-only.


-- Default privileges granted the API role
-- broad rights when the billing ledger tables were created. Limit it to the
-- operations implemented by the owner-scoped management repository.
revoke all on app_private.billing_event_inbox,
  app_private.billing_subscription_ledger,
  app_private.billing_invoice_ledger,
  app_private.billing_cancellation from gym_assistant_api;

grant select on app_private.billing_subscription_ledger,
  app_private.billing_invoice_ledger to gym_assistant_api;
grant select, insert, update on app_private.billing_cancellation to gym_assistant_api;


-- R15 schema only. First-cycle authority; renewal remains pending reconciliation.
alter table app_private.billing_checkout_intent drop constraint billing_checkout_intent_status_check;
alter table app_private.billing_checkout_intent add constraint billing_checkout_intent_status_check
  check(status in ('creating','open','pending','confirmed'));
alter table app_private.billing_invoice_ledger
  add constraint billing_invoice_period_owner_key
  unique(environment,store_id,provider_id,subscription_id,workspace_id);

create table app_private.billing_verified_period (
  environment text not null check (environment in ('test','live')),
  store_id text not null,
  subscription_id text not null,
  workspace_id uuid not null,
  period_key text not null check(period_key='initial'),
  origin text not null check(origin in ('trial','payment')),
  tier text not null check(tier in ('basic','advanced')),
  billing_interval text not null check(billing_interval in ('month','year')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  original_due_at timestamptz not null,
  subscription_version timestamptz not null,
  invoice_id text,
  invoice_version timestamptz,
  verified_at timestamptz not null default now(),
  primary key(environment,store_id,subscription_id,period_key),
  foreign key(environment,store_id,subscription_id,workspace_id)
    references app_private.billing_subscription_ledger(environment,store_id,provider_id,workspace_id) on delete cascade,
  foreign key(environment,store_id,invoice_id,subscription_id,workspace_id)
    references app_private.billing_invoice_ledger
      (environment,store_id,provider_id,subscription_id,workspace_id),
  check(ends_at>starts_at and original_due_at=ends_at),
  check((origin='trial' and invoice_id is null and invoice_version is null)
    or (origin='payment' and invoice_id is not null and invoice_version is not null))
);
create index billing_period_owner on app_private.billing_verified_period(workspace_id,ends_at);
alter table app_private.billing_verified_period enable row level security;
revoke all on app_private.billing_verified_period from public,anon,authenticated,service_role,gym_assistant_api;
grant select,insert on app_private.billing_verified_period to gym_billing_worker;
grant select on app_private.billing_verified_period to gym_assistant_api;
create policy billing_period_worker on app_private.billing_verified_period
  for all to gym_billing_worker using(true) with check(true);
create policy billing_period_owner on app_private.billing_verified_period
  for select to gym_assistant_api
  using(workspace_id=nullif(current_setting('app.current_workspace_id',true),'')::uuid);

-- Worker may only consume the first-subscription marker and confirm the bound intent.
grant select on app_private.billing_checkout_account to gym_billing_worker;
grant update(first_subscribed_at,version) on app_private.billing_checkout_account to gym_billing_worker;
create policy billing_worker_account on app_private.billing_checkout_account
  to gym_billing_worker using(true) with check(true);
grant update(status,intent) on app_private.billing_checkout_intent to gym_billing_worker;
create policy billing_worker_intent_update on app_private.billing_checkout_intent
  for update to gym_billing_worker using(true) with check(true);


-- R15 schema only. A paid-plan trial change stays on one provider subscription.
create table app_private.billing_trial_change (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('test','live')),
  store_id text not null,
  subscription_id text not null,
  workspace_id uuid not null,
  old_variant_id text not null,
  target_variant_id text not null,
  old_tier text not null check(old_tier in ('basic','advanced')),
  old_interval text not null check(old_interval in ('month','year')),
  target_tier text not null check(target_tier in ('basic','advanced')),
  target_interval text not null check(target_interval in ('month','year')),
  trial_ends_at timestamptz not null,
  request_version timestamptz not null,
  baseline_invoice_ids jsonb not null check(
    jsonb_typeof(baseline_invoice_ids)='array' and
    not jsonb_path_exists(baseline_invoice_ids,'$[*] ? (@.type() != "string")')
  ),
  status text not null default 'pending' check(status in ('pending','confirmed')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  confirmation jsonb check(confirmation is null or jsonb_typeof(confirmation)='object'),
  unique(environment,store_id,subscription_id,request_version,target_variant_id),
  foreign key(environment,store_id,subscription_id,workspace_id)
    references app_private.billing_subscription_ledger(environment,store_id,provider_id,workspace_id) on delete cascade
);
create unique index billing_one_pending_trial_change
  on app_private.billing_trial_change(environment,store_id,subscription_id)
  where status='pending';
alter table app_private.billing_trial_change enable row level security;
revoke all on app_private.billing_trial_change from public,anon,authenticated,service_role;
grant select,insert,update on app_private.billing_trial_change to gym_assistant_api;
grant select on app_private.billing_trial_change to gym_billing_worker;
create policy billing_trial_change_owner on app_private.billing_trial_change to gym_assistant_api
  using(workspace_id=nullif(current_setting('app.current_workspace_id',true),'')::uuid)
  with check(workspace_id=nullif(current_setting('app.current_workspace_id',true),'')::uuid);
create policy billing_trial_change_worker on app_private.billing_trial_change
  for select to gym_billing_worker using(true);

-- API changes only the choice and provider version after verifying the same Test Mode subscription.
-- Trial start/end, due date and origin remain worker-owned and cannot be changed by this role.
grant update(tier,billing_interval,subscription_version,verified_at)
  on app_private.billing_verified_period to gym_assistant_api;
create policy billing_period_owner_trial_update on app_private.billing_verified_period
  for update to gym_assistant_api
  using(workspace_id=nullif(current_setting('app.current_workspace_id',true),'')::uuid)
  with check(workspace_id=nullif(current_setting('app.current_workspace_id',true),'')::uuid);


-- R15 schema only. A paid provider renewal may extend access by one verified period.
alter table app_private.billing_verified_period
  drop constraint billing_verified_period_period_key_check,
  drop constraint billing_verified_period_origin_check,
  drop constraint billing_verified_period_check,
  drop constraint billing_verified_period_check1;

alter table app_private.billing_verified_period
  add constraint billing_verified_period_period_key_check
    check(period_key='initial' or period_key ~ '^renewal:[1-9][0-9]*$'),
  add constraint billing_verified_period_origin_check
    check(origin in ('trial','payment','renewal')),
  add constraint billing_verified_period_time_check check(
    ends_at>starts_at and (
      (period_key='initial' and origin in ('trial','payment') and original_due_at=ends_at) or
      (period_key ~ '^renewal:[1-9][0-9]*$' and origin='renewal' and original_due_at=starts_at)
    )
  ),
  add constraint billing_verified_period_invoice_check check(
    (origin='trial' and invoice_id is null and invoice_version is null) or
    (origin in ('payment','renewal') and invoice_id is not null and invoice_version is not null)
  );

create unique index billing_verified_period_invoice_once
  on app_private.billing_verified_period(environment,store_id,subscription_id,invoice_id)
  where invoice_id is not null;


-- R15 schema only. A same-cycle paid provider upgrade is auditable by invoice ID.
create table app_private.billing_paid_upgrade_evidence (
  environment text not null check (environment in ('test','live')),
  store_id text not null,
  subscription_id text not null,
  workspace_id uuid not null,
  invoice_id text not null,
  from_variant_id text not null,
  to_variant_id text not null,
  period_key text not null,
  period_ends_at timestamptz not null,
  subscription_version timestamptz not null,
  verified_at timestamptz not null default now(),
  primary key(environment,store_id,subscription_id,invoice_id),
  unique(environment,store_id,subscription_id,subscription_version),
  foreign key(environment,store_id,subscription_id,workspace_id)
    references app_private.billing_subscription_ledger(environment,store_id,provider_id,workspace_id),
  foreign key(environment,store_id,invoice_id,subscription_id,workspace_id)
    references app_private.billing_invoice_ledger(environment,store_id,provider_id,subscription_id,workspace_id)
);
alter table app_private.billing_paid_upgrade_evidence enable row level security;
revoke all on app_private.billing_paid_upgrade_evidence from public,anon,authenticated,service_role,gym_assistant_api;
grant select,insert on app_private.billing_paid_upgrade_evidence to gym_billing_worker;
create policy billing_paid_upgrade_worker on app_private.billing_paid_upgrade_evidence
  for all to gym_billing_worker using(true) with check(true);

-- The worker may promote a paid period only after inserting its matching invoice evidence.
grant update(tier,subscription_version,verified_at)
  on app_private.billing_verified_period to gym_billing_worker;


-- R15 schema only. Preserve the original paid period while replacing
-- its access authority with a separately invoiced annual period.
alter table app_private.billing_verified_period
  add column superseded_at timestamptz;

alter table app_private.billing_verified_period
  drop constraint billing_verified_period_period_key_check,
  drop constraint billing_verified_period_time_check;

alter table app_private.billing_verified_period
  add constraint billing_verified_period_period_key_check check(
    period_key='initial' or period_key ~ '^(renewal|change):[1-9][0-9]*$'
  ),
  add constraint billing_verified_period_time_check check(
    ends_at>starts_at and (
      (period_key='initial' and origin in ('trial','payment') and original_due_at=ends_at) or
      (period_key ~ '^renewal:[1-9][0-9]*$' and origin='renewal' and original_due_at=starts_at) or
      (period_key ~ '^change:[1-9][0-9]*$' and origin='payment' and original_due_at=ends_at)
    )
  );

grant update(superseded_at) on app_private.billing_verified_period to gym_billing_worker;


-- R15 schema only. The API persists consent before its one allowed provider PATCH.
create table app_private.billing_paid_change (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('test','live')),
  store_id text not null,
  subscription_id text not null,
  workspace_id uuid not null,
  from_variant_id text not null,
  target_variant_id text not null,
  target_tier text not null check(target_tier in ('basic','advanced')),
  target_interval text not null check(target_interval in ('month','year')),
  subscription_version timestamptz not null,
  period_key text not null,
  period_ends_at timestamptz not null,
  estimate_minor integer not null check(estimate_minor>0),
  status text not null default 'previewed' check(status in ('previewed','dispatching','confirmed')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  dispatched_at timestamptz,
  confirmed_at timestamptz,
  foreign key(environment,store_id,subscription_id,workspace_id)
    references app_private.billing_subscription_ledger(environment,store_id,provider_id,workspace_id) on delete cascade
);
create unique index billing_one_dispatching_paid_change
  on app_private.billing_paid_change(environment,store_id,subscription_id)
  where status='dispatching';
create index billing_paid_change_owner on app_private.billing_paid_change(workspace_id,created_at);
alter table app_private.billing_paid_change enable row level security;
revoke all on app_private.billing_paid_change from public,anon,authenticated,service_role;
grant select,insert,update on app_private.billing_paid_change to gym_assistant_api;
create policy billing_paid_change_owner on app_private.billing_paid_change to gym_assistant_api
  using(workspace_id=nullif(current_setting('app.current_workspace_id',true),'')::uuid)
  with check(workspace_id=nullif(current_setting('app.current_workspace_id',true),'')::uuid);


-- R15 schema only. Approval and application are separate append-only records.
-- A provider refund alone never changes paid access.
create table app_private.billing_refund_case (
  id uuid primary key,
  environment text not null check (environment in ('test','live')),
  case_ref text not null unique check (case_ref ~ '^[A-Z0-9-]{6,80}$'),
  store_id text not null,
  subscription_id text not null,
  invoice_id text not null,
  workspace_id uuid not null,
  period_key text,
  requested_at timestamptz not null,
  customer_notified_at timestamptz not null,
  approved_at timestamptz not null default now(),
  reviewer text not null check (length(reviewer) between 3 and 120),
  reason text not null check (length(reason) between 8 and 1000),
  exception_basis text,
  decision text not null check (decision in ('revoke_current', 'retain')),
  effective_at timestamptz,
  approved_refund_usd integer not null check (approved_refund_usd > 0),
  baseline_refunded_usd integer not null check (baseline_refunded_usd >= 0),
  unique (id, workspace_id),
  foreign key (environment, store_id, invoice_id, subscription_id, workspace_id)
    references app_private.billing_invoice_ledger
      (environment, store_id, provider_id, subscription_id, workspace_id),
  foreign key (environment, store_id, subscription_id, period_key)
    references app_private.billing_verified_period
      (environment, store_id, subscription_id, period_key),
  check ((decision = 'revoke_current' and period_key is not null and effective_at is not null)
    or (decision = 'retain' and effective_at is null)),
  check (customer_notified_at <= approved_at),
  check (exception_basis is null or length(exception_basis) between 8 and 1000)
);

create table app_private.billing_refund_case_application (
  case_id uuid primary key,
  workspace_id uuid not null,
  provider_invoice_version timestamptz not null,
  provider_refunded_usd integer not null check (provider_refunded_usd > 0),
  provider_refunded_amount integer not null check (provider_refunded_amount > 0),
  applied_at timestamptz not null default now(),
  access_revoked_at timestamptz,
  foreign key (case_id, workspace_id)
    references app_private.billing_refund_case (id, workspace_id),
  check (access_revoked_at is null or access_revoked_at >= applied_at)
);

create index billing_refund_case_owner_period
  on app_private.billing_refund_case (workspace_id, subscription_id, period_key);

alter table app_private.billing_refund_case enable row level security;
alter table app_private.billing_refund_case_application enable row level security;
revoke all on app_private.billing_refund_case,
  app_private.billing_refund_case_application
  from public, anon, authenticated, service_role, gym_assistant_api;
grant select, insert on app_private.billing_refund_case,
  app_private.billing_refund_case_application to gym_billing_worker;
grant select (id, environment, store_id, subscription_id, workspace_id, period_key, decision)
  on app_private.billing_refund_case to gym_assistant_api;
grant select (case_id, workspace_id, access_revoked_at)
  on app_private.billing_refund_case_application to gym_assistant_api;

create policy billing_refund_case_worker on app_private.billing_refund_case
  for all to gym_billing_worker using (true) with check (true);
create policy billing_refund_application_worker on app_private.billing_refund_case_application
  for all to gym_billing_worker using (true) with check (true);
create policy billing_refund_case_owner on app_private.billing_refund_case
  for select to gym_assistant_api
  using (workspace_id = nullif(current_setting('app.current_workspace_id', true), '')::uuid);
create policy billing_refund_application_owner on app_private.billing_refund_case_application
  for select to gym_assistant_api
  using (workspace_id = nullif(current_setting('app.current_workspace_id', true), '')::uuid);


