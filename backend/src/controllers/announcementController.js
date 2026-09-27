const prisma = require('../db');
const realtimeService = require('../services/realtimeService');
const notificationService = require('../services/notificationService');
const activityService = require('../services/activityService');

const VALID_PRIORITIES = ['INFO', 'IMPORTANT', 'CRITICAL_ALERT'];
const VALID_AUDIENCES = ['ALL', 'ORGANIZERS_ONLY', 'JUDGES_ONLY', 'PARTICIPANTS_ONLY'];

/**
 * Sanitize author object to prevent leaking sensitive fields
 */
function sanitizeAuthor(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    role: user.role,
  };
}

/**
 * Helper to sanitize announcement payload
 */
function sanitizeAnnouncement(a) {
  return {
    id: a.id,
    eventId: a.eventId,
    title: a.title,
    content: a.content,
    priority: a.priority || 'INFO',
    targetAudience: a.targetAudience || 'ALL',
    isPinned: Boolean(a.isPinned),
    isBannerActive: Boolean(a.isBannerActive),
    expiresAt: a.expiresAt,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    author: sanitizeAuthor(a.author),
  };
}

/**
 * Create a new event broadcast announcement
 * POST /api/events/:eventIdOrSlug/announcements
 * Protected: Event ORGANIZER or ADMIN
 */
