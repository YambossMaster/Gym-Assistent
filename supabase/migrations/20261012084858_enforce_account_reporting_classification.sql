-- Every Auth identity is classified in the same database transaction that
-- creates it. Public signup and OAuth identities are real Coaches. Only a
-- trusted Auth-admin creation request can opt into a test kind through
-- raw_app_meta_data; public user metadata is deliberately ignored.
create or replace function app_private.classify_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_test_kind text := new.raw_app_meta_data ->> 'gym_test_kind';
  auth_provider text := new.raw_app_meta_data ->> 'provider';
  registration_channel text := new.raw_user_meta_data ->> 'gym_registration_channel';
  assigned_class text;
  assigned_kind text;
  assigned_actor text;
  assigned_reason text;
begin
  if requested_test_kind is not null
     and requested_test_kind not in ('owner', 'manual', 'automation') then
    raise exception 'Invalid internal test account kind';
  end if;

  if requested_test_kind is null
     and auth_provider is distinct from 'google'
     and (auth_provider is distinct from 'email'
       or registration_channel is distinct from 'public-web-v1') then
    raise exception 'Auth account creation is missing a supported classification marker';
  end if;

  assigned_class := case when requested_test_kind is null then 'real' else 'test' end;
  assigned_kind := requested_test_kind;
  assigned_actor := case
    when requested_test_kind is null then 'auth-signup'
    else 'trusted-auth-admin'
  end;
  assigned_reason := case
    when requested_test_kind is null then 'Public registration creates a real Coach account'
    else 'Trusted Auth admin created an internal test account'
  end;

  insert into app_private.account_reporting_classification
    (user_id, account_class, test_kind, classified_by, reason)
  values
    (new.id, assigned_class, assigned_kind, assigned_actor, assigned_reason);

  insert into app_private.account_reporting_classification_event
    (id, user_id, previous_class, previous_test_kind, account_class, test_kind, actor, reason)
  values
    (gen_random_uuid(), new.id, null, null, assigned_class, assigned_kind,
     assigned_actor, assigned_reason);

  return new;
end;
$$;

revoke all on function app_private.classify_new_auth_user() from public;

drop trigger if exists classify_new_auth_user on auth.users;
create trigger classify_new_auth_user
after insert on auth.users
for each row execute function app_private.classify_new_auth_user();

-- The Product Owner confirmed that accounts created after the three internal
-- Alpha identities are real users. Cover any signup that landed between the
-- first classification migration and this trigger release.
insert into app_private.account_reporting_classification
  (user_id, account_class, test_kind, classified_by, reason)
select u.id, 'real', null, 'classification-enforcement-migration',
       'Existing Auth account missing a label treated as a real Coach by product policy'
from auth.users u
left join app_private.account_reporting_classification c on c.user_id = u.id
where c.user_id is null;

insert into app_private.account_reporting_classification_event
  (id, user_id, previous_class, previous_test_kind, account_class, test_kind, actor, reason)
select gen_random_uuid(), u.id, null, null, 'real', null,
       'classification-enforcement-migration',
       'Existing Auth account missing a label treated as a real Coach by product policy'
from auth.users u
join app_private.account_reporting_classification c on c.user_id = u.id
where c.classified_by = 'classification-enforcement-migration'
  and not exists (
    select 1
    from app_private.account_reporting_classification_event e
    where e.user_id = u.id
  );

do $$
begin
  if exists (
    select 1
    from auth.users u
    left join app_private.account_reporting_classification c on c.user_id = u.id
    where c.user_id is null
  ) then
    raise exception 'Account classification invariant failed during migration';
  end if;
end;
$$;

comment on function app_private.classify_new_auth_user() is
  'Classifies every new Auth identity atomically: public signup is real; trusted Auth-admin fixtures declare a test kind in app metadata.';
comment on table app_private.account_reporting_classification is
  'Private operator reporting label. Every Auth identity must have exactly one row; never grants product access.';
