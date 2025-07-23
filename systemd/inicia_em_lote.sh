#!/bin/bash

for i in $(seq 10 19); do
    CONTAINER_NAME="server-${i}"
    FULL_IP="10.10.10.${i}"
    echo "Iniciando ${CONTAINER_NAME} com IP ${FULL_IP}..."
    podman run -d --name ${CONTAINER_NAME} \
      --network=dezdezdez \
      --ip=${FULL_IP} \
      --privileged --systemd=true \
      ubuntu-generico
done

echo "containers criados"
