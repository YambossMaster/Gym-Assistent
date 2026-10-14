-- Agent-only Production readback. Run each SELECT separately with a privileged
-- read-only Supabase SQL connection. Never expose this schema through the Data API.
-- Use the report's Taipei cutoff timestamp consistently; NOW() is a snapshot
-- shortcut for an on-demand report. Do not print Email, codes or digests.

-- A. Coach audience and last sign-in (Auth billing MAU is a different metric).
with coaches as (
  select u.id, u.created_at, u.last_sign_in_at,
         c.account_class,
         c.test_kind
  from auth.users u
  join app_private.workspace w on w.owner_user_id = u.id
  join app_private.account_reporting_classification c on c.user_id = u.id
  where u.deleted_at is null and u.email_confirmed_at is not null
)
select account_class, test_kind, count(*) as coach_count,
       count(*) filter (where created_at >= now() - interval '7 days') as new_7d,
       count(*) filter (where last_sign_in_at >= now() - interval '7 days') as signed_in_7d
from coaches
group by account_class, test_kind
order by account_class, test_kind;

-- B. Effective Beta access. M8-E must replace this query with provider-verified
-- paid subscription state before the first live charge.
select c.account_class,
       case
         when g.kind = 'permanent' and g.started_at <= now() then 'permanent_prime'
         when g.kind = 'promotional' and g.started_at <= now() and g.ends_at > now()
           then 'promotional_prime'
         else 'free'
       end as effective_access,
       count(*) as coach_count
from auth.users u
join app_private.workspace w on w.owner_user_id = u.id
join app_private.account_reporting_classification c on c.user_id = u.id
left join app_private.beta_grant g on g.workspace_id = w.id
where u.deleted_at is null and u.email_confirmed_at is not null
group by 1, 2
order by 1, 2;

-- C. Surviving-record activity and activation for real Coaches only.
-- updated_at is a useful activity proxy, not an immutable event log; deleted
-- records and writes later overwritten cannot be reconstructed here.
with real_coaches as (
  select u.id, u.created_at, w.id as workspace_id
  from auth.users u
  join app_private.workspace w on w.owner_user_id = u.id
  join app_private.account_reporting_classification c on c.user_id = u.id
  where u.deleted_at is null and u.email_confirmed_at is not null
    and c.account_class = 'real'
)
select count(*) filter (where created_at >= now() - interval '7 days') as new_real_7d,
       count(*) filter (where has_student) as has_student_total,
       count(*) filter (where has_completed_session_or_training) as has_core_completion_total,
       count(*) filter (where created_at >= now() - interval '7 days'
         and has_student and has_completed_session_or_training) as new_activated_7d,
       count(*) filter (where wrote_current_record_7d) as current_record_writers_7d
from (
  select rc.created_at,
         exists (select 1 from app_private.student s
                 where s.workspace_id = rc.workspace_id) as has_student,
         (exists (select 1 from app_private.course_session cs
                  where cs.workspace_id = rc.workspace_id and cs.status = 'completed')
           or exists (select 1 from app_private.training_record tr
                      where tr.workspace_id = rc.workspace_id)) as has_completed_session_or_training,
         (exists (select 1 from app_private.student s
                  where s.workspace_id = rc.workspace_id
                    and s.updated_at >= now() - interval '7 days')
           or exists (select 1 from app_private.course_session cs
                      where cs.workspace_id = rc.workspace_id
                        and cs.updated_at >= now() - interval '7 days')
           or exists (select 1 from app_private.training_record tr
                      where tr.workspace_id = rc.workspace_id
                        and tr.updated_at >= now() - interval '7 days')) as wrote_current_record_7d
  from real_coaches rc
) activity;

-- D. Code use, excluding direct grants. No raw code or digest in output.
select b.code_kind, b.redemption_limit, b.redemption_count,
       (select count(*) from app_private.beta_redemption r where r.code_id = b.id)
         as ledger_redemptions,
       (select count(*) from app_private.beta_grant g
        where g.code_id = b.id and g.started_at <= now()
          and (g.ends_at is null or g.ends_at > now())) as active_code_grants,
       b.closes_at, b.revoked_at is not null as revoked
from app_private.beta_code b
order by b.code_kind, b.created_at;

-- E. Separate direct permanent grants and the earliest promotional expiry.
select count(*) filter (where code_id is null and kind = 'permanent')
         as direct_permanent_grants,
       min(ends_at) filter (where kind = 'promotional' and ends_at > now())
         as next_promotional_expiry
from app_private.beta_grant;

-- F. Integrity assertion. The expected result is one row with zero. Any
-- positive count is a system defect: stop the report and repair the creation
-- path rather than inventing an operational audience category.
select count(*) as classification_integrity_errors
from auth.users u
left join app_private.account_reporting_classification c on c.user_id = u.id
where u.deleted_at is null and c.user_id is null;
