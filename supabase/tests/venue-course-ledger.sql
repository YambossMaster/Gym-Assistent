begin;
do $$
declare
  w uuid := gen_random_uuid(); u uuid := gen_random_uuid(); st uuid := gen_random_uuid();
  v uuid := gen_random_uuid(); p uuid := gen_random_uuid();
  s1 uuid := gen_random_uuid(); s2 uuid := gen_random_uuid();
  c1 uuid := gen_random_uuid(); c2 uuid := gen_random_uuid();
begin
  insert into auth.users(id) values(u);
  insert into app_private.workspace(id,owner_user_id) values(w,u);
  insert into app_private.student(id,workspace_id,name) values(st,w,'Rollback ledger student');
  insert into app_private.venue(id,workspace_id,name) values(v,w,'Rollback ledger Venue');
  insert into app_private.lesson_purchase(id,workspace_id,student_id,purchased_at,lesson_count,amount_minor,currency)
    values(p,w,st,'2026-08-01 01:00Z',3,3000,'TWD');
  insert into app_private.venue_fee_rule(workspace_id,venue_id,effective_from,effective_at,kind)
    values(w,v,'2026-09-01','2026-09-01 00:00Z','prepaid');
  insert into app_private.course_session(id,workspace_id,student_id,starts_at,ends_at,location,status,is_legacy,venue_id)
    values(s1,w,st,'2026-09-01 01:00Z','2026-09-01 02:00Z','Rollback Venue','scheduled',false,v),
          (s2,w,st,'2026-09-01 03:00Z','2026-09-01 04:00Z','Rollback Venue','scheduled',false,v);
  update app_private.course_session set status='completed',completed_at=now() where id in (s1,s2);
  insert into app_private.venue_credit_purchase(id,workspace_id,venue_id,purchased_on,starts_deducting_at,lesson_count,amount_minor,currency)
    values(c1,w,v,'2026-09-03','2026-09-01 03:00Z',1,900,'TWD');
  if exists(select 1 from app_private.venue_session_adjustment where workspace_id=w and session_id=s1 and credit_id is not null)
    then raise exception 'A batch deducted before its start instant'; end if;
  if not exists(select 1 from app_private.venue_session_adjustment where workspace_id=w and session_id=s2 and credit_id=c1)
    then raise exception 'Later eligible Session was not allocated'; end if;
  insert into app_private.venue_credit_purchase(id,workspace_id,venue_id,purchased_on,starts_deducting_at,lesson_count,amount_minor,currency)
    values(c2,w,v,'2026-09-04','2026-09-01 01:00Z',1,900,'TWD');
  if not exists(select 1 from app_private.venue_session_adjustment where workspace_id=w and session_id=s1 and credit_id=c2)
    then raise exception 'Old pending Session was not backfilled'; end if;
  if not exists(select 1 from app_private.venue_session_adjustment where workspace_id=w and session_id=s2 and credit_id=c1)
    then raise exception 'Existing allocation was rewritten'; end if;
  insert into app_private.finance_entry_state(workspace_id,entry_id,manual_amount_minor,manual_at,manual_label,source_fingerprint)
    values(w,'salary:' || v::text || ':2026-09',5000,'2026-10-01 02:00Z','Adjusted salary','source-v1');
  if not exists(select 1 from app_private.finance_entry_state where workspace_id=w and manual_amount_minor=5000 and manual_at='2026-10-01 02:00Z')
    then raise exception 'Ledger adjustment lost its independent date or amount'; end if;
end $$;
select 'venue allocation and independent ledger state passed' as result;
rollback;
