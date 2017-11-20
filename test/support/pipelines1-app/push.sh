#!/bin/sh
docker build . -t test-pipelines1:latest
docker tag test-pipelines1:latest docker.io/akkeris/test-pipelines1:latest
docker push docker.io/akkeris/test-pipelines1:latest