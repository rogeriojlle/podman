const net = require('net');
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const client = new Client({
  puppeteer: {
    headless: false,
    args: ['--disable-gpu', '--mute-audio'],
  },
});

client.on('qr', (qr) => {
  // Generate and scan this code with your phone
  console.log('QR RECEIVED', qrcode.toString(qr));
});

client.on('ready', () => {
  console.log('Client is ready!');
});

client.on('message', (msg) => {
  if (msg.body == '!ping') {
    msg.reply('pong');
  }
});

client.initialize();

net
  .createServer((socket) => {
    socket.on('data', (data) => {
      console.log(JSON.parse(`${data}`));
    });
  })
  .listen(4000);
