-- M11 database assertions. Run only against an isolated migrated database.
-- The whole fixture rolls back, including the synthetic Auth user.
begin;
do $$
<<fixture>>
declare
  owner_id uuid := gen_random_uuid();
  other_owner_id uuid := gen_random_uuid();
  workspace_id uuid := gen_random_uuid();
  other_workspace_id uuid := gen_random_uuid();
  group_id uuid := gen_random_uuid();
  person_id uuid := gen_random_uuid();
  empty_person_id uuid := gen_random_uuid();
  third_person_id uuid := gen_random_uuid();
  fourth_person_id uuid := gen_random_uuid();
  other_person_id uuid := gen_random_uuid();
  session_id uuid := gen_random_uuid();
  personal_session_id uuid := gen_random_uuid();
  record_id uuid := gen_random_uuid();
  personal_record_id uuid := gen_random_uuid();
  exercise_id uuid := gen_random_uuid();
  personal_exercise_id uuid := gen_random_uuid();
  definition_id uuid := gen_random_uuid();
  purchase_id uuid := gen_random_uuid();
begin
  insert into app_private.account_reporting_test_intent
    (email,test_kind,actor,reason,expires_at)
    values (owner_id::text || '@m11.invalid','manual','m11-contract',
              'Rollback-only student group contract fixture',now() + interval '5 minutes'),
           (other_owner_id::text || '@m11.invalid','manual','m11-contract',
              'Rollback-only student group contract fixture',now() + interval '5 minutes');
  insert into auth.users(id,email)
    values (owner_id,owner_id::text || '@m11.invalid'),
           (other_owner_id,other_owner_id::text || '@m11.invalid');
  insert into app_private.workspace(id,owner_user_id)
    values (workspace_id,owner_id), (other_workspace_id,other_owner_id);
  insert into app_private.student(id,workspace_id,name,kind)
    values (group_id,workspace_id,'Rollback group','group'),
           (person_id,workspace_id,'Rollback person','person'),
           (empty_person_id,workspace_id,'Rollback empty person','person'),
           (third_person_id,workspace_id,'Rollback third person','person'),
           (fourth_person_id,workspace_id,'Rollback fourth person','person'),
           (other_person_id,other_workspace_id,'Rollback other coach','person');

  insert into app_private.student_group_member(workspace_id,group_id,student_id)
    values(workspace_id,group_id,person_id),
          (workspace_id,group_id,empty_person_id),
          (workspace_id,group_id,third_person_id);
  begin
    insert into app_private.student_group_member(workspace_id,group_id,student_id)
      values(workspace_id,group_id,fourth_person_id);
    raise exception 'Fourth group member was accepted';
  exception when check_violation then null; end;
  begin
    insert into app_private.student_group_member(workspace_id,group_id,student_id)
      values(workspace_id,group_id,group_id);
    raise exception 'Group was accepted as a person member';
  exception when foreign_key_violation or check_violation then null; end;
  begin
    insert into app_private.student_group_member(workspace_id,group_id,student_id)
      values(workspace_id,group_id,other_person_id);
    raise exception 'Cross-Workspace member was accepted';
  exception when foreign_key_violation or check_violation then null; end;
  begin
    update app_private.student set kind='person' where id=group_id;
    raise exception 'Student kind changed after creation';
  exception when check_violation then null; end;

  insert into app_private.course_session
    (id,workspace_id,student_id,starts_at,ends_at,location,status,is_legacy)
    values(session_id,workspace_id,group_id,
      '2026-10-20 02:00Z','2026-10-20 03:00Z','Rollback room','scheduled',false);
  insert into app_private.course_session_participant(workspace_id,session_id,student_id)
    values(workspace_id,session_id,person_id);
  insert into app_private.lesson_purchase
    (id,workspace_id,student_id,purchased_at,lesson_count,amount_minor,currency)
    values(purchase_id,workspace_id,group_id,'2026-10-20 01:00Z',2,200000,'TWD');
  insert into app_private.session_lesson_source
    (workspace_id,session_id,student_id,kind,purchase_id)
    values(workspace_id,session_id,group_id,'manual',purchase_id);
  begin
    insert into app_private.course_session_participant(workspace_id,session_id,student_id)
      values(workspace_id,session_id,group_id);
    set constraints all immediate;
    raise exception 'Group was accepted as Session participant';
  exception when foreign_key_violation then null; end;
  insert into app_private.exercise_definition
    (id,workspace_id,name,equipment,body_parts,movement_type,performance_metric)
    values(definition_id,workspace_id,'Rollback squat','Barbell',array['Legs'],'系統動作','weight');
  insert into app_private.training_record(id,workspace_id,session_id)
    values(record_id,workspace_id,session_id);
  insert into app_private.training_exercise
    (id,workspace_id,record_id,position,definition_id,definition_name,equipment,
      body_parts,movement_type,performance_metric)
    values(exercise_id,workspace_id,record_id,0,definition_id,'Rollback squat',
      'Barbell',array['Legs'],'系統動作','weight');
  insert into app_private.training_set
    (id,workspace_id,exercise_id,position,unit,student_id)
    values(gen_random_uuid(),workspace_id,exercise_id,0,'kg',person_id);
  insert into app_private.course_session
    (id,workspace_id,student_id,starts_at,ends_at,location,status,is_legacy)
    values(personal_session_id,workspace_id,fourth_person_id,
      '2026-10-20 04:00Z','2026-10-20 05:00Z','Rollback room','scheduled',false);
  insert into app_private.training_record(id,workspace_id,session_id)
    values(personal_record_id,workspace_id,personal_session_id);
  insert into app_private.training_exercise
    (id,workspace_id,record_id,position,definition_id,definition_name,equipment,
      body_parts,movement_type,performance_metric)
    values(personal_exercise_id,workspace_id,personal_record_id,0,definition_id,
      'Rollback squat','Barbell',array['Legs'],'系統動作','weight');
  -- Migration-first rollout: the old API omits student_id for a personal set.
  insert into app_private.training_set
    (id,workspace_id,exercise_id,position,unit)
    values(gen_random_uuid(),workspace_id,personal_exercise_id,0,'kg');
  if not exists(select 1 from app_private.training_set ts
      where ts.workspace_id=fixture.workspace_id
        and ts.exercise_id=personal_exercise_id and ts.student_id=fourth_person_id) then
    raise exception 'Legacy personal write did not acquire the owner';
  end if;
  begin
    insert into app_private.training_set
      (id,workspace_id,exercise_id,position,unit,student_id)
      values(gen_random_uuid(),workspace_id,exercise_id,1,'kg',group_id);
    raise exception 'Group was accepted as a Training Set owner';
  exception when check_violation or foreign_key_violation then null; end;

  -- Force deferred owner/participant FKs to check inside the subtransaction.
  begin
    delete from app_private.student where id=person_id;
    set constraints all immediate;
    raise exception 'Historical person was hard deleted';
  exception when foreign_key_violation then null; end;
  begin
    delete from app_private.student where id=group_id;
    set constraints all immediate;
    raise exception 'Historical group was hard deleted';
  exception when foreign_key_violation then null; end;
  if not exists(select 1 from app_private.course_session cs
      where cs.id=fixture.session_id and cs.student_id=group_id) or
     not exists(select 1 from app_private.course_session_participant p
      where p.session_id=fixture.session_id and p.student_id=person_id) then
    raise exception 'Hard delete damaged the shared Session';
  end if;

  delete from app_private.student where id=empty_person_id;
  if exists(select 1 from app_private.student_group_member
      where student_id=empty_person_id) then
    raise exception 'Blank member relation was not cleaned';
  end if;
  if exists(select 1 from app_private.training_set where student_id is null) then
    raise exception 'Historical Training Set backfill left null owner';
  end if;

  -- Deleting an entire Auth owner must still cascade the Workspace and its history.
  delete from auth.users where id=owner_id;
  set constraints all immediate;
  if exists(select 1 from app_private.workspace w where w.id=fixture.workspace_id) or
     exists(select 1 from app_private.course_session cs where cs.id=fixture.session_id) or
     exists(select 1 from app_private.course_session_participant p
       where p.session_id=fixture.session_id) then
    raise exception 'Full owner deletion left Workspace data behind';
  end if;
  if not exists(select 1 from app_private.student where id=other_person_id) then
    raise exception 'Full owner deletion crossed into another Workspace';
  end if;
end $$;

do $$ begin
  if has_table_privilege('anon','app_private.student_group_member','select') or
     has_table_privilege('authenticated','app_private.student_group_member','select') or
     has_table_privilege('anon','app_private.course_session_participant','select') or
     has_table_privilege('authenticated','app_private.course_session_participant','select') then
    raise exception 'Browser role can read M11 private relations';
  end if;
  if not exists(select 1 from pg_policies
      where schemaname='app_private' and tablename='student_group_member') or
     not exists(select 1 from pg_policies
      where schemaname='app_private' and tablename='course_session_participant') then
    raise exception 'M11 Workspace RLS policies missing';
  end if;
end $$;
rollback;
