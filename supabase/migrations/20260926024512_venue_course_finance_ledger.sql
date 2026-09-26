-- Keep the original local date for display while comparing instants in one time line.
alter table app_private.venue_fee_rule add column effective_at timestamptz;
update app_private.venue_fee_rule r set effective_at = r.effective_from::timestamp at time zone w.time_zone
from app_private.workspace w where w.id=r.workspace_id;
alter table app_private.venue_fee_rule alter column effective_at set not null;
create unique index venue_fee_rule_instant on app_private.venue_fee_rule(workspace_id,venue_id,effective_at);
alter table app_private.venue_fee_rule drop constraint venue_fee_rule_workspace_id_venue_id_effective_from_key;

alter table app_private.venue_credit_purchase add column starts_deducting_at timestamptz;
update app_private.venue_credit_purchase p set starts_deducting_at = p.purchased_on::timestamp at time zone w.time_zone
from app_private.workspace w where w.id=p.workspace_id;
alter table app_private.venue_credit_purchase alter column starts_deducting_at set not null;
alter table app_private.venue_credit_purchase add constraint venue_credit_workspace_identity unique(workspace_id,venue_id,id);

create table app_private.venue_session_adjustment (
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  session_id uuid not null,
  venue_id uuid not null,
  mode text not null check(mode in ('auto','exempt','batch','amount','rate')),
  credit_id uuid,
  amount_minor bigint check(amount_minor between -999999999999 and 999999999999),
  rate numeric(5,2) check(rate between 0 and 100),
  version integer not null default 1 check(version>0),
  updated_at timestamptz not null default now(),
  primary key(workspace_id,session_id),
  foreign key(workspace_id,session_id) references app_private.course_session(workspace_id,id) on delete cascade,
  foreign key(workspace_id,venue_id) references app_private.venue(workspace_id,id),
  foreign key(workspace_id,venue_id,credit_id) references app_private.venue_credit_purchase(workspace_id,venue_id,id),
  check((mode in ('batch','auto')) or credit_id is null),
  check(mode<>'batch' or credit_id is not null),
  check(mode='amount' or amount_minor is null),
  check(mode='rate' or rate is null)
);

create table app_private.finance_entry_state (
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  entry_id text not null,
  version integer not null default 1 check(version>0),
  hidden boolean not null default false,
  manual_amount_minor bigint check(manual_amount_minor between -999999999999 and 999999999999),
  manual_at timestamptz,
  manual_label text check(length(trim(manual_label)) between 1 and 160),
  source_fingerprint text,
  source_snapshot jsonb,
  updated_at timestamptz not null default now(),
  primary key(workspace_id,entry_id)
);
create table app_private.finance_manual_entry (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  occurred_at timestamptz not null,
  label text not null check(length(trim(label)) between 1 and 160),
  direction text not null check(direction in ('income','expense')),
  amount_minor bigint not null check(amount_minor between 0 and 999999999999),
  currency text not null check(currency ~ '^[A-Z]{3}$'),
  private_note text not null default '' check(length(private_note)<=4000),
  version integer not null default 1 check(version>0)
);
create index finance_manual_entry_month on app_private.finance_manual_entry(workspace_id,occurred_at,id);

do $$ declare t text; begin
  foreach t in array array['venue_session_adjustment','finance_entry_state','finance_manual_entry'] loop
    execute format('alter table app_private.%I enable row level security',t);
    execute format('revoke all on app_private.%I from public,anon,authenticated,service_role',t);
    execute format('grant select,insert,update,delete on app_private.%I to gym_assistant_api',t);
    execute format('create policy workspace_api on app_private.%I for all to gym_assistant_api using (workspace_id=nullif((select current_setting(''app.current_workspace_id'',true)),'''')::uuid) with check (workspace_id=nullif((select current_setting(''app.current_workspace_id'',true)),'''')::uuid)',t);
  end loop;
end $$;

-- Scheduled Sessions track the rule applicable at the end of the Session.
create or replace function app_private.assign_session_venue_rule() returns trigger
language plpgsql set search_path = '' as $$
begin
  perform set_config('app.current_workspace_id',new.workspace_id::text,true);
  if new.venue_id is null then new.fee_rule_id := null; new.customer_source := null; return new; end if;
  if tg_op = 'INSERT' or new.venue_id is distinct from old.venue_id then
    if not exists(select 1 from app_private.venue where workspace_id=new.workspace_id and id=new.venue_id and active)
      then raise exception 'Venue not found' using errcode='P0002'; end if;
  end if;
  if tg_op = 'INSERT' or (new.status='scheduled' and
    (new.venue_id is distinct from old.venue_id or new.ends_at is distinct from old.ends_at or new.status is distinct from old.status)) then
    select r.id into new.fee_rule_id from app_private.venue_fee_rule r
      where r.workspace_id=new.workspace_id and r.venue_id=new.venue_id and r.effective_at<=new.ends_at
      order by r.effective_at desc,r.id desc limit 1;
  end if;
  if (tg_op='INSERT' or new.venue_id is distinct from old.venue_id or new.customer_source is distinct from old.customer_source or new.status is distinct from old.status)
    and exists(select 1 from app_private.venue_fee_rule where workspace_id=new.workspace_id and id=new.fee_rule_id and kind='commission' and rate is null)
    and new.customer_source is null then raise exception 'Customer source required'; end if;
  return new;
