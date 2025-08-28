#!/usr/bin/bash -x

source $(dirname "${BASH_SOURCE}")/defaults.env

XVFB_CMD=$(
    echo /usr/libexec/Xorg +extension GLX +extension RANDR +extension RENDER \
    -extension DOUBLE-BUFFER -listen tcp -noreset -novtswitch \
    -logfile '${XPRA_SESSION_DIR}/Xorg.log' \
    -configdir '${XPRA_SESSION_DIR}/xorg.conf.d/$PID' \
    -config '${XORG_CONFIG_PREFIX}/etc/xpra/xorg.conf'
)

#--exit-with-windows=yes \
# esse parametro instrui o xpra encerrar quando nada mais estiver sendo exibido
# enquanto em desenvolvimento deixarei desativado 
/usr/bin/xpra start \
    --daemon=no \
    --xvfb="${XVFB_CMD}" \
    --resize-display=800x600 \
    --bind-tcp=0.0.0.0${DISPLAY} \
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
    --exit-with-windows=no \
    ${DISPLAY}