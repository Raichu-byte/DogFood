const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const { requireAuth } = require('../middleware/auth');

// Protected routes (require user login)
router.post('/', requireAuth, teamController.createTeam);
router.post('/join', requireAuth, teamController.joinTeam);
router.get('/my-team', requireAuth, teamController.getMyTeam);

// Public / Protected query
router.get('/:id', teamController.getTeamById);

module.exports = router;
