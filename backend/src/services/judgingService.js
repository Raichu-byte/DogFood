const prisma = require('../db');

/**
 * Detects if a judge has a Conflict of Interest (COI) with a submission
 * @param {string} judgeId 
 * @param {object} submission (with team and members included)
 * @returns {boolean}
 */
function hasConflictOfInterest(judgeId, submission) {
  if (!submission || !submission.team) return false;
  
  // 1. Judge created the team
  if (submission.team.creatorId === judgeId) return true;

  // 2. Judge is a member of the team
  if (submission.team.members && submission.team.members.some(m => m.userId === judgeId)) {
    return true;
  }

  return false;
}

/**
 * Balanced Round-Robin Judge Assignment Algorithm with COI avoidance
 * @param {string} eventId
 * @param {number} judgesPerProject
 * @param {boolean} clearExisting
 * @returns {Promise<{ createdCount: number, totalProjects: number, totalJudges: number, assignments: Array }>}
 */
async function generateRoundRobinAssignments(eventId, judgesPerProject = 3, clearExisting = false) {
  // 1. Fetch event, non-draft submissions, and eligible judges
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new Error('Event not found.');
  }

  // Fetch all non-draft submissions for this event
  const submissions = await prisma.submission.findMany({
    where: {
      eventId,
      isDraft: false,
    },
    include: {
      team: {
        include: {
          members: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  if (submissions.length === 0) {
    return {
      createdCount: 0,
      totalProjects: 0,
      totalJudges: 0,
      assignments: [],
      warning: 'No finalized submissions available to assign.',
    };
  }

  // Fetch all eligible judges (users with role JUDGE, ORGANIZER, or ADMIN)
  const judges = await prisma.user.findMany({
    where: {
      role: { in: ['JUDGE', 'ORGANIZER', 'ADMIN'] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (judges.length === 0) {
    throw new Error('No eligible judges found in the system (role JUDGE, ORGANIZER, or ADMIN).');
  }

  // 2. Clear existing assignments if requested
  if (clearExisting) {
    await prisma.judgeAssignment.deleteMany({
      where: { eventId },
    });
  }

  // Fetch existing assignments if not cleared
  const existingAssignments = await prisma.judgeAssignment.findMany({
    where: { eventId },
    select: { judgeId: true, submissionId: true },
  });

  const existingMap = new Set(
    existingAssignments.map(a => `${a.judgeId}:${a.submissionId}`)
  );

  // Initialize judge workload trackers
  const judgeWorkload = {};
  for (const j of judges) {
    const currentAssigned = existingAssignments.filter(a => a.judgeId === j.id).length;
    judgeWorkload[j.id] = currentAssigned;
  }

  const targetPerProject = Math.min(judgesPerProject, judges.length);
  const newAssignments = [];

  // 3. For each project, assign targetPerProject least-loaded eligible judges without COI
  for (const sub of submissions) {
    // Current assignments for this submission
    const assignedJudgesForSub = new Set();
    existingAssignments
      .filter(a => a.submissionId === sub.id)
      .forEach(a => assignedJudgesForSub.add(a.judgeId));

    let needed = targetPerProject - assignedJudgesForSub.size;
    if (needed <= 0) continue;

    // Filter eligible judges (No COI and not already assigned)
    const candidates = judges.filter(j => {
      if (assignedJudgesForSub.has(j.id)) return false;
      if (existingMap.has(`${j.id}:${sub.id}`)) return false;
      if (hasConflictOfInterest(j.id, sub)) return false;
      return true;
    });

    // Sort candidates by workload ascending, then deterministic tie-break by judge ID
    candidates.sort((a, b) => {
      const loadDiff = judgeWorkload[a.id] - judgeWorkload[b.id];
      if (loadDiff !== 0) return loadDiff;
      return a.id.localeCompare(b.id);
    });

    const toAssign = candidates.slice(0, needed);
    for (const judge of toAssign) {
      newAssignments.push({
        eventId,
        judgeId: judge.id,
        submissionId: sub.id,
        status: 'PENDING',
      });
      judgeWorkload[judge.id] = (judgeWorkload[judge.id] || 0) + 1;
      assignedJudgesForSub.add(judge.id);
      existingMap.add(`${judge.id}:${sub.id}`);
    }
  }

  // 4. Batch create assignments
  if (newAssignments.length > 0) {
    await prisma.judgeAssignment.createMany({
      data: newAssignments,
      skipDuplicates: true,
    });
  }

  const totalAssignments = await prisma.judgeAssignment.count({
    where: { eventId },
  });

  return {
    createdCount: newAssignments.length,
    totalAssignments,
    totalProjects: submissions.length,
    totalJudges: judges.length,
    judgeWorkloads: judgeWorkload,
  };
}

module.exports = {
  hasConflictOfInterest,
  generateRoundRobinAssignments,
};
