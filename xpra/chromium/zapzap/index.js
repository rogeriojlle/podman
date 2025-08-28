const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const api = require('./api.js');

const {
  DATAPATH,
  DISPLAY,
  PUPPETEER_EXECUTABLE_PATH,
  DISPLAYSERVER_HOST,
  DISPLAYSERVER_PORT,
} = process.env;

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

// Função de espera ativa (loop de polling)
const waitForDisplay = () => {
  return new Promise((resolve) => {
    const checkConnection = () => {
      const socket = net.createConnection(
        parseInt(DISPLAYSERVER_PORT),
        DISPLAYSERVER_HOST,
        () => {
          socket.destroy();
          console.log('Display is ready!');
          resolve();
        }
      );
      socket.on('error', () => {
        console.log('Aguardando Display... Tentando novamente em 5 segundos.');
        setTimeout(checkConnection, 5000);
      });
    };
    checkConnection();
  });
};

const startClient = () => {
  return new Promise((resolve, reject) => {
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
//        '--no-zygote',
//        '--disable-features=site-per-process',
//        '--disable-features=IsolateOrigins',
//        '--disable-breakpad',
//        '--disable-sync',
          '--disable-print-preview',
          `--display=${DISPLAY}`,
        ],
      },
    });

    client.on('error', (err) => {
      console.error('Client error:', err);
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
        console.error('Puppeteer browser error (pupBrowser.on("error")):', err);
        clientStatus = 'error';
        clientInstance = null;
      });
    }
    client.initialize();
  });
};

// Limpa arquivos de sessão
cleanSessionFiles();

// Espera o display ficar pronto antes de iniciar o cliente
waitForDisplay().then(() => {
  startClient().then(() => {
    api({
      clientInstance,
      clientStatus,
    });
  });
});