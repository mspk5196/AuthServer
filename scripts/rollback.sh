#!/bin/bash
ENV=${1:-prod}

echo "🔙 Rolling back ${ENV}"

docker compose -p auth-server-${ENV} \
  -f docker/docker-compose.base.yml \
  -f docker/docker-compose.${ENV}.yml \
  up -d
