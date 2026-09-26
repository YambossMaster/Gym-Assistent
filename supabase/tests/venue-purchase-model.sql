-- Run inside a transaction after the Venue purchase migrations; caller rolls back.
do $$
declare
  w uuid := gen_random_uuid(); u uuid := gen_random_uuid(); st uuid := gen_random_uuid();
  v1 uuid := gen_random_uuid(); v2 uuid := gen_random_uuid();
  fixed_purchase uuid := gen_random_uuid(); general_purchase uuid := gen_random_uuid();
  s1 uuid := gen_random_uuid(); s2 uuid := gen_random_uuid();
begin
  insert into auth.users(id) values(u);
  insert into app_private.workspace(id,owner_user_id) values(w,u);
  insert into app_private.student(id,workspace_id,name) values(st,w,'Rollback Venue model student');
  insert into app_private.venue(id,workspace_id,name) values
    (v1,w,'Rollback Venue one'),(v2,w,'Rollback Venue two');
  insert into app_private.lesson_purchase
    (id,workspace_id,student_id,purchased_at,lesson_count,amount_minor,currency,entitlement_venue_id)
    values(fixed_purchase,w,st,'2026-08-01 01:00Z',2,1000,'TWD',v1);
  insert into app_private.course_session
    (id,workspace_id,student_id,starts_at,ends_at,location,status,is_legacy,venue_id)
    values(s1,w,st,'2026-09-01 01:00Z','2026-09-01 02:00Z','preserved', 'scheduled',false,v1);
  if (select customer_source from app_private.course_session where id=s1) <> 'venue' then
    raise exception 'Venue-supplied default missing';
  end if;
  begin
    insert into app_private.course_session
      (id,workspace_id,student_id,starts_at,ends_at,location,status,is_legacy,venue_id)
      values(s2,w,st,'2026-09-02 01:00Z','2026-09-02 02:00Z','preserved','scheduled',false,v2);
    raise exception 'Unpurchased Venue was accepted';
  exception when check_violation then null; end;
  insert into app_private.lesson_purchase
    (id,workspace_id,student_id,purchased_at,lesson_count,amount_minor,currency,entitlement_venue_id)
    values(general_purchase,w,st,'2026-08-02 01:00Z',3,1500,'TWD',null);
  insert into app_private.course_session
    (id,workspace_id,student_id,starts_at,ends_at,location,status,is_legacy,venue_id)
    values(s2,w,st,'2026-09-02 01:00Z','2026-09-02 02:00Z','preserved','scheduled',false,v2);
  begin
    delete from app_private.lesson_purchase where id=general_purchase;
    raise exception 'Purchase removal stranded scheduled work';
  exception when check_violation then null; end;
  insert into app_private.venue_coach_supplied_student(workspace_id,venue_id,student_id)
    values(w,v2,st);
  update app_private.course_session set venue_id=v1 where id=s2;
  update app_private.course_session set venue_id=v2 where id=s2;
  if (select customer_source from app_private.course_session where id=s2) <> 'coach' then
    raise exception 'Coach-supplied Venue exception missing';
  end if;
  insert into app_private.venue_salary_rule
    (workspace_id,venue_id,effective_from,enabled,amount_minor,currency,pay_day)
    values(w,v2,'2026-09-01',true,30000,'TWD',31);
  if (select pay_day from app_private.venue_salary_rule where workspace_id=w and venue_id=v2) <> 31 then
    raise exception 'Venue salary pay day missing';
  end if;
end $$;
select 'fixed/general purchase eligibility, source default/exception, purchase removal guard and salary storage passed' as result;
