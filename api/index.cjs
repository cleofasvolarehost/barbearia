const serverless = require('serverless-http');
const app = require('../backend/src/app');

module.exports = (req, res) => {
  const handler = serverless(app);
  return handler(req, res);
};
