const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const {
  getBadgeCatalog,
  getUserReputation,
  endorseUser,
  getReputationLeaderboard,
  awardBadgeManual,
  evaluateUserAchievements
} = require('../controllers/reputationController');

// 1. Public catalog and leaderboard
router.get('/reputation/badges', getBadgeCatalog);
router.get('/reputation/leaderboard', getReputationLeaderboard);

// 2. User reputation profiles
router.get('/reputation/me', requireAuth, (req, res, next) => {
  req.params.id = 'me';
  getUserReputation(req, res, next);
});
router.get('/users/:id/reputation', getUserReputation);

// 3. Peer Skill Endorsement
router.post('/users/:id/endorse', requireAuth, endorseUser);

// 4. Manual Badge Award (Admin / Organizer)
router.post(
  '/admin/badges/award',
  requireAuth,
  requireRole(['ORGANIZER', 'ADMIN']),
  awardBadgeManual
);

// 5. Evaluate achievements for logged in user
router.post('/reputation/evaluate', requireAuth, async (req, res) => {
  await evaluateUserAchievements(req.user.id);
  res.json({ message: 'Achievements evaluated.' });
});

module.exports = router;
