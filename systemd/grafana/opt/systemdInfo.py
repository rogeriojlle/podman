#!/usr/bin/env python3

import http.server
import socketserver
import urllib.parse
import subprocess
import json

# --- Configurações ---
PORT = 5678

# Campos que queremos extrair da saída do systemctl show
CAMPOS_INTERESSE = [
    'Id',
    'Description',
    'LoadState',
    'ActiveState',
    'UnitFileState',
    'MemoryCurrent',
    'IOReadBytes',
    'IOWriteBytes',
    'IOReadOperations',
    'IOWriteOperations',
    'CPUUsageNanos',
]

def parse_systemctl_output(raw_output):
    """
    Processa a saída bruta do systemctl show e retorna um dicionário
    com os campos de interesse, convertendo "[not set]" para None.
    Preenche campos ausentes com None para consistência.
    """
    obj = {}
    lines = raw_output.split('\n')
    for line in lines:
        if not line:
            continue
        
        parts = line.split('=', 1) 
        if len(parts) < 2:
            continue
        
        key = parts[0].strip()
        value = parts[1].strip()

        if key not in CAMPOS_INTERESSE:
            continue
        
        if value == "[not set]":
            obj[key] = None
        else:
            obj[key] = value
            
    # Garante que todos os campos de interesse estejam presentes, mesmo que com None
    for field in CAMPOS_INTERESSE:
        if field not in obj:
            obj[field] = None

    return obj

class SimpleHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        query_params = urllib.parse.parse_qs(parsed_url.query)

        services_param = query_params.get('services')[0] 
        
        service_names = [s.strip() for s in services_param.split(',')]
        results = []

        for service_name in service_names:
            service_data = {} 
            service_data['serviceName'] = service_name 

            # AQUI: Chamada subprocess.run sem try-except, direto como execSync do Node.js
            process = subprocess.run(
                ['systemctl', 'show', service_name],
                capture_output=True, text=True, check=False # check=False para não levantar exceção em retorno != 0
            )
            
            raw_output = process.stdout
            
            # Processa a saída (stdout) e atualiza service_data
            service_data.update(parse_systemctl_output(raw_output))
            
            results.append(service_data)

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        self.wfile.write(json.dumps(results, indent=2).encode('utf-8'))

if __name__ == '__main__':
    with socketserver.TCPServer(("", PORT), SimpleHandler) as httpd:
        print(f"Servidor iniciado em http://0.0.0.0:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("Servidor parado.")