end $$;
revoke all on function app_private.assign_session_venue_rule() from public,anon,authenticated,service_role;
grant execute on function app_private.assign_session_venue_rule() to gym_assistant_api;

create or replace function app_private.refresh_venue_balance(w uuid,v uuid) returns void
language plpgsql set search_path='' as $$
declare current_kind text; available bigint; waiting bigint; credit_row record; session_row record; selected_credit uuid;
begin
  if v is null then return; end if;
  perform set_config('app.current_workspace_id',w::text,true);
  perform id from app_private.venue where workspace_id=w and id=v for update;
  -- An existing valid assignment keeps its batch when a later batch is inserted.
  delete from app_private.venue_session_adjustment a
    where a.workspace_id=w and a.venue_id=v and a.mode='auto' and a.credit_id is not null
      and not exists(
        select 1 from app_private.course_session s
        join app_private.venue_fee_rule r on r.workspace_id=s.workspace_id and r.id=s.fee_rule_id
        join app_private.venue_credit_purchase p on p.workspace_id=a.workspace_id and p.id=a.credit_id
        where s.workspace_id=w and s.id=a.session_id and s.venue_id=v and s.status='completed'
          and r.kind='prepaid' and s.ends_at>=p.starts_deducting_at);
  for credit_row in select id,lesson_count from app_private.venue_credit_purchase
    where workspace_id=w and venue_id=v loop
    if (select count(*) from app_private.venue_session_adjustment
      where workspace_id=w and venue_id=v and credit_id=credit_row.id and mode='batch') > credit_row.lesson_count
      then raise exception 'Manual Venue allocation exceeds batch capacity' using errcode='23514'; end if;
    while (select count(*) from app_private.venue_session_adjustment
      where workspace_id=w and venue_id=v and credit_id=credit_row.id) > credit_row.lesson_count loop
      update app_private.venue_session_adjustment set credit_id=null,version=version+1,updated_at=now()
        where (workspace_id,session_id)=(select a.workspace_id,a.session_id
          from app_private.venue_session_adjustment a join app_private.course_session s
            on s.workspace_id=a.workspace_id and s.id=a.session_id
          where a.workspace_id=w and a.venue_id=v and a.credit_id=credit_row.id and a.mode='auto'
          order by s.ends_at desc,s.id desc limit 1);
    end loop;
  end loop;
  for session_row in
    select s.id,s.ends_at from app_private.course_session s
    join app_private.venue_fee_rule r on r.workspace_id=s.workspace_id and r.id=s.fee_rule_id
    where s.workspace_id=w and s.venue_id=v and s.status='completed' and r.kind='prepaid'
      and not exists(select 1 from app_private.venue_session_adjustment a
        where a.workspace_id=w and a.session_id=s.id and (a.mode<>'auto' or a.credit_id is not null))
    order by s.ends_at,s.id
  loop
    select p.id into selected_credit from app_private.venue_credit_purchase p
      where p.workspace_id=w and p.venue_id=v and p.starts_deducting_at<=session_row.ends_at
        and (select count(*) from app_private.venue_session_adjustment a
          where a.workspace_id=w and a.credit_id=p.id) < p.lesson_count
      order by p.starts_deducting_at,p.purchased_on,p.id limit 1;
    if selected_credit is not null then
      insert into app_private.venue_session_adjustment(workspace_id,session_id,venue_id,mode,credit_id)
        values(w,session_row.id,v,'auto',selected_credit)
        on conflict(workspace_id,session_id) do update set credit_id=excluded.credit_id,
          version=app_private.venue_session_adjustment.version+1,updated_at=now()
          where app_private.venue_session_adjustment.mode='auto'
            and app_private.venue_session_adjustment.credit_id is null;
    end if;
    selected_credit := null;
  end loop;
  select r.kind into current_kind from app_private.venue_fee_rule r
    where r.workspace_id=w and r.venue_id=v and r.effective_at<=now()
    order by r.effective_at desc,r.id desc limit 1;
  select coalesce(sum(lesson_count),0) into available from app_private.venue_credit_purchase
    where workspace_id=w and venue_id=v;
  select available-count(*) into available from app_private.venue_session_adjustment
    where workspace_id=w and venue_id=v and credit_id is not null;
  select count(*) into waiting from app_private.course_session s
    join app_private.venue_fee_rule r on r.workspace_id=s.workspace_id and r.id=s.fee_rule_id
    where s.workspace_id=w and s.venue_id=v and s.status='completed' and r.kind='prepaid'
      and not exists(select 1 from app_private.venue_session_adjustment a
        where a.workspace_id=w and a.session_id=s.id and (a.mode='exempt' or a.credit_id is not null));
  update app_private.venue set
    low_occurrence=case when current_kind='prepaid' and available-waiting<=1 then coalesce(low_occurrence,gen_random_uuid()) else null end,
    low_occurred_at=case when current_kind='prepaid' and available-waiting<=1 then coalesce(low_occurred_at,now()) else null end
    where workspace_id=w and id=v and ((coalesce(current_kind='prepaid',false) and available-waiting<=1) is distinct from (low_occurrence is not null));
end $$;
revoke all on function app_private.refresh_venue_balance(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function app_private.refresh_venue_balance(uuid,uuid) to gym_assistant_api;
do $$ declare item record; begin
  for item in select workspace_id,id from app_private.venue loop
    perform app_private.refresh_venue_balance(item.workspace_id,item.id);
  end loop;
end $$;
