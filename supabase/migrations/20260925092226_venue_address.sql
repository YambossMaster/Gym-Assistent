alter table app_private.venue
  add column address text
  constraint venue_address_length check (address is null or char_length(address) <= 500);
