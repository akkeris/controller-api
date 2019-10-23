#!/bin/sh
openssl genrsa -out jwt-rs256-private-key.pem
openssl rsa -pubout -in jwt-rs256-private-key.pem -out jwt-rs256-public-certificate.pem
