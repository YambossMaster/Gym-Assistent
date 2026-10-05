create table app_private.plan_subscription (
  workspace_id uuid primary key references app_private.workspace(id) on delete cascade,
  tier text not null check (tier in ('basic', 'advanced')),
  billing_interval text not null check (billing_interval in ('month', 'year')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  pending_tier text check (pending_tier in ('free', 'basic', 'advanced')),
  pending_interval text check (pending_interval in ('month', 'year')),
  version integer not null default 1 check (version > 0),
  amount_due_minor integer not null default 0 check (amount_due_minor = 0),
  amount_paid_minor integer not null default 0 check (amount_paid_minor = 0),
  updated_at timestamptz not null default now(),
  check (period_end > period_start),
  check ((pending_tier is null and pending_interval is null)
    or (pending_tier = 'free' and pending_interval is null)
    or (pending_tier in ('basic', 'advanced') and pending_interval is not null))
);

revoke all on app_private.plan_subscription from public, anon, authenticated, service_role;
grant select, insert, update, delete on app_private.plan_subscription to gym_assistant_api;
