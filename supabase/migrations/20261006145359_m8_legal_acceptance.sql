create table app_private.legal_acceptance (
  user_id uuid not null references auth.users(id) on delete cascade,
  terms_version text not null check (char_length(terms_version) between 1 and 80),
  privacy_version text not null check (char_length(privacy_version) between 1 and 80),
  source text not null check (source in ('web')),
  accepted_at timestamptz not null,
  primary key (user_id, terms_version, privacy_version)
);

revoke all on app_private.legal_acceptance from public, anon, authenticated, service_role;
grant select, insert, update on app_private.legal_acceptance to gym_assistant_api;
