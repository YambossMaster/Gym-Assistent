alter table app_private.student
  add column default_venue_id uuid,
  add constraint student_default_venue_fk
    foreign key (workspace_id, default_venue_id)
    references app_private.venue (workspace_id, id);

create index student_default_venue_idx
  on app_private.student (workspace_id, default_venue_id)
  where default_venue_id is not null;
