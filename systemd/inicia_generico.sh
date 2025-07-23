#! /bin/bash

podman run -ti --rm --privileged --systemd=true \
  --network=podman-local \
  localhost/ubuntu-generico:latest
