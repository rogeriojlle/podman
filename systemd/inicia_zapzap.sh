#! /bin/bash

podman run -ti --rm --systemd=true \
  --name=zapzap \
  --network=podman \
  --user=root \
  --label=zapzap \
  --volume=./zapzap/opt/zapzap/.wwebjs_auth:/opt/zapzap/.wwebjs_auth:Z \
  -p 10000:10000 \
  -p 6789:6789 \
  localhost/ubuntu-zapzap:latest
