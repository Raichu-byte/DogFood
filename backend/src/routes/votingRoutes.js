const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const {
  castVote,
  retractVote,
  getMyVote,
  getVotingStats,
} = require('../controllers/votingController');

// Authenticated voting actions
router.post('/vote', requireAuth, castVote);
router.delete('/vote/:eventId', requireAuth, retractVote);
router.get('/my-vote', requireAuth, getMyVote);

// Organizer / Admin stats
router.get('/stats/:eventId', requireAuth, requireRole('ORGANIZER', 'ADMIN'), getVotingStats);

module.exports = router;
