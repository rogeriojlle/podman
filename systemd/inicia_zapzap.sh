#! /bin/bash

podman run -ti --rm --privileged --systemd=true \
  --network=podman-local \
  --label=zapzap \
  --ip=192.168.0.250 \
  --volume=./zapzap/opt/zapzap/.wwebjs_auth:/opt/zapzap/.wwebjs_auth \
  localhost/ubuntu-zapzap:latest
