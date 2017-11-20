#!/bin/sh
docker build . -t test-pipelines2:latest
docker tag test-pipelines2:latest docker.io/akkeris/test-pipelines2:latest
docker push docker.io/akkeris/test-pipelines2:latest