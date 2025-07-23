#!/bin/bash

echo "Iniciando configuração do container como Samba4 Domain Controller com CUPS"

# --- Atualizar e Instalar Pacotes Essenciais ---
echo "Atualizando pacotes e instalando dependências..."
DEBIAN_FRONTEND=noninteractive apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y \
    samba \
    samba-vfs-modules \
    winbind \
    krb5-user \
    dnsutils \
    cups \
    cups-client \
    cups-bsd \
    acl \
    attr \
    lm-sensors \
    net-tools \
    python3-samba \
    apt-utils \
    iputils-ping \
    vim \
    less \
    nano \
    sudo

# Limpeza
apt-get clean
rm -rf /var/lib/apt/lists/*
rm -rf /var/cache/apt/archives/*

echo "Pacotes instalados."

# --- Configurar CUPS ---
echo "Configurando CUPS..."
systemctl enable cups.service
systemctl start cups.service

# --- Configurar o Samba como Domain Controller ---
echo "Configurando Samba como Domain Controller..."

# Definir variáveis para o domínio
DOMAIN_NAME="SISNEMA.LAN"
REALM="SISNEMA.LAN" # Realm é geralmente o nome do domínio em maiúsculas
NETBIOS_NAME="SISNEMA" # Nome NetBIOS do domínio
DOMAIN_PASSWORD="SambaAdminPassword123" # Senha para o administrador do domínio (ATENÇÃO: Mude isso!)

# Remover configurações Samba existentes para evitar conflitos
rm -f /etc/samba/smb.conf
systemctl stop smbd nmbd winbind
systemctl disable smbd nmbd winbind

# Provisionar o domínio Samba
# Certifique-se de que o hostname está correto e resolva para o IP do container.
# Se o hostname for "samba-dc-01", certifique-se de que a rede o configure.
echo "Provisionando o domínio Samba com o nome ${NETBIOS_NAME}..."
samba-tool domain provision --domain="${NETBIOS_NAME}" \
                            --realm="${REALM}" \
                            --server-role=dc \
                            --dns-backend=SAMBA_INTERNAL \
                            --adminpass="${DOMAIN_PASSWORD}" \
                            --use-rfc2307 --function-level=2008_R2 \
                            --host-ip="$(hostname -I | awk '{print $1}')"

# Configurar Kerberos (krb5.conf)
echo "Configurando Kerberos (krb5.conf)..."
cp /var/lib/samba/private/krb5.conf /etc/krb5.conf

# Editar smb.conf com as seções de impressoras
echo "Editando smb.conf com as seções de impressoras..."
curl -f -s "http://192.168.0.19/pacotes/samba/cupssmbconf.py" | python3 -

# Reiniciar e habilitar serviços Samba DC
echo "Habilitando e iniciando serviços Samba DC..."
systemctl unmask samba-ad-dc.service # Desmascara o serviço caso esteja mascarado
systemctl enable samba-ad-dc.service
systemctl start samba-ad-dc.service

# Verificar status do Samba DC
systemctl --no-pager status samba-ad-dc.service || { echo "Erro ao iniciar Samba AD DC. Verifique os logs."; exit 1; }
samba-tool domain level show || { echo "Erro: Samba DC não provisionado corretamente."; exit 1; }

echo "Samba Domain Controller configurado com sucesso!"

echo "Configuração completa do Samba4 DC com CUPS!"
echo "Lembre-se de configurar o DNS nos clientes para apontar para o IP deste container."
echo "Senha do administrador do domínio: ${DOMAIN_PASSWORD}"