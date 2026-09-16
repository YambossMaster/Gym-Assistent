alter table app_private.capability_link
  add column original_starts_at timestamptz;

alter table app_private.today_notification_read
  alter column read_at drop not null,
  add column dismissed_at timestamptz,
  add constraint today_notification_has_action
    check (read_at is not null or dismissed_at is not null);
