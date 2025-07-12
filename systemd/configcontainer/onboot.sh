#!/bin/bash

# muda para a pasta desse arquivo
cd "$(dirname -- "$( readlink -f -- "$0"; )")"

# Baixa o script, verifica o status HTTP e armazena em uma variável
SCRIPT_CONTENT=$(curl -f -s "http://192.168.0.19/cgi-bin/?$(hostname)")

# Verifica o código de saída do curl
if [ $? -eq 0 ]; then
    # Se curl foi bem-sucedido (código de saída 0), executa o conteúdo
    echo "$SCRIPT_CONTENT" | bash
else
    # Se curl falhou (código de saída diferente de 0)
    echo "Erro: Falha ao obter a configuração ou status HTTP não é 2xx." >&2
    exit 1
fi