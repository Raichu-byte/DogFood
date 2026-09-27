const prisma = require('../db');
const realtimeService = require('./realtimeService');

class NotificationService {
  /**
   * Create a new notification for a user and stream via SSE in real-time
   */
  async createNotification({ userId, type, title, message, link = null, metadata = null }) {
    if (!userId || !type || !title || !message) {
      throw new Error('userId, type, title, and message are required to create a notification');
    }

    const metadataStr = typeof metadata === 'object' && metadata !== null ? JSON.stringify(metadata) : metadata;

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
        metadata: metadataStr,
      },
    });

    // Real-time broadcast to user's personal channel
    realtimeService.publish(`user:${userId}`, 'NOTIFICATION_RECEIVED', notification);

    return notification;
  }

  /**
   * Fetch paginated notifications for a user with unread count
   */
  async getUserNotifications(userId, { unreadOnly = false, page = 1, limit = 20 } = {}) {
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const where = {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page: Math.max(1, parseInt(page, 10)),
      totalPages: Math.ceil(total / take) || 1,
    };
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId) {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId, userId) {
    const existing = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!existing || existing.userId !== userId) {
      return null;
    }

    if (existing.isRead) {
      return existing;
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Notify user of state change
    realtimeService.publish(`user:${userId}`, 'NOTIFICATION_READ', {
      id: notificationId,
      unreadCount: await this.getUnreadCount(userId),
    });

    return updated;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId) {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    realtimeService.publish(`user:${userId}`, 'NOTIFICATIONS_ALL_READ', {
      count: result.count,
      unreadCount: 0,
    });

    return result;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId, userId) {
    const existing = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!existing || existing.userId !== userId) {
      return null;
    }

    const deleted = await prisma.notification.delete({
      where: { id: notificationId },
    });

    return deleted;
  }
}

module.exports = new NotificationService();
