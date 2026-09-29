const prisma = require('../db');
const realtimeService = require('../services/realtimeService');
const activityService = require('../services/activityService');

/**
 * Helper to compute vote statistics and format poll response
 */
function formatPoll(poll, userId = null) {
  const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votesCount || 0), 0);
  
  const userVotedOptionIds = [];
  if (userId && poll.votes) {
    poll.votes.forEach(v => {
      if (v.userId === userId) {
        userVotedOptionIds.push(v.optionId);
      }
    });
  }

  const optionsWithPercentages = poll.options
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(opt => ({
      id: opt.id,
      text: opt.text,
      order: opt.order,
      votesCount: opt.votesCount,
      percentage: totalVotes > 0 ? Math.round((opt.votesCount / totalVotes) * 100 * 10) / 10 : 0,
      hasUserVoted: userVotedOptionIds.includes(opt.id),
    }));

  return {
    id: poll.id,
    eventId: poll.eventId,
    question: poll.question,
    description: poll.description,
    category: poll.category,
    allowMultiple: poll.allowMultiple,
    status: poll.status,
    closesAt: poll.closesAt,
    creator: poll.creator,
    options: optionsWithPercentages,
    totalVotes,
    hasVoted: userVotedOptionIds.length > 0,
    userVotedOptionIds,
    createdAt: poll.createdAt,
    updatedAt: poll.updatedAt,
  };
}

/**
 * 1. GET /api/polls - List Polls for Event
 */
async function getPolls(req, res) {
  try {
    const { eventId, category, status, search } = req.query;
    const userId = req.user?.id || null;

    const where = {};
    if (eventId) where.eventId = eventId;
    if (category) where.category = category;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { question: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const polls = await prisma.poll.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, role: true } },
        options: true,
        votes: userId ? { where: { userId }, select: { optionId: true, userId: true } } : false,
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      polls: polls.map(p => formatPoll(p, userId)),
      totalCount: polls.length
    });
  } catch (error) {
    console.error('Error fetching polls:', error);
    res.status(500).json({ error: 'Failed to retrieve polls.' });
  }
}

/**
 * 2. GET /api/polls/:id - Get Single Poll by ID
 */
async function getPollById(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;

    const poll = await prisma.poll.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, name: true, role: true } },
        options: true,
        votes: userId ? { where: { userId }, select: { optionId: true, userId: true } } : false,
        event: { select: { id: true, name: true, slug: true } }
      }
    });

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found.' });
    }

    res.json({ poll: formatPoll(poll, userId) });
  } catch (error) {
    console.error('Error fetching poll by ID:', error);
    res.status(500).json({ error: 'Failed to retrieve poll.' });
  }
}

/**
 * 3. POST /api/polls - Create New Poll
 */
async function createPoll(req, res) {
  try {
    const creatorId = req.user.id;
    const {
      eventId,
      question,
      description,
      category,
      allowMultiple,
      options,
      closesAt
    } = req.body;

    if (!eventId || !question || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        error: 'eventId, question, and at least 2 options are required.'
      });
    }

    const cleanedOptions = options
      .map(o => (typeof o === 'string' ? o.trim() : o?.text?.trim()))
      .filter(Boolean);

    if (cleanedOptions.length < 2) {
      return res.status(400).json({ error: 'A minimum of 2 non-empty options must be provided.' });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // Create Poll and PollOptions in transaction
    const poll = await prisma.$transaction(async (tx) => {
      const createdPoll = await tx.poll.create({
        data: {
          eventId,
          creatorId,
          question: question.trim(),
          description: description?.trim() || null,
          category: category || 'GENERAL',
          allowMultiple: Boolean(allowMultiple),
          status: 'ACTIVE',
          closesAt: closesAt ? new Date(closesAt) : null,
          options: {
            create: cleanedOptions.map((text, idx) => ({
              text,
              order: idx,
              votesCount: 0
            }))
          }
        },
        include: {
          creator: { select: { id: true, name: true, role: true } },
          options: true,
        }
      });
      return createdPoll;
    });

    // Real-time broadcast
    realtimeService.publish(`event:${eventId}`, 'POLL_CREATED', formatPoll(poll, creatorId));

    // Audit log
    activityService.logActivity({
      eventId,
      actorId: creatorId,
      action: 'POLL_CREATED',
      targetResource: 'Poll',
      targetId: poll.id,
      metadata: { question: poll.question, category: poll.category }
    }).catch(console.error);

    res.status(201).json({
      poll: formatPoll(poll, creatorId),
      message: 'Community poll published successfully.'
    });
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({ error: 'Failed to create poll.' });
  }
}

/**
 * 4. POST /api/polls/:id/vote - Cast Vote on Poll
 */
