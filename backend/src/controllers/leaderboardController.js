const prisma = require('../db');

/**
 * Fetch event leaderboard with dynamic sorting (Z-score, raw, community), track filtering, and role-based visibility
 * GET /api/leaderboard/:eventIdOrSlug
 * Public when event is FINALIZED/PUBLISHED, or restricted to ORGANIZER/ADMIN during active judging
 */
async function getLeaderboard(req, res) {
  try {
    const { eventIdOrSlug } = req.params;
    const { mode = 'normalized', trackId, prizeId } = req.query;

    // 1. Fetch event
    const event = await prisma.event.findFirst({
      where: {
        OR: [
          { id: eventIdOrSlug },
          { slug: eventIdOrSlug.toLowerCase() },
        ],
      },
      include: {
        tracks: true,
        prizes: true,
      },
    });

    if (!event) {
      return res.status(404).json({
        error: 'Event not found.',
        code: 'EVENT_NOT_FOUND',
      });
    }

    // 2. Check visibility access:
    // If event is not yet FINALIZED or PUBLISHED, only ORGANIZER or ADMIN can view score rankings.
    const isPubliclyAvailable = ['FINALIZED', 'PUBLISHED'].includes(event.status);
    const user = req.user;
    const isPrivileged = user && (user.role === 'ADMIN' || event.organizerId === user.id);

    if (!isPubliclyAvailable && !isPrivileged) {
      return res.status(403).json({
        error: 'Leaderboard rankings are private until judging concludes and results are published.',
        code: 'LEADERBOARD_LOCKED',
        eventStatus: event.status,
      });
    }

    // 3. Build Submission query filters
    const where = {
      eventId: event.id,
      isDraft: false,
    };

    if (trackId) {
      where.trackId = trackId;
    }

    // If prizeId is provided, filter by prize's track if prize has one
    if (prizeId) {
      const prize = event.prizes.find(p => p.id === prizeId);
      if (prize && prize.trackId) {
        where.trackId = prize.trackId;
      }
    }

    // 4. Fetch submissions with score summaries and judge assignments
    const submissions = await prisma.submission.findMany({
      where,
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
        submittedAt: true,
        track: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
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
                    // Zero sensitive data leakage: NO email, passwordHash
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
            rank: true,
          },
        },
        _count: {
          select: {
            judgeAssignments: {
              where: { status: 'COMPLETED' },
            },
            communityVotes: true,
          },
        },
      },
    });

    // 5. Format and rank projects
    const rankedList = submissions.map((s) => {
      let tech = [];
      try {
        tech = JSON.parse(s.techStack);
      } catch (e) {
        tech = typeof s.techStack === 'string' ? s.techStack.split(',').map(item => item.trim()) : [];
      }

      const rawMean = s.scoreSummary?.rawScoreMean ?? 0.0;
      const zScore = s.scoreSummary?.normalizedZScore ?? 0.0;
      const votes = (s._count?.communityVotes && s._count.communityVotes > 0)
        ? s._count.communityVotes
        : (s.scoreSummary?.communityVotesCount ?? 0);
      const completedEvals = s._count?.judgeAssignments ?? 0;

      return {
        id: s.id,
        title: s.title,
        tagline: s.tagline,
        techStack: Array.isArray(tech) ? tech : [],
        repoUrl: s.repoUrl,
        demoUrl: s.demoUrl,
        videoUrl: s.videoUrl,
        thumbnailUrl: s.thumbnailUrl,
        track: s.track,
        team: s.team,
        scores: {
          normalizedZScore: zScore,
          rawScoreMean: rawMean,
          communityVotesCount: votes,
          evaluationsCount: completedEvals,
        },
      };
    });

    // 6. Sort according to requested mode with deterministic tie-breakers
    rankedList.sort((a, b) => {
      if (mode === 'raw') {
        const diff = b.scores.rawScoreMean - a.scores.rawScoreMean;
        if (Math.abs(diff) > 0.0001) return diff;
        // Secondary tie-breaker: Z-Score
        const zDiff = b.scores.normalizedZScore - a.scores.normalizedZScore;
        if (Math.abs(zDiff) > 0.0001) return zDiff;
      } else if (mode === 'community') {
        const diff = b.scores.communityVotesCount - a.scores.communityVotesCount;
        if (diff !== 0) return diff;
        // Secondary tie-breaker: Z-Score
        const zDiff = b.scores.normalizedZScore - a.scores.normalizedZScore;
        if (Math.abs(zDiff) > 0.0001) return zDiff;
      } else {
        // Default: Normalized Z-Score
        const diff = b.scores.normalizedZScore - a.scores.normalizedZScore;
        if (Math.abs(diff) > 0.0001) return diff;
        // Secondary tie-breaker: Raw score mean
        const rawDiff = b.scores.rawScoreMean - a.scores.rawScoreMean;
        if (Math.abs(rawDiff) > 0.0001) return rawDiff;
      }
      // Final tie-breaker: title alphabetical
      return a.title.localeCompare(b.title);
    });

    // Assign rank positions (1, 2, 3...)
    const finalLeaderboard = rankedList.map((item, index) => ({
      rank: index + 1,
      ...item,
    }));

    return res.status(200).json({
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        status: event.status,
      },
      rankingMode: mode,
      trackFilter: trackId || null,
      totalEntries: finalLeaderboard.length,
      leaderboard: finalLeaderboard,
    });
  } catch (err) {
    console.error('[GET LEADERBOARD ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error fetching leaderboard.',
      code: 'SERVER_ERROR',
    });
  }
}

module.exports = {
  getLeaderboard,
};
