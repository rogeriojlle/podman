RUN for service in "grafana-server.service" \
    "ssh.service" \
    "mini-api.service"; do \
    echo "Configuring accounting for: $service"; \
    systemctl set-property "$service" \
    CPUAccounting=yes \
    IOAccounting=yes \
    MemoryAccounting=yes \
    TasksAccounting=yes \
    IPAccounting=yes; \
    done \
    && systemctl daemon-reload