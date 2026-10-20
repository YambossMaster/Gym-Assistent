-- Preserve whole-Workspace deletion when a shared group Session has recorded
-- exercises. The Session and its exercise definitions disappear together.
alter table app_private.training_exercise
  alter constraint training_exercise_workspace_id_definition_id_fkey
  deferrable initially deferred;
