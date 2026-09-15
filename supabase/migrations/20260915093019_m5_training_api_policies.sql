-- The API sets this transaction-local UUID only after verified identity resolves a Workspace.
-- RLS then keeps defense in depth even if a repository predicate is accidentally omitted.
create policy exercise_definition_api on app_private.exercise_definition
  for all to gym_assistant_api
  using (workspace_id = nullif(current_setting('app.current_workspace_id', true), '')::uuid)
  with check (workspace_id = nullif(current_setting('app.current_workspace_id', true), '')::uuid);
create policy training_preference_api on app_private.training_preference
  for all to gym_assistant_api
  using (workspace_id = nullif(current_setting('app.current_workspace_id', true), '')::uuid)
  with check (workspace_id = nullif(current_setting('app.current_workspace_id', true), '')::uuid);
create policy training_record_api on app_private.training_record
  for all to gym_assistant_api
  using (workspace_id = nullif(current_setting('app.current_workspace_id', true), '')::uuid)
  with check (workspace_id = nullif(current_setting('app.current_workspace_id', true), '')::uuid);
create policy training_exercise_api on app_private.training_exercise
  for all to gym_assistant_api
  using (workspace_id = nullif(current_setting('app.current_workspace_id', true), '')::uuid)
  with check (workspace_id = nullif(current_setting('app.current_workspace_id', true), '')::uuid);
create policy training_set_api on app_private.training_set
  for all to gym_assistant_api
  using (workspace_id = nullif(current_setting('app.current_workspace_id', true), '')::uuid)
  with check (workspace_id = nullif(current_setting('app.current_workspace_id', true), '')::uuid);
create policy training_mutation_receipt_api on app_private.training_mutation_receipt
  for all to gym_assistant_api
  using (workspace_id = nullif(current_setting('app.current_workspace_id', true), '')::uuid)
  with check (workspace_id = nullif(current_setting('app.current_workspace_id', true), '')::uuid);
