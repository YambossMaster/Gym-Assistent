-- M11: one entitlement owner per group Session, with person-owned results.
-- The migration does not create groups or reinterpret historical individual Sessions.
alter table app_private.student
  add column kind text not null default 'person'
    check (kind in ('person', 'group')),
  add constraint student_group_contact_empty check (
    kind = 'person' or (phone = '' and age_range is null and not line_linked)
  ),
  add constraint student_workspace_kind_identity unique (workspace_id, id, kind);

create function app_private.immutable_student_kind() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.kind is distinct from old.kind then
    raise exception using errcode = '23514', message = 'student_kind_immutable';
  end if;
  return new;
end;
$$;
create trigger student_kind_immutable before update of kind on app_private.student
  for each row execute function app_private.immutable_student_kind();
revoke all on function app_private.immutable_student_kind() from public, anon, authenticated, service_role;

-- Historical owners must be archived, never erased by a single Student DELETE.
-- NO ACTION is deferred so deleting an entire Workspace still cascades all its rows.
do $$
declare fk record;
begin
  for fk in
    select c.conname, c.conrelid::regclass as child_table,
           pg_catalog.pg_get_constraintdef(c.oid) as definition
    from pg_catalog.pg_constraint c
    where c.contype = 'f'
      and c.confrelid = 'app_private.student'::regclass
      and c.confdeltype = 'c'
  loop
    execute format('alter table %s drop constraint %I', fk.child_table, fk.conname);
    execute format(
      'alter table %s add constraint %I %s',
      fk.child_table, fk.conname,
      replace(fk.definition, 'ON DELETE CASCADE',
              'ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED')
    );
  end loop;
end;
$$;

-- A membership row is a dated interval; rejoining makes a new interval.
create table app_private.student_group_member (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  group_id uuid not null,
  group_kind text not null default 'group' check (group_kind = 'group'),
  student_id uuid not null,
  student_kind text not null default 'person' check (student_kind = 'person'),
  joined_at timestamptz not null default now(),
  removed_at timestamptz,
  check (removed_at is null or removed_at >= joined_at),
  foreign key (workspace_id, group_id, group_kind)
    references app_private.student(workspace_id, id, kind) on delete cascade,
  foreign key (workspace_id, student_id, student_kind)
    references app_private.student(workspace_id, id, kind) on delete cascade
);
create unique index student_group_member_current
  on app_private.student_group_member(workspace_id, group_id, student_id)
  where removed_at is null;
create index student_group_member_student_current
  on app_private.student_group_member(workspace_id, student_id, group_id)
  where removed_at is null;

create function app_private.guard_current_group_member() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare group_active boolean;
declare person_active boolean;
declare current_count integer;
begin
  if new.removed_at is not null then
    return new;
  end if;
  -- The owner row serializes two concurrent attempts to add the third/fourth member.
  select active into group_active from app_private.student
  where workspace_id = new.workspace_id and id = new.group_id and kind = 'group'
  for update;
  select active into person_active from app_private.student
  where workspace_id = new.workspace_id and id = new.student_id and kind = 'person';
  if group_active is distinct from true or person_active is distinct from true then
    raise exception using errcode = '23514', message = 'group_member_inactive';
  end if;
  select count(*)::integer into current_count from app_private.student_group_member
  where workspace_id = new.workspace_id and group_id = new.group_id
    and removed_at is null and id <> new.id;
  if current_count >= 3 then
    raise exception using errcode = '23514', message = 'group_member_limit';
  end if;
  return new;
end;
$$;
create trigger student_group_member_current_guard
  before insert or update on app_private.student_group_member
  for each row execute function app_private.guard_current_group_member();
revoke all on function app_private.guard_current_group_member() from public, anon, authenticated, service_role;

-- This is the roster of one Session, independent from current group membership.
create table app_private.course_session_participant (
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  session_id uuid not null,
  student_id uuid not null,
  student_kind text not null default 'person' check (student_kind = 'person'),
  attendance text not null default 'pending'
    check (attendance in ('pending', 'present', 'absent')),
  attendance_edited boolean not null default false,
  version integer not null default 1 check (version > 0),
  primary key (workspace_id, session_id, student_id),
  foreign key (workspace_id, session_id)
    references app_private.course_session(workspace_id, id) on delete cascade,
  foreign key (workspace_id, student_id, student_kind)
    references app_private.student(workspace_id, id, kind)
    on delete no action deferrable initially deferred
);
create index course_session_participant_student_history
  on app_private.course_session_participant(workspace_id, student_id, session_id);

alter table app_private.training_set
  add column student_id uuid,
  add column student_kind text not null default 'person'
    check (student_kind = 'person');

