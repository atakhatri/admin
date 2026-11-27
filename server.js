const express = require('express');
const path = require('path');
const { registerApiRoutes } = require('./server/createApiApp');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

registerApiRoutes(app);

const buildDir = path.resolve(__dirname, 'build');
app.use(express.static(buildDir));

app.use((_req, res) => {
  res.sendFile(path.join(buildDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Admin Dashboard server running on http://0.0.0.0:${PORT}`);
});

