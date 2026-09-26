alter table app_private.venue_credit_purchase
  add column private_note text not null default ''
  constraint venue_credit_private_note_length check (char_length(private_note) <= 4000);
