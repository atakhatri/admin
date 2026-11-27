const express = require('express');
const { registerPortfolioRoutes } = require('../server/portfolioApi');
const { registerWeatherRoutes } = require('../server/weatherApi');

module.exports = function setupProxy(app) {
  app.use('/api', express.json({ limit: '1mb' }));
  registerPortfolioRoutes(app);
  registerWeatherRoutes(app);
};
