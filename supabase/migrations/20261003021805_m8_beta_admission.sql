create table app_private.beta_code (
  id uuid primary key,
  code_digest text not null unique check (code_digest ~ '^[0-9a-f]{64}$'),
  redemption_limit integer not null check (redemption_limit > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0 and redemption_count <= redemption_limit),
  closes_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table app_private.beta_redemption (
  id uuid primary key,
  code_id uuid not null references app_private.beta_code(id),
  email_code_digest text not null check (email_code_digest ~ '^[0-9a-f]{64}$'),
  redeemed_at timestamptz not null,
  unique (code_id, email_code_digest)
);

create table app_private.beta_grant (
  workspace_id uuid primary key references app_private.workspace(id) on delete cascade,
  code_id uuid references app_private.beta_code(id),
  kind text not null check (kind in ('promotional', 'permanent')),
  started_at timestamptz not null,
  ends_at timestamptz,
  prior_ends_at timestamptz,
  disclosure_version text not null,
  disclosure_accepted_at timestamptz not null,
  check ((kind = 'promotional' and ends_at is not null and code_id is not null)
    or (kind = 'permanent' and ends_at is null)),
  check (ends_at is null or ends_at > started_at)
);

create table app_private.beta_rate_limit_bucket (
  subject_kind text not null check (subject_kind in ('identity', 'ip')),
  subject_digest text not null check (subject_digest ~ '^[0-9a-f]{64}$'),
  bucket_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (subject_kind, subject_digest, bucket_started_at)
);

create table app_private.beta_operator_event (
  id uuid primary key,
  action text not null check (action in ('issue_code', 'revoke_code', 'grant_permanent', 'revoke_permanent')),
  actor text not null,
  code_id uuid references app_private.beta_code(id),
  workspace_id uuid references app_private.workspace(id) on delete set null,
  reason text not null,
  occurred_at timestamptz not null default now()
);

create index beta_rate_limit_bucket_time_idx on app_private.beta_rate_limit_bucket (bucket_started_at);
create index beta_grant_kind_idx on app_private.beta_grant (kind);

revoke all on app_private.beta_code, app_private.beta_redemption, app_private.beta_grant,
  app_private.beta_rate_limit_bucket, app_private.beta_operator_event
  from public, anon, authenticated, service_role;
grant select, insert, update, delete on app_private.beta_code, app_private.beta_redemption,
  app_private.beta_grant, app_private.beta_rate_limit_bucket, app_private.beta_operator_event
  to gym_assistant_api;
