drop table app_private.account_lifecycle_outbox;

drop index app_private.workspace_inactivity_review_idx;

alter table app_private.workspace
  drop column inactivity_notice_sent_at,
  add column lifecycle_deletion_claimed_at timestamptz;

create index workspace_inactivity_deletion_idx
  on app_private.workspace (last_activity_at)
  where deletion_requested_at is null;

create or replace function public.claim_due_account_deletions(p_limit integer default 100)
returns table(user_id uuid)
language sql
security definer
set search_path = pg_catalog, app_private
as $$
  with due as (
    select id
    from app_private.workspace
    where (
      deletion_due_at <= now()
      or (
        deletion_requested_at is null
        and last_activity_at <= now() - interval '365 days'
      )
    )
      and (
        lifecycle_deletion_claimed_at is null
        or lifecycle_deletion_claimed_at < now() - interval '1 hour'
      )
    order by coalesce(deletion_due_at, last_activity_at)
    limit greatest(1, least(p_limit, 100))
    for update skip locked
  )
  update app_private.workspace workspace
  set lifecycle_deletion_claimed_at = now()
  from due
  where workspace.id = due.id
  returning workspace.owner_user_id;
$$;

create or replace function public.release_due_account_deletion(p_user_id uuid)
returns void
language sql
security definer
set search_path = pg_catalog, app_private
as $$
  update app_private.workspace
  set lifecycle_deletion_claimed_at = null
  where owner_user_id = p_user_id;
$$;

revoke all on function public.claim_due_account_deletions(integer) from public, anon, authenticated;
revoke all on function public.release_due_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.claim_due_account_deletions(integer) to service_role;
grant execute on function public.release_due_account_deletion(uuid) to service_role;

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'gym-assistant-delete-inactive-coaches',
  '10 18 * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'gym_assistant_project_url') || '/functions/v1/delete-inactive-coaches',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'gym_assistant_lifecycle_cron_key')
      ),
      body := '{}'::jsonb
    );
  $$
);
