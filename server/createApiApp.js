const express = require('express');
const { registerPortfolioRoutes } = require('./portfolioApi');
const { registerWeatherRoutes } = require('./weatherApi');

function registerApiRoutes(app, options = {}) {
  app.use(express.json({ limit: '1mb' }));

  const portfolio = registerPortfolioRoutes(app, options.portfolioDeps);
  registerWeatherRoutes(app);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  app.use('/api', (err, _req, res, next) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    const status = err && Number.isInteger(err.status) ? err.status : 500;
    res.status(status).json({
      error: status === 400 ? 'Malformed JSON request body.' : 'Internal API error.',
    });
  });

  return { portfolio };
}

function createApiApp(options = {}) {
  const app = express();
  registerApiRoutes(app, options);
  return app;
}

module.exports = {
  createApiApp,
  registerApiRoutes,
};
