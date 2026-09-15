create table app_private.demo_import_preview (
  id uuid primary key,
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  source_hash text not null check (source_hash ~ '^[0-9a-f]{64}$'),
  manifest_checksum text not null check (manifest_checksum ~ '^[0-9a-f]{64}$'),
  baseline_fingerprint text not null check (baseline_fingerprint ~ '^[0-9a-f]{64}$'),
  plan jsonb not null check (jsonb_typeof(plan) = 'object'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  unique (workspace_id, id),
  check (expires_at > created_at)
);

create table app_private.demo_import_run (
  id uuid primary key,
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  preview_id uuid not null,
  status text not null default 'ready'
    check (status in ('ready','running','partial','completed','rolling_back','rolled_back','rollback_blocked')),
  next_phase smallint not null default 0 check (next_phase between 0 and 5),
  completed_phases jsonb not null default '[]'::jsonb check (jsonb_typeof(completed_phases) = 'array'),
  before_state jsonb not null default '{}'::jsonb check (jsonb_typeof(before_state) = 'object'),
  failure jsonb,
  rollback_expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, preview_id)
    references app_private.demo_import_preview(workspace_id, id) on delete restrict
);

create unique index demo_import_one_active_idx
  on app_private.demo_import_run(workspace_id)
  where status in ('ready','running','partial','rolling_back');

create table app_private.demo_import_ledger (
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  run_id uuid not null,
  phase smallint not null check (phase between 0 and 4),
  entity_type text not null,
  target_id uuid not null,
  accepted_version integer,
  created_at timestamptz not null default now(),
  primary key (workspace_id, run_id, entity_type, target_id),
  foreign key (workspace_id, run_id)
    references app_private.demo_import_run(workspace_id, id) on delete cascade
);

create index demo_import_preview_expiry_idx on app_private.demo_import_preview(expires_at);
create index demo_import_run_workspace_created_idx
  on app_private.demo_import_run(workspace_id, created_at desc);
create index demo_import_ledger_reverse_idx
  on app_private.demo_import_ledger(workspace_id, run_id, phase desc, entity_type, target_id);

alter table app_private.demo_import_preview enable row level security;
alter table app_private.demo_import_run enable row level security;
alter table app_private.demo_import_ledger enable row level security;

revoke all on app_private.demo_import_preview, app_private.demo_import_run,
  app_private.demo_import_ledger from anon, authenticated, service_role;
grant select, insert, update, delete on app_private.demo_import_preview,
  app_private.demo_import_run, app_private.demo_import_ledger to gym_assistant_api;

create policy demo_import_preview_api on app_private.demo_import_preview
  for all to gym_assistant_api
  using (workspace_id = nullif(current_setting('app.current_workspace_id', true), '')::uuid)
  with check (workspace_id = nullif(current_setting('app.current_workspace_id', true), '')::uuid);
create policy demo_import_run_api on app_private.demo_import_run
  for all to gym_assistant_api
  using (workspace_id = nullif(current_setting('app.current_workspace_id', true), '')::uuid)
  with check (workspace_id = nullif(current_setting('app.current_workspace_id', true), '')::uuid);
create policy demo_import_ledger_api on app_private.demo_import_ledger
  for all to gym_assistant_api
  using (workspace_id = nullif(current_setting('app.current_workspace_id', true), '')::uuid)
  with check (workspace_id = nullif(current_setting('app.current_workspace_id', true), '')::uuid);
