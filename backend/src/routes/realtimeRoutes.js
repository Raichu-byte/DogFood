const express = require('express');
const router = express.Router();
const realtimeService = require('../services/realtimeService');
const { optionalAuth } = require('../middleware/auth');

/**
 * Server-Sent Events (SSE) stream endpoint for local real-time live updates
 * GET /api/realtime/stream?channel=submission:XYZ or ?channel=event:ABC
 */
router.get('/realtime/stream', optionalAuth, (req, res) => {
  const { channel } = req.query;

  if (!channel || typeof channel !== 'string') {
    return res.status(400).json({
      error: 'Missing required query parameter: channel',
      code: 'VALIDATION_FAILED',
    });
  }

  // Set SSE response headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send initial connection event
  res.write(`event: CONNECTED\ndata: ${JSON.stringify({ channel, status: 'connected', time: new Date().toISOString() })}\n\n`);

  // Subscribe to channel
  realtimeService.subscribe(channel, res);
});

/**
 * Real-time connection diagnostic stats
 * GET /api/realtime/stats
 */
router.get('/realtime/stats', (req, res) => {
  res.status(200).json(realtimeService.getStats());
});

module.exports = router;
