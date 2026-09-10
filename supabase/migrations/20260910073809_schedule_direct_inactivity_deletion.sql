select cron.unschedule(jobid)
from cron.job
where jobname = 'gym-assistant-delete-inactive-coaches';

select cron.schedule(
  'gym-assistant-delete-inactive-coaches',
  '10 18 * * *',
  $$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'gym_assistant_project_url') || '/functions/v1/delete-inactive-coaches',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-gym-assistant-lifecycle-token',
        (select decrypted_secret from vault.decrypted_secrets where name = 'gym_assistant_lifecycle_cron_token')
      ),
      body := '{}'::jsonb
    );
  $$
);
