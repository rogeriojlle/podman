#!/bin/bash

SD_NOTIFY="/usr/bin/systemd-notify"

echo "[$0] Iniciando Xpra em ${DISPLAY}..."

# Executa o comando xpra start em segundo plano
# Captura o PID do Xpra para monitoramento posterior, se necessário.
/usr/bin/xpra start \
  --daemon=no \
  --xvfb=Xdummy \
  --exit-with-windows=yes \
  --resize-display=800x600 \
  --html=on \
  --http-scripts=off \
  --speaker=disabled \
  --microphone=disabled \
  --webcam=no \
  --audio=no \
  --sharing=no \
  --file-transfer=off \
  --bell=no \
  --printing=no \
  --webcam=no \
  --input-method=none \
  --pulseaudio=no \
  --mdns=no \
  --dbus=no \
  --systemd-run=no \
  --notifications=no \
  --tray=no \
  --start-new-commands=no \
  --bind-tcp="0.0.0.0${DISPLAY}" \
  --dbus=no \
  "${DISPLAY}" &
XPRA_PID=$! # Pega o PID do processo xpra start

echo "[$0] Xpra iniciado (PID: ${XPRA_PID}). Aguardando display ficar pronto..."

# Loop para aguardar o display Xpra estar ativo e responsivo
# O comando `xpra id` retornará 0 quando o display estiver pronto
until xpra id "${DISPLAY}" &> /dev/null; do
    echo "[$0] Aguardando Xpra em ${DISPLAY}..."
    sleep 1 # Pequena pausa para não saturar a CPU
done

echo "[$0] Display Xpra em ${DISPLAY} está PRONTO!"

# Notifica o systemd que o serviço está pronto
${SD_NOTIFY} --ready

echo "[$0] Notificado systemd. Mantendo o script ativo para o systemd monitorar o Xpra..."

# Aguarda o processo do Xpra terminar
# O Xpra vai encerrar quando a última janela for fechada,
# devido ao --exit-with-windows=yes.
wait ${XPRA_PID}
${SD_NOTIFY} --stopping
echo "[$0] Xpra (PID: ${XPRA_PID}) encerrou. Encerrando script."
exit 0 # Saída limpa
