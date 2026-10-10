alter table app_private.calendar_subscription
  add column token_salt text;

alter table app_private.calendar_subscription
  add constraint calendar_subscription_token_salt_format
  check (token_salt is null or token_salt ~ '^[A-Za-z0-9_-]{22}$');

comment on column app_private.calendar_subscription.token_salt is
  'Non-secret random salt used with the API-only calendar subscription secret. Raw bearer tokens are never stored.';
