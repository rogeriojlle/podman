#! /bin/bash

podman run -d --rm --systemd=true \
  --name=zapzap \
  --network=podman \
  --user=root \
  --label=zapzap \
  --volume=./zapzap/opt/zapzap/.wwebjs_auth:/opt/zapzap/.wwebjs_auth:Z \
  -p 10000:10000 \
  localhost/ubuntu-zapzap:latest
