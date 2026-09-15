create table app_private.exercise_definition (
  id uuid primary key,
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  catalog_key text,
  name text not null check (char_length(name) between 1 and 120),
  equipment text not null check (char_length(equipment) between 1 and 120),
  body_parts text[] not null check (cardinality(body_parts) between 1 and 12),
  movement_type text not null check (movement_type in ('系統動作', '局部動作')),
  performance_metric text not null check (performance_metric in ('weight', 'reps')),
  is_system boolean not null default false,
  favorite boolean not null default false,
  deleted_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, catalog_key)
);

create table app_private.training_preference (
  workspace_id uuid primary key references app_private.workspace(id) on delete cascade,
  default_weight_unit text not null default 'kg' check (default_weight_unit in ('kg', 'lb')),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now()
);

-- M3 used a globally unique Session UUID; add the composite key required by every
-- tenant-safe M5 parent/child reference without changing existing identity.
alter table app_private.course_session
  add constraint course_session_workspace_identity unique (workspace_id, id);

create table app_private.training_record (
  id uuid primary key,
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  session_id uuid not null,
  private_note text not null default '' check (char_length(private_note) <= 5000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, session_id),
  foreign key (workspace_id, session_id)
    references app_private.course_session(workspace_id, id) on delete cascade
);

create table app_private.training_exercise (
  id uuid primary key,
  workspace_id uuid not null,
  record_id uuid not null,
  position integer not null check (position between 0 and 99),
  definition_id uuid not null,
  definition_name text not null,
  equipment text not null,
  body_parts text[] not null,
  movement_type text not null check (movement_type in ('系統動作', '局部動作')),
  performance_metric text not null check (performance_metric in ('weight', 'reps')),
  unique (workspace_id, id),
  unique (record_id, position),
  foreign key (workspace_id, record_id)
    references app_private.training_record(workspace_id, id) on delete cascade,
  foreign key (workspace_id, definition_id)
    references app_private.exercise_definition(workspace_id, id)
);

create table app_private.training_set (
  id uuid primary key,
  workspace_id uuid not null,
  exercise_id uuid not null,
  position integer not null check (position between 0 and 99),
  planned_weight numeric(12,3) check (planned_weight between 0 and 10000),
  planned_reps integer check (planned_reps between 0 and 10000),
  actual_reps integer check (actual_reps between 0 and 10000),
  rpe numeric(3,1) check (rpe between 1 and 10 and mod(rpe, 0.5) = 0),
  result text check (result in ('completed', 'incomplete')),
  unit text not null check (unit in ('kg', 'lb')),
  unique (workspace_id, id),
  unique (exercise_id, position),
  foreign key (workspace_id, exercise_id)
    references app_private.training_exercise(workspace_id, id) on delete cascade
);

create table app_private.training_mutation_receipt (
  workspace_id uuid not null references app_private.workspace(id) on delete cascade,
  operation_id uuid not null,
  target text not null,
  payload_hash text not null,
  response jsonb not null,
  accepted_at timestamptz not null default now(),
  primary key (workspace_id, operation_id)
);

