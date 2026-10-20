-- Whole-Workspace deletion cascades purchases and completed Session sources
-- in one statement. Check their relationship after both cascades finish.
alter table app_private.session_lesson_source
  alter constraint session_lesson_source_workspace_id_student_id_purchase_id_fkey
  deferrable initially deferred;
