const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const {
  getHackers,
  updateProfile,
  getRecruitingTeams,
  updateTeamMatchmaking,
  applyToTeam,
  inviteHacker,
  getTeamRequests,
  getMyRequests,
  respondToRequest,
  cancelRequest,
} = require('../controllers/matchmakingController');

// 1. Hacker Directory
router.get('/matchmaking/hackers', optionalAuth, getHackers);
router.put('/matchmaking/profile', requireAuth, updateProfile);

// 2. Team Discovery & Recruitment
router.get('/matchmaking/teams', optionalAuth, getRecruitingTeams);
router.put('/matchmaking/teams/:teamId', requireAuth, updateTeamMatchmaking);

// 3. Applications & Invitations
router.post('/matchmaking/teams/:teamId/apply', requireAuth, applyToTeam);
router.post('/matchmaking/teams/:teamId/invite', requireAuth, inviteHacker);
router.get('/matchmaking/teams/:teamId/requests', requireAuth, getTeamRequests);
router.get('/matchmaking/my-requests', requireAuth, getMyRequests);
router.patch('/matchmaking/requests/:requestId/respond', requireAuth, respondToRequest);
router.delete('/matchmaking/requests/:requestId', requireAuth, cancelRequest);

module.exports = router;
