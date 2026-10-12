-- Operator-owned reporting labels. An absent row means unclassified.
-- These labels never participate in authorization or plan entitlement.
create table app_private.account_reporting_classification (
  user_id uuid primary key references auth.users(id) on delete cascade,
  account_class text not null check (account_class in ('real', 'test')),
  test_kind text check (test_kind in ('owner', 'manual', 'automation')),
  classified_at timestamptz not null default now(),
  classified_by text not null check (char_length(classified_by) between 2 and 120),
  reason text not null check (char_length(reason) between 4 and 500),
  check ((account_class = 'real' and test_kind is null)
    or (account_class = 'test' and test_kind is not null))
);

create table app_private.account_reporting_classification_event (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_class text check (previous_class in ('real', 'test')),
  previous_test_kind text check (previous_test_kind in ('owner', 'manual', 'automation')),
  account_class text not null check (account_class in ('real', 'test')),
  test_kind text check (test_kind in ('owner', 'manual', 'automation')),
  actor text not null check (char_length(actor) between 2 and 120),
  reason text not null check (char_length(reason) between 4 and 500),
  occurred_at timestamptz not null default now(),
  check ((account_class = 'real' and test_kind is null)
    or (account_class = 'test' and test_kind is not null))
);

create index account_reporting_classification_event_user_time
  on app_private.account_reporting_classification_event (user_id, occurred_at desc);

revoke all on app_private.account_reporting_classification,
  app_private.account_reporting_classification_event
  from public, anon, authenticated, service_role;
revoke all on app_private.account_reporting_classification,
  app_private.account_reporting_classification_event
  from gym_assistant_api;
grant select, insert, update on app_private.account_reporting_classification to gym_assistant_api;
grant select, insert on app_private.account_reporting_classification_event to gym_assistant_api;

comment on table app_private.account_reporting_classification is
  'Private operator reporting label. Missing row is unclassified; never grants product access.';
comment on column app_private.account_reporting_classification.test_kind is
  'Distinguishes owner, manual and automation tests without creating a plan-tester entitlement.';
