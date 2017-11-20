#!/bin/sh
docker build . -t test-worker:latest
docker tag test-worker:latest docker.io/akkeris/test-worker:latest
docker push docker.io/akkeris/test-worker:latest