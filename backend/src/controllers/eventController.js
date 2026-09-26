const prisma = require('../db');

/**
 * List all events (Public)
 * GET /api/events
 */
async function listEvents(req, res) {
  try {
    const { status } = req.query;
    const where = {};

    if (status) {
      where.status = status.toUpperCase();
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        tracks: true,
        prizes: true,
        _count: {
          select: {
            submissions: true,
            teams: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ events });
  } catch (err) {
    console.error('[EVENT LIST ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error listing events.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Get event details by ID or Slug (Public)
 * GET /api/events/:idOrSlug
 */
async function getEventBySlugOrId(req, res) {
  try {
    const { idOrSlug } = req.params;

    const event = await prisma.event.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug.toLowerCase() }],
      },
      include: {
        tracks: true,
        prizes: true,
        rubricCriteria: {
          select: {
            id: true,
            name: true,
            description: true,
            weight: true,
            minScore: true,
            maxScore: true,
          },
        },
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            submissions: true,
            teams: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({
        error: 'Event not found.',
        code: 'EVENT_NOT_FOUND',
      });
    }

    return res.status(200).json({ event });
  } catch (err) {
    console.error('[EVENT GET_DETAILS ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error fetching event details.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Create a new event
 * POST /api/events
 * Protected: ORGANIZER, ADMIN
 */
async function createEvent(req, res) {
  try {
    const {
      name,
      slug,
      description,
      submissionDeadline,
      judgingDeadline,
      votingDeadline,
      status = 'ACTIVE',
      tracks = [],
      prizes = [],
      rubricCriteria = [],
    } = req.body;

    if (!name || !description || !submissionDeadline || !judgingDeadline || !votingDeadline) {
      return res.status(400).json({
        error: 'Validation error: name, description, and all three deadlines are required.',
        code: 'VALIDATION_FAILED',
      });
    }

    const subDate = new Date(submissionDeadline);
    const judgeDate = new Date(judgingDeadline);
    const voteDate = new Date(votingDeadline);

    if (isNaN(subDate.getTime()) || isNaN(judgeDate.getTime()) || isNaN(voteDate.getTime())) {
      return res.status(400).json({
        error: 'Validation error: one or more deadline timestamps are invalid.',
        code: 'INVALID_TIMESTAMP',
      });
    }

    // Chronological validation: submission < judging <= voting
    if (subDate >= judgeDate) {
      return res.status(400).json({
        error: 'Validation error: submission deadline must be strictly before judging deadline.',
        code: 'CHRONOLOGY_ERROR',
      });
    }

    if (judgeDate > voteDate) {
      return res.status(400).json({
        error: 'Validation error: judging deadline cannot be after voting deadline.',
        code: 'CHRONOLOGY_ERROR',
      });
    }

    const generatedSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')).toLowerCase();

    // Check slug uniqueness
    const existing = await prisma.event.findUnique({ where: { slug: generatedSlug } });
    if (existing) {
      return res.status(409).json({
        error: 'An event with this URL slug already exists.',
        code: 'SLUG_EXISTS',
      });
    }

    // Validate rubric weights sum to 1.0 if provided
    if (rubricCriteria.length > 0) {
      const totalWeight = rubricCriteria.reduce((sum, c) => sum + (parseFloat(c.weight) || 0), 0);
      if (Math.abs(totalWeight - 1.0) > 0.001) {
        return res.status(400).json({
          error: `Validation error: rubric criteria weights must sum to 1.0 (Current sum: ${totalWeight}).`,
          code: 'INVALID_RUBRIC_WEIGHTS',
        });
      }
    }

    // Transactional creation of event and nested tracks/prizes/rubrics
    const newEvent = await prisma.$transaction(async (tx) => {
      const created = await tx.event.create({
        data: {
          name,
          slug: generatedSlug,
          description,
          status: status.toUpperCase(),
          submissionDeadline: subDate,
          judgingDeadline: judgeDate,
          votingDeadline: voteDate,
          organizerId: req.user.id,
          tracks: {
            create: tracks.map(t => ({
              name: t.name,
              description: t.description || '',
            })),
          },
          prizes: {
            create: prizes.map(p => ({
              title: p.title,
              amount: p.amount,
              description: p.description || '',
            })),
          },
          rubricCriteria: {
            create: rubricCriteria.map(c => ({
              name: c.name,
              description: c.description || '',
              weight: parseFloat(c.weight),
              minScore: c.minScore ? parseFloat(c.minScore) : 1.0,
              maxScore: c.maxScore ? parseFloat(c.maxScore) : 10.0,
            })),
          },
        },
        include: {
          tracks: true,
          prizes: true,
          rubricCriteria: true,
        },
      });

      // Audit log entry
      await tx.auditLog.create({
        data: {
          eventId: created.id,
          actorId: req.user.id,
          action: 'EVENT_CREATED',
          targetResource: 'Event',
          targetId: created.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          metadata: JSON.stringify({ name: created.name, slug: created.slug }),
        },
      });

      return created;
    });

    return res.status(201).json({
      message: 'Event created successfully.',
      event: newEvent,
    });
  } catch (err) {
    console.error('[EVENT CREATE ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error creating event.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Update an existing event
 * PUT /api/events/:id
 * Protected: ORGANIZER (Owner), ADMIN
 */
async function updateEvent(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      status,
      submissionDeadline,
      judgingDeadline,
      votingDeadline,
    } = req.body;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return res.status(404).json({
        error: 'Event not found.',
        code: 'EVENT_NOT_FOUND',
      });
    }

    // Ownership check: must be the organizer who created it or ADMIN
    if (event.organizerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to update this event.',
        code: 'FORBIDDEN_EVENT_MUTATION',
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (status) updateData.status = status.toUpperCase();

    if (submissionDeadline) updateData.submissionDeadline = new Date(submissionDeadline);
    if (judgingDeadline) updateData.judgingDeadline = new Date(judgingDeadline);
    if (votingDeadline) updateData.votingDeadline = new Date(votingDeadline);

    // Validate updated dates if provided
    const sub = updateData.submissionDeadline || event.submissionDeadline;
    const judge = updateData.judgingDeadline || event.judgingDeadline;
    const vote = updateData.votingDeadline || event.votingDeadline;

    if (sub >= judge || judge > vote) {
      return res.status(400).json({
        error: 'Validation error: invalid chronological deadline ordering.',
        code: 'CHRONOLOGY_ERROR',
      });
    }

    const updatedEvent = await prisma.$transaction(async (tx) => {
      const updated = await tx.event.update({
        where: { id },
        data: updateData,
        include: {
          tracks: true,
          prizes: true,
          rubricCriteria: true,
        },
      });

      await tx.auditLog.create({
        data: {
          eventId: updated.id,
          actorId: req.user.id,
          action: 'EVENT_UPDATED',
          targetResource: 'Event',
          targetId: updated.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          metadata: JSON.stringify(updateData),
        },
      });

      return updated;
    });

    return res.status(200).json({
      message: 'Event updated successfully.',
      event: updatedEvent,
    });
  } catch (err) {
    console.error('[EVENT UPDATE ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error updating event.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Delete an event
 * DELETE /api/events/:id
 * Protected: ORGANIZER (Owner), ADMIN
 */
async function deleteEvent(req, res) {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      return res.status(404).json({
        error: 'Event not found.',
        code: 'EVENT_NOT_FOUND',
      });
    }

    if (event.organizerId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to delete this event.',
        code: 'FORBIDDEN_EVENT_MUTATION',
      });
    }

    await prisma.event.delete({ where: { id } });

    return res.status(200).json({
      message: 'Event deleted successfully.',
    });
  } catch (err) {
    console.error('[EVENT DELETE ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error deleting event.',
      code: 'SERVER_ERROR',
    });
  }
}

module.exports = {
  listEvents,
  getEventBySlugOrId,
  createEvent,
  updateEvent,
  deleteEvent,
};
