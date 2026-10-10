-- Keep historical tester rows auditable while preventing any new tester code or grant.
-- Runtime entitlement ignores those historical rows after this migration's application release.
update app_private.beta_code
set revoked_at = coalesce(revoked_at, pg_catalog.clock_timestamp())
where code_kind = 'tester';

-- The code and redemption ledger retain issuance/use evidence. The active grant is removed so the
-- Workspace returns to Free and can later redeem one of the two supported code classes.
delete from app_private.beta_grant where kind = 'tester';

alter table app_private.beta_code
  drop constraint if exists beta_code_code_kind_check,
  drop constraint beta_code_kind_limit_check,
  add constraint beta_code_code_kind_check
    check (code_kind in ('promotional', 'permanent')) not valid,
  add constraint beta_code_kind_limit_check
    check (code_kind = 'promotional' or (code_kind = 'permanent' and redemption_limit = 1))
    not valid;

alter table app_private.beta_grant
  drop constraint beta_grant_kind_check,
  drop constraint beta_grant_shape_check,
  add constraint beta_grant_kind_check
    check (kind in ('promotional', 'permanent')),
  add constraint beta_grant_shape_check check (
    (kind = 'promotional' and ends_at is not null and code_id is not null)
    or (kind = 'permanent' and ends_at is null)
  );

drop index app_private.beta_code_single_special_kind_idx;
create unique index beta_code_single_special_kind_idx
  on app_private.beta_code (code_kind)
  where code_kind = 'permanent' and revoked_at is null;

comment on index app_private.beta_code_single_special_kind_idx is
  'Allows only one active permanent Prime code';
comment on column app_private.beta_code.code_kind is
  'promotional grants 60-day Prime; permanent grants Prime without an end date';

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

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('gym-assistant-active-capacity'),
    pg_catalog.hashtext(new.workspace_id::text)
  );

  select g.kind, g.ends_at
    into grant_kind, grant_ends_at
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

comment on function app_private.enforce_plan_active_capacity() is
  'Enforces Free and Prime grant capacity at the database boundary';
