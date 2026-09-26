const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const { getLeaderboard } = require('../controllers/leaderboardController');

// Leaderboard query with optional authentication (for early organizer inspection)
router.get('/:eventIdOrSlug', optionalAuth, getLeaderboard);

module.exports = router;
