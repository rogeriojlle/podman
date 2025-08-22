const { error } = require('node:console');
const net = require('node:net');
const polka = require('polka');
const { WHATSAPP_SOCKET } = process.env;

const genId = () => Math.random().toString(36).slice(2);

const client = new net.Socket();
client.connect({ path: WHATSAPP_SOCKET }, () => {
  console.log('Conectado ao Socket Unix');
  client.on('data', (data) => {
    const {id, error, result} = JSON.parse(`${data}`);
    if (id) {
      const callback = fila[id];
      if (callback) {
        callback(error, result);
        delete fila[id];
      }
    }
  });
});
client.on('error', (err) => {
  console.error('Erro no Socket Unix:', err);
  process.exit(1);
});

const fila = {};
const enfileirar = ({method = null, args = []}, callback) => {
  const id = genId();
  fila[id] = callback;
  client.write(JSON.stringify({ id, method, args }));
  return id;
}


polka()
  .post('/message', (req, res) => {
    client.write(JSON.stringify(req.body));
    res.end();
  })
  .get('/', (req, res) => {
    enfileirar({method:'_getAll'}, (error, result) => {
      if (error) {
        res.statusCode = 500;
        res.end(error);
        return;
      }
      res.end(JSON.stringify(result));
    });
  })
  .listen(6789, () => {
    console.log(polka);
  });
