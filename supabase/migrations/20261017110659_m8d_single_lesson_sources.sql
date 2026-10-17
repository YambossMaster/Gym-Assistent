-- Source decisions are fixed when a Session is completed. Existing completed
-- Sessions are classified with the same historical ordering used by Finance.
alter table app_private.lesson_purchase
  add column source_kind text not null default 'manual'
    check (source_kind in ('manual', 'generated_single')),
  add column source_session_id uuid,
  add constraint lesson_purchase_generated_source_pair
    check ((source_kind = 'generated_single') = (source_session_id is not null)),
  add constraint lesson_purchase_source_session_fk
    foreign key (workspace_id, source_session_id)
    references app_private.course_session (workspace_id, id),
  add constraint lesson_purchase_source_session_unique
    unique (workspace_id, source_session_id);
alter table app_private.lesson_purchase
  add constraint lesson_purchase_source_student_identity unique (workspace_id, student_id, id);
alter table app_private.course_session
  add constraint course_session_source_student_identity unique (workspace_id, student_id, id);

create table app_private.session_lesson_source (
  workspace_id uuid not null,
  session_id uuid not null,
  student_id uuid not null,
  kind text not null check (kind in ('manual', 'generated_single', 'pending', 'legacy_unallocated')),
  purchase_id uuid,
  version integer not null default 1 check (version > 0),
  decided_at timestamptz not null default now(),
  primary key (workspace_id, session_id),
  foreign key (workspace_id, student_id, session_id)
    references app_private.course_session (workspace_id, student_id, id) on delete cascade,
  foreign key (workspace_id, student_id)
    references app_private.student (workspace_id, id) on delete cascade,
  foreign key (workspace_id, student_id, purchase_id)
    references app_private.lesson_purchase (workspace_id, student_id, id),
  check ((kind in ('manual', 'generated_single')) = (purchase_id is not null))
);
create index session_lesson_source_purchase
  on app_private.session_lesson_source (workspace_id, purchase_id)
  where purchase_id is not null;
create index session_lesson_source_pending
  on app_private.session_lesson_source (workspace_id, session_id)
  where kind = 'pending';
alter table app_private.session_lesson_source enable row level security;
revoke all on app_private.session_lesson_source from public, anon, authenticated, service_role;
grant select, insert, update, delete on app_private.session_lesson_source to gym_assistant_api;
create policy workspace_api on app_private.session_lesson_source for all to gym_assistant_api
  using (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid)
  with check (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid);

create table app_private.single_lesson_settlement_request (
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  request_id uuid not null,
  payload_hash text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, request_id)
);
alter table app_private.single_lesson_settlement_request enable row level security;
revoke all on app_private.single_lesson_settlement_request from public, anon, authenticated, service_role;
grant select, insert on app_private.single_lesson_settlement_request to gym_assistant_api;
create policy workspace_api on app_private.single_lesson_settlement_request for all to gym_assistant_api
  using (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid)
  with check (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid);

-- Preserve the old dynamic allocation for historical completed Sessions,
-- including overdrawn packages and completed records with no eligible source.
do $$
declare
  session_row record;
  chosen uuid;
begin
  for session_row in
    select s.workspace_id, s.id, s.student_id, s.venue_id,
      case when s.ends_at is null then null
        else (s.ends_at at time zone w.time_zone)::date end as local_date
    from app_private.course_session s
    join app_private.workspace w on w.id = s.workspace_id
    where s.status = 'completed'
    order by coalesce(s.ends_at, s.starts_at) nulls first, s.id
  loop
    select p.id into chosen
    from app_private.lesson_purchase p
    where p.workspace_id = session_row.workspace_id
      and p.student_id = session_row.student_id
      and (session_row.local_date is null or
        (p.purchased_at at time zone
          (select time_zone from app_private.workspace where id = p.workspace_id))::date
          <= session_row.local_date)
      and (p.entitlement_venue_id is null or
        p.entitlement_venue_id = session_row.venue_id)
      and (select count(*) from app_private.session_lesson_source a
        where a.workspace_id = p.workspace_id and a.purchase_id = p.id) < p.lesson_count
    order by (p.entitlement_venue_id is not null) desc, p.purchased_at, p.id
    limit 1;
    if chosen is null then
      select p.id into chosen
      from app_private.lesson_purchase p
      where p.workspace_id = session_row.workspace_id
        and p.student_id = session_row.student_id
        and (session_row.local_date is null or
          (p.purchased_at at time zone
            (select time_zone from app_private.workspace where id = p.workspace_id))::date
            <= session_row.local_date)
        and (p.entitlement_venue_id is null or
          p.entitlement_venue_id = session_row.venue_id)
      order by (p.entitlement_venue_id is not null) desc, p.purchased_at, p.id
      limit 1;
    end if;
    insert into app_private.session_lesson_source
      (workspace_id, session_id, student_id, kind, purchase_id)
    values (session_row.workspace_id, session_row.id, session_row.student_id,
      case when chosen is null then 'legacy_unallocated' else 'manual' end, chosen);
  end loop;
end $$;

-- Scheduling is independent of lesson purchase history. Retain Venue
-- existence, effective fee rule and customer-source logic.
drop trigger if exists guard_purchase_venue_schedule on app_private.lesson_purchase;
drop function if exists app_private.guard_purchase_venue_schedule();
create or replace function app_private.validate_series_venue() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform set_config('app.current_workspace_id', new.workspace_id::text, true);
  if new.venue_id is not null and
    (tg_op = 'INSERT' or new.venue_id is distinct from old.venue_id) and
    not exists (select 1 from app_private.venue
      where workspace_id = new.workspace_id and id = new.venue_id and active) then
    raise exception 'Venue not found' using errcode = 'P0002';
  end if;
  if new.venue_id is not null and
    (tg_op = 'INSERT' or new.venue_id is distinct from old.venue_id or
      new.student_id is distinct from old.student_id) then
    new.customer_source := case when exists (
      select 1 from app_private.venue_coach_supplied_student x
      where x.workspace_id = new.workspace_id and x.venue_id = new.venue_id
        and x.student_id = new.student_id
    ) then 'coach' else 'venue' end;
  end if;
  return new;
end $$;

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
    if not exists (select 1 from app_private.venue
      where workspace_id = new.workspace_id and id = new.venue_id and active) then
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
    where r.workspace_id = new.workspace_id and r.venue_id = new.venue_id
      and r.effective_at <= new.ends_at
    order by r.effective_at desc, r.id desc
    limit 1;
  end if;
  if tg_op = 'INSERT' or new.student_id is distinct from old.student_id or
    new.venue_id is distinct from old.venue_id then
    new.customer_source := case when exists (
      select 1 from app_private.venue_coach_supplied_student x
      where x.workspace_id = new.workspace_id and x.venue_id = new.venue_id
        and x.student_id = new.student_id
    ) then 'coach' else 'venue' end;
  end if;
  if (tg_op = 'INSERT' or new.venue_id is distinct from old.venue_id or
    new.customer_source is distinct from old.customer_source or
    new.status is distinct from old.status)
    and exists (select 1 from app_private.venue_fee_rule
      where workspace_id = new.workspace_id and id = new.fee_rule_id
        and kind = 'commission' and rate is null)
    and new.customer_source is null then
    raise exception 'Customer source required';
  end if;
  return new;
end $$;
