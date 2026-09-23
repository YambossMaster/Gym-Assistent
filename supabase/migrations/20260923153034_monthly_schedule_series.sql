-- Zero represents a calendar-month recurrence; 1 and 2 retain their weekly meaning.
-- Previously allowed long-horizon Series are capped at two weeks before tightening the constraint.
update app_private.schedule_series
set auto_schedule_horizon = '2_WEEKS'
where auto_schedule_horizon = 'MAX_WINDOW';

alter table app_private.schedule_series
  drop constraint schedule_series_interval_weeks_check,
  add constraint schedule_series_interval_weeks_check check (interval_weeks in (0, 1, 2)),
  drop constraint schedule_series_auto_schedule_horizon_check,
  add constraint schedule_series_auto_schedule_horizon_check
    check (auto_schedule_horizon in ('NONE', '1_WEEK', '2_WEEKS'));
