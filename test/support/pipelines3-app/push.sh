#!/bin/sh
docker build . -t test-pipelines3:latest
docker tag test-pipelines3:latest docker.io/akkeris/test-pipelines3:latest
docker push docker.io/akkeris/test-pipelines3:latest