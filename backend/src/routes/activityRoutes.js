const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');

// Activity feed REST API
router.get('/feed', activityController.getFeed);

// Activity feed SSE real-time stream
router.get('/stream', activityController.streamActivity);

module.exports = router;
