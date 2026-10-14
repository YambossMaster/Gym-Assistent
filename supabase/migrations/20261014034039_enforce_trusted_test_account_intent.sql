-- Auth-admin user creation does not expose custom app_metadata to the INSERT
-- trigger soon enough to classify atomically. A private, expiring intent makes
-- internal creation explicit and leaves unsupported paths fail closed.
create table app_private.account_reporting_test_intent (
  email text primary key check (email = lower(email)),
  test_kind text not null check (test_kind in ('owner', 'manual', 'automation')),
  actor text not null check (char_length(actor) between 2 and 120),
  reason text not null check (char_length(reason) between 4 and 500),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

revoke all on app_private.account_reporting_test_intent
  from public, anon, authenticated, service_role;
revoke all on app_private.account_reporting_test_intent from gym_assistant_api;
grant select, insert, update, delete
  on app_private.account_reporting_test_intent to gym_assistant_api;

create or replace function app_private.classify_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  auth_provider text := new.raw_app_meta_data ->> 'provider';
  registration_channel text := new.raw_user_meta_data ->> 'gym_registration_channel';
  test_intent app_private.account_reporting_test_intent%rowtype;
  assigned_class text;
  assigned_kind text;
  assigned_actor text;
  assigned_reason text;
begin
  delete from app_private.account_reporting_test_intent
  where email = lower(new.email) and expires_at <= now();

  select * into test_intent
  from app_private.account_reporting_test_intent
  where email = lower(new.email) and expires_at > now()
  for update;

  if found then
    assigned_class := 'test';
    assigned_kind := test_intent.test_kind;
    assigned_actor := test_intent.actor;
    assigned_reason := test_intent.reason;
    delete from app_private.account_reporting_test_intent where email = test_intent.email;
  elsif auth_provider = 'google'
     or (auth_provider = 'email' and registration_channel = 'public-web-v1') then
    assigned_class := 'real';
    assigned_kind := null;
    assigned_actor := 'auth-signup';
    assigned_reason := 'Supported public registration created a real Coach account';
  else
    raise exception 'Auth account creation is missing a supported classification marker';
  end if;

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

comment on table app_private.account_reporting_test_intent is
  'Private, expiring authorization consumed atomically when a trusted internal process creates a test Auth account.';
comment on function app_private.classify_new_auth_user() is
  'Classifies supported public signups as real and atomically consumes private test-account creation intents.';
