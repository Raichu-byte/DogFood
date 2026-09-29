const prisma = require('../db');
const realtimeService = require('../services/realtimeService');
const notificationService = require('../services/notificationService');
const activityService = require('../services/activityService');

/**
 * 1. GET /api/bounties - List Bounties
 */
async function getBounties(req, res) {
  try {
    const { eventId, category, status, search } = req.query;

    const where = {};
    if (eventId) where.eventId = eventId;
    if (category) where.category = category;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sponsorName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const bounties = await prisma.bounty.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, role: true } },
        winnerSubmission: {
          include: {
            submitter: { select: { id: true, name: true, role: true, githubUsername: true } },
            team: { select: { id: true, name: true } }
          }
        },
        _count: {
          select: { submissions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      bounties: bounties.map(b => ({
        id: b.id,
        eventId: b.eventId,
        title: b.title,
        description: b.description,
        rewardAmount: b.rewardAmount,
        category: b.category,
        sponsorName: b.sponsorName || 'Community Bounty',
        sponsorLogo: b.sponsorLogo || null,
        requirements: b.requirements || '',
        status: b.status,
        deadline: b.deadline,
        submissionsCount: b._count.submissions,
        winner: b.winnerSubmission ? {
          submissionId: b.winnerSubmission.id,
          title: b.winnerSubmission.title,
          proofUrl: b.winnerSubmission.proofUrl,
          submitter: b.winnerSubmission.submitter,
          team: b.winnerSubmission.team,
        } : null,
        createdAt: b.createdAt,
      })),
      totalCount: bounties.length
    });
  } catch (error) {
    console.error('Error fetching bounties:', error);
    res.status(500).json({ error: 'Failed to retrieve bounties.' });
  }
}

/**
 * 2. GET /api/bounties/:id - Get Single Bounty
 */
async function getBountyById(req, res) {
  try {
    const { id } = req.params;

    const bounty = await prisma.bounty.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, role: true } },
        event: { select: { id: true, name: true, slug: true } },
        winnerSubmission: {
          include: {
            submitter: { select: { id: true, name: true, role: true } },
            team: { select: { id: true, name: true } }
          }
        },
        _count: {
          select: { submissions: true }
        }
      }
    });

    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found.' });
    }

    res.json({ bounty });
  } catch (error) {
    console.error('Error fetching bounty by ID:', error);
    res.status(500).json({ error: 'Failed to retrieve bounty.' });
  }
}

/**
 * 3. POST /api/bounties - Create Bounty
 */
