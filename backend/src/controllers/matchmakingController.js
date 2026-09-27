const prisma = require('../db');
const realtimeService = require('../services/realtimeService');

/**
 * Sanitize hacker profile for public display
 */
function sanitizeHacker(user) {
  if (!user) return null;
  let skills = [];
  try {
    skills = user.skills ? JSON.parse(user.skills) : [];
  } catch (e) {
    skills = typeof user.skills === 'string' ? user.skills.split(',').map(s => s.trim()) : [];
  }

  let rolesSeeking = [];
  try {
    rolesSeeking = user.rolesSeeking ? JSON.parse(user.rolesSeeking) : [];
  } catch (e) {
    rolesSeeking = typeof user.rolesSeeking === 'string' ? user.rolesSeeking.split(',').map(r => r.trim()) : [];
  }

  return {
    id: user.id,
    name: user.name,
    role: user.role,
    bio: user.bio || '',
    githubUsername: user.githubUsername || '',
    portfolioUrl: user.portfolioUrl || '',
    skills: Array.isArray(skills) ? skills : [],
    lookingForTeam: Boolean(user.lookingForTeam),
    rolesSeeking: Array.isArray(rolesSeeking) ? rolesSeeking : [],
    createdAt: user.createdAt,
  };
}

/**
 * Sanitize team matchmaking entry
 */
function sanitizeTeamMatchmaking(team) {
  if (!team) return null;
  let skillsNeeded = [];
  try {
    skillsNeeded = team.skillsNeeded ? JSON.parse(team.skillsNeeded) : [];
  } catch (e) {
    skillsNeeded = typeof team.skillsNeeded === 'string' ? team.skillsNeeded.split(',').map(s => s.trim()) : [];
  }

  let openRoles = [];
  try {
    openRoles = team.openRoles ? JSON.parse(team.openRoles) : [];
  } catch (e) {
    openRoles = typeof team.openRoles === 'string' ? team.openRoles.split(',').map(r => r.trim()) : [];
  }

  return {
    id: team.id,
    eventId: team.eventId,
    name: team.name,
    description: team.description || '',
    isLookingForMembers: Boolean(team.isLookingForMembers),
    skillsNeeded: Array.isArray(skillsNeeded) ? skillsNeeded : [],
    openRoles: Array.isArray(openRoles) ? openRoles : [],
    maxMembers: team.maxMembers || 5,
    membersCount: team.members ? team.members.length : 0,
    members: (team.members || []).map(m => ({
      userId: m.userId,
      name: m.user ? m.user.name : '',
      role: m.role,
      joinedAt: m.joinedAt,
    })),
    event: team.event ? {
      id: team.event.id,
      name: team.event.name,
      slug: team.event.slug,
    } : null,
  };
}

/**
 * 1. Hacker Directory
 * GET /api/matchmaking/hackers
 * Public
 */
