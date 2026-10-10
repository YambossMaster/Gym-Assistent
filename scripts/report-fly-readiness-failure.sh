#!/usr/bin/env bash

set +e

app="${1:-formcoachdesk}"

echo "Fly application status"
flyctl status --app "$app"

echo "Fly health checks"
flyctl checks list --app "$app"

echo "Fly machine list"
flyctl machine list --app "$app"

echo "Fly machine states"
machine_ids="$(flyctl machine list --app "$app" --json 2>/dev/null | jq -r '.[] | (.id // .ID // empty)')"
while IFS= read -r machine_id; do
  if [[ -n "$machine_id" ]]; then
    flyctl machine status "$machine_id" --app "$app"
  fi
done <<< "$machine_ids"

echo "Last 50 Fly log lines (bearer routes and authorization values redacted)"
flyctl logs --app "$app" --no-tail 2>&1 | node scripts/redact-fly-diagnostics.mjs --last 50

exit 0
