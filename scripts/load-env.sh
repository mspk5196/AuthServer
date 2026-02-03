#!/bin/bash
set -e
set -a

ENV_FILES=(
  /opt/envs/cpanel-backend.env
  /opt/envs/cpanel-frontend.env
  /opt/envs/dev-backend.env
  /opt/envs/dev-frontend.env
  /opt/envs/frontend.prod.env
)

for f in "${ENV_FILES[@]}"; do
  [ -f "$f" ] || { echo "❌ Missing $f"; exit 1; }
  source "$f"
done

set +a
