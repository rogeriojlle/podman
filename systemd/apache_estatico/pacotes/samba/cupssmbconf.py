import configparser
import os

# Caminho para o seu arquivo smb.conf
smb_conf_path = '/etc/samba/smb.conf'

# Criar um objeto ConfigParser
config = configparser.ConfigParser()

# Preservar a capitalização das opções (útil para Samba)
config.optionxform = str

# --- Carregar o arquivo smb.conf existente ---
try:
    with open(smb_conf_path, 'r') as f:
        config.read_file(f)
except FileNotFoundError:
    print(f"Erro: Arquivo {smb_conf_path} não encontrado.")
    exit(1)
except Exception as e:
    print(f"Erro ao ler o arquivo {smb_conf_path}: {e}")
    exit(1)


# --- Seção [global]
section_name_global = 'global'
config.set(section_name_global, 'comment', 'All Printers')
config.set(section_name_global, 'load printers', 'Yes')
config.set(section_name_global, 'printing', 'cups')
config.set(section_name_global, 'printcap name', 'cups')

# --- Adicionar ou Modificar Seção [printers] ---
section_name_printers = 'printers'
if not config.has_section(section_name_printers):
    config.add_section(section_name_printers)
    print(f"Seção [{section_name_printers}] adicionada.")
else:
    print(f"Seção [{section_name_printers}] já existe. Atualizando configurações.")

config.set(section_name_printers, 'comment', 'All Printers')
config.set(section_name_printers, 'path', '/var/spool/samba')
config.set(section_name_printers, 'create mask', '0700')
config.set(section_name_printers, 'printable', 'yes')
config.set(section_name_printers, 'browseable', 'no')
config.set(section_name_printers, 'public', 'no')
config.set(section_name_printers, 'guest ok', 'no') # CUPS com autenticação
# Ou 'guest ok = yes' se quiser impressora pública

# --- Adicionar ou Modificar Seção [print$] ---
section_name_print_dollars = 'print$'
if not config.has_section(section_name_print_dollars):
    config.add_section(section_name_print_dollars)
    print(f"Seção [{section_name_print_dollars}] adicionada.")
else:
    print(f"Seção [{section_name_print_dollars}] já existe. Atualizando configurações.")

config.set(section_name_print_dollars, 'comment', 'Printer Drivers')
config.set(section_name_print_dollars, 'path', '/var/lib/samba/drivers')
config.set(section_name_print_dollars, 'browseable', 'yes')
config.set(section_name_print_dollars, 'read only', 'yes')
config.set(section_name_print_dollars, 'guest ok', 'no')

# --- Salvar as alterações de volta no arquivo ---
# É uma boa prática fazer um backup antes de escrever
backup_path = smb_conf_path + '.bak'
if os.path.exists(smb_conf_path):
    os.rename(smb_conf_path, backup_path)
    print(f"Backup de {smb_conf_path} criado em {backup_path}")

try:
    with open(smb_conf_path, 'w') as configfile:
        config.write(configfile)
    print(f"Configurações do CUPS adicionadas/atualizadas em {smb_conf_path}")
except Exception as e:
    print(f"Erro ao escrever no arquivo {smb_conf_path}: {e}")
    # Se houver erro ao escrever, tente restaurar o backup
    if os.path.exists(backup_path):
        os.rename(backup_path, smb_conf_path)
        print(f"Backup restaurado devido ao erro de escrita.")
    exit(1)
