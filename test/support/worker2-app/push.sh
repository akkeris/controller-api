#!/bin/sh
docker build . -t test-worker2:v6
docker tag test-worker2:v6 docker.io/akkeris/test-worker2:v6
docker push docker.io/akkeris/test-worker2:v6