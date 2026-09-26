-- A Coach-supplied exception is scoped to a Student at one Venue. Absence means
-- Venue-supplied, so the Coach never has to classify every Session.
create table app_private.venue_coach_supplied_student (
  workspace_id uuid not null,
  venue_id uuid not null,
  student_id uuid not null,
  primary key (workspace_id, venue_id, student_id),
  foreign key (workspace_id, venue_id) references app_private.venue(workspace_id, id) on delete cascade,
  foreign key (workspace_id, student_id) references app_private.student(workspace_id, id) on delete cascade
);

-- Dated salary settings preserve already paid months. A disabled rule ends the
-- series without deleting older salary facts derived from previous rules.
create table app_private.venue_salary_rule (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  venue_id uuid not null,
  effective_from date not null,
  enabled boolean not null,
  amount_minor bigint check (amount_minor between 0 and 999999999999),
  currency text check (currency ~ '^[A-Z]{3}$'),
  pay_day integer check (pay_day between 1 and 31),
  foreign key (workspace_id, venue_id) references app_private.venue(workspace_id, id) on delete cascade,
  unique (workspace_id, venue_id, effective_from),
  check (not enabled or (amount_minor is not null and currency is not null and pay_day is not null))
);
create index venue_salary_rule_lookup on app_private.venue_salary_rule(workspace_id, venue_id, effective_from desc);

-- The older lesson_purchase.venue_id records a legacy collecting Venue. Do not
-- reinterpret those historical values as lesson entitlement.
alter table app_private.lesson_purchase
  add column entitlement_venue_id uuid,
  add column entitlement_customer_source text check (entitlement_customer_source in ('coach','venue')),
  add foreign key (workspace_id, entitlement_venue_id) references app_private.venue(workspace_id, id);
create index lesson_purchase_entitlement_venue on app_private.lesson_purchase(workspace_id, student_id, entitlement_venue_id, purchased_at);

do $$ declare t text; begin
  foreach t in array array['venue_coach_supplied_student','venue_salary_rule'] loop
    execute format('alter table app_private.%I enable row level security', t);
    execute format('revoke all on app_private.%I from public,anon,authenticated,service_role', t);
    execute format('grant select,insert,update,delete on app_private.%I to gym_assistant_api', t);
    execute format('create policy workspace_api on app_private.%I for all to gym_assistant_api using (workspace_id=nullif((select current_setting(''app.current_workspace_id'',true)),'''')::uuid) with check (workspace_id=nullif((select current_setting(''app.current_workspace_id'',true)),'''')::uuid)', t);
  end loop;
end $$;

create or replace function app_private.assign_session_venue_rule() returns trigger
language plpgsql set search_path = '' as $$
declare local_day date;
begin
  perform set_config('app.current_workspace_id',new.workspace_id::text,true);
  if new.venue_id is null then
    new.fee_rule_id := null;
    new.customer_source := null;
    return new;
  end if;
  if tg_op = 'INSERT' or new.venue_id is distinct from old.venue_id then
    if not exists(select 1 from app_private.venue where workspace_id=new.workspace_id and id=new.venue_id and active)
      then raise exception 'Venue not found' using errcode='P0002'; end if;
  end if;
  if tg_op = 'INSERT' or (new.status = 'scheduled' and
    (new.venue_id is distinct from old.venue_id or new.starts_at is distinct from old.starts_at or new.status is distinct from old.status)) then
    select (new.starts_at at time zone w.time_zone)::date into local_day
      from app_private.workspace w where w.id=new.workspace_id;
    select r.id into new.fee_rule_id from app_private.venue_fee_rule r
      where r.workspace_id=new.workspace_id and r.venue_id=new.venue_id and r.effective_from<=local_day
      order by r.effective_from desc limit 1;
  end if;
  if new.status = 'scheduled' and (tg_op = 'INSERT' or new.student_id is distinct from old.student_id or new.venue_id is distinct from old.venue_id) then
    if not exists (
      select 1 from app_private.lesson_purchase p
      where p.workspace_id=new.workspace_id and p.student_id=new.student_id
        and (p.entitlement_venue_id is null or p.entitlement_venue_id=new.venue_id)
    ) then raise exception 'Student has no purchase for this Venue' using errcode='23514'; end if;
  end if;
  if tg_op = 'INSERT' or new.student_id is distinct from old.student_id or new.venue_id is distinct from old.venue_id then
    new.customer_source := case when exists (
      select 1 from app_private.venue_coach_supplied_student x
      where x.workspace_id=new.workspace_id and x.venue_id=new.venue_id and x.student_id=new.student_id
    ) then 'coach' else 'venue' end;
  end if;
  return new;
end $$;

create or replace function app_private.validate_series_venue() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform set_config('app.current_workspace_id',new.workspace_id::text,true);
  if new.venue_id is not null and (tg_op='INSERT' or new.venue_id is distinct from old.venue_id) and
    not exists(select 1 from app_private.venue where workspace_id=new.workspace_id and id=new.venue_id and active)
    then raise exception 'Venue not found' using errcode='P0002'; end if;
  if new.active and new.venue_id is not null and (tg_op='INSERT' or new.venue_id is distinct from old.venue_id) and
    not exists(select 1 from app_private.lesson_purchase p where p.workspace_id=new.workspace_id and p.student_id=new.student_id and (p.entitlement_venue_id is null or p.entitlement_venue_id=new.venue_id))
    then raise exception 'Student has no purchase for this Venue' using errcode='23514'; end if;
  if new.venue_id is not null and (tg_op='INSERT' or new.venue_id is distinct from old.venue_id) then
    new.customer_source := case when exists (
      select 1 from app_private.venue_coach_supplied_student x
      where x.workspace_id=new.workspace_id and x.venue_id=new.venue_id and x.student_id=new.student_id
    ) then 'coach' else 'venue' end;
  end if;
  return new;
end $$;

create function app_private.assign_purchase_entitlement_source() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform set_config('app.current_workspace_id',new.workspace_id::text,true);
  if new.entitlement_venue_id is null then
    new.entitlement_customer_source := null;
  elsif tg_op = 'INSERT' or new.entitlement_venue_id is distinct from old.entitlement_venue_id then
    if not exists(select 1 from app_private.venue v where v.workspace_id=new.workspace_id and v.id=new.entitlement_venue_id and v.active)
      then raise exception 'Venue not found' using errcode='P0002'; end if;
    new.entitlement_customer_source := case when exists (
      select 1 from app_private.venue_coach_supplied_student x
      where x.workspace_id=new.workspace_id and x.venue_id=new.entitlement_venue_id and x.student_id=new.student_id
    ) then 'coach' else 'venue' end;
  end if;
  return new;
end $$;
revoke all on function app_private.assign_purchase_entitlement_source() from public,anon,authenticated,service_role;
grant execute on function app_private.assign_purchase_entitlement_source() to gym_assistant_api;
create trigger assign_purchase_entitlement_source before insert or update on app_private.lesson_purchase
  for each row execute function app_private.assign_purchase_entitlement_source();
