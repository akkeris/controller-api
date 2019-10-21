#!/bin/sh
openssl genrsa -out sample-jwt-private-key.pem
openssl rsa -pubout -in sample-jwt-private-key.pem -out sample-jwt-public-certificate.pem
