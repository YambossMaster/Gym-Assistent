-- Support the new composite foreign keys without scanning all sessions or payouts.
create index course_session_venue_rule_idx
  on app_private.course_session(workspace_id, venue_id, fee_rule_id);
create index venue_payout_venue_idx
  on app_private.venue_payout(workspace_id, venue_id);
