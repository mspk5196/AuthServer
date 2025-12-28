#!/bin/bash
echo "🏷 Tagging images as stable"

services=(
  "mspk/cpanel-backend"
  "mspk/cpanel-frontend"
  "mspk/dev-backend"
  "mspk/dev-frontend"
)

for svc in "${services[@]}"; do
  docker tag ${svc}:${IMAGE_TAG} ${svc}:stable
done
