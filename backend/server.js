require('dotenv').config();

const { config } = require('./src/config/env');
const { criarApp } = require('./src/app');

const app = criarApp();

app.listen(config.port, () => {
  console.log(`Servidor rodando na porta ${config.port} (${config.nodeEnv})`);
});
