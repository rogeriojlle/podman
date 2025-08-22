#! /bin/bash

podman run -d --rm --systemd=true \
  --name=zapzap \
  --network=podman \
  --user=root \
  --label=zapzap \
  --volume=/home/rogerio/projetos/podman/systemd/zapzap/opt/zapzap/.wwebjs_auth:/opt/zapzap/.wwebjs_auth:Z \
  -p 10000:10000 \
  -p 6789:6789 \
  localhost/ubuntu-zapzap:latest
