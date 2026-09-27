const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const {
  createAnnouncement,
  getAnnouncements,
  getActiveBanner,
  toggleBannerActive,
  updateAnnouncement,
  deleteAnnouncement,
} = require('../controllers/announcementController');

// Event announcements & broadcast endpoints
router.post('/events/:eventIdOrSlug/announcements', requireAuth, createAnnouncement);
router.get('/events/:eventIdOrSlug/announcements', optionalAuth, getAnnouncements);
router.get('/events/:eventIdOrSlug/broadcasts/active-banner', optionalAuth, getActiveBanner);

// Single announcement & banner toggle moderation endpoints
router.put('/announcements/:announcementId/toggle-banner', requireAuth, toggleBannerActive);
router.put('/announcements/:announcementId', requireAuth, updateAnnouncement);
router.delete('/announcements/:announcementId', requireAuth, deleteAnnouncement);

module.exports = router;
