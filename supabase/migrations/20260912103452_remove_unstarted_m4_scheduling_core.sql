-- The linked development database received an abandoned M4 starter migration.
-- Restore the M3 entitlement-only Course Session schema before formal M4 work begins.
alter table app_private.course_session
  drop constraint if exists course_session_series_workspace_fk;

drop table if exists app_private.calendar_block;
drop table if exists app_private.availability_override;
drop table if exists app_private.availability_rule;
drop table if exists app_private.schedule_series;

alter table app_private.course_session
  drop constraint if exists course_session_time_range,
  drop constraint if exists course_session_completed_at_check,
  drop column if exists series_id,
  drop column if exists starts_at,
  drop column if exists ends_at,
  drop column if exists completed_at,
  drop column if exists location,
  drop column if exists version,
  drop column if exists created_at,
  drop column if exists updated_at;
