-- Additive: existing occurrence snapshots and set measurement_values are never reinterpreted.
create function app_private.training_dimensions(kind text) returns text[]
language sql immutable set search_path = '' as $$
  select case kind
    when 'weight_reps' then array['weight','reps']
    when 'reps' then array['reps']
    when 'weight_duration' then array['weight','duration']
    when 'duration' then array['duration']
    when 'distance_duration' then array['distance','duration']
    when 'weight_distance' then array['weight','distance']
    when 'distance' then array['distance']
    when 'duration_rounds' then array['duration','rounds']
    else null end
$$;

create function app_private.training_config_valid(config jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare allowed text[]; metric text; seen text[] := array[]::text[];
begin
  if jsonb_typeof(config) <> 'object' or jsonb_typeof(config->'metrics') <> 'array'
    or not (config ?& array['type','metrics']) then return false; end if;
  allowed := case config->>'type'
    when 'weight_duration' then array['duration','weight']
    when 'distance_duration' then array['duration','pace']
    when 'duration_rounds' then array['rounds']
    else app_private.training_dimensions(config->>'type') end;
  if allowed is null or jsonb_array_length(config->'metrics') not between 1 and 2 then return false; end if;
  for metric in select jsonb_array_elements_text(config->'metrics') loop
    if metric is null or not metric = any(allowed) or metric = any(seen) then return false; end if;
    seen := array_append(seen, metric);
  end loop;
  return true;
exception when others then return false;
end $$;

create function app_private.training_measurements_valid(measurement_values jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare dimension text; number numeric;
begin
  if jsonb_typeof(measurement_values) <> 'object' or not (measurement_values ?& array['weight','reps','duration','distance','rounds','weightUnit','durationUnit','distanceUnit'])
    or measurement_values->>'weightUnit' not in ('kg','lb') or measurement_values->>'durationUnit' not in ('sec','min')
    or measurement_values->>'distanceUnit' not in ('m','km')
    or jsonb_typeof(measurement_values->'weightUnit') <> 'string' or jsonb_typeof(measurement_values->'durationUnit') <> 'string'
    or jsonb_typeof(measurement_values->'distanceUnit') <> 'string' then return false; end if;
  foreach dimension in array array['weight','reps','duration','distance','rounds'] loop
    if measurement_values->dimension <> 'null'::jsonb then
      if jsonb_typeof(measurement_values->dimension) <> 'number' then return false; end if;
      number := (measurement_values->>dimension)::numeric;
      if number < 0 or number > (case when dimension in ('weight','reps','rounds') then 10000 else 1000000 end)
        or number <> round(number, case when dimension in ('reps','rounds') then 0 else 3 end) then return false; end if;
    end if;
  end loop;
  return true;
exception when others then return false;
end $$;

create function app_private.training_measurements_complete(kind text, measurement_values jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(app_private.training_measurements_valid(measurement_values)
    and app_private.training_dimensions(kind) is not null
    and not exists (select 1 from unnest(app_private.training_dimensions(kind)) d
      where measurement_values->d is null or measurement_values->d = 'null'::jsonb),false)
$$;

alter table app_private.exercise_definition add column recording_config jsonb
  check (recording_config is null or app_private.training_config_valid(recording_config));
alter table app_private.training_exercise add column recording_config jsonb
  check (recording_config is null or app_private.training_config_valid(recording_config));
alter table app_private.training_set add column measurements jsonb
  check (measurements is null or app_private.training_measurements_valid(measurements));
alter table app_private.training_preference
  add column default_duration_unit text not null default 'sec' check (default_duration_unit in ('sec','min')),
  add column default_distance_unit text not null default 'm' check (default_distance_unit in ('m','km'));

-- Custom/edited definitions retain their chosen progress dimension; original measurement_values are untouched.
update app_private.exercise_definition set recording_config = jsonb_build_object(
  'type',case when performance_metric='reps' then 'reps' else 'weight_reps' end,
  'metrics',jsonb_build_array(performance_metric)), version=version+1,updated_at=now();

revoke all on function app_private.training_dimensions(text),
  app_private.training_config_valid(jsonb), app_private.training_measurements_valid(jsonb),
  app_private.training_measurements_complete(text,jsonb) from public,anon,authenticated;
grant execute on function app_private.training_dimensions(text),
  app_private.training_config_valid(jsonb), app_private.training_measurements_valid(jsonb),
  app_private.training_measurements_complete(text,jsonb) to gym_assistant_api;

-- Only reclassify catalog copies whose original identity text is still intact.
update app_private.exercise_definition d set recording_config=c.config
from (values
('builtin-001','低背槓深蹲','槓鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-002','高背槓深蹲','槓鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-003','槓鈴前蹲','槓鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-004','傳統硬舉','槓鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-005','相撲硬舉','槓鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-006','槓鈴羅馬尼亞硬舉','槓鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-007','槓鈴早安式','槓鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-008','槓鈴臀推','槓鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-009','槓鈴反向弓箭步','槓鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-010','槓鈴臥推','槓鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-011','上斜槓鈴臥推','槓鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-012','窄握槓鈴臥推','槓鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-013','槓鈴肩推','槓鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-014','槓鈴借力推舉','槓鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-015','槓鈴俯身划船','槓鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-016','潘德雷划船','槓鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-017','槓鈴聳肩','槓鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-018','槓鈴上膊推舉','槓鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-019','啞鈴高腳杯深蹲','啞鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-020','啞鈴保加利亞分腿蹲','啞鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-021','啞鈴行走弓箭步','啞鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-022','啞鈴登階','啞鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-023','單腳啞鈴羅馬尼亞硬舉','啞鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-024','啞鈴臀推','啞鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-025','啞鈴臥推','啞鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-026','上斜啞鈴臥推','啞鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-027','啞鈴地板臥推','啞鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-028','啞鈴飛鳥','啞鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-029','啞鈴上拉','啞鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-030','單臂啞鈴划船','啞鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-031','胸靠式啞鈴划船','啞鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-032','啞鈴肩推','啞鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-033','阿諾肩推','啞鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-034','啞鈴側平舉','啞鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-035','啞鈴反向飛鳥','啞鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-036','啞鈴二頭彎舉','啞鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-037','啞鈴槌式彎舉','啞鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-038','啞鈴過頭三頭伸展','啞鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-039','壺鈴擺盪','壺鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-040','壺鈴高腳杯深蹲','壺鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-041','壺鈴相撲硬舉','壺鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-042','壺鈴上膊','壺鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-043','壺鈴上膊推舉','壺鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-044','壺鈴抓舉','壺鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-045','壺鈴土耳其起身','壺鈴','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-046','壺鈴農夫走路','壺鈴','{"type":"weight_distance","metrics":["weight","distance"]}'::jsonb),
('builtin-047','站姿滑輪胸推','滑輪','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-048','滑輪夾胸','滑輪','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-049','滑輪下拉','滑輪','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-050','直臂滑輪下拉','滑輪','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-051','坐姿滑輪划船','滑輪','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-052','單臂滑輪划船','滑輪','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-053','滑輪面拉','滑輪','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-054','單臂滑輪側平舉','滑輪','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-055','滑輪反向飛鳥','滑輪','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-056','滑輪二頭彎舉','滑輪','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-057','滑輪三頭下壓','滑輪','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-058','滑輪過頭三頭伸展','滑輪','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-059','Pallof 抗旋轉推舉','滑輪','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-060','滑輪伐木式轉體','滑輪','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-061','腿推','固定式器械','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-062','哈克深蹲','固定式器械','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-063','腿伸展','固定式器械','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-064','坐姿腿彎舉','固定式器械','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-065','羅馬椅背部伸展','固定式器械','{"type":"reps","metrics":["reps"]}'::jsonb),
('builtin-066','髖外展','固定式器械','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-067','髖內收','固定式器械','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-068','臀部後踢','固定式器械','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-069','站姿提踵','固定式器械','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-070','坐姿提踵','固定式器械','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-071','機械式胸推','固定式器械','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-072','蝴蝶機夾胸','固定式器械','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-073','機械式肩推','固定式器械','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-074','機械式坐姿划船','固定式器械','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-075','輔助引體向上','固定式器械','{"type":"reps","metrics":["reps"]}'::jsonb),
('builtin-076','徒手深蹲','徒手','{"type":"reps","metrics":["reps"]}'::jsonb),
('builtin-077','徒手反向弓箭步','徒手','{"type":"reps","metrics":["reps"]}'::jsonb),
('builtin-078','哥薩克深蹲','徒手','{"type":"reps","metrics":["reps"]}'::jsonb),
('builtin-079','單腳深蹲','徒手','{"type":"reps","metrics":["reps"]}'::jsonb),
('builtin-080','臀橋','徒手','{"type":"reps","metrics":["reps"]}'::jsonb),
('builtin-081','伏地挺身','徒手','{"type":"reps","metrics":["reps"]}'::jsonb),
('builtin-082','鑽石伏地挺身','徒手','{"type":"reps","metrics":["reps"]}'::jsonb),
('builtin-083','Pike 伏地挺身','徒手','{"type":"reps","metrics":["reps"]}'::jsonb),
('builtin-084','引體向上','單槓','{"type":"reps","metrics":["reps"]}'::jsonb),
('builtin-085','反向划船','單槓','{"type":"reps","metrics":["reps"]}'::jsonb),
('builtin-086','雙槓撐體','雙槓','{"type":"reps","metrics":["reps"]}'::jsonb),
('builtin-087','平板支撐','徒手','{"type":"duration","metrics":["duration"]}'::jsonb),
('builtin-088','側平板支撐','徒手','{"type":"duration","metrics":["duration"]}'::jsonb),
('builtin-089','Dead Bug 死蟲式','徒手','{"type":"reps","metrics":["reps"]}'::jsonb),
('builtin-090','Bird Dog 鳥狗式','徒手','{"type":"reps","metrics":["reps"]}'::jsonb),
('builtin-091','仰臥捲腹','徒手','{"type":"reps","metrics":["reps"]}'::jsonb),
('builtin-092','懸垂抬腿','單槓','{"type":"reps","metrics":["reps"]}'::jsonb),
('builtin-093','波比跳','徒手','{"type":"duration_rounds","metrics":["rounds"]}'::jsonb),
('builtin-094','彈力帶側向走','彈力帶','{"type":"reps","metrics":["reps"]}'::jsonb),
('builtin-095','彈力帶蚌式開合','彈力帶','{"type":"reps","metrics":["reps"]}'::jsonb),
('builtin-096','彈力帶水平拉開','彈力帶','{"type":"reps","metrics":["reps"]}'::jsonb),
('builtin-097','TRX 懸吊划船','懸吊訓練帶','{"type":"reps","metrics":["reps"]}'::jsonb),
('builtin-098','TRX 懸吊胸推','懸吊訓練帶','{"type":"reps","metrics":["reps"]}'::jsonb),
('builtin-099','藥球砸地','藥球','{"type":"weight_reps","metrics":["weight","reps"]}'::jsonb),
('builtin-100','戰繩交替甩動','戰繩','{"type":"duration_rounds","metrics":["rounds"]}'::jsonb)
) c(key,name,equipment,config)
where d.catalog_key=c.key and d.name=c.name and d.equipment=c.equipment and d.is_system;
