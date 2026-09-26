const prisma = require('../db');

/**
 * Cast a community vote for a project
 * POST /api/voting/vote
 * Protected: Authenticated Users
 */
async function castVote(req, res) {
  try {
    const { eventId, submissionId } = req.body;
    const voterId = req.user.id;

    if (!eventId || !submissionId) {
      return res.status(400).json({
        error: 'Validation error: eventId and submissionId are required.',
        code: 'VALIDATION_FAILED',
      });
    }

    // 1. Fetch event and submission
    const [event, submission] = await Promise.all([
      prisma.event.findUnique({ where: { id: eventId } }),
      prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
          team: {
            include: {
              members: true,
            },
          },
        },
      }),
    ]);

    if (!event) {
      return res.status(404).json({
        error: 'Event not found.',
        code: 'EVENT_NOT_FOUND',
      });
    }

    if (!submission || submission.eventId !== eventId || submission.isDraft) {
      return res.status(404).json({
        error: 'Published submission not found for this event.',
        code: 'SUBMISSION_NOT_FOUND',
      });
    }

    // 2. Deadline & Event status check
    const now = new Date();
    if (event.status === 'FINALIZED') {
      return res.status(403).json({
        error: 'Forbidden: Voting is locked because the event is finalized.',
        code: 'EVENT_FINALIZED',
      });
    }

    if (now > new Date(event.votingDeadline)) {
      return res.status(403).json({
        error: `Forbidden: Community voting deadline passed on ${event.votingDeadline.toISOString()}.`,
        code: 'VOTING_DEADLINE_PASSED',
      });
    }

    // 3. Self-Vote Prevention (Anti-Cheating)
    const isTeamMember = submission.team.members.some(m => m.userId === voterId);
    const isCreator = submission.team.creatorId === voterId;

    if (isTeamMember || isCreator) {
      return res.status(400).json({
        error: 'Anti-fraud rule: You cannot vote for your own team’s project.',
        code: 'SELF_VOTE_PROHIBITED',
      });
    }

    // 4. Atomic vote recording and summary count update
    const result = await prisma.$transaction(async (tx) => {
      // Check existing vote for this event
      const existingVote = await tx.communityVote.findUnique({
        where: {
          eventId_voterId: {
            eventId,
            voterId,
          },
        },
      });

      if (existingVote) {
        if (existingVote.submissionId === submissionId) {
          return {
            vote: existingVote,
            alreadyVotedSame: true,
          };
        }

        // Decrement count on previous submission
        await tx.communityVote.delete({
          where: { id: existingVote.id },
        });

        const prevCount = await tx.communityVote.count({
          where: { submissionId: existingVote.submissionId },
        });

        await tx.projectScoreSummary.upsert({
          where: { submissionId: existingVote.submissionId },
          update: { communityVotesCount: prevCount },
          create: {
            submissionId: existingVote.submissionId,
            communityVotesCount: prevCount,
          },
        });
      }

      // Create new vote
      const newVote = await tx.communityVote.create({
        data: {
          eventId,
          voterId,
          submissionId,
        },
        include: {
          submission: {
            select: { id: true, title: true },
          },
        },
      });

      // Recalculate and update current submission's vote count
      const newCount = await tx.communityVote.count({
        where: { submissionId },
      });

      await tx.projectScoreSummary.upsert({
        where: { submissionId },
        update: { communityVotesCount: newCount },
        create: {
          submissionId,
          communityVotesCount: newCount,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          eventId,
          actorId: voterId,
          action: 'COMMUNITY_VOTE_CAST',
          targetResource: 'CommunityVote',
          targetId: newVote.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          metadata: JSON.stringify({ submissionId }),
        },
      });

      return { vote: newVote, alreadyVotedSame: false };
    });

    return res.status(200).json({
      message: result.alreadyVotedSame
        ? 'You have already voted for this project.'
        : 'Community vote cast successfully.',
      vote: result.vote,
    });
  } catch (err) {
    console.error('[CAST VOTE ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error casting vote.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Retract an existing community vote
 * DELETE /api/voting/vote/:eventId
 * Protected: Authenticated Users
 */
async function retractVote(req, res) {
  try {
    const { eventId } = req.params;
    const voterId = req.user.id;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({
        error: 'Event not found.',
        code: 'EVENT_NOT_FOUND',
      });
    }

    const now = new Date();
    if (event.status === 'FINALIZED' || now > new Date(event.votingDeadline)) {
      return res.status(403).json({
        error: 'Forbidden: Voting is closed for this event.',
        code: 'VOTING_CLOSED',
      });
    }

    const existingVote = await prisma.communityVote.findUnique({
      where: {
        eventId_voterId: { eventId, voterId },
      },
    });

    if (!existingVote) {
      return res.status(404).json({
        error: 'No active vote found for this event.',
        code: 'VOTE_NOT_FOUND',
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.communityVote.delete({
        where: { id: existingVote.id },
      });

      const count = await tx.communityVote.count({
        where: { submissionId: existingVote.submissionId },
      });

      await tx.projectScoreSummary.upsert({
        where: { submissionId: existingVote.submissionId },
        update: { communityVotesCount: count },
        create: {
          submissionId: existingVote.submissionId,
          communityVotesCount: count,
        },
      });

      await tx.auditLog.create({
        data: {
          eventId,
          actorId: voterId,
          action: 'COMMUNITY_VOTE_RETRACTED',
          targetResource: 'CommunityVote',
          targetId: existingVote.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });
    });

    return res.status(200).json({
      message: 'Vote retracted successfully.',
    });
  } catch (err) {
    console.error('[RETRACT VOTE ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error retracting vote.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Get the current user's active vote in an event
 * GET /api/voting/my-vote
 * Protected: Authenticated Users
 */
async function getMyVote(req, res) {
  try {
    const { eventId } = req.query;
    const voterId = req.user.id;

    if (!eventId) {
      return res.status(400).json({
        error: 'Validation error: eventId query parameter is required.',
        code: 'VALIDATION_FAILED',
      });
    }

    const vote = await prisma.communityVote.findUnique({
      where: {
        eventId_voterId: { eventId, voterId },
      },
      include: {
        submission: {
          select: {
            id: true,
            title: true,
            tagline: true,
            team: { select: { name: true } },
          },
        },
      },
    });

    return res.status(200).json({
      vote: vote || null,
    });
  } catch (err) {
    console.error('[GET MY VOTE ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error fetching your vote.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Get voting stats and distribution for an event
 * GET /api/voting/stats/:eventId
 * Protected: ORGANIZER, ADMIN
 */
async function getVotingStats(req, res) {
  try {
    const { eventId } = req.params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({
        error: 'Event not found.',
        code: 'EVENT_NOT_FOUND',
      });
    }

    const votes = await prisma.communityVote.groupBy({
      by: ['submissionId'],
      where: { eventId },
      _count: { id: true },
      orderBy: {
        _count: { id: 'desc' },
      },
    });

    const totalVotes = votes.reduce((sum, v) => sum + v._count.id, 0);

    return res.status(200).json({
      eventId,
      totalVotes,
      submissionRankings: votes.map(v => ({
        submissionId: v.submissionId,
        votes: v._count.id,
      })),
    });
  } catch (err) {
    console.error('[GET VOTING STATS ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error fetching voting stats.',
      code: 'SERVER_ERROR',
    });
  }
}

module.exports = {
  castVote,
  retractVote,
  getMyVote,
  getVotingStats,
};
