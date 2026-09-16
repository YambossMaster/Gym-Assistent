create table app_private.today_notification_read (
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  notification_id text not null check (length(notification_id) between 1 and 160),
  read_at timestamptz not null,
  primary key (workspace_id, notification_id)
);

create index capability_link_recent_reschedule_idx
  on app_private.capability_link (workspace_id, used_at desc, id)
  where purpose = 'reschedule_session' and used_at is not null;

alter table app_private.today_notification_read enable row level security;
revoke all on app_private.today_notification_read from public, anon, authenticated, service_role;
grant select, insert, update on app_private.today_notification_read to gym_assistant_api;

create policy today_notification_read_workspace_api on app_private.today_notification_read
  for all to gym_assistant_api
  using (
    workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid
  )
  with check (
    workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid
  );
