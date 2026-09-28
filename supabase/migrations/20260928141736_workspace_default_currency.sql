alter table app_private.workspace
  add column default_currency text not null default 'TWD'
    check (default_currency in ('TWD', 'USD', 'JPY', 'EUR', 'HKD'));

grant update (default_currency) on app_private.workspace to gym_assistant_api;
