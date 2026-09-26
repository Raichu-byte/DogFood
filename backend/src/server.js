require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`[DOGFOOD 2026] Server active on port ${PORT}`);
});

module.exports = server;
