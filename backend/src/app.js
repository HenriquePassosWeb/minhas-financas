const express = require('express');
const cors = require('cors');
const { config } = require('./config/env');
const analiseRoutes = require('./routes/analiseRoutes');
const { errorHandler } = require('./middlewares/errorHandler');

function criarApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '1mb' }));

  // Health check para a plataforma de deploy (Render)
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api', analiseRoutes);

  // errorHandler SEMPRE por último
  app.use(errorHandler);

  return app;
}

module.exports = { criarApp };
