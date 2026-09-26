-- Run inside a transaction after applying the pending migration; caller always rolls back.
do $$
declare w uuid:=gen_random_uuid(); other_w uuid:=gen_random_uuid(); u uuid:=gen_random_uuid(); other_u uuid:=gen_random_uuid();
  v uuid:=gen_random_uuid(); r uuid:=gen_random_uuid(); st uuid:=gen_random_uuid(); p uuid:=gen_random_uuid(); cs uuid:=gen_random_uuid(); occurrence uuid; later_occurrence uuid;
begin
  insert into auth.users(id) values(u),(other_u);
  insert into app_private.workspace(id,owner_user_id) values(w,u),(other_w,other_u);
  perform set_config('finance_test.w',w::text,true);
  perform set_config('finance_test.other_w',other_w::text,true);
  perform set_config('finance_test.v',v::text,true);
  insert into app_private.venue(id,workspace_id,name) values(v,w,'Rollback finance test');
  insert into app_private.venue_fee_rule(id,workspace_id,venue_id,effective_from,kind) values(r,w,v,'2026-01-01','prepaid');
  insert into app_private.student(id,workspace_id,name) values(st,w,'Rollback finance student');
  insert into app_private.lesson_purchase(id,workspace_id,student_id,purchased_at,lesson_count,entitlement_venue_id)
    values(p,w,st,'2026-08-01 01:00Z',2,v);
  insert into app_private.course_session(id,workspace_id,student_id,starts_at,ends_at,location,status,is_legacy,version,venue_id)
    values(cs,w,st,'2026-09-01 01:00Z','2026-09-01 02:00Z','preserve text','scheduled',false,1,v);
  if (select fee_rule_id from app_private.course_session where id=cs) is distinct from r then raise exception 'Rule pin failed'; end if;
  select low_occurrence into occurrence from app_private.venue where id=v;
  if occurrence is null then raise exception 'Initial low balance occurrence missing'; end if;
  insert into app_private.venue_credit_purchase(workspace_id,venue_id,purchased_on,lesson_count,amount_minor,currency) values(w,v,'2026-08-31',2,600,'TWD');
  if (select low_occurrence from app_private.venue where id=v) is not null then raise exception 'Top-up failed to clear occurrence'; end if;
  update app_private.course_session set status='completed',completed_at=now() where id=cs;
  select low_occurrence into later_occurrence from app_private.venue where id=v;
  if later_occurrence is null or later_occurrence=occurrence then raise exception 'New threshold occurrence missing'; end if;
  perform app_private.refresh_venue_balance(w,v);
  if (select low_occurrence from app_private.venue where id=v) is distinct from later_occurrence then raise exception 'Repeat refresh changed occurrence'; end if;
  update app_private.course_session set status='scheduled',completed_at=null where id=cs;
  if (select low_occurrence from app_private.venue where id=v) is not null then raise exception 'Reopen failed to restore credit'; end if;
  begin
    delete from app_private.lesson_purchase where id=p;
    raise exception 'Scheduled work lost its purchase';
  exception when check_violation then null; end;
  if (select location from app_private.course_session where id=cs)<>'preserve text' then raise exception 'Location changed'; end if;
  begin
    insert into app_private.venue_credit_purchase(workspace_id,venue_id,purchased_on,lesson_count,amount_minor,currency) values(other_w,v,'2026-09-01',1,100,'TWD');
    raise exception 'Cross-Workspace reference accepted';
  exception when foreign_key_violation then null; end;
  delete from app_private.student where id=st;
end $$;
do $$ begin
  if has_table_privilege('anon','app_private.venue','select') or has_table_privilege('authenticated','app_private.venue','select') then raise exception 'Browser role can read private Venue'; end if;
  if not exists(select 1 from pg_policies where schemaname='app_private' and tablename='venue' and qual like '%app.current_workspace_id%') then raise exception 'Workspace RLS policy missing'; end if;
end $$;
select 'finance migration, rule pinning, low balance lifecycle, reopen, text preservation, composite FK and private grants passed' as result;
