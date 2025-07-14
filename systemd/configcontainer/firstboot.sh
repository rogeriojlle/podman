#!/bin/bash
set -euo pipefail

cd "$(dirname -- "$( readlink -f -- "$0"; )")"

# O `if` vai capturar a falha do `curl` sem parar o script
if ! SCRIPT=$(curl -f -s "http://192.168.0.19/cgi-bin/firstboot/?$(hostname)"); then
  echo "Aviso: Falha ao obter o script de firstboot. Continuando..." >&2
  SCRIPT="" # Define a variável como vazia
fi

if [ -n "$SCRIPT" ]; then
  # Se a variável não estiver vazia, execute o script
  echo "$SCRIPT" | bash -e
  RESULTADO=$?
  if [ $RESULTADO -eq 0 ]; then
    touch ./.firstboot
  else
    echo "Erro ao executar o script de firstboot. Resultado: $RESULTADO"
    exit $RESULTADO
  fi
else
  # Se a variável estiver vazia, faça outra coisa ou ignore
  echo "Nenhum script para executar."
  touch ./.firstboot
fi