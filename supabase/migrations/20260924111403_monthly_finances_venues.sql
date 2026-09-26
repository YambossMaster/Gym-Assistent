create table app_private.venue (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 160),
  active boolean not null default true,
  version integer not null default 1 check (version > 0),
  low_occurrence uuid, low_occurred_at timestamptz,
  unique(workspace_id,id)
);
create table app_private.venue_fee_rule (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null,
  venue_id uuid not null, effective_from date not null,
  kind text not null check (kind in ('untracked','free','commission','rent','prepaid')),
  collection_mode text not null default 'coach' check (collection_mode in ('coach','venue')),
  rate numeric(5,2) check(rate between 0 and 100),
  coach_rate numeric(5,2) check(coach_rate between 0 and 100),
  venue_rate numeric(5,2) check(venue_rate between 0 and 100),
  amount_minor bigint check(amount_minor between 0 and 999999999999),
  currency text check(currency ~ '^[A-Z]{3}$'),
  foreign key(workspace_id,venue_id) references app_private.venue(workspace_id,id) on delete cascade,
  unique(workspace_id,venue_id,id), unique(workspace_id,venue_id,effective_from),
  check(kind <> 'rent' or (amount_minor is not null and currency is not null)),
  check(kind <> 'commission' or ((rate is not null and coach_rate is null and venue_rate is null) or (rate is null and coach_rate is not null and venue_rate is not null)))
);
create table app_private.venue_credit_purchase (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, venue_id uuid not null,
  purchased_on date not null, lesson_count integer not null check(lesson_count between 1 and 10000),
  amount_minor bigint not null check(amount_minor between 0 and 999999999999),
  currency text not null check(currency ~ '^[A-Z]{3}$'), version integer not null default 1 check(version > 0),
  foreign key(workspace_id,venue_id) references app_private.venue(workspace_id,id) on delete cascade
);
alter table app_private.course_session add column venue_id uuid, add column fee_rule_id uuid,
  add column customer_source text check(customer_source in ('coach','venue')),
  add foreign key(workspace_id,venue_id) references app_private.venue(workspace_id,id),
  add foreign key(workspace_id,venue_id,fee_rule_id) references app_private.venue_fee_rule(workspace_id,venue_id,id);
alter table app_private.schedule_series add column venue_id uuid,
  add column customer_source text check(customer_source in ('coach','venue')),
  add foreign key(workspace_id,venue_id) references app_private.venue(workspace_id,id);
alter table app_private.lesson_purchase add column collection_mode text not null default 'coach' check(collection_mode in ('coach','venue')),
  add column venue_id uuid,
  add foreign key(workspace_id,venue_id) references app_private.venue(workspace_id,id),
  add constraint purchase_collecting_venue check(collection_mode = 'coach' or venue_id is not null);
-- Existing amounts/dates and text-only locations deliberately remain untouched.
alter table app_private.lesson_purchase add constraint lesson_purchase_workspace_identity unique(workspace_id,id);
create table app_private.venue_payout (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null, venue_id uuid not null,
  purchase_id uuid, session_id uuid, received_on date not null,
  amount_minor bigint not null check(amount_minor between 0 and 999999999999),
  currency text not null check(currency ~ '^[A-Z]{3}$'), version integer not null default 1 check(version > 0),
  foreign key(workspace_id,venue_id) references app_private.venue(workspace_id,id) on delete cascade,
  foreign key(workspace_id,purchase_id) references app_private.lesson_purchase(workspace_id,id) on delete cascade,
  foreign key(workspace_id,session_id) references app_private.course_session(workspace_id,id) on delete cascade,
  check((purchase_id is null) <> (session_id is null))
);
create index venue_credit_date on app_private.venue_credit_purchase(workspace_id,venue_id,purchased_on,id);
create index venue_payout_date on app_private.venue_payout(workspace_id,received_on,id);
create index course_session_venue on app_private.course_session(workspace_id,venue_id,starts_at,id);
create index schedule_series_venue on app_private.schedule_series(workspace_id,venue_id);
create index lesson_purchase_venue on app_private.lesson_purchase(workspace_id,venue_id);
create index venue_payout_purchase on app_private.venue_payout(workspace_id,purchase_id);
create index venue_payout_session on app_private.venue_payout(workspace_id,session_id);

do $$ declare t text; begin
  foreach t in array array['venue','venue_fee_rule','venue_credit_purchase','venue_payout'] loop
    execute format('alter table app_private.%I enable row level security',t);
    execute format('revoke all on app_private.%I from public,anon,authenticated,service_role',t);
    execute format('grant select,insert,update,delete on app_private.%I to gym_assistant_api',t);
    execute format('create policy workspace_api on app_private.%I for all to gym_assistant_api using (workspace_id=nullif((select current_setting(''app.current_workspace_id'',true)),'''')::uuid) with check (workspace_id=nullif((select current_setting(''app.current_workspace_id'',true)),'''')::uuid)',t);
  end loop;