async function createBounty(req, res) {
  try {
    const creatorId = req.user.id;
    const {
      eventId,
      title,
      description,
      rewardAmount,
      category,
      sponsorName,
      sponsorLogo,
      requirements,
      deadline
    } = req.body;

    if (!eventId || !title || !description || !rewardAmount) {
      return res.status(400).json({ error: 'eventId, title, description, and rewardAmount are required.' });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const bounty = await prisma.bounty.create({
      data: {
        eventId,
        creatorId,
        title: title.trim(),
        description: description.trim(),
        rewardAmount: rewardAmount.trim(),
        category: category || 'FEATURE',
        sponsorName: sponsorName?.trim() || null,
        sponsorLogo: sponsorLogo?.trim() || null,
        requirements: requirements ? (typeof requirements === 'object' ? JSON.stringify(requirements) : requirements) : null,
        deadline: deadline ? new Date(deadline) : null,
        status: 'OPEN',
      },
      include: {
        creator: { select: { id: true, name: true, role: true } }
      }
    });

    // Broadcast real-time event
    realtimeService.publish(`event:${eventId}`, 'BOUNTY_CREATED', bounty);

    // Audit log
    activityService.logActivity({
      eventId,
      actorId: creatorId,
      action: 'BOUNTY_CREATED',
      targetResource: 'Bounty',
      targetId: bounty.id,
      metadata: { title: bounty.title, rewardAmount: bounty.rewardAmount, category: bounty.category }
    }).catch(console.error);

    res.status(201).json({
      bounty,
      message: 'Bounty challenge published successfully.'
    });
  } catch (error) {
    console.error('Error creating bounty:', error);
    res.status(500).json({ error: 'Failed to create bounty.' });
  }
}

/**
 * 4. PUT /api/bounties/:id - Update Bounty
 */
async function updateBounty(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, description, rewardAmount, category, sponsorName, status, deadline } = req.body;

    const bounty = await prisma.bounty.findUnique({ where: { id } });
    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found.' });
    }

    const isAuthorized = bounty.creatorId === userId || ['ORGANIZER', 'ADMIN'].includes(req.user.role);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden. You cannot edit this bounty.' });
    }

    const updated = await prisma.bounty.update({
      where: { id },
      data: {
        title: title ? title.trim() : undefined,
        description: description ? description.trim() : undefined,
        rewardAmount: rewardAmount ? rewardAmount.trim() : undefined,
        category: category || undefined,
        sponsorName: sponsorName !== undefined ? sponsorName : undefined,
        status: status || undefined,
        deadline: deadline ? new Date(deadline) : undefined,
      }
    });

    res.json({
      bounty: updated,
      message: 'Bounty updated successfully.'
    });
  } catch (error) {
    console.error('Error updating bounty:', error);
    res.status(500).json({ error: 'Failed to update bounty.' });
  }
}

/**
 * 5. POST /api/bounties/:id/submit - Submit Work for Bounty
 */
async function submitBountyWork(req, res) {
  try {
    const bountyId = req.params.id;
    const submitterId = req.user.id;
    const { title, description, proofUrl, teamId } = req.body;

    if (!title || !description || !proofUrl) {
      return res.status(400).json({ error: 'title, description, and proofUrl are required.' });
    }

    const bounty = await prisma.bounty.findUnique({ where: { id: bountyId } });
    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found.' });
    }

    if (bounty.status !== 'OPEN') {
      return res.status(400).json({ error: `Cannot submit work to a bounty with status: ${bounty.status}` });
    }

    // Check duplicate submission
    const existing = await prisma.bountySubmission.findUnique({
      where: {
        bountyId_submitterId: {
          bountyId,
          submitterId
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'You have already submitted a solution for this bounty.' });
    }

    const submission = await prisma.bountySubmission.create({
      data: {
        bountyId,
        submitterId,
        teamId: teamId || null,
        title: title.trim(),
        description: description.trim(),
        proofUrl: proofUrl.trim(),
        status: 'PENDING'
      },
      include: {
        submitter: { select: { id: true, name: true, role: true } },
        team: { select: { id: true, name: true } }
      }
    });

    // Notify bounty creator
    notificationService.createNotification({
      userId: bounty.creatorId,
      type: 'BOUNTY_SUBMISSION_RECEIVED',
      title: 'New Bounty Submission',
      message: `${req.user.name} submitted a solution for "${bounty.title}".`,
      metadata: { bountyId, submissionId: submission.id }
    }).catch(console.error);

    realtimeService.publish(`event:${bounty.eventId}`, 'BOUNTY_SUBMITTED', {
      bountyId,
      submissionId: submission.id,
      submitterName: req.user.name
    });

    res.status(201).json({
      submission,
      message: 'Bounty solution submitted successfully.'
    });
  } catch (error) {
    console.error('Error submitting bounty work:', error);
    res.status(500).json({ error: 'Failed to submit bounty work.' });
  }
}

/**
 * 6. GET /api/bounties/:id/submissions - List Submissions for Bounty
 */
