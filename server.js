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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Aurora Command Hub server running on http://0.0.0.0:${PORT}`);
});
