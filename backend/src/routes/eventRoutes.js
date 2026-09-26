const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const winnerController = require('../controllers/winnerController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// Public routes
router.get('/', eventController.listEvents);
router.get('/:idOrSlug', eventController.getEventBySlugOrId);
router.get('/:idOrSlug/winners', optionalAuth, winnerController.getWinners);

// Protected routes: Organizers and Admins
router.post('/', requireAuth, requireRole('ORGANIZER', 'ADMIN'), eventController.createEvent);
router.put('/:id', requireAuth, requireRole('ORGANIZER', 'ADMIN'), eventController.updateEvent);
router.delete('/:id', requireAuth, requireRole('ORGANIZER', 'ADMIN'), eventController.deleteEvent);

// Winner declaration & result publishing
router.post(
  '/:idOrSlug/winners/assign',
  requireAuth,
  requireRole('ORGANIZER', 'ADMIN'),
  winnerController.assignWinners
);

router.post(
  '/:idOrSlug/publish',
  requireAuth,
  requireRole('ORGANIZER', 'ADMIN'),
  winnerController.publishResults
);

module.exports = router;
