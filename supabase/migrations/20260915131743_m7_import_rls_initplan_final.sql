alter policy demo_import_preview_api on app_private.demo_import_preview
  using (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid)
  with check (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid);
alter policy demo_import_run_api on app_private.demo_import_run
  using (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid)
  with check (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid);
alter policy demo_import_ledger_api on app_private.demo_import_ledger
  using (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid)
  with check (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid);
