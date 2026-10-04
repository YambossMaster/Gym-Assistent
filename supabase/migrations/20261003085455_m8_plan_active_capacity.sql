-- Serialize active-seat claims inside the same transaction as the Student/Venue write.
-- The API handles all other plan checks; these triggers close the last-seat race.
create function app_private.enforce_plan_active_capacity() returns trigger
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

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('gym-assistant-active-capacity'),
    pg_catalog.hashtext(new.workspace_id::text)
  );

  select g.kind, g.ends_at into grant_kind, grant_ends_at
  from app_private.beta_grant g where g.workspace_id = new.workspace_id;
  if grant_kind = 'permanent' or
     (grant_kind = 'promotional' and grant_ends_at > pg_catalog.clock_timestamp()) then
    return new;
  end if;

  if tg_table_name = 'student' then
    max_seats := 5;
    select count(*)::integer into used_seats from app_private.student s
    where s.workspace_id = new.workspace_id and s.active and s.id <> new.id;
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

revoke all on function app_private.enforce_plan_active_capacity() from public, anon, authenticated, service_role;
grant execute on function app_private.enforce_plan_active_capacity() to gym_assistant_api;

create trigger student_active_capacity
before insert or update of active on app_private.student
for each row execute function app_private.enforce_plan_active_capacity();

create trigger venue_active_capacity
before insert or update of active on app_private.venue
for each row execute function app_private.enforce_plan_active_capacity();
