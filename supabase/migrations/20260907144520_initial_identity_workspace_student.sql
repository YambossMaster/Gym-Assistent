do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'gym_assistant_api') then
    create role gym_assistant_api nologin;
  end if;
end
$$;

create schema if not exists app_private;

revoke all on schema app_private from public, anon, authenticated, service_role;
alter default privileges in schema app_private
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema app_private
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges in schema app_private
  revoke execute on functions from public, anon, authenticated, service_role;

create table app_private.workspace (
  id uuid primary key,
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table app_private.student (
  id uuid primary key,
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  phone text not null default '' check (char_length(phone) <= 40),
  goal text not null default '' check (char_length(goal) <= 1000),
  private_note text not null default '' check (char_length(private_note) <= 4000),
  active boolean not null default true,
  line_linked boolean not null default false,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_workspace_identity unique (workspace_id, id)
);

create index student_workspace_created_at_idx
  on app_private.student (workspace_id, created_at, id);

grant usage on schema app_private to gym_assistant_api;
grant select, insert on app_private.workspace to gym_assistant_api;
grant select, insert, update, delete on app_private.student to gym_assistant_api;

alter default privileges in schema app_private
  grant select, insert, update, delete on tables to gym_assistant_api;
