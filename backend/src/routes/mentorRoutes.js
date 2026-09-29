const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');
const {
  getMentors,
  updateMentorProfile,
  createSupportTicket,
  getSupportTickets,
  getTicketById,
  claimSupportTicket,
  updateTicketStatus,
  getOfficeHours,
  createOfficeHourSlot,
  bookOfficeHourSlot,
  cancelOfficeHourSlot,
} = require('../controllers/mentorController');

// 1. Mentor Profiles & Directory
router.get('/mentors', optionalAuth, getMentors);
router.put('/mentors/profile', requireAuth, updateMentorProfile);

// 2. Technical Support Tickets Queue
router.post('/support/tickets', requireAuth, createSupportTicket);
router.get('/support/tickets', optionalAuth, getSupportTickets);
router.get('/support/tickets/:id', optionalAuth, getTicketById);
router.patch('/support/tickets/:id/claim', requireAuth, claimSupportTicket);
router.patch('/support/tickets/:id/status', requireAuth, updateTicketStatus);

// 3. Office Hours Scheduling
router.get('/mentors/office-hours', optionalAuth, getOfficeHours);
router.post('/mentors/office-hours', requireAuth, createOfficeHourSlot);
router.post('/mentors/office-hours/:id/book', requireAuth, bookOfficeHourSlot);
router.delete('/mentors/office-hours/:id/cancel', requireAuth, cancelOfficeHourSlot);

module.exports = router;
