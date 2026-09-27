const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

// Real-time SSE stream (handles token query param or Bearer header)
router.get('/stream', notificationController.streamNotifications);

// Protected REST endpoints
router.get('/', requireAuth, notificationController.getNotifications);
router.get('/unread-count', requireAuth, notificationController.getUnreadCount);
router.patch('/:id/read', requireAuth, notificationController.markRead);
router.put('/read-all', requireAuth, notificationController.markAllRead);
router.delete('/:id', requireAuth, notificationController.deleteNotification);

module.exports = router;
