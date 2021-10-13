#!/bin/sh
docker buildx build --push --platform linux/arm/v7,linux/arm64/v8,linux/amd64 --tag docker.io/akkeris/test-worker2:v6 .
