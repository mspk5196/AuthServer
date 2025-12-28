#!/bin/bash
set -e

TAG=$(date +"%Y.%m.%d-%H%M")

docker tag auth-server-cpanel-backend:latest auth-server-cpanel-backend:$TAG
docker tag auth-server-developer-backend:latest auth-server-developer-backend:$TAG

echo "✅ Images tagged: $TAG"
