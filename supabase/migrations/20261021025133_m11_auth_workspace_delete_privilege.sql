-- Supabase Auth deletes as supabase_auth_admin, which cannot access app_private.
-- Delete only the Workspace owned by the Auth row being removed while this
-- SECURITY DEFINER trigger is active. The existing Workspace FK cascade then
-- removes its private children under the migration owner's permissions.
-- A later Auth constraint failure still rolls this deletion back atomically.
create function app_private.delete_workspace_before_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from app_private.workspace where owner_user_id = old.id;
  return old;
end;
$$;

revoke all on function app_private.delete_workspace_before_auth_user()
  from public, anon, authenticated, service_role, gym_assistant_api;

create trigger m11_delete_workspace_before_auth_user
before delete on auth.users
for each row execute function app_private.delete_workspace_before_auth_user();
