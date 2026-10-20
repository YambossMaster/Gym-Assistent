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

-- Round-trip nonempty M11 rows using the same COPY format as the full dump.
\copy (select * from app_private.student where id = 'f1100000-0000-4000-8000-000000000011') to '/tmp/development-restore/group.csv' with (format csv, header true)
\copy (select * from app_private.student_group_member where id = 'f1100000-0000-4000-8000-000000000012') to '/tmp/development-restore/member.csv' with (format csv, header true)
delete from app_private.student where id = 'f1100000-0000-4000-8000-000000000011';
\copy app_private.student from '/tmp/development-restore/group.csv' with (format csv, header true)
\copy app_private.student_group_member from '/tmp/development-restore/member.csv' with (format csv, header true)

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
  raise notice 'PASS nonempty M11 group and member COPY round-trip in isolated restore database.';
end $$;
