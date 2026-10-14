-- Prepared locally only. Test Mode ledger does not grant PlanAccess or enable live billing.
do $$ begin
  if not exists(select 1 from pg_roles where rolname='gym_billing_worker') then
    create role gym_billing_worker nologin;
  end if;
end $$;
grant usage on schema app_private to gym_billing_worker;

create table app_private.billing_event_inbox (
  id uuid primary key default gen_random_uuid(),
  environment text not null default 'test' check(environment='test'),
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
  environment text not null default 'test' check(environment='test'),
  store_id text not null,
  provider_id text not null,
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  intent_id uuid not null unique references app_private.billing_checkout_intent(id) on delete cascade,
  customer_id text not null,
  resource jsonb not null check(jsonb_typeof(resource)='object'),
  reconciled_at timestamptz not null,
  primary key(environment,store_id,provider_id),
  unique(environment,store_id,provider_id,workspace_id)
);
create index billing_subscription_owner on app_private.billing_subscription_ledger(workspace_id);

create table app_private.billing_invoice_ledger (
  environment text not null default 'test' check(environment='test'),
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
  environment text not null default 'test' check(environment='test'),
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
