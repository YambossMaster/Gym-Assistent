alter table app_private.workspace
  add column deletion_requested_at timestamptz,
  add column deletion_due_at timestamptz,
  add column last_activity_at timestamptz not null default now(),
  add column inactivity_notice_sent_at timestamptz,
  add constraint workspace_deletion_schedule_check check (
    (deletion_requested_at is null and deletion_due_at is null)
    or (deletion_requested_at is not null and deletion_due_at is not null and deletion_due_at > deletion_requested_at)
  );

create index workspace_deletion_due_at_idx
  on app_private.workspace (deletion_due_at)
  where deletion_due_at is not null;

create index workspace_inactivity_review_idx
  on app_private.workspace (last_activity_at, inactivity_notice_sent_at)
  where deletion_requested_at is null;

grant update (deletion_requested_at, deletion_due_at, last_activity_at, inactivity_notice_sent_at)
  on app_private.workspace to gym_assistant_api;
