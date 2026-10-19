-- Keep consent history while allowing owner-scoped abandonment after the payment check.
alter table app_private.billing_checkout_intent drop constraint billing_checkout_intent_status_check;
alter table app_private.billing_checkout_intent add constraint billing_checkout_intent_status_check
  check(status in ('creating','open','pending','abandon_requested','confirmed','abandoned'));
drop index app_private.billing_one_unresolved_checkout;
create unique index billing_one_unresolved_checkout
  on app_private.billing_checkout_intent(workspace_id,environment)
  where status in ('creating','open','pending','abandon_requested');

-- The API checks whether an event for this owner's checkout has already arrived.
grant select (environment,notification) on app_private.billing_event_inbox to gym_assistant_api;
create policy billing_inbox_checkout_owner on app_private.billing_event_inbox
  for select to gym_assistant_api using (
    exists (
      select 1 from app_private.billing_checkout_intent i
      where i.id::text=notification->>'intentId'
        and i.environment=billing_event_inbox.environment
        and i.workspace_id=nullif(current_setting('app.current_workspace_id',true),'')::uuid
    )
  );
