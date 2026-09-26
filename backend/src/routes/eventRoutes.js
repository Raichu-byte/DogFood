const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// Public routes
router.get('/', eventController.listEvents);
router.get('/:idOrSlug', eventController.getEventBySlugOrId);

// Protected routes: Organizers and Admins
router.post('/', requireAuth, requireRole('ORGANIZER', 'ADMIN'), eventController.createEvent);
router.put('/:id', requireAuth, requireRole('ORGANIZER', 'ADMIN'), eventController.updateEvent);
router.delete('/:id', requireAuth, requireRole('ORGANIZER', 'ADMIN'), eventController.deleteEvent);

module.exports = router;
