const express = require('express');
const router = express.Router();
const bountyController = require('../controllers/bountyController');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// List bounties & single bounty lookup
router.get('/bounties', optionalAuth, bountyController.getBounties);
router.get('/bounties/:id', optionalAuth, bountyController.getBountyById);

// Bounty CRUD
router.post('/bounties', requireAuth, bountyController.createBounty);
router.put('/bounties/:id', requireAuth, bountyController.updateBounty);

// Bounty Submissions
router.post('/bounties/:id/submit', requireAuth, bountyController.submitBountyWork);
router.get('/bounties/:id/submissions', optionalAuth, bountyController.getBountySubmissions);
router.patch('/bounties/:id/submissions/:submissionId/review', requireAuth, bountyController.reviewBountySubmission);

module.exports = router;
