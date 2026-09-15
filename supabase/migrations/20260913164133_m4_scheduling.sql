-- M4 replaces the deliberately removed starter. Existing M3 rows are preserved as
-- entitlement-only legacy rows; their calendar fields are intentionally never invented.
alter table app_private.course_session
  add column is_legacy boolean not null default true,
  add column series_id uuid,
  add column starts_at timestamptz,
  add column ends_at timestamptz,
  add column completed_at timestamptz,
  add column location text,
  add column version integer not null default 1 check (version > 0),
  add column created_at timestamptz not null default now(),
  add column updated_at timestamptz not null default now();

create table app_private.schedule_series (
  id uuid primary key,
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  student_id uuid not null,
  anchor_starts_at timestamptz not null,
  local_weekday smallint not null check (local_weekday between 1 and 7),
  local_start_time time not null,
  duration_minutes integer not null check (duration_minutes between 15 and 1440),
  interval_weeks smallint not null check (interval_weeks in (1, 2)),
  auto_schedule_horizon text not null default 'NONE'
    check (auto_schedule_horizon in ('NONE', '1_WEEK', '2_WEEKS', 'MAX_WINDOW')),
  location text not null check (char_length(location) between 1 and 160),
  active boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_series_workspace_identity unique (workspace_id, id),
  constraint schedule_series_student_workspace_fk
    foreign key (workspace_id, student_id)
    references app_private.student (workspace_id, id) on delete cascade
);

alter table app_private.course_session
  add constraint course_session_series_workspace_fk
    foreign key (workspace_id, series_id)
    references app_private.schedule_series(workspace_id, id) on delete set null (series_id),
  add constraint course_session_temporal_or_legacy
    check (
      is_legacy
      or (starts_at is not null and ends_at is not null and ends_at > starts_at
          and location is not null and char_length(location) between 1 and 160)
    ),
  add constraint course_session_completed_at_check
    check ((status <> 'completed') or completed_at is not null or is_legacy);

alter table app_private.course_session alter column is_legacy set default false;

create index course_session_calendar_range_idx
  on app_private.course_session (workspace_id, starts_at, ends_at, id)
  where not is_legacy;
create index course_session_student_schedule_idx
  on app_private.course_session (workspace_id, student_id, starts_at, id)
  where not is_legacy;
create index schedule_series_student_idx
  on app_private.schedule_series (workspace_id, student_id, active, anchor_starts_at);

create table app_private.availability_rule (
  id uuid primary key,
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  active boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  unique (workspace_id, weekday, start_time, end_time)
);

create table app_private.availability_override (
  id uuid primary key,
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  local_date date not null,
  windows jsonb not null default '[]'::jsonb,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, local_date),
  check (jsonb_typeof(windows) = 'array')
);

create table app_private.calendar_block (
  id uuid primary key,
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  recurrence_id uuid,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text not null default '' check (char_length(note) <= 1000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index calendar_block_range_idx
  on app_private.calendar_block (workspace_id, starts_at, ends_at, id);
create index calendar_block_recurrence_idx
  on app_private.calendar_block (workspace_id, recurrence_id, starts_at)
  where recurrence_id is not null;

grant select, insert, update, delete on app_private.schedule_series,
  app_private.availability_rule, app_private.availability_override, app_private.calendar_block
  to gym_assistant_api;
