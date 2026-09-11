create table app_private.lesson_purchase (
  id uuid primary key,
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  student_id uuid not null,
  purchased_at timestamptz not null,
  lesson_count integer not null check (lesson_count > 0 and lesson_count <= 10000),
  private_note text not null default '' check (char_length(private_note) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_purchase_student_workspace_fk
    foreign key (workspace_id, student_id)
    references app_private.student (workspace_id, id) on delete cascade
);

create index lesson_purchase_student_purchased_at_idx
  on app_private.lesson_purchase (workspace_id, student_id, purchased_at, id);

-- M3 owns only the entitlement-relevant session state. M4 will add calendar fields and transitions.
create table app_private.course_session (
  id uuid primary key,
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  student_id uuid not null,
  status text not null check (status in ('scheduled', 'completed', 'cancelled')),
  constraint course_session_student_workspace_fk
    foreign key (workspace_id, student_id)
    references app_private.student (workspace_id, id) on delete cascade
);

create index course_session_completed_student_idx
  on app_private.course_session (workspace_id, student_id)
  where status = 'completed';

grant select, insert, update, delete on app_private.lesson_purchase, app_private.course_session
  to gym_assistant_api;
