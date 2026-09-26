const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

// Public health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'dogfood-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static files in production if dist exists
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

module.exports = app;
