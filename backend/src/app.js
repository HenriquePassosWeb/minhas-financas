const path = require('path');
const express = require('express');
const cors = require('cors');
const { config } = require('./config/env');
const analiseRoutes = require('./routes/analiseRoutes');
const { errorHandler } = require('./middlewares/errorHandler');

// Raiz do frontend (dois níveis acima de src/): index.html, login.html, js/, css
const RAIZ_FRONTEND = path.resolve(__dirname, '..', '..');

function criarApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '1mb' }));

  // Health check para a plataforma de deploy (Render)
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // API
  app.use('/api', analiseRoutes);

  // Serve os arquivos estáticos do frontend (HTML, CSS, JS)
  app.use(express.static(RAIZ_FRONTEND));

  // Rota raiz: entrega a tela de login
  app.get('/', (req, res) => {
    res.sendFile(path.join(RAIZ_FRONTEND, 'login.html'));
  });

  // errorHandler SEMPRE por último
  app.use(errorHandler);

  return app;
}

module.exports = { criarApp };
