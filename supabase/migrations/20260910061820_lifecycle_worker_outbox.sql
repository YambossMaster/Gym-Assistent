create table app_private.account_lifecycle_outbox (
  id uuid primary key,
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  kind text not null check (kind in ('account_deletion', 'inactivity_reminder')),
  available_at timestamptz not null,
  claimed_at timestamptz,
  delivered_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  constraint account_lifecycle_outbox_one_job unique (workspace_id, kind)
);

create index account_lifecycle_outbox_ready_idx
  on app_private.account_lifecycle_outbox (available_at, created_at)
  where delivered_at is null;

grant select, insert, update, delete on app_private.account_lifecycle_outbox to gym_assistant_api;
