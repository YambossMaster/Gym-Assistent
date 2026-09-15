create table app_private.capability_link (
  id uuid primary key,
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  session_id uuid not null,
  purpose text not null check (purpose in ('training_result', 'reschedule_session')),
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  used_at timestamptz,
  redeemed_starts_at timestamptz,
  include_training_note boolean not null default false,
  resource_version integer not null check (resource_version > 0),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, session_id)
    references app_private.course_session(workspace_id, id) on delete cascade,
  check (purpose = 'training_result' or not include_training_note),
  check (
    (purpose = 'reschedule_session' and ((used_at is null) = (redeemed_starts_at is null)))
    or (purpose = 'training_result' and used_at is null and redeemed_starts_at is null)
  )
);

create table app_private.public_rate_limit_bucket (
  operation text not null check (operation in ('projection', 'redemption')),
  key_hash bytea not null check (octet_length(key_hash) = 32),
  bucket_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key (operation, key_hash, bucket_started_at)
);

create index capability_link_session_created_idx
  on app_private.capability_link (workspace_id, session_id, purpose, created_at desc, id);
create index capability_link_active_idx
  on app_private.capability_link (workspace_id, session_id, purpose)
  where revoked_at is null and used_at is null;
create index public_rate_limit_bucket_updated_idx
  on app_private.public_rate_limit_bucket (updated_at);

alter table app_private.capability_link enable row level security;
alter table app_private.public_rate_limit_bucket enable row level security;

revoke all on app_private.capability_link, app_private.public_rate_limit_bucket
  from public, anon, authenticated, service_role;
grant select, insert, update, delete on app_private.capability_link,
  app_private.public_rate_limit_bucket to gym_assistant_api;

create policy capability_link_workspace_api on app_private.capability_link
  for all to gym_assistant_api
  using (
    workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid
  )
  with check (
    workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid
  );

create policy capability_link_token_read_api on app_private.capability_link
  for select to gym_assistant_api
  using (
    token_hash = decode(
      nullif((select current_setting('app.current_capability_hash', true)), ''),
      'hex'
    )
  );

create policy capability_link_token_update_api on app_private.capability_link
  for update to gym_assistant_api
  using (
    token_hash = decode(
      nullif((select current_setting('app.current_capability_hash', true)), ''),
      'hex'
    )
  )
  with check (
    token_hash = decode(
      nullif((select current_setting('app.current_capability_hash', true)), ''),
      'hex'
    )
  );

-- Scheduling and Training invalidation runs only from the two audited row triggers below.
create policy capability_link_trigger_update_api on app_private.capability_link
  for update to gym_assistant_api
  using (pg_trigger_depth() > 0)
  with check (pg_trigger_depth() > 0);

create policy public_rate_limit_bucket_api on app_private.public_rate_limit_bucket
  for all to gym_assistant_api
  using (
    key_hash = decode(
      nullif((select current_setting('app.current_rate_limit_key', true)), ''),
      'hex'
    )
  )
  with check (
    key_hash = decode(
      nullif((select current_setting('app.current_rate_limit_key', true)), ''),
      'hex'
    )
  );

create function app_private.revoke_reschedule_capability_on_session_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.starts_at is distinct from new.starts_at
     or old.ends_at is distinct from new.ends_at
     or old.location is distinct from new.location
     or old.status is distinct from new.status then
    update app_private.capability_link
       set revoked_at = coalesce(revoked_at, now()),
           version = case when revoked_at is null then version + 1 else version end,
           updated_at = case when revoked_at is null then now() else updated_at end
     where workspace_id = new.workspace_id
       and session_id = new.id
       and purpose = 'reschedule_session'
       and revoked_at is null
       and used_at is null;
  end if;
  return new;
end
$$;

create trigger course_session_revoke_reschedule_capability
after update of starts_at, ends_at, location, status on app_private.course_session
for each row execute function app_private.revoke_reschedule_capability_on_session_change();

create function app_private.revoke_training_capability_on_record_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.version is distinct from new.version then
    update app_private.capability_link
       set revoked_at = coalesce(revoked_at, now()),
           version = case when revoked_at is null then version + 1 else version end,
           updated_at = case when revoked_at is null then now() else updated_at end
     where workspace_id = new.workspace_id
       and session_id = new.session_id
       and purpose = 'training_result'
       and revoked_at is null;
  end if;
  return new;
end
$$;

create trigger training_record_revoke_training_capability
after update of version on app_private.training_record
for each row execute function app_private.revoke_training_capability_on_record_change();

revoke execute on function app_private.revoke_reschedule_capability_on_session_change()
  from public, anon, authenticated, service_role;
revoke execute on function app_private.revoke_training_capability_on_record_change()
  from public, anon, authenticated, service_role;
grant execute on function app_private.revoke_reschedule_capability_on_session_change(),
  app_private.revoke_training_capability_on_record_change() to gym_assistant_api;
