-- The first M8-B prototype attached a standalone backup checkbox to code
-- redemption. Open Beta removes that first-use consent; M8-C will version and
-- record acceptance of complete published terms before real Coach admission.
-- Keep prior development acknowledgments as historical facts.
alter table app_private.beta_grant
  alter column disclosure_version drop not null,
  alter column disclosure_accepted_at drop not null;
