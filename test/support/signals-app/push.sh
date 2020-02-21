#!/bin/sh
docker build . -t test-signals:latest
docker tag test-signals:latest docker.io/akkeris/test-signals:latest
docker push docker.io/akkeris/test-signals:latest