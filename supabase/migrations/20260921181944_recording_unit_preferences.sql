-- A preference selects a measurement convention, never a universal input scale.
-- Existing set JSON preserves its entered unit and numeric value.
create or replace function app_private.training_measurements_valid(measurement_values jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare dimension text; number numeric;
begin
  if jsonb_typeof(measurement_values) <> 'object' or not (measurement_values ?& array['weight','reps','duration','distance','rounds','weightUnit','durationUnit','distanceUnit'])
    or measurement_values->>'weightUnit' not in ('kg','lb') or measurement_values->>'durationUnit' not in ('sec','min')
    or measurement_values->>'distanceUnit' not in ('m','km','ft','mi')
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

alter table app_private.training_preference
  drop constraint if exists training_preference_default_distance_unit_check;
update app_private.training_preference set default_distance_unit='km' where default_distance_unit='m';
alter table app_private.training_preference
  alter column default_distance_unit set default 'km',
  add constraint training_preference_default_distance_unit_check check (default_distance_unit in ('km','mi')),
  drop column default_duration_unit;
