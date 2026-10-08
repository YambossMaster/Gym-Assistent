alter table app_private.beta_code
  add column code_kind text not null default 'promotional'
    check (code_kind in ('promotional', 'permanent', 'tester')),
  alter column redemption_limit drop not null;

alter table app_private.beta_code
  drop constraint beta_code_redemption_limit_check,
  add constraint beta_code_redemption_limit_check
    check (redemption_limit is null or redemption_limit > 0),
  add constraint beta_code_kind_limit_check
    check (code_kind = 'promotional' or redemption_limit = 1);

alter table app_private.beta_grant
  drop constraint beta_grant_kind_check,
  drop constraint beta_grant_check,
  add constraint beta_grant_kind_check
    check (kind in ('promotional', 'permanent', 'tester')),
  add constraint beta_grant_shape_check check (
    (kind = 'promotional' and ends_at is not null and code_id is not null)
    or (kind = 'permanent' and ends_at is null)
    or (kind = 'tester' and ends_at is null and code_id is not null)
  );

create unique index beta_code_single_special_kind_idx
  on app_private.beta_code (code_kind)
  where code_kind in ('permanent', 'tester') and revoked_at is null;

comment on column app_private.beta_code.code_kind is
  'promotional grants 60-day Prime, permanent grants ongoing Prime, tester permits self plan switching';
comment on column app_private.beta_code.redemption_limit is
  'null means no global redemption cap; per-code verified-email reuse remains prohibited';

create or replace function app_private.enforce_plan_active_capacity() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  grant_kind text;
  grant_ends_at timestamptz;
  tester_tier text;
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

  select g.kind, g.ends_at,
    case when g.kind = 'tester' then p.tier else null end
    into grant_kind, grant_ends_at, tester_tier
  from app_private.workspace w
  left join app_private.beta_grant g on g.workspace_id = w.id
  left join app_private.plan_subscription p on p.workspace_id = w.id
  where w.id = new.workspace_id;

  if grant_kind = 'permanent' or
     (grant_kind = 'promotional' and grant_ends_at > pg_catalog.clock_timestamp()) or
     tester_tier = 'advanced' then
    return new;
  end if;

  if tg_table_name = 'student' then
    max_seats := case when tester_tier = 'basic' then 15 else 5 end;
    select count(*)::integer into used_seats from app_private.student s
    where s.workspace_id = new.workspace_id and s.active and s.id <> new.id;
  elsif tester_tier = 'basic' then
    return new;
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
