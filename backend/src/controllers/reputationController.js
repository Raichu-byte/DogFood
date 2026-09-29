const prisma = require('../db');
const realtimeService = require('../services/realtimeService');
const notificationService = require('../services/notificationService');
const activityService = require('../services/activityService');

// Standard badge definitions
const STANDARD_BADGES = [
  {
    slug: 'FIRST_SUBMISSION',
    name: 'Genesis Builder',
    description: 'Successfully shipped first tournament project submission.',
    icon: 'Layers',
    category: 'ACHIEVEMENT',
    tier: 'BRONZE',
    points: 50
  },
  {
    slug: 'PODIUM_FINISHER',
    name: 'Podium Champion',
    description: 'Secured a winning prize position in an official event.',
    icon: 'Trophy',
    category: 'ACHIEVEMENT',
    tier: 'GOLD',
    points: 200
  },
  {
    slug: 'DEMOCRACY_CHAMPION',
    name: 'Democracy Champion',
    description: 'Cast verified community votes during event voting window.',
    icon: 'Vote',
    category: 'COMMUNITY',
    tier: 'BRONZE',
    points: 25
  },
  {
    slug: 'SQUAD_CAPTAIN',
    name: 'Squad Captain',
    description: 'Founded and recruited teammates for a tournament squad.',
    icon: 'Users',
    category: 'COMMUNITY',
    tier: 'SILVER',
    points: 50
  },
  {
    slug: 'TRUSTED_BUILDER',
    name: 'Trusted Builder',
    description: 'Received 3 or more peer skill endorsements from verified builders.',
    icon: 'ShieldCheck',
    category: 'SPECIALTY',
    tier: 'SILVER',
    points: 75
  },
  {
    slug: 'ESTEEMED_JUDGE',
    name: 'Esteemed Evaluator',
    description: 'Completed 100% of assigned rubric scoring evaluations.',
    icon: 'Award',
    category: 'JUDGING',
    tier: 'GOLD',
    points: 150
  },
  {
    slug: 'CODE_PIONEER',
    name: 'Code Pioneer',
    description: 'Recognized for high-impact technical architecture and resilience.',
    icon: 'Sparkles',
    category: 'SPECIALTY',
    tier: 'PLATINUM',
    points: 300
  }
];

/**
 * Ensure standard badges are seeded in database
 */
async function ensureBadgesSeeded() {
  for (const b of STANDARD_BADGES) {
    await prisma.badge.upsert({
      where: { slug: b.slug },
      update: {},
      create: b
    });
  }
}

/**
 * Calculate user level and title from reputation score
 */
function calculateLevel(reputationScore) {
  if (reputationScore >= 600) return { level: 5, title: 'Grandmaster' };
  if (reputationScore >= 300) return { level: 4, title: 'Architect' };
  if (reputationScore >= 150) return { level: 3, title: 'Pioneer' };
  if (reputationScore >= 50) return { level: 2, title: 'Builder' };
  return { level: 1, title: 'Scout' };
}

/**
 * Award a badge to a user idempotently
 */
