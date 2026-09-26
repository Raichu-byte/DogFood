const crypto = require('crypto');
const prisma = require('../db');

const MAX_TEAM_SIZE = 5;

/**
 * Generate cryptographically secure invite code
 */
function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. "A1B2C3D4"
}

/**
 * Create a new team in an event
 * POST /api/teams
 * Protected: Authenticated User
 */
async function createTeam(req, res) {
  try {
    const { eventId, name } = req.body;

    if (!eventId || !name) {
      return res.status(400).json({
        error: 'Validation error: eventId and team name are required.',
        code: 'VALIDATION_FAILED',
      });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      return res.status(400).json({
        error: 'Validation error: team name must be between 2 and 50 characters.',
        code: 'INVALID_TEAM_NAME',
      });
    }

    // Verify event exists and is active
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({
        error: 'Event not found.',
        code: 'EVENT_NOT_FOUND',
      });
    }

    if (['FINALIZED'].includes(event.status)) {
      return res.status(400).json({
        error: 'Cannot form teams for an event that has already concluded.',
        code: 'EVENT_CONCLUDED',
      });
    }

    // Check if submission deadline has passed
    if (new Date() > new Date(event.submissionDeadline)) {
      return res.status(400).json({
        error: 'Cannot form new teams after the submission deadline.',
        code: 'DEADLINE_PASSED',
      });
    }

    // Check if user is already a member of any team in this event
    const existingMembership = await prisma.teamMember.findFirst({
      where: {
        userId: req.user.id,
        team: { eventId },
      },
      include: { team: true },
    });

    if (existingMembership) {
      return res.status(400).json({
        error: `You are already a member of team "${existingMembership.team.name}" in this event.`,
        code: 'ALREADY_IN_ANOTHER_TEAM',
      });
    }

    // Check if team name is already taken in this event
    const existingName = await prisma.team.findUnique({
      where: {
        eventId_name: {
          eventId,
          name: trimmedName,
        },
      },
    });

    if (existingName) {
      return res.status(409).json({
        error: 'A team with this name already exists in this event.',
        code: 'TEAM_NAME_EXISTS',
      });
    }

    let inviteCode = generateInviteCode();
    // Ensure code uniqueness
    let attempts = 0;
    while (attempts < 5) {
      const collision = await prisma.team.findUnique({ where: { inviteCode } });
      if (!collision) break;
      inviteCode = generateInviteCode();
      attempts++;
    }

    // Transactionally create team and leader membership
    const newTeam = await prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          eventId,
          name: trimmedName,
          inviteCode,
          creatorId: req.user.id,
          members: {
            create: {
              userId: req.user.id,
              role: 'LEADER',
            },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, role: true },
              },
            },
          },
          event: {
            select: { id: true, name: true, slug: true, submissionDeadline: true },
          },
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          eventId,
          actorId: req.user.id,
          action: 'TEAM_CREATED',
          targetResource: 'Team',
          targetId: team.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          metadata: JSON.stringify({ name: team.name, inviteCode: team.inviteCode }),
        },
      });

      return team;
    });

    return res.status(201).json({
      message: 'Team created successfully.',
      team: newTeam,
    });
  } catch (err) {
    console.error('[TEAM CREATE ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error creating team.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Join a team via invite code
 * POST /api/teams/join
 * Protected: Authenticated User
 */
async function joinTeam(req, res) {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({
        error: 'Validation error: inviteCode is required.',
        code: 'VALIDATION_FAILED',
      });
    }

    const cleanCode = inviteCode.trim().toUpperCase();

    const team = await prisma.team.findUnique({
      where: { inviteCode: cleanCode },
      include: {
        members: true,
        event: true,
        submission: true,
      },
    });

    if (!team) {
      return res.status(404).json({
        error: 'Invalid or expired team invitation code.',
        code: 'INVALID_INVITE_CODE',
      });
    }

    // Check if event has concluded
    if (['FINALIZED'].includes(team.event.status)) {
      return res.status(400).json({
        error: 'Cannot join team for an event that has already concluded.',
        code: 'EVENT_CONCLUDED',
      });
    }

    // Check if team is full
    if (team.members.length >= MAX_TEAM_SIZE) {
      return res.status(400).json({
        error: `This team is full. Maximum team capacity is ${MAX_TEAM_SIZE} members.`,
        code: 'TEAM_FULL',
      });
    }

    // Check if user is already in this team
    const alreadyMember = team.members.some(m => m.userId === req.user.id);
    if (alreadyMember) {
      return res.status(400).json({
        error: 'You are already a member of this team.',
        code: 'ALREADY_TEAM_MEMBER',
      });
    }

    // Check if user is in another team in this event
    const inOtherTeam = await prisma.teamMember.findFirst({
      where: {
        userId: req.user.id,
        team: { eventId: team.eventId },
      },
      include: { team: true },
    });

    if (inOtherTeam) {
      return res.status(400).json({
        error: `You are already a member of team "${inOtherTeam.team.name}" in this event.`,
        code: 'ALREADY_IN_ANOTHER_TEAM',
      });
    }

    // Transactionally add member and log audit
    const updatedTeam = await prisma.$transaction(async (tx) => {
      await tx.teamMember.create({
        data: {
          teamId: team.id,
          userId: req.user.id,
          role: 'MEMBER',
        },
      });

      await tx.auditLog.create({
        data: {
          eventId: team.eventId,
          actorId: req.user.id,
          action: 'TEAM_JOINED',
          targetResource: 'Team',
          targetId: team.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          metadata: JSON.stringify({ teamName: team.name }),
        },
      });

      return await tx.team.findUnique({
        where: { id: team.id },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, role: true },
              },
            },
          },
          event: {
            select: { id: true, name: true, slug: true, submissionDeadline: true },
          },
          submission: true,
        },
      });
    });

    return res.status(200).json({
      message: `Successfully joined team "${updatedTeam.name}".`,
      team: updatedTeam,
    });
  } catch (err) {
    console.error('[TEAM JOIN ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error joining team.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Get current user's team for an event
 * GET /api/teams/my-team?eventId=...
 * Protected: Authenticated User
 */
async function getMyTeam(req, res) {
  try {
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({
        error: 'Validation error: eventId query parameter is required.',
        code: 'VALIDATION_FAILED',
      });
    }

    const membership = await prisma.teamMember.findFirst({
      where: {
        userId: req.user.id,
        team: { eventId },
      },
      include: {
        team: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, role: true },
                },
              },
            },
            submission: true,
            event: {
              select: { id: true, name: true, slug: true, submissionDeadline: true, status: true },
            },
          },
        },
      },
    });

    if (!membership) {
      return res.status(200).json({ team: null });
    }

    return res.status(200).json({ team: membership.team });
  } catch (err) {
    console.error('[TEAM GET_MY_TEAM ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error fetching your team.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Get team by ID
 * GET /api/teams/:id
 * Public / Protected
 */
async function getTeamById(req, res) {
  try {
    const { id } = req.params;

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        event: {
          select: { id: true, name: true, slug: true, submissionDeadline: true, status: true },
        },
        submission: {
          select: {
            id: true,
            title: true,
            tagline: true,
            isDraft: true,
            submittedAt: true,
            track: true,
          },
        },
      },
    });

    if (!team) {
      return res.status(404).json({
        error: 'Team not found.',
        code: 'TEAM_NOT_FOUND',
      });
    }

    return res.status(200).json({ team });
  } catch (err) {
    console.error('[TEAM GET_BY_ID ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error fetching team.',
      code: 'SERVER_ERROR',
    });
  }
}

module.exports = {
  createTeam,
  joinTeam,
  getMyTeam,
  getTeamById,
};
