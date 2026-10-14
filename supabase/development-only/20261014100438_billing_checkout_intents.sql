-- Local Test Mode foundation. No paid access, trial grant or Production activation.
create table app_private.billing_checkout_account (
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  environment text not null check (environment = 'test'),
  first_subscribed_at timestamptz,
  version integer not null default 1 check(version > 0),
  primary key(workspace_id, environment)
);
create table app_private.billing_checkout_quote (
  id uuid primary key,
  workspace_id uuid not null,
  environment text not null check(environment = 'test'),
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
  environment text not null check(environment = 'test'),
  quote_id uuid not null,
  status text not null check(status in ('creating','open','pending')),
  intent jsonb not null check(jsonb_typeof(intent)='object'),
  created_at timestamptz not null,
  unique(quote_id),
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
