const express = require('express');
const path = require('path');
const { registerPortfolioRoutes } = require('./server/portfolioApi');
const { registerWeatherRoutes } = require('./server/weatherApi');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));

registerPortfolioRoutes(app);
registerWeatherRoutes(app);

const buildDir = path.resolve(__dirname, 'build');
app.use(express.static(buildDir));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API route not found.' });
    return;
  }
  res.sendFile(path.join(buildDir, 'index.html'));
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (req.path.startsWith('/api/')) {
    const status = err && Number.isInteger(err.status) ? err.status : 500;
    res.status(status).json({
      error: status === 400 ? 'Malformed JSON request body.' : 'Internal API error.',
    });
    return;
  }
  next(err);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Aurora Command Hub server running on http://0.0.0.0:${PORT}`);
});
