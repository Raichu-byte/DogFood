const notificationService = require('../services/notificationService');
const realtimeService = require('../services/realtimeService');
const jwt = require('jsonwebtoken');

/**
 * List paginated notifications for current authenticated user
 */
const getNotifications = async (req, res, next) => {
  try {
    const { unreadOnly, page, limit } = req.query;
    const result = await notificationService.getUserNotifications(req.user.id, {
      unreadOnly: unreadOnly === 'true',
      page,
      limit,
    });
    return res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get quick unread count badge
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    return res.json({ unreadCount: count });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a single notification as read
 */
const markRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await notificationService.markAsRead(id, req.user.id);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found or unauthorized' });
    }
    return res.json(notification);
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all user notifications as read
 */
const markAllRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user.id);
    return res.json({ message: 'All notifications marked as read', count: result.count });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a notification
 */
const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await notificationService.deleteNotification(id, req.user.id);
    if (!result) {
      return res.status(404).json({ error: 'Notification not found or unauthorized' });
    }
    return res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * SSE real-time stream of notifications for authenticated user
 * Supports token via Header or query param '?token=' for EventSource compatibility
 */
const streamNotifications = async (req, res) => {
  let user = req.user;

  if (!user && req.query.token) {
    try {
      const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET || 'dogfood_jwt_secret_dev_key_2026_offline');
      user = decoded;
    } catch (e) {
      return res.status(401).json({ error: 'Invalid authentication token for event stream' });
    }
  }

  if (!user) {
    return res.status(401).json({ error: 'Authentication required for notification stream' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Send initial connection packet
  res.write(`event: CONNECTED\ndata: ${JSON.stringify({ message: 'Subscribed to user notifications', userId: user.id })}\n\n`);

  const channel = `user:${user.id}`;
  realtimeService.subscribe(channel, res);
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
  streamNotifications,
};
