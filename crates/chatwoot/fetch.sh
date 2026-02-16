#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

curl -sL \
  https://raw.githubusercontent.com/chatwoot/chatwoot/refs/heads/develop/swagger/swagger.json \
  -o swagger.json

echo "Fetched swagger.json ($(wc -l < swagger.json) lines)"