async function createAnnouncement(req, res) {
  try {
    const { eventIdOrSlug } = req.params;
    const {
      title,
      content,
      isPinned = false,
      priority = 'INFO',
      targetAudience = 'ALL',
      isBannerActive = false,
      expiresAt = null,
    } = req.body;
    const user = req.user;

    // Validation
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        error: 'Announcement title is required.',
        code: 'VALIDATION_FAILED',
      });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        error: 'Announcement content is required.',
        code: 'VALIDATION_FAILED',
      });
    }

    const cleanPriority = VALID_PRIORITIES.includes(priority) ? priority : 'INFO';
    const cleanAudience = VALID_AUDIENCES.includes(targetAudience) ? targetAudience : 'ALL';

    // Find event
    const event = await prisma.event.findFirst({
      where: {
        OR: [
          { id: eventIdOrSlug },
          { slug: eventIdOrSlug.toLowerCase() },
        ],
      },
    });

    if (!event) {
      return res.status(404).json({
        error: 'Event not found.',
        code: 'EVENT_NOT_FOUND',
      });
    }

    // Authorization: Only Organizer or Admin
    if (user.role !== 'ADMIN' && event.organizerId !== user.id) {
      return res.status(403).json({
        error: 'Forbidden: Only the event organizer or an admin can post announcements.',
        code: 'FORBIDDEN',
      });
    }

    // If this announcement is set as an active banner, deactivate existing active banners for this event
    if (isBannerActive) {
      await prisma.announcement.updateMany({
        where: { eventId: event.id, isBannerActive: true },
        data: { isBannerActive: false },
      });
    }

    const announcement = await prisma.announcement.create({
      data: {
        eventId: event.id,
        authorId: user.id,
        title: title.trim(),
        content: content.trim(),
        isPinned: Boolean(isPinned),
        priority: cleanPriority,
        targetAudience: cleanAudience,
        isBannerActive: Boolean(isBannerActive),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        author: true,
      },
    });

    const sanitized = sanitizeAnnouncement(announcement);

    // 1. Real-time SSE dispatch over event and global channels
    realtimeService.publish(`event:${event.id}`, 'ANNOUNCEMENT_CREATED', sanitized);
    realtimeService.publish('global:broadcasts', 'BROADCAST_CREATED', sanitized);

    // 2. Multi-channel Fan-out in-app notifications to target audience
    let audienceWhere = {};
    if (cleanAudience === 'ORGANIZERS_ONLY') {
      audienceWhere.role = { in: ['ORGANIZER', 'ADMIN'] };
    } else if (cleanAudience === 'JUDGES_ONLY') {
      audienceWhere.role = 'JUDGE';
    } else if (cleanAudience === 'PARTICIPANTS_ONLY') {
      audienceWhere.role = 'PARTICIPANT';
    }

    const targetUsers = await prisma.user.findMany({
      where: audienceWhere,
      select: { id: true },
      take: 1000,
    });

    // Asynchronously dispatch notifications without blocking response
    (async () => {
      for (const recipient of targetUsers) {
        if (recipient.id !== user.id) {
          try {
            await notificationService.createNotification({
              userId: recipient.id,
              type: cleanPriority === 'CRITICAL_ALERT' ? 'CRITICAL_ALERT' : 'ANNOUNCEMENT',
              title: `📢 ${cleanPriority === 'CRITICAL_ALERT' ? '[CRITICAL ALERT] ' : ''}${announcement.title}`,
              message: announcement.content.slice(0, 140),
              link: `/announcements`,
              metadata: { announcementId: announcement.id, priority: cleanPriority, eventId: event.id },
            });
          } catch (e) {
            // non-blocking
          }
        }
      }
    })();

    // 3. Activity Audit log
    await activityService.logActivity({
      eventId: event.id,
      actorId: user.id,
      action: 'ANNOUNCEMENT_CREATED',
      targetResource: 'Announcement',
      targetId: announcement.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: {
        title: announcement.title,
        priority: cleanPriority,
        targetAudience: cleanAudience,
        isBannerActive: announcement.isBannerActive,
        isPinned: announcement.isPinned,
      },
    });

    return res.status(201).json({
      message: 'Announcement broadcasted successfully.',
      announcement: sanitized,
    });
  } catch (err) {
    console.error('[CREATE ANNOUNCEMENT ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error creating announcement.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Fetch all announcements for an event (with priority & audience filtering)
 * GET /api/events/:eventIdOrSlug/announcements
 * Public
 */
async function getAnnouncements(req, res) {
  try {
    const { eventIdOrSlug } = req.params;
    const { priority, targetAudience } = req.query;

    const event = await prisma.event.findFirst({
      where: {
        OR: [
          { id: eventIdOrSlug },
          { slug: eventIdOrSlug.toLowerCase() },
        ],
      },
    });

    if (!event) {
      return res.status(404).json({
        error: 'Event not found.',
        code: 'EVENT_NOT_FOUND',
      });
    }

    const where = { eventId: event.id };
    if (priority && VALID_PRIORITIES.includes(priority)) {
      where.priority = priority;
    }
    if (targetAudience && VALID_AUDIENCES.includes(targetAudience)) {
      where.targetAudience = targetAudience;
    }

    const announcements = await prisma.announcement.findMany({
      where,
      include: {
        author: true,
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const sanitized = announcements.map(sanitizeAnnouncement);

    return res.status(200).json({
      eventId: event.id,
      eventSlug: event.slug,
      totalCount: sanitized.length,
      announcements: sanitized,
    });
  } catch (err) {
    console.error('[GET ANNOUNCEMENTS ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error fetching announcements.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Fetch active critical banner takeover for an event
 * GET /api/events/:eventIdOrSlug/broadcasts/active-banner
 * Public
 */
async function getActiveBanner(req, res) {
  try {
    const { eventIdOrSlug } = req.params;

    const event = await prisma.event.findFirst({
      where: {
        OR: [
          { id: eventIdOrSlug },
          { slug: eventIdOrSlug.toLowerCase() },
        ],
      },
    });

    if (!event) {
      return res.status(404).json({
        error: 'Event not found.',
        code: 'EVENT_NOT_FOUND',
      });
    }

    const banner = await prisma.announcement.findFirst({
      where: {
        eventId: event.id,
        isBannerActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        author: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      activeBanner: banner ? sanitizeAnnouncement(banner) : null,
    });
  } catch (err) {
    console.error('[GET ACTIVE BANNER ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error fetching active banner.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Toggle banner active state
 * PUT /api/announcements/:announcementId/toggle-banner
 * Protected: Event ORGANIZER or ADMIN
 */
async function toggleBannerActive(req, res) {
  try {
    const { announcementId } = req.params;
    const user = req.user;

    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: { event: true, author: true },
    });

    if (!announcement) {
      return res.status(404).json({
        error: 'Announcement not found.',
        code: 'ANNOUNCEMENT_NOT_FOUND',
      });
    }

    if (user.role !== 'ADMIN' && announcement.event.organizerId !== user.id) {
      return res.status(403).json({
        error: 'Forbidden: Only organizer or admin can toggle announcement banner state.',
        code: 'FORBIDDEN',
      });
    }

    const nextState = !announcement.isBannerActive;

    // If activating, deactivate other banners for same event
    if (nextState) {
      await prisma.announcement.updateMany({
        where: { eventId: announcement.eventId, isBannerActive: true },
        data: { isBannerActive: false },
      });
    }

    const updated = await prisma.announcement.update({
      where: { id: announcementId },
      data: { isBannerActive: nextState },
      include: { author: true },
    });

    const sanitized = sanitizeAnnouncement(updated);

    realtimeService.publish(`event:${announcement.eventId}`, 'BANNER_STATE_CHANGED', {
      activeBanner: nextState ? sanitized : null,
    });

    await activityService.logActivity({
      eventId: announcement.eventId,
      actorId: user.id,
      action: nextState ? 'BANNER_ACTIVATED' : 'BANNER_DEACTIVATED',
      targetResource: 'Announcement',
      targetId: announcement.id,
      metadata: { title: announcement.title, isBannerActive: nextState },
    });

    return res.status(200).json({
      message: `Banner ${nextState ? 'activated' : 'deactivated'} successfully.`,
      announcement: sanitized,
    });
  } catch (err) {
    console.error('[TOGGLE BANNER ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error toggling banner state.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Update an announcement
 * PUT /api/announcements/:announcementId
 * Protected: Event ORGANIZER or ADMIN
 */
async function updateAnnouncement(req, res) {
  try {
    const { announcementId } = req.params;
    const {
      title,
      content,
      isPinned,
      priority,
      targetAudience,
      isBannerActive,
      expiresAt,
    } = req.body;
    const user = req.user;

    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: {
        event: true,
        author: true,
      },
    });

    if (!announcement) {
      return res.status(404).json({
        error: 'Announcement not found.',
        code: 'ANNOUNCEMENT_NOT_FOUND',
      });
    }

    if (user.role !== 'ADMIN' && announcement.event.organizerId !== user.id) {
      return res.status(403).json({
        error: 'Forbidden: Only the event organizer or an admin can edit announcements.',
        code: 'FORBIDDEN',
      });
    }

    const updateData = {};
    if (title !== undefined && typeof title === 'string') updateData.title = title.trim();
    if (content !== undefined && typeof content === 'string') updateData.content = content.trim();
    if (isPinned !== undefined) updateData.isPinned = Boolean(isPinned);
    if (priority !== undefined && VALID_PRIORITIES.includes(priority)) updateData.priority = priority;
    if (targetAudience !== undefined && VALID_AUDIENCES.includes(targetAudience)) updateData.targetAudience = targetAudience;
    if (isBannerActive !== undefined) updateData.isBannerActive = Boolean(isBannerActive);
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;

    if (updateData.isBannerActive) {
      await prisma.announcement.updateMany({
        where: { eventId: announcement.eventId, isBannerActive: true, id: { not: announcementId } },
        data: { isBannerActive: false },
      });
    }

    const updated = await prisma.announcement.update({
      where: { id: announcementId },
      data: updateData,
      include: {
        author: true,
      },
    });

    const sanitized = sanitizeAnnouncement(updated);

    realtimeService.publish(`event:${updated.eventId}`, 'ANNOUNCEMENT_UPDATED', sanitized);

    return res.status(200).json({
      message: 'Announcement updated successfully.',
      announcement: sanitized,
    });
  } catch (err) {
    console.error('[UPDATE ANNOUNCEMENT ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error updating announcement.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Delete an announcement
 * DELETE /api/announcements/:announcementId
 * Protected: Event ORGANIZER or ADMIN
 */
async function deleteAnnouncement(req, res) {
  try {
    const { announcementId } = req.params;
    const user = req.user;

    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: {
        event: true,
      },
    });

    if (!announcement) {
      return res.status(404).json({
        error: 'Announcement not found.',
        code: 'ANNOUNCEMENT_NOT_FOUND',
      });
    }

    if (user.role !== 'ADMIN' && announcement.event.organizerId !== user.id) {
      return res.status(403).json({
        error: 'Forbidden: Only the event organizer or an admin can delete announcements.',
        code: 'FORBIDDEN',
      });
    }

    await prisma.announcement.delete({
      where: { id: announcementId },
    });

    realtimeService.publish(`event:${announcement.eventId}`, 'ANNOUNCEMENT_DELETED', {
      id: announcementId,
      eventId: announcement.eventId,
    });

    return res.status(200).json({
      message: 'Announcement deleted successfully.',
      announcementId,
    });
  } catch (err) {
    console.error('[DELETE ANNOUNCEMENT ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error deleting announcement.',
      code: 'SERVER_ERROR',
    });
  }
}

module.exports = {
  createAnnouncement,
  getAnnouncements,
  getActiveBanner,
  toggleBannerActive,
  updateAnnouncement,
  deleteAnnouncement,
};
