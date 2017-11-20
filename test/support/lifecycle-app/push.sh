#!/bin/sh
docker build . -t test-lifecycle:latest
docker tag test-lifecycle:latest docker.io/akkeris/test-lifecycle:latest
docker push docker.io/akkeris/test-lifecycle:latest