-- Seed one private copy per existing Workspace. Runtime bootstrap uses the same frozen manifest
-- for Workspaces created after this migration; ON CONFLICT intentionally preserves Coach edits/deletes.
with catalog as (
  select * from jsonb_to_recordset($catalog$[{"catalog_key":"builtin-001","name":"低背槓深蹲","equipment":"槓鈴","body_parts":["腿","臀"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-002","name":"高背槓深蹲","equipment":"槓鈴","body_parts":["腿","臀"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-003","name":"槓鈴前蹲","equipment":"槓鈴","body_parts":["腿","臀"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-004","name":"傳統硬舉","equipment":"槓鈴","body_parts":["腿","臀","背"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-005","name":"相撲硬舉","equipment":"槓鈴","body_parts":["腿","臀"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-006","name":"槓鈴羅馬尼亞硬舉","equipment":"槓鈴","body_parts":["腿","臀"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-007","name":"槓鈴早安式","equipment":"槓鈴","body_parts":["腿","臀"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-008","name":"槓鈴臀推","equipment":"槓鈴","body_parts":["臀"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-009","name":"槓鈴反向弓箭步","equipment":"槓鈴","body_parts":["腿","臀"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-010","name":"槓鈴臥推","equipment":"槓鈴","body_parts":["胸","手臂"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-011","name":"上斜槓鈴臥推","equipment":"槓鈴","body_parts":["胸","肩"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-012","name":"窄握槓鈴臥推","equipment":"槓鈴","body_parts":["手臂","胸"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-013","name":"槓鈴肩推","equipment":"槓鈴","body_parts":["肩","手臂"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-014","name":"槓鈴借力推舉","equipment":"槓鈴","body_parts":["肩","腿"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-015","name":"槓鈴俯身划船","equipment":"槓鈴","body_parts":["背","手臂"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-016","name":"潘德雷划船","equipment":"槓鈴","body_parts":["背","手臂"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-017","name":"槓鈴聳肩","equipment":"槓鈴","body_parts":["背"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-018","name":"槓鈴上膊推舉","equipment":"槓鈴","body_parts":["腿","臀","肩"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-019","name":"啞鈴高腳杯深蹲","equipment":"啞鈴","body_parts":["腿","臀"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-020","name":"啞鈴保加利亞分腿蹲","equipment":"啞鈴","body_parts":["腿","臀"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-021","name":"啞鈴行走弓箭步","equipment":"啞鈴","body_parts":["腿","臀"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-022","name":"啞鈴登階","equipment":"啞鈴","body_parts":["腿","臀"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-023","name":"單腳啞鈴羅馬尼亞硬舉","equipment":"啞鈴","body_parts":["腿","臀"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-024","name":"啞鈴臀推","equipment":"啞鈴","body_parts":["臀"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-025","name":"啞鈴臥推","equipment":"啞鈴","body_parts":["胸","手臂"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-026","name":"上斜啞鈴臥推","equipment":"啞鈴","body_parts":["胸","肩"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-027","name":"啞鈴地板臥推","equipment":"啞鈴","body_parts":["胸","手臂"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-028","name":"啞鈴飛鳥","equipment":"啞鈴","body_parts":["胸"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-029","name":"啞鈴上拉","equipment":"啞鈴","body_parts":["胸","背"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-030","name":"單臂啞鈴划船","equipment":"啞鈴","body_parts":["背","手臂"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-031","name":"胸靠式啞鈴划船","equipment":"啞鈴","body_parts":["背","手臂"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-032","name":"啞鈴肩推","equipment":"啞鈴","body_parts":["肩","手臂"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-033","name":"阿諾肩推","equipment":"啞鈴","body_parts":["肩","手臂"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-034","name":"啞鈴側平舉","equipment":"啞鈴","body_parts":["肩"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-035","name":"啞鈴反向飛鳥","equipment":"啞鈴","body_parts":["肩","背"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-036","name":"啞鈴二頭彎舉","equipment":"啞鈴","body_parts":["手臂"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-037","name":"啞鈴槌式彎舉","equipment":"啞鈴","body_parts":["手臂"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-038","name":"啞鈴過頭三頭伸展","equipment":"啞鈴","body_parts":["手臂"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-039","name":"壺鈴擺盪","equipment":"壺鈴","body_parts":["臀","腿"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-040","name":"壺鈴高腳杯深蹲","equipment":"壺鈴","body_parts":["腿","臀"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-041","name":"壺鈴相撲硬舉","equipment":"壺鈴","body_parts":["腿","臀"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-042","name":"壺鈴上膊","equipment":"壺鈴","body_parts":["臀","腿"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-043","name":"壺鈴上膊推舉","equipment":"壺鈴","body_parts":["臀","腿","肩"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-044","name":"壺鈴抓舉","equipment":"壺鈴","body_parts":["臀","腿","肩"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-045","name":"壺鈴土耳其起身","equipment":"壺鈴","body_parts":["核心","肩"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-046","name":"壺鈴農夫走路","equipment":"壺鈴","body_parts":["背","手臂","核心"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-047","name":"站姿滑輪胸推","equipment":"滑輪","body_parts":["胸","手臂"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-048","name":"滑輪夾胸","equipment":"滑輪","body_parts":["胸"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-049","name":"滑輪下拉","equipment":"滑輪","body_parts":["背","手臂"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-050","name":"直臂滑輪下拉","equipment":"滑輪","body_parts":["背"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-051","name":"坐姿滑輪划船","equipment":"滑輪","body_parts":["背","手臂"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-052","name":"單臂滑輪划船","equipment":"滑輪","body_parts":["背","手臂"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-053","name":"滑輪面拉","equipment":"滑輪","body_parts":["肩","背"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-054","name":"單臂滑輪側平舉","equipment":"滑輪","body_parts":["肩"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-055","name":"滑輪反向飛鳥","equipment":"滑輪","body_parts":["肩","背"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-056","name":"滑輪二頭彎舉","equipment":"滑輪","body_parts":["手臂"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-057","name":"滑輪三頭下壓","equipment":"滑輪","body_parts":["手臂"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-058","name":"滑輪過頭三頭伸展","equipment":"滑輪","body_parts":["手臂"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-059","name":"Pallof 抗旋轉推舉","equipment":"滑輪","body_parts":["核心"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-060","name":"滑輪伐木式轉體","equipment":"滑輪","body_parts":["核心"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-061","name":"腿推","equipment":"固定式器械","body_parts":["腿","臀"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-062","name":"哈克深蹲","equipment":"固定式器械","body_parts":["腿","臀"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-063","name":"腿伸展","equipment":"固定式器械","body_parts":["腿"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-064","name":"坐姿腿彎舉","equipment":"固定式器械","body_parts":["腿"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-065","name":"羅馬椅背部伸展","equipment":"固定式器械","body_parts":["背","臀"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-066","name":"髖外展","equipment":"固定式器械","body_parts":["臀"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-067","name":"髖內收","equipment":"固定式器械","body_parts":["腿"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-068","name":"臀部後踢","equipment":"固定式器械","body_parts":["臀"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-069","name":"站姿提踵","equipment":"固定式器械","body_parts":["小腿"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-070","name":"坐姿提踵","equipment":"固定式器械","body_parts":["小腿"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-071","name":"機械式胸推","equipment":"固定式器械","body_parts":["胸","手臂"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-072","name":"蝴蝶機夾胸","equipment":"固定式器械","body_parts":["胸"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-073","name":"機械式肩推","equipment":"固定式器械","body_parts":["肩","手臂"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-074","name":"機械式坐姿划船","equipment":"固定式器械","body_parts":["背","手臂"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-075","name":"輔助引體向上","equipment":"固定式器械","body_parts":["背","手臂"],"movement_type":"系統動作","performance_metric":"reps"},{"catalog_key":"builtin-076","name":"徒手深蹲","equipment":"徒手","body_parts":["腿","臀"],"movement_type":"系統動作","performance_metric":"reps"},{"catalog_key":"builtin-077","name":"徒手反向弓箭步","equipment":"徒手","body_parts":["腿","臀"],"movement_type":"系統動作","performance_metric":"reps"},{"catalog_key":"builtin-078","name":"哥薩克深蹲","equipment":"徒手","body_parts":["腿","臀"],"movement_type":"系統動作","performance_metric":"reps"},{"catalog_key":"builtin-079","name":"單腳深蹲","equipment":"徒手","body_parts":["腿","臀"],"movement_type":"系統動作","performance_metric":"reps"},{"catalog_key":"builtin-080","name":"臀橋","equipment":"徒手","body_parts":["臀"],"movement_type":"局部動作","performance_metric":"reps"},{"catalog_key":"builtin-081","name":"伏地挺身","equipment":"徒手","body_parts":["胸","手臂"],"movement_type":"系統動作","performance_metric":"reps"},{"catalog_key":"builtin-082","name":"鑽石伏地挺身","equipment":"徒手","body_parts":["手臂","胸"],"movement_type":"系統動作","performance_metric":"reps"},{"catalog_key":"builtin-083","name":"Pike 伏地挺身","equipment":"徒手","body_parts":["肩","手臂"],"movement_type":"系統動作","performance_metric":"reps"},{"catalog_key":"builtin-084","name":"引體向上","equipment":"單槓","body_parts":["背","手臂"],"movement_type":"系統動作","performance_metric":"reps"},{"catalog_key":"builtin-085","name":"反向划船","equipment":"單槓","body_parts":["背","手臂"],"movement_type":"系統動作","performance_metric":"reps"},{"catalog_key":"builtin-086","name":"雙槓撐體","equipment":"雙槓","body_parts":["胸","手臂"],"movement_type":"系統動作","performance_metric":"reps"},{"catalog_key":"builtin-087","name":"平板支撐","equipment":"徒手","body_parts":["核心"],"movement_type":"系統動作","performance_metric":"reps"},{"catalog_key":"builtin-088","name":"側平板支撐","equipment":"徒手","body_parts":["核心"],"movement_type":"系統動作","performance_metric":"reps"},{"catalog_key":"builtin-089","name":"Dead Bug 死蟲式","equipment":"徒手","body_parts":["核心"],"movement_type":"系統動作","performance_metric":"reps"},{"catalog_key":"builtin-090","name":"Bird Dog 鳥狗式","equipment":"徒手","body_parts":["核心"],"movement_type":"系統動作","performance_metric":"reps"},{"catalog_key":"builtin-091","name":"仰臥捲腹","equipment":"徒手","body_parts":["核心"],"movement_type":"局部動作","performance_metric":"reps"},{"catalog_key":"builtin-092","name":"懸垂抬腿","equipment":"單槓","body_parts":["核心"],"movement_type":"系統動作","performance_metric":"reps"},{"catalog_key":"builtin-093","name":"波比跳","equipment":"徒手","body_parts":["腿","胸"],"movement_type":"系統動作","performance_metric":"reps"},{"catalog_key":"builtin-094","name":"彈力帶側向走","equipment":"彈力帶","body_parts":["臀"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-095","name":"彈力帶蚌式開合","equipment":"彈力帶","body_parts":["臀"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-096","name":"彈力帶水平拉開","equipment":"彈力帶","body_parts":["肩","背"],"movement_type":"局部動作","performance_metric":"weight"},{"catalog_key":"builtin-097","name":"TRX 懸吊划船","equipment":"懸吊訓練帶","body_parts":["背","手臂"],"movement_type":"系統動作","performance_metric":"reps"},{"catalog_key":"builtin-098","name":"TRX 懸吊胸推","equipment":"懸吊訓練帶","body_parts":["胸","手臂"],"movement_type":"系統動作","performance_metric":"reps"},{"catalog_key":"builtin-099","name":"藥球砸地","equipment":"藥球","body_parts":["背","核心"],"movement_type":"系統動作","performance_metric":"weight"},{"catalog_key":"builtin-100","name":"戰繩交替甩動","equipment":"戰繩","body_parts":["肩","手臂"],"movement_type":"系統動作","performance_metric":"reps"}]$catalog$::jsonb) as item(
    catalog_key text, name text, equipment text, body_parts text[],
    movement_type text, performance_metric text
  )
)
insert into app_private.exercise_definition
  (id,workspace_id,catalog_key,name,equipment,body_parts,movement_type,performance_metric,is_system)
select gen_random_uuid(),workspace.id,catalog.catalog_key,catalog.name,catalog.equipment,
  catalog.body_parts,catalog.movement_type,catalog.performance_metric,true
from app_private.workspace cross join catalog
on conflict (workspace_id,catalog_key) do nothing;

insert into app_private.training_preference(workspace_id)
select id from app_private.workspace on conflict do nothing;


create index exercise_definition_visible_idx on app_private.exercise_definition
  (workspace_id, is_system desc, created_at, id) where deleted_at is null;
create index training_record_session_idx on app_private.training_record(workspace_id, session_id);
create index training_exercise_definition_idx on app_private.training_exercise(workspace_id, definition_id);
create index training_receipt_expiry_idx on app_private.training_mutation_receipt(accepted_at);

alter table app_private.exercise_definition enable row level security;
alter table app_private.training_preference enable row level security;
alter table app_private.training_record enable row level security;
alter table app_private.training_exercise enable row level security;
alter table app_private.training_set enable row level security;
alter table app_private.training_mutation_receipt enable row level security;

revoke all on app_private.exercise_definition, app_private.training_preference,
  app_private.training_record, app_private.training_exercise, app_private.training_set,
  app_private.training_mutation_receipt from anon, authenticated;
grant select, insert, update, delete on app_private.exercise_definition,
  app_private.training_preference, app_private.training_record, app_private.training_exercise,
  app_private.training_set, app_private.training_mutation_receipt to gym_assistant_api;
