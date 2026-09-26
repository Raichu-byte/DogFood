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
} = require('../controllers/judgingController');

// Judge personal queue (accessible by JUDGE, ORGANIZER, ADMIN)
router.get(
  '/my-assignments',
  requireAuth,
  requireRole('JUDGE', 'ORGANIZER', 'ADMIN'),
  getMyAssignments
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
