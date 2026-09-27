const activityService = require('../services/activityService');
const realtimeService = require('../services/realtimeService');

/**
 * Fetch paginated public activity feed
 */
const getFeed = async (req, res, next) => {
  try {
    const { eventId, action, targetResource, page, limit } = req.query;
    const result = await activityService.getActivityFeed({
      eventId,
      action,
      targetResource,
      page,
      limit,
    });
    return res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * SSE real-time activity stream
 * Supports global feed or specific event feed via '?eventId='
 */
const streamActivity = async (req, res) => {
  const { eventId } = req.query;
  const channel = eventId ? `activity:${eventId}` : 'activity:global';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  res.write(`event: CONNECTED\ndata: ${JSON.stringify({ message: 'Subscribed to activity stream', channel })}\n\n`);

  realtimeService.subscribe(channel, res);
};

module.exports = {
  getFeed,
  streamActivity,
};
