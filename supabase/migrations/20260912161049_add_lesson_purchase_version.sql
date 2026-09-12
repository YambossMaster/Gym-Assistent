alter table app_private.lesson_purchase
  add column version integer not null default 1
    check (version > 0);
