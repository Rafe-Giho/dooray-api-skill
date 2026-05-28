#!/usr/bin/env bash
set -euo pipefail

SERVICE="${1:-dooray-api-token}"
ACCOUNT="${2:-default}"

printf 'Dooray API token for service=%s account=%s: ' "$SERVICE" "$ACCOUNT" >&2
IFS= read -rs TOKEN
printf '\n' >&2

if [[ -z "$TOKEN" ]]; then
  echo 'Token is empty; aborting.' >&2
  exit 2
fi

security add-generic-password \
  -a "$ACCOUNT" \
  -s "$SERVICE" \
  -w "$TOKEN" \
  -U >/dev/null

echo "Stored Dooray API token in macOS Keychain: service=$SERVICE account=$ACCOUNT"