-- The existing API writes no student_id. During migration-first rollout it can
-- continue writing personal Sessions; a group Session requires explicit ownership.
create function app_private.assign_training_set_student() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare owner_id uuid;
declare owner_kind text;
declare session_id_value uuid;
begin
  select cs.id, cs.student_id, s.kind
    into session_id_value, owner_id, owner_kind
  from app_private.training_exercise te
  join app_private.training_record tr
    on tr.workspace_id = te.workspace_id and tr.id = te.record_id
  join app_private.course_session cs
    on cs.workspace_id = tr.workspace_id and cs.id = tr.session_id
  join app_private.student s
    on s.workspace_id = cs.workspace_id and s.id = cs.student_id
  where te.workspace_id = new.workspace_id and te.id = new.exercise_id;

  if session_id_value is null then
    raise exception using errcode = '23503', message = 'training_set_session_missing';
  end if;
  if new.student_id is null and owner_kind = 'person' then
    new.student_id := owner_id;
  end if;
  if new.student_id is null then
    raise exception using errcode = '23514', message = 'training_set_student_required';
  end if;
  if owner_kind = 'person' and new.student_id <> owner_id then
    raise exception using errcode = '23514', message = 'training_set_wrong_person';
  end if;
  if owner_kind = 'group' and not exists (
    select 1 from app_private.course_session_participant p
    where p.workspace_id = new.workspace_id
      and p.session_id = session_id_value and p.student_id = new.student_id
  ) then
    raise exception using errcode = '23514', message = 'training_set_person_not_participant';
  end if;
  return new;
end;
$$;
create trigger training_set_student_guard
  before insert or update of student_id, exercise_id, workspace_id
  on app_private.training_set for each row
  execute function app_private.assign_training_set_student();
revoke all on function app_private.assign_training_set_student() from public, anon, authenticated, service_role;

-- Validate the exact legacy ownership path before any value is assigned.
do $$
begin
  if exists (
    select 1 from app_private.training_set ts
    left join app_private.training_exercise te
      on te.workspace_id = ts.workspace_id and te.id = ts.exercise_id
    left join app_private.training_record tr
      on tr.workspace_id = te.workspace_id and tr.id = te.record_id
    left join app_private.course_session cs
      on cs.workspace_id = tr.workspace_id and cs.id = tr.session_id
    left join app_private.student s
      on s.workspace_id = cs.workspace_id and s.id = cs.student_id
    where s.id is null or s.kind <> 'person'
  ) then
    raise exception using errcode = '23514', message = 'training_set_backfill_ambiguous';
  end if;
end;
$$;
update app_private.training_set ts set student_id = cs.student_id
from app_private.training_exercise te
join app_private.training_record tr
  on tr.workspace_id = te.workspace_id and tr.id = te.record_id
join app_private.course_session cs
  on cs.workspace_id = tr.workspace_id and cs.id = tr.session_id
where ts.workspace_id = te.workspace_id and ts.exercise_id = te.id;
do $$
begin
  if exists (select 1 from app_private.training_set where student_id is null) then
    raise exception using errcode = '23514', message = 'training_set_backfill_incomplete';
  end if;
end;
$$;
alter table app_private.training_set
  alter column student_id set not null,
  add constraint training_set_person_workspace_kind_fk
    foreign key (workspace_id, student_id, student_kind)
    references app_private.student(workspace_id, id, kind)
    on delete no action deferrable initially deferred;
create index training_set_person_history
  on app_private.training_set(workspace_id, student_id, exercise_id);

-- A group consumes no natural-person seat, even at the Free cap.
create or replace function app_private.enforce_plan_active_capacity() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  grant_kind text;
  grant_ends_at timestamptz;
  used_seats integer;
  max_seats integer;
begin
  if not new.active or (tg_op = 'UPDATE' and old.active) then
    return new;
  end if;
  if tg_table_name = 'student' then
    if new.kind = 'group' then
      return new;
    end if;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('gym-assistant-active-capacity'),
    pg_catalog.hashtext(new.workspace_id::text)
  );
  select g.kind, g.ends_at into grant_kind, grant_ends_at
  from app_private.workspace w
  left join app_private.beta_grant g on g.workspace_id = w.id
  where w.id = new.workspace_id;
  if grant_kind = 'permanent' or
     (grant_kind = 'promotional' and grant_ends_at > pg_catalog.clock_timestamp()) then
    return new;
  end if;
  if tg_table_name = 'student' then
    max_seats := 5;
    select count(*)::integer into used_seats from app_private.student s
    where s.workspace_id = new.workspace_id and s.active and s.kind = 'person'
      and s.id <> new.id;
  else
    max_seats := 1;
    select count(*)::integer into used_seats from app_private.venue v
    where v.workspace_id = new.workspace_id and v.active and v.id <> new.id;
  end if;
  if used_seats >= max_seats then
    raise exception using errcode = 'P0003', message = 'active_capacity_limit';
  end if;
  return new;
end;
$$;

alter table app_private.student_group_member enable row level security;
alter table app_private.course_session_participant enable row level security;
revoke all on app_private.student_group_member, app_private.course_session_participant
  from public, anon, authenticated, service_role;
grant select, insert, update, delete on
  app_private.student_group_member, app_private.course_session_participant
  to gym_assistant_api;
create policy student_group_member_api on app_private.student_group_member
  for all to gym_assistant_api
  using (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid)
  with check (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid);
create policy course_session_participant_api on app_private.course_session_participant
  for all to gym_assistant_api
  using (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid)
  with check (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid);
