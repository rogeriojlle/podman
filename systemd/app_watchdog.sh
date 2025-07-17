#!/bin/bash

# --- CONFIGURAÇÕES: Ajuste estas variáveis ---
APP_EXEC="/caminho/para/sua/aplicacao" # Caminho COMPLETO do executável
APP_ARGS=""                             # Argumentos para a aplicação (ex: "--config /etc/app.conf")
READY_DELAY=5                           # Tempo em segundos para a aplicação estar "pronta" (ajuste conforme necessário)
WATCHDOG_INTERVAL=30                    # Intervalo em segundos para notificar o watchdog (deve ser menor que WatchdogSec no .service)

# --- INÍCIO DO WRAPPER ---
echo "Wrapper: Iniciando a aplicação '$APP_EXEC'..."

# Inicia a aplicação em segundo plano e captura seu PID
"$APP_EXEC" $APP_ARGS &
APP_PID=$!

echo "Wrapper: Aplicação iniciada com PID $APP_PID."

# 1. Notifica o systemd que o serviço está PRONTO (Ready)
# Aguarda um tempo para a aplicação realmente inicializar.
echo "Wrapper: Aguardando $READY_DELAY segundos para notificar 'READY' ao systemd..."
sleep "$READY_DELAY"

systemd-notify --ready
echo "Wrapper: Notificação 'READY' enviada ao systemd."

# 2. Loop para o Watchdog
# Envia notificações regulares para o systemd. Se o wrapper parar, o systemd detecta.
echo "Wrapper: Iniciando loop de watchdog (a cada $WATCHDOG_INTERVAL segundos)..."
while kill -0 "$APP_PID" 2>/dev/null; do
    systemd-notify --status="Aplicação rodando e watchdog ativo. PID: $APP_PID" --watchdog
    sleep "$WATCHDOG_INTERVAL"
done

echo "Wrapper: Aplicação (PID $APP_PID) encerrou."
exit 0