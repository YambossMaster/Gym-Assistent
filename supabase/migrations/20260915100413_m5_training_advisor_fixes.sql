create index training_exercise_record_idx
  on app_private.training_exercise(workspace_id, record_id);
create index training_set_exercise_idx
  on app_private.training_set(workspace_id, exercise_id);

alter policy exercise_definition_api on app_private.exercise_definition
  using (workspace_id = (select nullif(current_setting('app.current_workspace_id', true), '')::uuid))
  with check (workspace_id = (select nullif(current_setting('app.current_workspace_id', true), '')::uuid));
alter policy training_preference_api on app_private.training_preference
  using (workspace_id = (select nullif(current_setting('app.current_workspace_id', true), '')::uuid))
  with check (workspace_id = (select nullif(current_setting('app.current_workspace_id', true), '')::uuid));
alter policy training_record_api on app_private.training_record
  using (workspace_id = (select nullif(current_setting('app.current_workspace_id', true), '')::uuid))
  with check (workspace_id = (select nullif(current_setting('app.current_workspace_id', true), '')::uuid));
alter policy training_exercise_api on app_private.training_exercise
  using (workspace_id = (select nullif(current_setting('app.current_workspace_id', true), '')::uuid))
  with check (workspace_id = (select nullif(current_setting('app.current_workspace_id', true), '')::uuid));
alter policy training_set_api on app_private.training_set
  using (workspace_id = (select nullif(current_setting('app.current_workspace_id', true), '')::uuid))
  with check (workspace_id = (select nullif(current_setting('app.current_workspace_id', true), '')::uuid));
alter policy training_mutation_receipt_api on app_private.training_mutation_receipt
  using (workspace_id = (select nullif(current_setting('app.current_workspace_id', true), '')::uuid))
  with check (workspace_id = (select nullif(current_setting('app.current_workspace_id', true), '')::uuid));
