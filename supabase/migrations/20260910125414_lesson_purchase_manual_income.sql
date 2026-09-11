alter table app_private.lesson_purchase
  add column amount_minor bigint not null default 0
    check (amount_minor >= 0 and amount_minor <= 999999999999),
  add column currency char(3) not null default 'TWD'
    check (currency ~ '^[A-Z]{3}$');
