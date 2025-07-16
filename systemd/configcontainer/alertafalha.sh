#!/bin/bash

read -r SERVICO FERRAMENTA DESTINO <<< $( systemd-escape -u ${1} )

function enviar-email () {
    echo -e "Subject: Falha detectada em ${SERVICO}\n\n${1}" | sendmail $DESTINO
    log $1
    exit 0
}

function enviar-zap () {
    echo "não implementado, fazendo log"
    log $1
    exit 0
}

function log () {
  echo "FALHA DETECTADA: $(date)"
  echo "SERVIÇO: $SERVICO"
  echo "MENSAGEM: $1"
  echo "FERRAMENTA: $FERRAMENTA"
  echo "DESTINO: $DESTINO"
  exit 0
}

journalctl -o export -f -u "$SERVICO" --since "now" | \
while IFS= read -r line; do
    # IFS= Internal Field Separator
    # Terminar bloco quando linha vazia for encontrada
    if [[ -z "$line" ]]; then
        if [[ "$JOB_RESULT" == "failed" ]]; then
            case $FERRAMENTA in
              email)
                enviar-email $MESSAGE
              ;;
              zap)
                enviar-zap $MESSAGE
              ;;
              *)
                log $MESSAGE
              ;; 
            esac
        fi
        # Resetar variáveis
        unset JOB_RESULT MESSAGE
    else
        # Capturar variáveis do bloco
        case "$line" in
            JOB_RESULT=*)
                JOB_RESULT="${line#JOB_RESULT=}"
                ;;
            MESSAGE=*)
                MESSAGE="${line#MESSAGE=}"
                ;;
        esac
    fi
done
