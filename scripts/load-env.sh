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

# Validate required secrets are present — no silent fallbacks allowed
REQUIRED_VARS=(
  SECRET_ENCRYPTION_KEY
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Required environment variable '$var' is not set in /opt/envs/cpanel-backend.env"
    exit 1
  fi
done

echo "✅ All required environment variables are present"
