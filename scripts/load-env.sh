#!/bin/bash
set -e
set -a

  source /opt/envs/frontend.prod.env
  
for f in \
  /opt/envs/cpanel-backend.env \
  /opt/envs/cpanel-frontend.env \
  /opt/envs/dev-backend.env \
  /opt/envs/dev-frontend.env
do
  [ -f "$f" ] || { echo "❌ Missing $f"; exit 1; }
  source "$f"
done

set +a
