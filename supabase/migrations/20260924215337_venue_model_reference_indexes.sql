create index lesson_purchase_entitlement_venue_fk
  on app_private.lesson_purchase(workspace_id, entitlement_venue_id)
  where entitlement_venue_id is not null;

create index venue_coach_supplied_student_student_fk
  on app_private.venue_coach_supplied_student(workspace_id, student_id);