end $$;
-- Pin the applicable rule on scheduled writes. Completed history is changed only by the
-- explicit, version-checked history operation; public reschedules also retain the rule/date invariant.
create function app_private.assign_session_venue_rule() returns trigger
language plpgsql set search_path = '' as $$
declare local_day date;
begin
  perform set_config('app.current_workspace_id',new.workspace_id::text,true);
  if new.venue_id is null then new.fee_rule_id := null; new.customer_source := null; return new; end if;
  if tg_op = 'INSERT' or new.venue_id is distinct from old.venue_id then
    if not exists(select 1 from app_private.venue where workspace_id=new.workspace_id and id=new.venue_id and active) then raise exception 'Venue not found' using errcode='P0002'; end if;
  end if;
  if tg_op = 'INSERT' or (new.status = 'scheduled' and
    (new.venue_id is distinct from old.venue_id or new.starts_at is distinct from old.starts_at or new.status is distinct from old.status)) then
    select (new.starts_at at time zone w.time_zone)::date into local_day from app_private.workspace w where w.id=new.workspace_id;
    select r.id into new.fee_rule_id from app_private.venue_fee_rule r
      where r.workspace_id=new.workspace_id and r.venue_id=new.venue_id and r.effective_from<=local_day
      order by r.effective_from desc limit 1;
  end if;
  if (tg_op='INSERT' or new.venue_id is distinct from old.venue_id or new.customer_source is distinct from old.customer_source or new.status is distinct from old.status) and exists(select 1 from app_private.venue_fee_rule where workspace_id=new.workspace_id and id=new.fee_rule_id and kind='commission' and rate is null) and new.customer_source is null then raise exception 'Customer source required'; end if;
  return new;
end $$;
revoke all on function app_private.assign_session_venue_rule() from public,anon,authenticated,service_role;
grant execute on function app_private.assign_session_venue_rule() to gym_assistant_api;
create trigger assign_session_venue_rule before insert or update on app_private.course_session
  for each row execute function app_private.assign_session_venue_rule();

create function app_private.validate_purchase_venue() returns trigger
language plpgsql set search_path='' as $$ begin
  perform set_config('app.current_workspace_id',new.workspace_id::text,true);
  if new.collection_mode='venue' and new.venue_id is null then raise exception 'Collecting venue required'; end if;
  if new.venue_id is not null and not exists(select 1 from app_private.venue where workspace_id=new.workspace_id and id=new.venue_id) then raise exception 'Venue not found' using errcode='P0002'; end if;
  return new;
end $$;
create trigger validate_purchase_venue before insert or update on app_private.lesson_purchase
  for each row execute function app_private.validate_purchase_venue();
create function app_private.validate_series_venue() returns trigger
language plpgsql set search_path='' as $$ begin
  perform set_config('app.current_workspace_id',new.workspace_id::text,true);
  if new.venue_id is not null and (tg_op='INSERT' or new.venue_id is distinct from old.venue_id) and not exists(select 1 from app_private.venue where workspace_id=new.workspace_id and id=new.venue_id and active) then raise exception 'Venue not found' using errcode='P0002'; end if;
  return new;
end $$;
create trigger validate_series_venue before insert or update on app_private.schedule_series for each row execute function app_private.validate_series_venue();
revoke all on function app_private.validate_series_venue() from public,anon,authenticated,service_role;
grant execute on function app_private.validate_series_venue() to gym_assistant_api;
create function app_private.refresh_venue_balance(w uuid,v uuid) returns void
language plpgsql set search_path='' as $$
declare is_prepaid boolean; remaining bigint;
begin
  if v is null then return; end if;
  perform set_config('app.current_workspace_id',w::text,true);
  perform id from app_private.venue where workspace_id=w and id=v for update;
  select r.kind='prepaid' into is_prepaid from app_private.venue_fee_rule r
    join app_private.workspace ws on ws.id=r.workspace_id
    where r.workspace_id=w and r.venue_id=v and r.effective_from<=(now() at time zone ws.time_zone)::date
    order by r.effective_from desc limit 1;
  select coalesce((select sum(lesson_count) from app_private.venue_credit_purchase where workspace_id=w and venue_id=v),0)
    -(select count(*) from app_private.course_session s join app_private.venue_fee_rule r
      on r.workspace_id=s.workspace_id and r.venue_id=s.venue_id and r.id=s.fee_rule_id
      where s.workspace_id=w and s.venue_id=v and s.status='completed' and r.kind='prepaid') into remaining;
  update app_private.venue set
    low_occurrence=case when is_prepaid and remaining<=1 then coalesce(low_occurrence,gen_random_uuid()) else null end,
    low_occurred_at=case when is_prepaid and remaining<=1 then coalesce(low_occurred_at,now()) else null end
    where workspace_id=w and id=v and ((coalesce(is_prepaid,false) and remaining<=1) is distinct from (low_occurrence is not null));
end $$;
create function app_private.refresh_changed_venue_balance() returns trigger
language plpgsql set search_path='' as $$ begin
  if tg_op <> 'INSERT' then perform app_private.refresh_venue_balance(old.workspace_id,old.venue_id); end if;
  if tg_op <> 'DELETE' then perform app_private.refresh_venue_balance(new.workspace_id,new.venue_id); end if;
  return null;
end $$;
create trigger course_session_venue_balance after insert or update or delete on app_private.course_session for each row execute function app_private.refresh_changed_venue_balance();
create trigger credit_venue_balance after insert or update or delete on app_private.venue_credit_purchase for each row execute function app_private.refresh_changed_venue_balance();
create trigger rule_venue_balance after insert on app_private.venue_fee_rule for each row execute function app_private.refresh_changed_venue_balance();
revoke all on function app_private.validate_purchase_venue(),app_private.refresh_venue_balance(uuid,uuid),app_private.refresh_changed_venue_balance() from public,anon,authenticated,service_role;
grant execute on function app_private.validate_purchase_venue(),app_private.refresh_venue_balance(uuid,uuid),app_private.refresh_changed_venue_balance() to gym_assistant_api;
