drop policy demo_import_preview_api on app_private.demo_import_preview;
create policy demo_import_preview_api on app_private.demo_import_preview
  for all to gym_assistant_api
  using (workspace_id = (select nullif(current_setting('app.current_workspace_id', true), '')::uuid))
  with check (workspace_id = (select nullif(current_setting('app.current_workspace_id', true), '')::uuid));

drop policy demo_import_run_api on app_private.demo_import_run;
create policy demo_import_run_api on app_private.demo_import_run
  for all to gym_assistant_api
  using (workspace_id = (select nullif(current_setting('app.current_workspace_id', true), '')::uuid))
  with check (workspace_id = (select nullif(current_setting('app.current_workspace_id', true), '')::uuid));

drop policy demo_import_ledger_api on app_private.demo_import_ledger;
create policy demo_import_ledger_api on app_private.demo_import_ledger
  for all to gym_assistant_api
  using (workspace_id = (select nullif(current_setting('app.current_workspace_id', true), '')::uuid))
  with check (workspace_id = (select nullif(current_setting('app.current_workspace_id', true), '')::uuid));
