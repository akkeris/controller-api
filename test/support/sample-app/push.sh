#!/bin/sh
docker build . -t test-sample:latest
docker tag test-sample:latest docker.io/akkeris/test-sample:latest
docker push docker.io/akkeris/test-sample:latest