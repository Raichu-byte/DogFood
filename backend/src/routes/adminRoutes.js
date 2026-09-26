const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// All admin routes require authentication
router.use(requireAuth);

// List users: accessible by ORGANIZER and ADMIN
router.get('/users', requireRole('ORGANIZER', 'ADMIN'), adminController.listUsers);

// Update user role: accessible by ORGANIZER and ADMIN (with role ceiling enforced in controller)
router.put('/users/:id/role', requireRole('ORGANIZER', 'ADMIN'), adminController.updateUserRole);

module.exports = router;
