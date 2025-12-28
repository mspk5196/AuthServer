#!/bin/bash
echo "🔙 Rolling back to previous stable images"
docker compose -f docker/docker-compose.prod.yml down
docker compose -f docker/docker-compose.prod.yml up -d
