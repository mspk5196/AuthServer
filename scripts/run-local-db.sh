#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_ROOT/docker/docker-compose.local.yml"

echo "🚀 Starting local isolated database & redis containers..."
docker compose -f "$COMPOSE_FILE" up -d local-postgres local-redis

echo "⏳ Waiting for PostgreSQL container to become ready..."
for i in {1..30}; do
  STATUS=$(docker inspect --format='{{json .State.Health.Status}}' auth-local-postgres 2>/dev/null || echo "")
  if [[ "$STATUS" == *"healthy"* ]]; then
    echo -e "\n✅ Local PostgreSQL is READY and seeded with Sql/public.sql!"
    echo "   Host: localhost:5432"
    echo "   User: mspkapps | Password: Mskp@3922 | DB: authdb"
    echo "   Redis: localhost:6379"
    exit 0
  fi
  printf "."
  sleep 2
done

echo -e "\n⚠️ Container is still starting. Check logs with: docker logs -f auth-local-postgres"

