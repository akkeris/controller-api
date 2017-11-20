#!/bin/sh
docker build . -t test-pipelines4:latest
docker tag test-pipelines4:latest docker.io/akkeris/test-pipelines4:latest
docker push docker.io/akkeris/test-pipelines4:latest