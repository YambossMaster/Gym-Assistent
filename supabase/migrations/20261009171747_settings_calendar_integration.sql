create table app_private.calendar_subscription (
  workspace_id uuid primary key references app_private.workspace(id) on delete cascade,
  token_hash text unique check (token_hash is null or token_hash ~ '^[0-9a-f]{64}$'),
  version integer not null default 1 check (version > 0),
  include_blocks boolean not null default false,
  show_names boolean not null default false,
  show_location boolean not null default true,
  revoked_at timestamptz,
  updated_at timestamptz not null default now()
);
create table app_private.calendar_published_event (
  workspace_id uuid not null references app_private.calendar_subscription(workspace_id) on delete cascade,
  uid text not null,
  fingerprint text not null,
  sequence integer not null check (sequence >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  revised_at timestamptz not null,
  cancelled_at timestamptz,
  primary key (workspace_id, uid)
);
create index calendar_published_event_expiry on app_private.calendar_published_event(workspace_id, cancelled_at);
revoke all on app_private.calendar_subscription, app_private.calendar_published_event from public, anon, authenticated, service_role;
grant select, insert, update, delete on app_private.calendar_subscription, app_private.calendar_published_event to gym_assistant_api;
alter table app_private.calendar_subscription enable row level security;
alter table app_private.calendar_published_event enable row level security;
create policy calendar_subscription_owner on app_private.calendar_subscription to gym_assistant_api
  using (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid)
  with check (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid);
-- Narrow token lookup only. Writes still require resolved tenant scope.
create policy calendar_subscription_lookup on app_private.calendar_subscription for select to gym_assistant_api
  using (token_hash = nullif((select current_setting('app.calendar_token_hash', true)), ''));
create policy calendar_published_event_owner on app_private.calendar_published_event to gym_assistant_api
  using (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid)
  with check (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid);
