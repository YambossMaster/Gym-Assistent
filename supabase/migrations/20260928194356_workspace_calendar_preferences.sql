alter table app_private.workspace
  add column calendar_start_hour integer not null default 6
    check (calendar_start_hour between 0 and 23),
  add column calendar_end_hour integer not null default 22
    check (calendar_end_hour between 1 and 24),
  add column calendar_week_start integer not null default 1
    check (calendar_week_start in (0, 1)),
  add column default_session_minutes integer not null default 60
    check (default_session_minutes in (30, 45, 60, 90, 120)),
  add constraint workspace_calendar_hours_order check (calendar_end_hour > calendar_start_hour);

grant update (calendar_start_hour, calendar_end_hour, calendar_week_start, default_session_minutes)
  on app_private.workspace to gym_assistant_api;
