const http = require('http');
const url = require('url');
const {execSync} = require('child_process');

const campos = [
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
  'CPUUsageNanos'
];

const paraObjeto = (txt) => {
  const obj = campos.reduce((a, b) => ({...a, [b]: null}), {});
  
  txt.split('\n').map((linha) => {
    if(!linha) return;
    if(!linha.includes('=')) return;
    let [chave, valor] = linha.split(/=(.*)/s);
    if(!campos.includes(chave)) return;
    if (valor == '[not set]') valor = null;
    obj[chave] = valor;
  })
  return obj;
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const queryParams = parsedUrl.query;
  const {services} = queryParams;
  const loop = []

  services.split(',').map((service) => {
    loop.push(paraObjeto(execSync(`systemctl show ${service}`).toString())); 
  });

  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify(loop, null, 2));
});

server.listen(5678, () => {
  console.log('Server started');
});
