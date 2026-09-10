alter table app_private.workspace
  add column display_name text not null default '我的工作台'
    check (char_length(display_name) between 1 and 120),
  add column time_zone text not null default 'Asia/Taipei'
    check (char_length(time_zone) between 1 and 64),
  add column version integer not null default 1 check (version > 0),
  add column updated_at timestamptz not null default now();

grant update (display_name, time_zone, version, updated_at) on app_private.workspace to gym_assistant_api;
