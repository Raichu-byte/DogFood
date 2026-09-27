const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const {
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
} = require('../controllers/announcementController');

// Event announcements endpoints
router.post('/events/:eventIdOrSlug/announcements', requireAuth, createAnnouncement);
router.get('/events/:eventIdOrSlug/announcements', optionalAuth, getAnnouncements);

// Single announcement moderation endpoints
router.put('/announcements/:announcementId', requireAuth, updateAnnouncement);
router.delete('/announcements/:announcementId', requireAuth, deleteAnnouncement);

module.exports = router;
