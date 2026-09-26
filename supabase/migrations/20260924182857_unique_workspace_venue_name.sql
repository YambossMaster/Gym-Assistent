-- Collapse only identical, unused name-only duplicates. Any duplicate with
-- financial or scheduling history stays untouched and blocks the unique index.
with eligible as (
  select v.*, (
    v.active and v.low_occurrence is null and v.low_occurred_at is null
    and (select count(*) = 1 and bool_and(r.kind = 'untracked' and r.effective_from = date '0001-01-01')
      from app_private.venue_fee_rule r where r.workspace_id = v.workspace_id and r.venue_id = v.id)
    and not exists (select 1 from app_private.course_session s where s.workspace_id = v.workspace_id and s.venue_id = v.id)
    and not exists (select 1 from app_private.schedule_series s where s.workspace_id = v.workspace_id and s.venue_id = v.id)
    and not exists (select 1 from app_private.lesson_purchase p where p.workspace_id = v.workspace_id and p.venue_id = v.id)
    and not exists (select 1 from app_private.venue_credit_purchase p where p.workspace_id = v.workspace_id and p.venue_id = v.id)
    and not exists (select 1 from app_private.venue_payout p where p.workspace_id = v.workspace_id and p.venue_id = v.id)
    and not exists (select 1 from app_private.student s where s.workspace_id = v.workspace_id and s.default_venue_id = v.id)
  ) safe_to_merge
  from app_private.venue v
), safe_groups as (
  select v.workspace_id, lower(btrim(v.name)) normalized_name
  from eligible v
  group by v.workspace_id, lower(btrim(v.name))
  having count(*) > 1
    and bool_and(v.safe_to_merge)
), ranked as (
  select v.id, row_number() over (partition by v.workspace_id, lower(btrim(v.name)) order by v.version desc, v.id) ordinal
  from app_private.venue v
  join safe_groups g on g.workspace_id = v.workspace_id and g.normalized_name = lower(btrim(v.name))
)
delete from app_private.venue v using ranked r where v.id = r.id and r.ordinal > 1;

create unique index venue_workspace_name_unique
  on app_private.venue (workspace_id, lower(btrim(name)));
