-- Keep the Session-end fee-rule selection from 20260926024512 while restoring
-- the purchase-model source derivation for a newly selected Student/Venue.
create or replace function app_private.assign_session_venue_rule() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform set_config('app.current_workspace_id', new.workspace_id::text, true);
  if new.venue_id is null then
    new.fee_rule_id := null;
    new.customer_source := null;
    return new;
  end if;
  if tg_op = 'INSERT' or new.venue_id is distinct from old.venue_id then
    if not exists (
      select 1 from app_private.venue
      where workspace_id = new.workspace_id and id = new.venue_id and active
    ) then
      raise exception 'Venue not found' using errcode = 'P0002';
    end if;
  end if;
  if tg_op = 'INSERT' or (new.status = 'scheduled' and (
    new.venue_id is distinct from old.venue_id or
    new.ends_at is distinct from old.ends_at or
    new.status is distinct from old.status
  )) then
    select r.id into new.fee_rule_id
    from app_private.venue_fee_rule r
    where r.workspace_id = new.workspace_id
      and r.venue_id = new.venue_id
      and r.effective_at <= new.ends_at
    order by r.effective_at desc, r.id desc
    limit 1;
  end if;
  if tg_op = 'INSERT' or
    new.student_id is distinct from old.student_id or
    new.venue_id is distinct from old.venue_id then
    new.customer_source := case when exists (
      select 1 from app_private.venue_coach_supplied_student x
      where x.workspace_id = new.workspace_id
        and x.venue_id = new.venue_id
        and x.student_id = new.student_id
    ) then 'coach' else 'venue' end;
  end if;
  if (tg_op = 'INSERT' or
    new.venue_id is distinct from old.venue_id or
    new.customer_source is distinct from old.customer_source or
    new.status is distinct from old.status)
    and exists (
      select 1 from app_private.venue_fee_rule
      where workspace_id = new.workspace_id
        and id = new.fee_rule_id
        and kind = 'commission'
        and rate is null
    )
    and new.customer_source is null then
    raise exception 'Customer source required';
  end if;
  return new;
end $$;

revoke all on function app_private.assign_session_venue_rule() from public, anon, authenticated, service_role;
grant execute on function app_private.assign_session_venue_rule() to gym_assistant_api;