async function getBountySubmissions(req, res) {
  try {
    const bountyId = req.params.id;

    const bounty = await prisma.bounty.findUnique({ where: { id: bountyId } });
    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found.' });
    }

    const isPrivileged = req.user && (
      bounty.creatorId === req.user.id ||
      ['ORGANIZER', 'ADMIN', 'JUDGE', 'MENTOR'].includes(req.user.role)
    );

    const where = { bountyId };
    if (!isPrivileged && req.user) {
      where.submitterId = req.user.id;
    }

    const submissions = await prisma.bountySubmission.findMany({
      where,
      include: {
        submitter: { select: { id: true, name: true, role: true, githubUsername: true } },
        team: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      submissions,
      totalCount: submissions.length
    });
  } catch (error) {
    console.error('Error fetching bounty submissions:', error);
    res.status(500).json({ error: 'Failed to retrieve bounty submissions.' });
  }
}

/**
 * 7. PATCH /api/bounties/:id/submissions/:submissionId/review - Review and Award Bounty
 */
async function reviewBountySubmission(req, res) {
  try {
    const { id: bountyId, submissionId } = req.params;
    const { status, feedback } = req.body;
    const userId = req.user.id;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'status must be either APPROVED or REJECTED.' });
    }

    const bounty = await prisma.bounty.findUnique({ where: { id: bountyId } });
    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found.' });
    }

    const isAuthorized = bounty.creatorId === userId || ['ORGANIZER', 'ADMIN'].includes(req.user.role);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden. You cannot review submissions for this bounty.' });
    }

    const submission = await prisma.bountySubmission.findUnique({
      where: { id: submissionId },
      include: { submitter: true }
    });

    if (!submission || submission.bountyId !== bountyId) {
      return res.status(404).json({ error: 'Bounty submission not found.' });
    }

    const updatedSubmission = await prisma.bountySubmission.update({
      where: { id: submissionId },
      data: {
        status,
        feedback: feedback ? feedback.trim() : undefined,
      },
      include: {
        submitter: { select: { id: true, name: true, role: true } }
      }
    });

    // If APPROVED, mark bounty as AWARDED, link winner and grant reputation
    if (status === 'APPROVED') {
      await prisma.bounty.update({
        where: { id: bountyId },
        data: {
          status: 'AWARDED',
          winnerSubmissionId: submissionId
        }
      });

      const bountyPoints = 100;
      await prisma.user.update({
        where: { id: submission.submitterId },
        data: {
          reputationScore: { increment: bountyPoints }
        }
      });

      await prisma.reputationLog.create({
        data: {
          userId: submission.submitterId,
          points: bountyPoints,
          action: 'BOUNTY_CHAMPION',
          sourceId: bounty.id,
          description: `Won bounty challenge: "${bounty.title}" (${bounty.rewardAmount}) (+${bountyPoints} pts)`
        }
      });

      // Send congratulations in-app notification
      notificationService.createNotification({
        userId: submission.submitterId,
        type: 'BOUNTY_AWARDED',
        title: '🏆 Bounty Awarded to You!',
        message: `Your solution for "${bounty.title}" was approved! Reward: ${bounty.rewardAmount} (+${bountyPoints} reputation).`,
        metadata: { bountyId, rewardAmount: bounty.rewardAmount, points: bountyPoints }
      }).catch(console.error);

      realtimeService.publish(`event:${bounty.eventId}`, 'BOUNTY_AWARDED', {
        bountyId,
        bountyTitle: bounty.title,
        winnerName: submission.submitter.name,
        rewardAmount: bounty.rewardAmount
      });
    }

    res.json({
      submission: updatedSubmission,
      message: status === 'APPROVED' ? `Bounty awarded to ${submission.submitter.name}!` : 'Submission reviewed and rejected.'
    });
  } catch (error) {
    console.error('Error reviewing bounty submission:', error);
    res.status(500).json({ error: 'Failed to review bounty submission.' });
  }
}

module.exports = {
  getBounties,
  getBountyById,
  createBounty,
  updateBounty,
  submitBountyWork,
  getBountySubmissions,
  reviewBountySubmission,
};
