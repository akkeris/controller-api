#!/bin/sh
docker build . -t test-hooks:latest
docker tag test-hooks:latest docker.io/akkeris/test-hooks:latest
docker push docker.io/akkeris/test-hooks:latest