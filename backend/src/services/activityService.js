const prisma = require('../db');
const realtimeService = require('./realtimeService');

class ActivityService {
  /**
   * Log an activity and broadcast in real-time
   */
  async logActivity({
    eventId = null,
    actorId = null,
    action,
    targetResource,
    targetId = null,
    metadata = null,
    ipAddress = null,
    userAgent = null,
  }) {
    const metadataStr = typeof metadata === 'object' && metadata !== null ? JSON.stringify(metadata) : metadata;

    const log = await prisma.auditLog.create({
      data: {
        eventId,
        actorId,
        action,
        targetResource,
        targetId,
        metadata: metadataStr,
        ipAddress,
        userAgent,
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    const formatted = this.formatActivity(log);

    // Broadcast live to global and event activity channels
    realtimeService.publish('activity:global', 'ACTIVITY_LOGGED', formatted);
    if (eventId) {
      realtimeService.publish(`activity:${eventId}`, 'ACTIVITY_LOGGED', formatted);
    }

    return formatted;
  }

  /**
   * Format an audit log entry into a user-facing activity item
   */
  formatActivity(item) {
    let meta = {};
    if (item.metadata) {
      try {
        meta = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
      } catch (e) {
        meta = { raw: item.metadata };
      }
    }

    return {
      id: item.id,
      action: item.action,
      targetResource: item.targetResource,
      targetId: item.targetId,
      eventId: item.eventId,
      timestamp: item.timestamp,
      actor: item.actor ? {
        id: item.actor.id,
        name: item.actor.name,
        role: item.actor.role,
      } : { id: null, name: 'System', role: 'SYSTEM' },
      metadata: meta,
    };
  }

  /**
   * Get paginated activity feed with filtering
   */
  async getActivityFeed({ eventId = null, action = null, targetResource = null, page = 1, limit = 30 } = {}) {
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const where = {};
    if (eventId) where.eventId = eventId;
    if (action) where.action = action;
    if (targetResource) where.targetResource = targetResource;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      activities: logs.map((log) => this.formatActivity(log)),
      total,
      page: Math.max(1, parseInt(page, 10)),
      totalPages: Math.ceil(total / take) || 1,
    };
  }
}

module.exports = new ActivityService();
