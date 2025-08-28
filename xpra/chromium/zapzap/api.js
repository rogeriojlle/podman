const polka = require('polka');

const {CHROME_API_PORT} = process.env

const toJson = (obj) => {
  return JSON.stringify(obj);
}

/**
 * @param {{clientInstance: Client, clientStatus: string}} options
 * @return {http.Server}
 */
module.exports = ({clientInstance, clientStatus}) => {
  const app = polka()
    .post('/', (req, res) => {
      res.end(
        toJson({
          clientStatus,
        })
      );
    })
    .listen(CHROME_API_PORT, () => {
      console.log(`> Running on *:${CHROME_API_PORT}`);
    });
  return app
}