const url = require('node:url');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const child_process = require('node:child_process');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const { DATAPATH, DISPLAY } = process.env;

// Remove SingletonLock, SingletonSocket, SingletonCookie
// antes de iniciar o puppeteer para evitar problemas com sessões anteriores
['SingletonLock', 'SingletonSocket', 'SingletonCookie'].forEach((file) => {
  fs.unlink(path.join(DATAPATH, 'session', file), (err) => {
    if (err && err.code !== 'ENOENT') {
      // Ignora 'file not found'
      console.error(`Erro ao remover ${file}:`, err);
    }
  });
});

const lancarClient = () => {
  return new Promise((resolve, reject) => {
    // Verifica se o display Xpra está ativo.
    // O Xpra já deve estar rodando para fornecer o DISPLAY.
    const xpraid = child_process.spawn('xpra', ['id', DISPLAY]);
    xpraid.on('exit', (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `O display Xpra (${DISPLAY}) não está ativo ou não iniciou corretamente. Código de saída: ${code}`
          )
        );
      } else {
        console.log(`Display Xpra (${DISPLAY}) verificado e ativo.`);
        const client = new Client({
          authStrategy: new LocalAuth({
            dataPath: DATAPATH,
          }),
          puppeteer: {
            headless: false,
            args: [
              '--mute-audio',
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-accelerated-video-decode',
              '--disable-gpu',
              '--no-first-run',
              '--no-zygote',
              '--disable-features=site-per-process',
              '--disable-features=IsolateOrigins',
              '--disable-breakpad',
              '--disable-sync',
              '--disable-print-preview',
              `--display=${DISPLAY}`,
            ],
          },
        });

        client.on('qr', (qr) => {
          console.log(
            'QR RECEIVED',
            qrcode.toString(qr, { type: 'terminal', small: true })
          );
        });

        client.on('ready', async () => {
          console.log('Client is ready!');

          // *** INÍCIO DA SOLUÇÃO PARA MONITORAR O PROCESSO DO NAVEGADOR ***
          let browserProcessPid = null;
          try {
            // Tenta obter o processo Puppeteer do navegador
            const browserProcess = client.pupBrowser.process();
            if (browserProcess) {
              browserProcessPid = browserProcess.pid;
              console.log(
                `[Monitor] PID do processo do navegador Puppeteer: ${browserProcessPid}`
              );

              // Inicia o monitoramento periódico do PID do navegador
              setInterval(() => {
                try {
                  // Tenta enviar um sinal 0 (que não faz nada, apenas verifica se o processo existe)
                  process.kill(browserProcessPid, 0);
                  // console.log(`[Monitor] Navegador (PID: ${browserProcessPid}) ainda ativo.`);
                } catch (e) {
                  // Se o processo não for encontrado (ESRCH), ele foi encerrado
                  if (e.code === 'ESRCH') {
                    console.error(
                      `[Monitor] Processo do navegador (PID: ${browserProcessPid}) não encontrado. Provavelmente foi encerrado inesperadamente.`
                    );
                    console.error(
                      '[Monitor] Encerrando o processo Node.js devido à perda do navegador...'
                    );
                    process.exit(1); // Encerra com código de erro para systemd
                  } else {
                    console.error(
                      `[Monitor] Erro inesperado ao verificar o processo do navegador (PID: ${browserProcessPid}):`,
                      e
                    );
                    process.exit(1); // Encerra em caso de outros erros
                  }
                }
              }, 5000); // Verifica a cada 5 segundos. Ajuste conforme sua necessidade de "imediatismo".
            } else {
              console.warn(
                '[Monitor] Não foi possível obter o PID do processo do navegador. O monitoramento direto não será ativado.'
              );
            }
          } catch (e) {
            console.error(
              '[Monitor] Erro ao tentar acessar o processo do navegador do Puppeteer:',
              e
            );
            // Considere encerrar aqui se a incapacidade de monitorar for crítica
          }
          // *** FIM DA SOLUÇÃO ***

          // Estes listeners ainda são úteis para outros tipos de desconexão limpa
          // ou falhas internas do Puppeteer/WhatsApp Web
          client.pupBrowser.on('close', () => {
            console.log(
              'Browser closed via Puppeteer event (pupBrowser.on("close"))'
            );
            process.exit(1);
          });

          client.pupBrowser.on('disconnected', () => {
            console.log(
              'Puppeteer browser disconnected (pupBrowser.on("disconnected"))'
            );
            process.exit(1);
          });

          client.pupBrowser.on('error', (err) => {
            console.error(
              'Puppeteer browser error (pupBrowser.on("error")):',
              err
            );
            process.exit(1);
          });

          console.log(client.pupBrowser);
          resolve(client);
        });

        client.on('disconnected', (reason) => {
          console.log(
            'Client was disconnected (client.on("disconnected")):',
            reason
          );
          // Este evento ainda pode ser útil para cenários onde o WhatsApp se desconecta
          // sem que o navegador seja "morto" (e.g., sessão expirada)
          process.exit(1); // Encerra com erro
        });

        client.on('change_state', (state) => {
          console.log('State changed:', state);
        });

        client.on('auth_failure', (msg) => {
          console.error('AUTHENTICATION FAILURE:', msg);
          process.exit(1); // Encerra com erro
        });

        client.initialize();
      }
    });
    xpraid.on('error', (err) => {
      reject(new Error(`Erro ao executar 'xpra id': ${err.message}`));
    });
  });
};

lancarClient().then(
  (client) => {
    const server = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url, true);
      const queryParams = parsedUrl.query;
      const { destino } = queryParams;

      if (!destino) {
        res.writeHead(400, { 'content-type': 'application/text' });
        res.end('Parâmetro "destino" é obrigatório.');
        return;
      }

      try {
        await client.sendMessage(
          destino,
          `${new Date().toLocaleString()} essa mensagem é automatica`
        );
        res.writeHead(200, { 'content-type': 'application/text' });
        res.end(`Mensagem enviada para ${destino}`);
      } catch (error) {
        console.error(
          `Erro ao enviar mensagem para ${destino}:`,
          error.message
        );
        res.writeHead(500, { 'content-type': 'application/text' });
        res.end(`Erro ao enviar mensagem: ${error.message}`);
        // Se o envio falhou, pode ser um sinal de que a conexão está ruim
        // Considerar um process.exit(1) aqui também se for um erro crítico.
      }
    });

    server.listen(6789, () => {
      console.log('Server started on port 6789');
    });

    globalThis.__client = client;
  },
  (err) => {
    console.error('Falha crítica ao iniciar o cliente WhatsApp:', err);
    process.exit(1);
  }
);
