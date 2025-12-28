#!/bin/bash
export IMAGE_TAG=$(git rev-parse --short HEAD)
echo "Using image tag: $IMAGE_TAG"
