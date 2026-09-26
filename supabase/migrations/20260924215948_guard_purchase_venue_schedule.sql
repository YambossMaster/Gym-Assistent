-- Removing or rebinding a purchase must not strand future scheduled work at a
-- Venue for which the Student no longer has an eligible purchase. Completed
-- history is deliberately left intact and remains available for correction.
create function app_private.guard_purchase_venue_schedule() returns trigger
language plpgsql set search_path = '' as $$
declare affected_venue uuid;
begin
  if tg_op = 'UPDATE' and new.entitlement_venue_id is not distinct from old.entitlement_venue_id then
    return new;
  end if;
  perform set_config('app.current_workspace_id', old.workspace_id::text, true);
  affected_venue := old.entitlement_venue_id;
  if exists (
    select 1 from app_private.course_session s
    where s.workspace_id = old.workspace_id and s.student_id = old.student_id
      and s.status = 'scheduled' and s.venue_id is not null
      and (affected_venue is null or s.venue_id = affected_venue)
      and not exists (
        select 1 from app_private.lesson_purchase p
        where p.workspace_id = old.workspace_id and p.student_id = old.student_id
          and (p.entitlement_venue_id is null or p.entitlement_venue_id = s.venue_id)
      )
  ) or exists (
    select 1 from app_private.schedule_series s
    where s.workspace_id = old.workspace_id and s.student_id = old.student_id
      and s.active and s.venue_id is not null
      and (affected_venue is null or s.venue_id = affected_venue)
      and not exists (
        select 1 from app_private.lesson_purchase p
        where p.workspace_id = old.workspace_id and p.student_id = old.student_id
          and (p.entitlement_venue_id is null or p.entitlement_venue_id = s.venue_id)
      )
  ) then
    raise exception 'Purchase is needed by scheduled work at this Venue' using errcode = '23514';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
revoke all on function app_private.guard_purchase_venue_schedule() from public, anon, authenticated, service_role;
grant execute on function app_private.guard_purchase_venue_schedule() to gym_assistant_api;
create trigger guard_purchase_venue_schedule after update of entitlement_venue_id or delete
  on app_private.lesson_purchase for each row execute function app_private.guard_purchase_venue_schedule();

-- Reassigning the Student of a fixed series must check that Student's purchases
-- as well as a Venue change. The source exception is likewise Student-scoped.
create or replace function app_private.validate_series_venue() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform set_config('app.current_workspace_id',new.workspace_id::text,true);
  if new.venue_id is not null and (tg_op='INSERT' or new.venue_id is distinct from old.venue_id) and
    not exists(select 1 from app_private.venue where workspace_id=new.workspace_id and id=new.venue_id and active)
    then raise exception 'Venue not found' using errcode='P0002'; end if;
  if new.active and new.venue_id is not null and
    (tg_op='INSERT' or new.venue_id is distinct from old.venue_id or new.student_id is distinct from old.student_id or new.active is distinct from old.active) and
    not exists(select 1 from app_private.lesson_purchase p where p.workspace_id=new.workspace_id and p.student_id=new.student_id and (p.entitlement_venue_id is null or p.entitlement_venue_id=new.venue_id))
    then raise exception 'Student has no purchase for this Venue' using errcode='23514'; end if;
  if new.venue_id is not null and
    (tg_op='INSERT' or new.venue_id is distinct from old.venue_id or new.student_id is distinct from old.student_id) then
    new.customer_source := case when exists (
      select 1 from app_private.venue_coach_supplied_student x
      where x.workspace_id=new.workspace_id and x.venue_id=new.venue_id and x.student_id=new.student_id
    ) then 'coach' else 'venue' end;
  end if;
  return new;
end $$;