async function getHackers(req, res) {
  try {
    const { search, skill, lookingForTeam } = req.query;

    const where = {};
    if (lookingForTeam !== undefined) {
      where.lookingForTeam = lookingForTeam === 'true' || lookingForTeam === true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } },
        { githubUsername: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    let results = users.map(sanitizeHacker);

    if (skill) {
      const lowerSkill = skill.toLowerCase();
      results = results.filter(u => u.skills.some(s => s.toLowerCase().includes(lowerSkill)));
    }

    return res.status(200).json({
      totalCount: results.length,
      hackers: results,
    });
  } catch (err) {
    console.error('[GET HACKERS ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error fetching hacker directory.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * 2. Update Profile & Skills
 * PUT /api/matchmaking/profile
 * Protected
 */
async function updateProfile(req, res) {
  try {
    const user = req.user;
    const { bio, githubUsername, portfolioUrl, skills, lookingForTeam, rolesSeeking } = req.body;

    const updateData = {};
    if (bio !== undefined) updateData.bio = typeof bio === 'string' ? bio.trim() : '';
    if (githubUsername !== undefined) updateData.githubUsername = typeof githubUsername === 'string' ? githubUsername.trim() : '';
    if (portfolioUrl !== undefined) updateData.portfolioUrl = typeof portfolioUrl === 'string' ? portfolioUrl.trim() : '';
    if (lookingForTeam !== undefined) updateData.lookingForTeam = Boolean(lookingForTeam);

    if (skills !== undefined) {
      updateData.skills = Array.isArray(skills) ? JSON.stringify(skills) : JSON.stringify([skills]);
    }

    if (rolesSeeking !== undefined) {
      updateData.rolesSeeking = Array.isArray(rolesSeeking) ? JSON.stringify(rolesSeeking) : JSON.stringify([rolesSeeking]);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return res.status(200).json({
      message: 'Profile updated successfully.',
      profile: sanitizeHacker(updatedUser),
    });
  } catch (err) {
    console.error('[UPDATE PROFILE ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error updating profile.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * 3. Discover Recruiting Teams
 * GET /api/matchmaking/teams
 * Public
 */
async function getRecruitingTeams(req, res) {
  try {
    const { eventId, search, skill, isLookingForMembers } = req.query;

    const where = {};
    if (eventId) where.eventId = eventId;
    if (isLookingForMembers !== undefined) {
      where.isLookingForMembers = isLookingForMembers === 'true' || isLookingForMembers === true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const teams = await prisma.team.findMany({
      where,
      include: {
        event: { select: { id: true, name: true, slug: true } },
        members: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    let results = teams.map(sanitizeTeamMatchmaking);

    if (skill) {
      const lowerSkill = skill.toLowerCase();
      results = results.filter(t => t.skillsNeeded.some(s => s.toLowerCase().includes(lowerSkill)));
    }

    return res.status(200).json({
      totalCount: results.length,
      teams: results,
    });
  } catch (err) {
    console.error('[GET RECRUITING TEAMS ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error fetching recruiting teams.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * 4. Update Team Matchmaking & Open Roles
 * PUT /api/matchmaking/teams/:teamId
 * Protected: Team Leader or ADMIN
 */
async function updateTeamMatchmaking(req, res) {
  try {
    const { teamId } = req.params;
    const user = req.user;
    const { description, isLookingForMembers, skillsNeeded, openRoles, maxMembers } = req.body;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    });

    if (!team) {
      return res.status(404).json({
        error: 'Team not found.',
        code: 'TEAM_NOT_FOUND',
      });
    }

    // Role check: Creator/Leader or Admin
    const isLeader = team.creatorId === user.id || team.members.some(m => m.userId === user.id && m.role === 'LEADER');
    if (user.role !== 'ADMIN' && !isLeader) {
      return res.status(403).json({
        error: 'Forbidden: Only the team leader can configure team matchmaking.',
        code: 'FORBIDDEN',
      });
    }

    const updateData = {};
    if (description !== undefined) updateData.description = typeof description === 'string' ? description.trim() : '';
    if (isLookingForMembers !== undefined) updateData.isLookingForMembers = Boolean(isLookingForMembers);
    if (maxMembers !== undefined) updateData.maxMembers = Math.max(1, parseInt(maxMembers, 10) || 5);

    if (skillsNeeded !== undefined) {
      updateData.skillsNeeded = Array.isArray(skillsNeeded) ? JSON.stringify(skillsNeeded) : JSON.stringify([skillsNeeded]);
    }

    if (openRoles !== undefined) {
      updateData.openRoles = Array.isArray(openRoles) ? JSON.stringify(openRoles) : JSON.stringify([openRoles]);
    }

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: updateData,
      include: {
        event: true,
        members: { include: { user: true } },
      },
    });

    return res.status(200).json({
      message: 'Team recruitment settings updated.',
      team: sanitizeTeamMatchmaking(updatedTeam),
    });
  } catch (err) {
    console.error('[UPDATE TEAM MATCHMAKING ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error updating team settings.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * 5. Hacker Applies to Join Team
 * POST /api/matchmaking/teams/:teamId/apply
 * Protected
 */
async function applyToTeam(req, res) {
  try {
    const { teamId } = req.params;
    const { message, role } = req.body;
    const user = req.user;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        event: true,
        members: true,
      },
    });

    if (!team) {
      return res.status(404).json({
        error: 'Team not found.',
        code: 'TEAM_NOT_FOUND',
      });
    }

    // Check if team is recruiting
    if (!team.isLookingForMembers) {
      return res.status(400).json({
        error: 'This team is not currently accepting new members.',
        code: 'TEAM_NOT_RECRUITING',
      });
    }

    // Check team capacity
    if (team.members.length >= (team.maxMembers || 5)) {
      return res.status(400).json({
        error: 'This team has reached its maximum member capacity.',
        code: 'TEAM_FULL',
      });
    }

    // Check if user is already a member of this team or another team in this event
    const existingMembership = await prisma.teamMember.findFirst({
      where: {
        userId: user.id,
        team: { eventId: team.eventId },
      },
      include: { team: true },
    });

    if (existingMembership) {
      return res.status(400).json({
        error: `You are already a member of team "${existingMembership.team.name}" for this event.`,
        code: 'ALREADY_IN_A_TEAM',
      });
    }

    // Check if pending request already exists
    const existingRequest = await prisma.joinRequest.findFirst({
      where: {
        teamId,
        userId: user.id,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      return res.status(409).json({
        error: 'You already have a pending request for this team.',
        code: 'REQUEST_ALREADY_PENDING',
      });
    }

    const requestObj = await prisma.joinRequest.create({
      data: {
        teamId,
        userId: user.id,
        type: 'APPLICATION',
        status: 'PENDING',
        message: message ? message.trim() : null,
        role: role ? role.trim() : null,
      },
      include: {
        user: { select: { id: true, name: true, skills: true } },
        team: { select: { id: true, name: true } },
      },
    });

    // Real-time dispatch
    realtimeService.publish(`team:${teamId}`, 'JOIN_REQUEST_RECEIVED', requestObj);

    return res.status(201).json({
      message: 'Application submitted successfully to team.',
      request: requestObj,
    });
  } catch (err) {
    console.error('[APPLY TO TEAM ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error submitting join request.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * 6. Team Leader Invites Hacker
 * POST /api/matchmaking/teams/:teamId/invite
 * Protected: Team Leader or ADMIN
 */
async function inviteHacker(req, res) {
  try {
    const { teamId } = req.params;
    const { userId, message, role } = req.body;
    const currentUser = req.user;

    if (!userId) {
      return res.status(400).json({
        error: 'Target userId is required to send an invitation.',
        code: 'VALIDATION_FAILED',
      });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: true,
      },
    });

    if (!team) {
      return res.status(404).json({
        error: 'Team not found.',
        code: 'TEAM_NOT_FOUND',
      });
    }

    // Permission: Leader or Admin
    const isLeader = team.creatorId === currentUser.id || team.members.some(m => m.userId === currentUser.id && m.role === 'LEADER');
    if (currentUser.role !== 'ADMIN' && !isLeader) {
      return res.status(403).json({
        error: 'Forbidden: Only the team leader can send team invitations.',
        code: 'FORBIDDEN',
      });
    }

    // Check capacity
    if (team.members.length >= (team.maxMembers || 5)) {
      return res.status(400).json({
        error: 'Team has reached its maximum member limit.',
        code: 'TEAM_FULL',
      });
    }

    // Target user check
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return res.status(404).json({
        error: 'Target user not found.',
        code: 'USER_NOT_FOUND',
      });
    }

    // Check if target user is already in a team for this event
    const existingMembership = await prisma.teamMember.findFirst({
      where: {
        userId,
        team: { eventId: team.eventId },
      },
    });

    if (existingMembership) {
      return res.status(400).json({
        error: 'Target hacker is already in a team for this event.',
        code: 'USER_ALREADY_IN_TEAM',
      });
    }

    // Check duplicate pending invite
    const existingInvite = await prisma.joinRequest.findFirst({
      where: {
        teamId,
        userId,
        status: 'PENDING',
      },
    });

    if (existingInvite) {
      return res.status(409).json({
        error: 'A pending invitation or application already exists with this user.',
        code: 'REQUEST_ALREADY_PENDING',
      });
    }

    const inviteObj = await prisma.joinRequest.create({
      data: {
        teamId,
        userId,
        type: 'INVITATION',
        status: 'PENDING',
        message: message ? message.trim() : null,
        role: role ? role.trim() : null,
      },
      include: {
        team: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    });

    // Real-time dispatch
    realtimeService.publish(`user:${userId}`, 'TEAM_INVITATION_RECEIVED', inviteObj);

    return res.status(201).json({
      message: 'Invitation sent to hacker.',
      invite: inviteObj,
    });
  } catch (err) {
    console.error('[INVITE HACKER ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error sending invitation.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * 7. List Team's Join Requests & Outgoing Invites
 * GET /api/matchmaking/teams/:teamId/requests
 * Protected: Team Leader or ADMIN
 */
async function getTeamRequests(req, res) {
  try {
    const { teamId } = req.params;
    const user = req.user;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    });

    if (!team) {
      return res.status(404).json({
        error: 'Team not found.',
        code: 'TEAM_NOT_FOUND',
      });
    }

    const isLeader = team.creatorId === user.id || team.members.some(m => m.userId === user.id && m.role === 'LEADER');
    if (user.role !== 'ADMIN' && !isLeader) {
      return res.status(403).json({
        error: 'Forbidden: Only the team leader can view team requests.',
        code: 'FORBIDDEN',
      });
    }

    const requests = await prisma.joinRequest.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            bio: true,
            githubUsername: true,
            skills: true,
            rolesSeeking: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      teamId,
      totalCount: requests.length,
      requests,
    });
  } catch (err) {
    console.error('[GET TEAM REQUESTS ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error fetching team requests.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * 8. List Current User's Requests (Applications and Invites)
 * GET /api/matchmaking/my-requests
 * Protected
 */
async function getMyRequests(req, res) {
  try {
    const user = req.user;

    const requests = await prisma.joinRequest.findMany({
      where: { userId: user.id },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            description: true,
            eventId: true,
            event: { select: { id: true, name: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      totalCount: requests.length,
      requests,
    });
  } catch (err) {
    console.error('[GET MY REQUESTS ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error fetching your requests.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * 9. Respond to Join Request / Invitation (ACCEPT or REJECT)
 * PATCH /api/matchmaking/requests/:requestId/respond
 * Protected
 */
async function respondToRequest(req, res) {
  try {
    const { requestId } = req.params;
    const { action } = req.body; // 'ACCEPT' or 'REJECT'
    const user = req.user;

    if (!['ACCEPT', 'REJECT'].includes(action)) {
      return res.status(400).json({
        error: "Action must be either 'ACCEPT' or 'REJECT'.",
        code: 'INVALID_ACTION',
      });
    }

    const joinReq = await prisma.joinRequest.findUnique({
      where: { id: requestId },
      include: {
        team: {
          include: {
            members: true,
            event: true,
          },
        },
        user: true,
      },
    });

    if (!joinReq) {
      return res.status(404).json({
        error: 'Join request not found.',
        code: 'REQUEST_NOT_FOUND',
      });
    }

    if (joinReq.status !== 'PENDING') {
      return res.status(400).json({
        error: `Request has already been ${joinReq.status.toLowerCase()}.`,
        code: 'REQUEST_NOT_PENDING',
      });
    }

    // Permission Verification:
    // If APPLICATION: only team leader or admin can respond
    // If INVITATION: only the invited user or admin can respond
    if (joinReq.type === 'APPLICATION') {
      const isLeader = joinReq.team.creatorId === user.id || joinReq.team.members.some(m => m.userId === user.id && m.role === 'LEADER');
      if (user.role !== 'ADMIN' && !isLeader) {
        return res.status(403).json({
          error: 'Forbidden: Only the team leader can accept or reject applications.',
          code: 'FORBIDDEN',
        });
      }
    } else if (joinReq.type === 'INVITATION') {
      if (user.role !== 'ADMIN' && joinReq.userId !== user.id) {
        return res.status(403).json({
          error: 'Forbidden: Only the invited hacker can accept or decline team invitations.',
          code: 'FORBIDDEN',
        });
      }
    }

    if (action === 'REJECT') {
      const updated = await prisma.joinRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' },
      });

      realtimeService.publish(`user:${joinReq.userId}`, 'REQUEST_REJECTED', { requestId, teamId: joinReq.teamId });

      return res.status(200).json({
        message: 'Request rejected.',
        request: updated,
      });
    }

    // If ACCEPT: perform atomic transaction to join team
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify capacity
      const currentTeam = await tx.team.findUnique({
        where: { id: joinReq.teamId },
        include: { members: true },
      });

      if (currentTeam.members.length >= (currentTeam.maxMembers || 5)) {
        throw new Error('TEAM_FULL: Team has reached max member capacity.');
      }

      // 2. Verify user not in a team for this event
      const existing = await tx.teamMember.findFirst({
        where: {
          userId: joinReq.userId,
          team: { eventId: currentTeam.eventId },
        },
      });

      if (existing) {
        throw new Error('ALREADY_IN_TEAM: User is already a member of a team in this event.');
      }

      // 3. Add to TeamMember
      const newMember = await tx.teamMember.create({
        data: {
          teamId: joinReq.teamId,
          userId: joinReq.userId,
          role: 'MEMBER',
        },
      });

      // 4. Mark request ACCEPTED
      const updatedReq = await tx.joinRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' },
      });

      // 5. Auto-cancel other pending applications/invitations for this user in this event
      await tx.joinRequest.updateMany({
        where: {
          userId: joinReq.userId,
          id: { not: requestId },
          status: 'PENDING',
          team: { eventId: currentTeam.eventId },
        },
        data: { status: 'CANCELLED' },
      });

      return { newMember, updatedReq };
    });

    realtimeService.publish(`team:${joinReq.teamId}`, 'MEMBER_JOINED', {
      teamId: joinReq.teamId,
      userId: joinReq.userId,
      role: 'MEMBER',
    });

    return res.status(200).json({
      message: 'Request accepted. Member added to team successfully!',
      request: result.updatedReq,
      member: result.newMember,
    });
  } catch (err) {
    if (err.message && err.message.startsWith('TEAM_FULL')) {
      return res.status(400).json({ error: 'Team is already full.', code: 'TEAM_FULL' });
    }
    if (err.message && err.message.startsWith('ALREADY_IN_TEAM')) {
      return res.status(400).json({ error: 'User is already in a team for this event.', code: 'ALREADY_IN_TEAM' });
    }
    console.error('[RESPOND TO REQUEST ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error processing request.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * 10. Withdraw / Cancel Request
 * DELETE /api/matchmaking/requests/:requestId
 * Protected
 */
async function cancelRequest(req, res) {
  try {
    const { requestId } = req.params;
    const user = req.user;

    const joinReq = await prisma.joinRequest.findUnique({
      where: { id: requestId },
      include: { team: true },
    });

    if (!joinReq) {
      return res.status(404).json({
        error: 'Join request not found.',
        code: 'REQUEST_NOT_FOUND',
      });
    }

    if (joinReq.status !== 'PENDING') {
      return res.status(400).json({
        error: 'Only pending requests can be withdrawn.',
        code: 'REQUEST_NOT_PENDING',
      });
    }

    // Permission: Either the applicant (for applications) or team leader (for invites), or ADMIN
    const isApplicant = joinReq.userId === user.id;
    const isTeamLeader = joinReq.team.creatorId === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isApplicant && !isTeamLeader && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden: You cannot cancel this request.',
        code: 'FORBIDDEN',
      });
    }

    const updated = await prisma.joinRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' },
    });

    return res.status(200).json({
      message: 'Request cancelled successfully.',
      request: updated,
    });
  } catch (err) {
    console.error('[CANCEL REQUEST ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error cancelling request.',
      code: 'SERVER_ERROR',
    });
  }
}

module.exports = {
  getHackers,
  updateProfile,
  getRecruitingTeams,
  updateTeamMatchmaking,
  applyToTeam,
  inviteHacker,
  getTeamRequests,
  getMyRequests,
  respondToRequest,
  cancelRequest,
};
