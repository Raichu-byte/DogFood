const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const eventRoutes = require('./routes/eventRoutes');
const teamRoutes = require('./routes/teamRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const galleryRoutes = require('./routes/galleryRoutes');
const { uploadDir } = require('./utils/upload');

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

// Serve uploaded local media files
app.use('/uploads', express.static(uploadDir));

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/gallery', galleryRoutes);

// Serve frontend static files in production if dist exists
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

module.exports = app;
