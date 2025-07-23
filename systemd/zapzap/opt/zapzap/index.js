const url = require('node:url');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const { DATAPATH, DISPLAY } = process.env;

// Remove SingletonLock, SingletonSocket, SingletonCookie
// antes de iniciar o puppeteer
['SingletonLock', 'SingletonSocket', 'SingletonCookie'].forEach((file) => {
  fs.unlink(path.join(DATAPATH, 'session', file), (err) => {/*vida que segue*/});
});

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
      '--single-process',
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
  // Generate and scan this code with your phone
  console.log('QR RECEIVED', qrcode.toString(qr));
});

client.on('ready', () => {
  console.log('Client is ready!');
  client.pupBrowser.on('close', () => {
    console.log('Browser closed');
    process.exit();
  });
});

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const queryParams = parsedUrl.query;
  const { destino } = queryParams;

  await client.sendMessage(destino, `${new Date().toLocaleString()} essa mensagem é automatica`);

  res.writeHead(200, { 'content-type': 'application/text' });
  res.end(`enviado para ${destino}`);
});

server.listen(6789, () => {
  console.log('Server started');
});



globalThis.__client = client;

client.initialize();
