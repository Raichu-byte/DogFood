const express = require('express');
const router = express.Router();
const pollController = require('../controllers/pollController');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// Poll Queries
router.get('/polls', optionalAuth, pollController.getPolls);
router.get('/polls/:id', optionalAuth, pollController.getPollById);

// Poll Actions
router.post('/polls', requireAuth, pollController.createPoll);
router.post('/polls/:id/vote', requireAuth, pollController.votePoll);
router.patch('/polls/:id/close', requireAuth, pollController.closePoll);

module.exports = router;
