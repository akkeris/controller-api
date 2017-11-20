#!/bin/sh
docker build . -t test-formations:latest
docker tag test-formations:latest docker.io/akkeris/test-formations:latest
docker push docker.io/akkeris/test-formations:latest