async function votePoll(req, res) {
  try {
    const pollId = req.params.id;
    const userId = req.user.id;
    const { optionIds } = req.body;

    if (!optionIds || (Array.isArray(optionIds) && optionIds.length === 0)) {
      return res.status(400).json({ error: 'optionIds is required (string or array of strings).' });
    }

    const targetOptionIds = Array.isArray(optionIds) ? optionIds : [optionIds];

    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: true,
        votes: { where: { userId } }
      }
    });

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found.' });
    }

    if (poll.status !== 'ACTIVE') {
      return res.status(400).json({ error: `Cannot vote on a poll with status: ${poll.status}` });
    }

    if (poll.closesAt && new Date() > new Date(poll.closesAt)) {
      return res.status(400).json({ error: 'This poll has ended and is closed for voting.' });
    }

    // Check single vote vs multiple vote rules
    if (!poll.allowMultiple) {
      if (targetOptionIds.length > 1) {
        return res.status(400).json({ error: 'This poll only allows voting for a single option.' });
      }
      if (poll.votes.length > 0) {
        return res.status(400).json({ error: 'You have already voted on this poll.' });
      }
    } else {
      // For multi-vote polls, ensure user hasn't already voted on these specific options
      const existingOptionIds = poll.votes.map(v => v.optionId);
      const hasDuplicate = targetOptionIds.some(id => existingOptionIds.includes(id));
      if (hasDuplicate) {
        return res.status(400).json({ error: 'You have already voted for one or more of these options.' });
      }
    }

    // Verify valid option IDs belong to this poll
    const validPollOptionIds = new Set(poll.options.map(o => o.id));
    for (const optId of targetOptionIds) {
      if (!validPollOptionIds.has(optId)) {
        return res.status(400).json({ error: `Invalid option ID: ${optId}` });
      }
    }

    // Execute atomic vote transaction
    const pointsAwarded = 5;
    await prisma.$transaction(async (tx) => {
      // 1. Create PollVote entries
      for (const optId of targetOptionIds) {
        await tx.pollVote.create({
          data: {
            pollId,
            optionId: optId,
            userId,
          }
        });

        // 2. Increment votesCount on option
        await tx.pollOption.update({
          where: { id: optId },
          data: { votesCount: { increment: 1 } }
        });
      }

      // 3. Increment user reputation score by +5
      await tx.user.update({
        where: { id: userId },
        data: { reputationScore: { increment: pointsAwarded } }
      });

      // 4. Log reputation
      await tx.reputationLog.create({
        data: {
          userId,
          points: pointsAwarded,
          action: 'POLL_VOTER',
          sourceId: poll.id,
          description: `Participated in community poll: "${poll.question}" (+${pointsAwarded} pts)`
        }
      });
    });

    // Fetch updated poll with latest vote counts
    const updatedPoll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        creator: { select: { id: true, name: true, role: true } },
        options: true,
        votes: { where: { userId } }
      }
    });

    const formatted = formatPoll(updatedPoll, userId);

    // Real-time broadcast updated counts
    realtimeService.publish(`event:${poll.eventId}`, 'POLL_VOTED', {
      pollId,
      options: formatted.options,
      totalVotes: formatted.totalVotes,
      voterName: req.user.name
    });

    res.json({
      poll: formatted,
      pointsAwarded,
      message: `Vote recorded! You earned +${pointsAwarded} reputation points.`
    });
  } catch (error) {
    console.error('Error casting poll vote:', error);
    res.status(500).json({ error: 'Failed to record vote.' });
  }
}

/**
 * 5. PATCH /api/polls/:id/close - Close Poll
 */
async function closePoll(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const poll = await prisma.poll.findUnique({ where: { id } });
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found.' });
    }

    const isAuthorized = poll.creatorId === userId || ['ORGANIZER', 'ADMIN'].includes(req.user.role);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Forbidden. You cannot close this poll.' });
    }

    const updated = await prisma.poll.update({
      where: { id },
      data: { status: 'CLOSED' },
      include: {
        creator: { select: { id: true, name: true, role: true } },
        options: true,
        votes: { where: { userId } }
      }
    });

    const formatted = formatPoll(updated, userId);

    realtimeService.publish(`event:${poll.eventId}`, 'POLL_CLOSED', {
      pollId: id,
      question: poll.question
    });

    res.json({
      poll: formatted,
      message: 'Poll closed successfully.'
    });
  } catch (error) {
    console.error('Error closing poll:', error);
    res.status(500).json({ error: 'Failed to close poll.' });
  }
}

module.exports = {
  getPolls,
  getPollById,
  createPoll,
  votePoll,
  closePoll,
};
