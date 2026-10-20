-- Run only against the network-isolated database restored from Development.
begin;
do $$
declare
  auth_count bigint;
  workspace_count bigint;
  student_count bigint;
  set_count bigint;
  missing_count bigint;
  migration_count bigint;
  invalid_fk_count bigint;
begin
  select count(*) into auth_count from auth.users;
  select count(*) into workspace_count from app_private.workspace;
  select count(*) into student_count from app_private.student;
  select count(*) into set_count from app_private.training_set;
  if auth_count < 1 or workspace_count < 1 or student_count < 1 or set_count < 1 then
    raise exception 'Restored baseline data is missing: auth %, workspace %, student %, sets %',
      auth_count, workspace_count, student_count, set_count;
  end if;

  select count(*) into migration_count
  from supabase_migrations.schema_migrations
  where version in ('20261020143716', '20261020163317', '20261021010300');
  if migration_count <> 3 then
    raise exception 'Expected all three M11 migrations, found %', migration_count;
  end if;

  -- Reading both relations also verifies that the M11 table definitions restored.
  perform count(*) from app_private.student_group_member;
  perform count(*) from app_private.course_session_participant;
  select count(*) into missing_count from app_private.training_set where student_id is null;
  if missing_count <> 0 then
    raise exception 'Restored training sets without person owner: %', missing_count;
  end if;

  select count(*) into invalid_fk_count
  from pg_constraint c
  where c.connamespace = 'app_private'::regnamespace
    and c.contype = 'f'
    and c.conrelid in (
      'app_private.student_group_member'::regclass,
      'app_private.course_session_participant'::regclass,
      'app_private.training_set'::regclass)
    and not c.convalidated;
  if invalid_fk_count <> 0 then
    raise exception 'Unvalidated M11 foreign keys: %', invalid_fk_count;
  end if;

  raise notice 'PASS isolated Development restore: Auth %, Workspaces %, Students %, Training sets %, M11 migrations 3, all set owners present, all M11 foreign keys valid.',
    auth_count, workspace_count, student_count, set_count;
end $$;
rollback;
