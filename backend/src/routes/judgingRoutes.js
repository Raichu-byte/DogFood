const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const {
  assignRoundRobin,
  assignManual,
  removeAssignment,
  listAssignments,
  getMyAssignments,
  submitScores,
  getScoresByAssignment,
  normalizeScores,
  getJudgingStats,
} = require('../controllers/judgingController');

// Judge personal queue (accessible by JUDGE, ORGANIZER, ADMIN)
router.get(
  '/my-assignments',
  requireAuth,
  requireRole('JUDGE', 'ORGANIZER', 'ADMIN'),
  getMyAssignments
);

// Score submission and retrieval (accessible by JUDGE, ORGANIZER, ADMIN)
router.post(
  '/scores',
  requireAuth,
  requireRole('JUDGE', 'ORGANIZER', 'ADMIN'),
  submitScores
);

router.get(
  '/scores/:assignmentId',
  requireAuth,
  requireRole('JUDGE', 'ORGANIZER', 'ADMIN'),
  getScoresByAssignment
);

// Normalization and statistical metrics (accessible by ORGANIZER, ADMIN)
router.post(
  '/normalize',
  requireAuth,
  requireRole('ORGANIZER', 'ADMIN'),
  normalizeScores
);

router.get(
  '/stats/:eventId',
  requireAuth,
  requireRole('ORGANIZER', 'ADMIN'),
  getJudgingStats
);

// Admin & Organizer Management Routes
router.post(
  '/assign/round-robin',
  requireAuth,
  requireRole('ORGANIZER', 'ADMIN'),
  assignRoundRobin
);

router.post(
  '/assign/manual',
  requireAuth,
  requireRole('ORGANIZER', 'ADMIN'),
  assignManual
);

router.get(
  '/assignments',
  requireAuth,
  requireRole('ORGANIZER', 'ADMIN'),
  listAssignments
);

router.delete(
  '/assignments/:id',
  requireAuth,
  requireRole('ORGANIZER', 'ADMIN'),
  removeAssignment
);

module.exports = router;
