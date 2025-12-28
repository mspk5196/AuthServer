#!/bin/bash
echo "🔙 Rolling back to stable images"

docker compose \
  -f docker/docker-compose.base.yml \
  -f docker/docker-compose.prod.yml \
  up -d
