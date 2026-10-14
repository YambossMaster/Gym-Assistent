-- Existing Coaches have no onboarding notice; only Workspaces created after this
-- migration receive the two durable, Workspace-scoped welcome notices.
alter table app_private.workspace
  add column welcome_notification_at timestamptz;

alter table app_private.workspace
  alter column welcome_notification_at set default now();
