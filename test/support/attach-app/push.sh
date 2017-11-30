#!/bin/sh
docker build . -t test-attach:v3
docker tag test-attach:v2 docker.io/akkeris/test-attach:v3
docker push docker.io/akkeris/test-attach:v3