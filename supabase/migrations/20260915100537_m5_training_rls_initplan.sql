alter policy exercise_definition_api on app_private.exercise_definition
  using (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid)
  with check (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid);
alter policy training_preference_api on app_private.training_preference
  using (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid)
  with check (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid);
alter policy training_record_api on app_private.training_record
  using (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid)
  with check (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid);
alter policy training_exercise_api on app_private.training_exercise
  using (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid)
  with check (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid);
alter policy training_set_api on app_private.training_set
  using (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid)
  with check (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid);
alter policy training_mutation_receipt_api on app_private.training_mutation_receipt
  using (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid)
  with check (workspace_id = nullif((select current_setting('app.current_workspace_id', true)), '')::uuid);
