-- This fixture exists only inside the disposable, network-isolated restore DB.
insert into app_private.student (id, workspace_id, name, kind)
select 'f1100000-0000-4000-8000-000000000011', p.workspace_id,
       'M11 isolated restore group', 'group'
from app_private.student p
where p.kind = 'person' and p.active
order by p.workspace_id, p.id
limit 1;

insert into app_private.student_group_member
  (id, workspace_id, group_id, student_id)
select 'f1100000-0000-4000-8000-000000000012', g.workspace_id, g.id, p.id
from app_private.student g
join lateral (
  select id from app_private.student
  where workspace_id = g.workspace_id and kind = 'person' and active
  order by id limit 1
) p on true
where g.id = 'f1100000-0000-4000-8000-000000000011';

insert into app_private.course_session
  (id, workspace_id, student_id, status, is_legacy, starts_at, ends_at,
   completed_at, location)
select 'f1100000-0000-4000-8000-000000000013', g.workspace_id, g.id,
       'completed', false, now() - interval '1 hour', now(), now(),
       'M11 isolated restore'
from app_private.student g
where g.id = 'f1100000-0000-4000-8000-000000000011';

insert into app_private.course_session_participant
  (workspace_id, session_id, student_id, attendance, attendance_edited)
select m.workspace_id, 'f1100000-0000-4000-8000-000000000013',
       m.student_id, 'absent', true
from app_private.student_group_member m
where m.id = 'f1100000-0000-4000-8000-000000000012';

insert into app_private.training_record (id, workspace_id, session_id)
select 'f1100000-0000-4000-8000-000000000014', s.workspace_id, s.id
from app_private.course_session s
where s.id = 'f1100000-0000-4000-8000-000000000013';

insert into app_private.lesson_purchase
  (id, workspace_id, student_id, purchased_at, lesson_count)
select 'f1100000-0000-4000-8000-000000000015', g.workspace_id, g.id,
       now(), 1
from app_private.student g
where g.id = 'f1100000-0000-4000-8000-000000000011';

insert into app_private.session_lesson_source
  (workspace_id, session_id, student_id, kind, purchase_id)
select s.workspace_id, s.id, s.student_id, 'manual',
       'f1100000-0000-4000-8000-000000000015'
from app_private.course_session s
where s.id = 'f1100000-0000-4000-8000-000000000013';

-- Round-trip nonempty M11 group history using the full dump's COPY format.
\copy (select * from app_private.student where id = 'f1100000-0000-4000-8000-000000000011') to '/tmp/development-restore/group.csv' with (format csv, header true)
\copy (select * from app_private.student_group_member where id = 'f1100000-0000-4000-8000-000000000012') to '/tmp/development-restore/member.csv' with (format csv, header true)
\copy (select * from app_private.course_session where id = 'f1100000-0000-4000-8000-000000000013') to '/tmp/development-restore/session.csv' with (format csv, header true)
\copy (select * from app_private.course_session_participant where session_id = 'f1100000-0000-4000-8000-000000000013') to '/tmp/development-restore/participant.csv' with (format csv, header true)
\copy (select * from app_private.training_record where id = 'f1100000-0000-4000-8000-000000000014') to '/tmp/development-restore/record.csv' with (format csv, header true)
\copy (select * from app_private.lesson_purchase where id = 'f1100000-0000-4000-8000-000000000015') to '/tmp/development-restore/purchase.csv' with (format csv, header true)
\copy (select * from app_private.session_lesson_source where session_id = 'f1100000-0000-4000-8000-000000000013') to '/tmp/development-restore/source.csv' with (format csv, header true)
delete from app_private.session_lesson_source where session_id = 'f1100000-0000-4000-8000-000000000013';
delete from app_private.lesson_purchase where id = 'f1100000-0000-4000-8000-000000000015';
delete from app_private.course_session where id = 'f1100000-0000-4000-8000-000000000013';
delete from app_private.student where id = 'f1100000-0000-4000-8000-000000000011';
\copy app_private.student from '/tmp/development-restore/group.csv' with (format csv, header true)
\copy app_private.student_group_member from '/tmp/development-restore/member.csv' with (format csv, header true)
\copy app_private.lesson_purchase from '/tmp/development-restore/purchase.csv' with (format csv, header true)
\copy app_private.course_session from '/tmp/development-restore/session.csv' with (format csv, header true)
\copy app_private.course_session_participant from '/tmp/development-restore/participant.csv' with (format csv, header true)
\copy app_private.training_record from '/tmp/development-restore/record.csv' with (format csv, header true)
\copy app_private.session_lesson_source from '/tmp/development-restore/source.csv' with (format csv, header true)

do $$
begin
  if not exists (
    select 1 from app_private.student_group_member m
    join app_private.student g on g.workspace_id = m.workspace_id and g.id = m.group_id
    join app_private.student p on p.workspace_id = m.workspace_id and p.id = m.student_id
    where m.id = 'f1100000-0000-4000-8000-000000000012'
      and g.id = 'f1100000-0000-4000-8000-000000000011'
      and g.kind = 'group' and p.kind = 'person' and m.removed_at is null
  ) then
    raise exception 'M11 group and member COPY round-trip failed';
  end if;
  if not exists (
    select 1 from app_private.course_session s
    join app_private.course_session_participant p
      on p.workspace_id = s.workspace_id and p.session_id = s.id
    join app_private.training_record r
      on r.workspace_id = s.workspace_id and r.session_id = s.id
    where s.id = 'f1100000-0000-4000-8000-000000000013'
      and s.status = 'completed' and s.student_id = 'f1100000-0000-4000-8000-000000000011'
      and p.attendance = 'absent'
      and r.id = 'f1100000-0000-4000-8000-000000000014'
  ) then
    raise exception 'M11 completed group Session history COPY round-trip failed';
  end if;
  if (
    select count(*) from app_private.session_lesson_source source
    join app_private.lesson_purchase purchase
      on purchase.workspace_id = source.workspace_id
      and purchase.student_id = source.student_id
      and purchase.id = source.purchase_id
    where source.session_id = 'f1100000-0000-4000-8000-000000000013'
      and source.student_id = 'f1100000-0000-4000-8000-000000000011'
      and source.kind = 'manual' and purchase.lesson_count = 1
  ) <> 1 then
    raise exception 'M11 group purchase and sole Session source COPY round-trip failed';
  end if;
  raise notice 'PASS nonempty M11 group, member, purchase, completed Session, absent participant, Training Record and sole lesson source COPY round-trip in isolated restore database.';
end $$;