async function awardBadgeToUser(userId, badgeSlug, awardedBy = 'SYSTEM', metadata = {}) {
  await ensureBadgesSeeded();

  const badge = await prisma.badge.findUnique({
    where: { slug: badgeSlug }
  });
  if (!badge) return null;

  const existing = await prisma.userBadge.findUnique({
    where: {
      userId_badgeId: {
        userId,
        badgeId: badge.id
      }
    },
    include: {
      badge: true
    }
  });

  if (existing) return existing;

  const userBadge = await prisma.$transaction(async (tx) => {
    const created = await tx.userBadge.create({
      data: {
        userId,
        badgeId: badge.id,
        awardedBy,
        metadata: JSON.stringify(metadata)
      },
      include: {
        badge: true
      }
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        reputationScore: { increment: badge.points }
      }
    });

    await tx.reputationLog.create({
      data: {
        userId,
        points: badge.points,
        action: 'BADGE_EARNED',
        sourceId: badge.id,
        description: `Unlocked badge: ${badge.name} (+${badge.points} pts)`
      }
    });

    return created;
  });

  // Notify user asynchronously
  notificationService.createNotification({
    userId,
    type: 'BADGE_AWARDED',
    title: `Badge Unlocked: ${badge.name}`,
    message: `You earned the "${badge.name}" badge and +${badge.points} reputation points!`,
    metadata: { badgeSlug, points: badge.points }
  }).catch(err => console.error('[Notification error]', err));

  activityService.logActivity({
    actorId: userId,
    action: 'BADGE_AWARDED',
    targetResource: 'Badge',
    targetId: badge.id,
    metadata: { badgeSlug, badgeName: badge.name, points: badge.points }
  }).catch(err => console.error('[Activity log error]', err));

  realtimeService.publish('activity', 'ACTIVITY_LOGGED', {
    action: 'BADGE_AWARDED',
    userId,
    badgeName: badge.name
  });

  return userBadge;
}

/**
 * 1. GET /api/reputation/badges - Badge Catalog
 */
async function getBadgeCatalog(req, res) {
  try {
    await ensureBadgesSeeded();

    const badges = await prisma.badge.findMany({
      include: {
        _count: {
          select: { userBadges: true }
        }
      },
      orderBy: { points: 'asc' }
    });

    res.json({
      badges: badges.map(b => ({
        id: b.id,
        slug: b.slug,
        name: b.name,
        description: b.description,
        icon: b.icon,
        category: b.category,
        tier: b.tier,
        points: b.points,
        unlockedCount: b._count.userBadges
      }))
    });
  } catch (error) {
    console.error('Error fetching badge catalog:', error);
    res.status(500).json({ error: 'Failed to retrieve badge catalog.' });
  }
}

/**
 * 2. GET /api/users/:id/reputation (or /api/reputation/me)
 */
