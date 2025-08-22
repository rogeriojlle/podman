const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const child_process = require('node:child_process');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const notify = require('sd-notify');

const { DATAPATH, DISPLAY, WHATSAPP_SOCKET, PUPPETEER_EXECUTABLE_PATH } =
  process.env;

let clientInstance = null;
let clientStatus = 'initializing';

// Função para remover arquivos de sessão
const cleanSessionFiles = () => {
  ['SingletonLock', 'SingletonSocket', 'SingletonCookie'].forEach((file) => {
    const filePath = path.join(DATAPATH, 'session', file);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`Removido: ${filePath}`);
      } catch (err) {
        console.error(`Erro ao remover ${filePath}:`, err);
      }
    }
  });
};

const socketServer = () => {
  // Servidor de Socket Unix para comunicação IPC
  const server = net.createServer((socket) => {
    console.log('Cliente conectado ao Socket Unix.');

    const functions = clientFunctions(clientInstance);

    socket.on('end', () => {
      console.log('Cliente desconectado do Socket Unix.');
    });

    socket.on('data', async (data) => {
      try {
        const request = JSON.parse(data.toString());
        const { id, method, args } = request;

        let result = method
          ? functions[method] && (await functions[method](args))
          : null;
        let error = null;

        if (!result) error = true;

        return socket.write(
          JSON.stringify({
            id,
            result,
            error,
          })
        );
      } catch (e) {
        console.error('Erro ao processar dados do socket:', e.message);
        socket.write(
          JSON.stringify({
            id: null,
            error: `Erro de parsing ou interno: ${e.message}`,
          })
        );
      }
    });

    socket.on('error', (err) => {
      console.error('Erro no socket:', err.message);
    });
  });

  server.listen(WHATSAPP_SOCKET, () => {
    console.log(`Serviço WhatsApp ouvindo no Socket Unix: ${WHATSAPP_SOCKET}`);
    notify.ready();
  });
};

const initializeWhatsappClient = () => {
  return new Promise((resolve, reject) => {
    if (clientInstance) {
      console.log('Client já inicializado. Retornando instância existente.');
      return resolve(clientInstance);
    }

    // Garante que o socket antigo seja removido se existir
    if (fs.existsSync(WHATSAPP_SOCKET)) {
      try {
        fs.unlinkSync(WHATSAPP_SOCKET);
        console.log(`Socket antigo removido: ${WHATSAPP_SOCKET}`);
      } catch (err) {
        console.error(`Erro ao remover socket antigo:`, err);
        return reject(err);
      }
    }

    cleanSessionFiles(); // Limpa os arquivos de sessão antes de iniciar

    const xpraid = child_process.spawn('xpra', ['id', DISPLAY]);
    xpraid.on('exit', (code) => {
      if (code !== 0) {
        clientStatus = 'error';
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
            executablePath: PUPPETEER_EXECUTABLE_PATH,
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
          clientStatus = 'qr_received';
          console.log(
            'QR RECEIVED',
            qrcode.toString(qr, { type: 'terminal', small: true })
          );
        });

        client.on('ready', async () => {
          console.log('Client is ready!');
          clientInstance = client;
          clientStatus = 'ready';
          resolve(client);
        });

        client.on('disconnected', (reason) => {
          console.log(
            'Client was disconnected (client.on("disconnected")):',
            reason
          );
          clientInstance = null;
          clientStatus = 'disconnected';
        });

        client.on('change_state', (state) => {
          console.log('State changed:', state);
        });
        client.on('auth_failure', (msg) => {
          console.error('AUTHENTICATION FAILURE:', msg);
          clientInstance = null;
          clientStatus = 'auth_failure';
        });

/*        
        // Listeners para fechar o navegador Puppeteer
        if (client.pupBrowser) {
          client.pupBrowser.on('close', () => {
            console.log(
              'Browser closed via Puppeteer event (pupBrowser.on("close"))'
            );
            clientStatus = 'disconnected';
            clientInstance = null;
          });

          client.pupBrowser.on('disconnected', () => {
            console.log(
              'Puppeteer browser disconnected (pupBrowser.on("disconnected"))'
            );
            clientStatus = 'disconnected';
            clientInstance = null;
          });

          client.pupBrowser.on('error', (err) => {
            console.error(
              'Puppeteer browser error (pupBrowser.on("error")):',
              err
            );
            clientStatus = 'error';
            clientInstance = null;
          });
        }
*/
        client.initialize();
      }
    });
    xpraid.on('error', (err) => {
      clientStatus = 'error';
      reject(new Error(`Erro ao executar 'xpra id': ${err.message}`));
    });
  });
};

// Inicia o cliente WhatsApp
initializeWhatsappClient()
  .then(() => {
    console.log(
      'Serviço WhatsApp iniciado e pronto para interagir via Socket Unix.'
    );
    socketServer();
  })
  .catch((err) => {
    console.error('Falha crítica ao iniciar o cliente WhatsApp:', err);
    process.exit(1);
  });

// Limpeza ao encerrar o processo
process.on('SIGINT', () => {
  console.log('Sinal SIGINT recebido, fechando servidor de socket.');
  server.close(() => {
    if (fs.existsSync(WHATSAPP_SOCKET)) {
      // Não precisa da verificação de plataforma aqui
      fs.unlinkSync(WHATSAPP_SOCKET);
      console.log('Socket Unix removido.');
    }
    if (clientInstance) {
      clientInstance
        .destroy()
        .then(() => {
          console.log('WhatsApp client destroyed.');
          process.exit(0);
        })
        .catch((err) => {
          console.error('Error destroying WhatsApp client:', err);
          process.exit(1);
        });
    } else {
      process.exit(0);
    }
  });
});

const clientFunctions = (client) => {
  const functions = Object.entries({
    message() {
      return this.sendMessage(...args);
    },
    fn2() {
      return this.fn2(...args);
    },
  }).reduce((acc, [key, fn]) => {
    acc[key] = fn.bind(client);
    return acc;
  }, {});
  return {
    ...functions,
    _getAll() {
      return Object.keys(functions);
    },
  };
};
