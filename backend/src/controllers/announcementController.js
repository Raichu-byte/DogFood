const prisma = require('../db');
const realtimeService = require('../services/realtimeService');

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
 * Create a new event announcement
 * POST /api/events/:eventIdOrSlug/announcements
 * Protected: Event ORGANIZER or ADMIN
 */
async function createAnnouncement(req, res) {
  try {
    const { eventIdOrSlug } = req.params;
    const { title, content, isPinned = false } = req.body;
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

    const announcement = await prisma.announcement.create({
      data: {
        eventId: event.id,
        authorId: user.id,
        title: title.trim(),
        content: content.trim(),
        isPinned: Boolean(isPinned),
      },
      include: {
        author: true,
      },
    });

    const sanitized = {
      id: announcement.id,
      eventId: announcement.eventId,
      title: announcement.title,
      content: announcement.content,
      isPinned: announcement.isPinned,
      createdAt: announcement.createdAt,
      updatedAt: announcement.updatedAt,
      author: sanitizeAuthor(announcement.author),
    };

    // Emit real-time notification
    realtimeService.publish(`event:${event.id}`, 'ANNOUNCEMENT_CREATED', sanitized);

    // Audit log
    await prisma.auditLog.create({
      data: {
        eventId: event.id,
        actorId: user.id,
        action: 'ANNOUNCEMENT_CREATED',
        targetResource: 'Announcement',
        targetId: announcement.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: JSON.stringify({ title: announcement.title, isPinned: announcement.isPinned }),
      },
    });

    return res.status(201).json({
      message: 'Announcement posted successfully.',
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
 * Fetch all announcements for an event
 * GET /api/events/:eventIdOrSlug/announcements
 * Public
 */
async function getAnnouncements(req, res) {
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

    const announcements = await prisma.announcement.findMany({
      where: { eventId: event.id },
      include: {
        author: true,
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const sanitized = announcements.map(a => ({
      id: a.id,
      eventId: a.eventId,
      title: a.title,
      content: a.content,
      isPinned: a.isPinned,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      author: sanitizeAuthor(a.author),
    }));

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
 * Update an announcement
 * PUT /api/announcements/:announcementId
 * Protected: Event ORGANIZER or ADMIN
 */
async function updateAnnouncement(req, res) {
  try {
    const { announcementId } = req.params;
    const { title, content, isPinned } = req.body;
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

    const updated = await prisma.announcement.update({
      where: { id: announcementId },
      data: updateData,
      include: {
        author: true,
      },
    });

    const sanitized = {
      id: updated.id,
      eventId: updated.eventId,
      title: updated.title,
      content: updated.content,
      isPinned: updated.isPinned,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      author: sanitizeAuthor(updated.author),
    };

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
  updateAnnouncement,
  deleteAnnouncement,
};