async function getUserReputation(req, res) {
  try {
    const targetUserId = req.params.id === 'me' ? req.user?.id : req.params.id;

    if (!targetUserId) {
      return res.status(400).json({ error: 'User ID is required.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        name: true,
        role: true,
        githubUsername: true,
        reputationScore: true,
        createdAt: true,
        userBadges: {
          include: { badge: true },
          orderBy: { awardedAt: 'desc' }
        },
        receivedEndorsements: {
          include: {
            sender: {
              select: { id: true, name: true, role: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        reputationLogs: {
          take: 15,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const levelInfo = calculateLevel(user.reputationScore);

    // Group skill endorsements
    const skillEndorsementCounts = {};
    for (const end of user.receivedEndorsements) {
      if (!skillEndorsementCounts[end.skill]) {
        skillEndorsementCounts[end.skill] = {
          skill: end.skill,
          count: 0,
          endorsers: []
        };
      }
      skillEndorsementCounts[end.skill].count += end.weight;
      skillEndorsementCounts[end.skill].endorsers.push({
        id: end.sender.id,
        name: end.sender.name,
        role: end.sender.role
      });
    }

    res.json({
      profile: {
        id: user.id,
        name: user.name,
        role: user.role,
        githubUsername: user.githubUsername,
        reputationScore: user.reputationScore,
        level: levelInfo.level,
        rankTitle: levelInfo.title,
        badgesCount: user.userBadges.length,
        badges: user.userBadges.map(ub => ({
          id: ub.badge.id,
          slug: ub.badge.slug,
          name: ub.badge.name,
          description: ub.badge.description,
          icon: ub.badge.icon,
          category: ub.badge.category,
          tier: ub.badge.tier,
          points: ub.badge.points,
          awardedAt: ub.awardedAt
        })),
        endorsements: Object.values(skillEndorsementCounts),
        recentLogs: user.reputationLogs
      }
    });
  } catch (error) {
    console.error('Error fetching user reputation:', error);
    res.status(500).json({ error: 'Failed to retrieve user reputation profile.' });
  }
}

/**
 * 3. POST /api/users/:id/endorse - Peer Trust Graph Endorsement
 */
async function endorseUser(req, res) {
  try {
    const senderId = req.user.id;
    const receiverId = req.params.id;
    const { skill, comment } = req.body;

    if (!skill || !skill.trim()) {
      return res.status(400).json({ error: 'Skill is required for endorsement.' });
    }

    if (senderId === receiverId) {
      return res.status(400).json({ error: 'You cannot endorse yourself.' });
    }

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId }
    });

    if (!receiver) {
      return res.status(404).json({ error: 'Recipient user not found.' });
    }

    const cleanSkill = skill.trim();

    // Check existing endorsement for this skill
    const existing = await prisma.endorsement.findUnique({
      where: {
        senderId_receiverId_skill: {
          senderId,
          receiverId,
          skill: cleanSkill
        }
      }
    });

    if (existing) {
      return res.status(400).json({ error: `You have already endorsed ${receiver.name} for ${cleanSkill}.` });
    }

    const endorsementPoints = 15;

    const endorsement = await prisma.$transaction(async (tx) => {
      const created = await tx.endorsement.create({
        data: {
          senderId,
          receiverId,
          skill: cleanSkill,
          comment: comment?.trim() || null,
          weight: 1
        },
        include: {
          sender: {
            select: { id: true, name: true, role: true }
          }
        }
      });

      await tx.user.update({
        where: { id: receiverId },
        data: {
          reputationScore: { increment: endorsementPoints }
        }
      });

      await tx.reputationLog.create({
        data: {
          userId: receiverId,
          points: endorsementPoints,
          action: 'PEER_ENDORSEMENT',
          sourceId: created.id,
          description: `Endorsed by ${req.user.name} for ${cleanSkill} (+${endorsementPoints} pts)`
        }
      });

      return created;
    });

    // Check if recipient now qualifies for TRUSTED_BUILDER badge (3+ endorsements)
    const totalEndorsements = await prisma.endorsement.count({
      where: { receiverId }
    });

    if (totalEndorsements >= 3) {
      await awardBadgeToUser(receiverId, 'TRUSTED_BUILDER', 'SYSTEM', { totalEndorsements });
    }

    // Send in-app notification
    notificationService.createNotification({
      userId: receiverId,
      type: 'ENDORSEMENT_RECEIVED',
      title: 'Peer Skill Endorsement Received',
      message: `${req.user.name} endorsed you for "${cleanSkill}"! (+${endorsementPoints} reputation)`,
      metadata: { senderId, skill: cleanSkill, points: endorsementPoints }
    }).catch(err => console.error('[Notification error]', err));

    activityService.logActivity({
      actorId: senderId,
      action: 'ENDORSEMENT_CREATED',
      targetResource: 'User',
      targetId: receiverId,
      metadata: { receiverId, receiverName: receiver.name, skill: cleanSkill }
    }).catch(err => console.error('[Activity error]', err));

    res.status(201).json({
      endorsement,
      pointsAwarded: endorsementPoints,
      message: `Successfully endorsed ${receiver.name} for ${cleanSkill}.`
    });
  } catch (error) {
    console.error('Error creating endorsement:', error);
    res.status(500).json({ error: 'Failed to create peer endorsement.' });
  }
}

/**
 * 4. GET /api/reputation/leaderboard - Top Reputed Builders
 */
async function getReputationLeaderboard(req, res) {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;

    const leaders = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        githubUsername: true,
        reputationScore: true,
        userBadges: {
          include: { badge: true },
          take: 5
        },
        _count: {
          select: {
            receivedEndorsements: true
          }
        }
      },
      orderBy: {
        reputationScore: 'desc'
      },
      take: limit
    });

    res.json({
      leaderboard: leaders.map((u, idx) => {
        const levelInfo = calculateLevel(u.reputationScore);
        return {
          rank: idx + 1,
          id: u.id,
          name: u.name,
          role: u.role,
          githubUsername: u.githubUsername,
          reputationScore: u.reputationScore,
          level: levelInfo.level,
          rankTitle: levelInfo.title,
          endorsementsCount: u._count.receivedEndorsements,
          topBadges: u.userBadges.map(ub => ({
            id: ub.badge.id,
            slug: ub.badge.slug,
            name: ub.badge.name,
            icon: ub.badge.icon,
            tier: ub.badge.tier
          }))
        };
      })
    });
  } catch (error) {
    console.error('Error fetching reputation leaderboard:', error);
    res.status(500).json({ error: 'Failed to retrieve reputation leaderboard.' });
  }
}

/**
 * 5. POST /api/admin/badges/award - Manual Badge Award (Admin/Organizer)
 */
async function awardBadgeManual(req, res) {
  try {
    const { userId, badgeSlug, reason } = req.body;

    if (!userId || !badgeSlug) {
      return res.status(400).json({ error: 'userId and badgeSlug are required.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'Target user not found.' });
    }

    const userBadge = await awardBadgeToUser(userId, badgeSlug, req.user.id, { reason });
    if (!userBadge) {
      return res.status(404).json({ error: `Badge with slug ${badgeSlug} not found.` });
    }

    res.status(201).json({
      userBadge,
      message: `Badge ${badgeSlug} awarded to ${user.name}.`
    });
  } catch (error) {
    console.error('Error awarding manual badge:', error);
    res.status(500).json({ error: 'Failed to award badge.' });
  }
}

/**
 * 6. Automated Trigger Evaluator (Can be invoked on actions or on demand)
 */
async function evaluateUserAchievements(userId) {
  try {
    // 1. Check submissions (FIRST_SUBMISSION)
    const submissionsCount = await prisma.submission.count({
      where: {
        team: {
          members: {
            some: { userId }
          }
        },
        status: { in: ['SUBMITTED', 'PUBLISHED'] }
      }
    });
    if (submissionsCount >= 1) {
      await awardBadgeToUser(userId, 'FIRST_SUBMISSION', 'SYSTEM');
    }

    // 2. Check community votes (DEMOCRACY_CHAMPION)
    const votesCount = await prisma.communityVote.count({
      where: { userId }
    });
    if (votesCount >= 1) {
      await awardBadgeToUser(userId, 'DEMOCRACY_CHAMPION', 'SYSTEM');
    }

    // 3. Check squad captain (SQUAD_CAPTAIN)
    const teamLeaderCount = await prisma.teamMember.count({
      where: { userId, role: 'LEADER' }
    });
    if (teamLeaderCount >= 1) {
      await awardBadgeToUser(userId, 'SQUAD_CAPTAIN', 'SYSTEM');
    }

    // 4. Check judge evaluation completed (ESTEEMED_JUDGE)
    const pendingAssignments = await prisma.judgeAssignment.count({
      where: { judgeId: userId, status: 'PENDING' }
    });
    const completedAssignments = await prisma.judgeAssignment.count({
      where: { judgeId: userId, status: 'COMPLETED' }
    });
    if (completedAssignments >= 1 && pendingAssignments === 0) {
      await awardBadgeToUser(userId, 'ESTEEMED_JUDGE', 'SYSTEM');
    }

    // 5. Check podium finish (PODIUM_FINISHER)
    const wonPrizes = await prisma.prize.count({
      where: {
        winnerSubmission: {
          team: {
            members: {
              some: { userId }
            }
          }
        }
      }
    });
    if (wonPrizes >= 1) {
      await awardBadgeToUser(userId, 'PODIUM_FINISHER', 'SYSTEM');
    }
  } catch (err) {
    console.error('[Error evaluating user achievements]', err);
  }
}

module.exports = {
  getBadgeCatalog,
  getUserReputation,
  endorseUser,
  getReputationLeaderboard,
  awardBadgeManual,
  evaluateUserAchievements,
  awardBadgeToUser,
  ensureBadgesSeeded
};
