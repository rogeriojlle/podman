#! /bin/bash

podman run -ti --rm --systemd=true \
  --name=grafana \
  --network=podman \
  --user=root \
  --cap-add=SYS_ADMIN \
  --volume=./grafana/var/lib/grafana:/var/lib/grafana:Z \
  --label=grafana \
  -p 3000:3000 \
  localhost/ubuntu-grafana:latest
