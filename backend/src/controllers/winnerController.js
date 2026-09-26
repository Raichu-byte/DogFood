const prisma = require('../db');

/**
 * Assign winning projects to event prizes
 * POST /api/events/:idOrSlug/winners/assign
 * Protected: ORGANIZER, ADMIN
 */
async function assignWinners(req, res) {
  try {
    const { idOrSlug } = req.params;
    const { prizeAssignments } = req.body;

    if (!Array.isArray(prizeAssignments) || prizeAssignments.length === 0) {
      return res.status(400).json({
        error: 'Validation error: prizeAssignments must be a non-empty array of { prizeId, submissionId } objects.',
        code: 'VALIDATION_FAILED',
      });
    }

    // 1. Fetch event with existing prizes
    const event = await prisma.event.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug.toLowerCase() }],
      },
      include: {
        prizes: true,
      },
    });

    if (!event) {
      return res.status(404).json({
        error: 'Event not found.',
        code: 'EVENT_NOT_FOUND',
      });
    }

    if (req.user.role !== 'ADMIN' && event.organizerId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden: Only the event organizer or an admin can assign prize winners.',
        code: 'FORBIDDEN',
      });
    }

    // 2. Validate all prizeIds and submissionIds
    const validPrizeIds = new Set(event.prizes.map(p => p.id));
    for (const item of prizeAssignments) {
      if (!validPrizeIds.has(item.prizeId)) {
        return res.status(400).json({
          error: `Validation error: prizeId '${item.prizeId}' does not belong to this event.`,
          code: 'INVALID_PRIZE_ID',
        });
      }

      if (item.submissionId) {
        const sub = await prisma.submission.findUnique({
          where: { id: item.submissionId },
        });

        if (!sub || sub.eventId !== event.id || sub.isDraft) {
          return res.status(400).json({
            error: `Validation error: submissionId '${item.submissionId}' is not a valid published submission in this event.`,
            code: 'INVALID_SUBMISSION_ID',
          });
        }
      }
    }

    // 3. Atomically update prizes
    const updatedPrizes = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const item of prizeAssignments) {
        const updated = await tx.prize.update({
          where: { id: item.prizeId },
          data: {
            winningSubmissionId: item.submissionId || null,
          },
          include: {
            track: true,
            winningSubmission: {
              select: {
                id: true,
                title: true,
                team: { select: { id: true, name: true } },
              },
            },
          },
        });
        results.push(updated);
      }

      await tx.auditLog.create({
        data: {
          eventId: event.id,
          actorId: req.user.id,
          action: 'WINNERS_ASSIGNED',
          targetResource: 'Prize',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          metadata: JSON.stringify({ assignmentsCount: prizeAssignments.length }),
        },
      });

      return results;
    });

    return res.status(200).json({
      message: 'Winners assigned to prizes successfully.',
      prizes: updatedPrizes,
    });
  } catch (err) {
    console.error('[ASSIGN WINNERS ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error assigning winners.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Publish event results and winners publicly
 * POST /api/events/:idOrSlug/publish
 * Protected: ORGANIZER, ADMIN
 */
async function publishResults(req, res) {
  try {
    const { idOrSlug } = req.params;

    const event = await prisma.event.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug.toLowerCase() }],
      },
    });

    if (!event) {
      return res.status(404).json({
        error: 'Event not found.',
        code: 'EVENT_NOT_FOUND',
      });
    }

    if (req.user.role !== 'ADMIN' && event.organizerId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden: Only the event organizer or an admin can publish results.',
        code: 'FORBIDDEN',
      });
    }

    const updatedEvent = await prisma.event.update({
      where: { id: event.id },
      data: {
        status: 'PUBLISHED',
      },
    });

    await prisma.auditLog.create({
      data: {
        eventId: event.id,
        actorId: req.user.id,
        action: 'EVENT_RESULTS_PUBLISHED',
        targetResource: 'Event',
        targetId: event.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    return res.status(200).json({
      message: 'Event results and winners published successfully.',
      event: updatedEvent,
    });
  } catch (err) {
    console.error('[PUBLISH RESULTS ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error publishing event results.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Get all declared winners and prize distributions for an event
 * GET /api/events/:idOrSlug/winners
 * Public when event is PUBLISHED/FINALIZED, or restricted to ORGANIZER/ADMIN during draft
 */
async function getWinners(req, res) {
  try {
    const { idOrSlug } = req.params;

    const event = await prisma.event.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug.toLowerCase() }],
      },
      include: {
        prizes: {
          include: {
            track: true,
            winningSubmission: {
              select: {
                id: true,
                title: true,
                tagline: true,
                description: true,
                techStack: true,
                repoUrl: true,
                demoUrl: true,
                videoUrl: true,
                thumbnailUrl: true,
                team: {
                  select: {
                    id: true,
                    name: true,
                    members: {
                      select: {
                        role: true,
                        user: {
                          select: {
                            id: true,
                            name: true,
                            // NO email or passwordHash!
                          },
                        },
                      },
                    },
                  },
                },
                scoreSummary: {
                  select: {
                    rawScoreMean: true,
                    normalizedZScore: true,
                    communityVotesCount: true,
                  },
                },
              },
            },
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

    const isPublic = ['PUBLISHED', 'FINALIZED'].includes(event.status);
    const user = req.user;
    const isPrivileged = user && (user.role === 'ADMIN' || event.organizerId === user.id);

    if (!isPublic && !isPrivileged) {
      return res.status(403).json({
        error: 'Event winners have not been published yet.',
        code: 'WINNERS_NOT_PUBLISHED',
      });
    }

    // Format prizes with parsed techStack
    const prizes = event.prizes.map((p) => {
      let winningSub = null;
      if (p.winningSubmission) {
        let tech = [];
        try {
          tech = JSON.parse(p.winningSubmission.techStack);
        } catch (e) {
          tech = [];
        }
        winningSub = {
          ...p.winningSubmission,
          techStack: Array.isArray(tech) ? tech : [],
        };
      }

      return {
        id: p.id,
        title: p.title,
        amount: p.amount,
        description: p.description,
        track: p.track,
        winningSubmission: winningSub,
      };
    });

    return res.status(200).json({
      eventId: event.id,
      eventName: event.name,
      eventSlug: event.slug,
      status: event.status,
      prizes,
    });
  } catch (err) {
    console.error('[GET WINNERS ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error fetching event winners.',
      code: 'SERVER_ERROR',
    });
  }
}

module.exports = {
  assignWinners,
  publishResults,
  getWinners,
};
