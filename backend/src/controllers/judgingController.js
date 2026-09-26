const prisma = require('../db');
const { hasConflictOfInterest, generateRoundRobinAssignments } = require('../services/judgingService');

/**
 * Trigger automated round-robin judge assignment
 * POST /api/judging/assign/round-robin
 * Protected: ORGANIZER, ADMIN
 */
async function assignRoundRobin(req, res) {
  try {
    const { eventId, judgesPerProject = 3, clearExisting = false } = req.body;

    if (!eventId) {
      return res.status(400).json({
        error: 'Validation error: eventId is required.',
        code: 'VALIDATION_FAILED',
      });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({
        error: 'Event not found.',
        code: 'EVENT_NOT_FOUND',
      });
    }

    // Role check: Only organizer of the event or ADMIN
    if (req.user.role !== 'ADMIN' && event.organizerId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden: Only the event organizer or an admin can generate judge assignments.',
        code: 'FORBIDDEN',
      });
    }

    const result = await generateRoundRobinAssignments(
      eventId,
      parseInt(judgesPerProject, 10) || 3,
      Boolean(clearExisting)
    );

    // Audit log
    await prisma.auditLog.create({
      data: {
        eventId,
        actorId: req.user.id,
        action: 'JUDGE_ASSIGNMENTS_GENERATED',
        targetResource: 'JudgeAssignment',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: JSON.stringify({
          createdCount: result.createdCount,
          totalProjects: result.totalProjects,
          judgesPerProject,
        }),
      },
    });

    return res.status(200).json({
      message: `Successfully generated ${result.createdCount} judge assignments.`,
      data: result,
    });
  } catch (err) {
    console.error('[ASSIGN ROUND_ROBIN ERROR]', err);
    return res.status(500).json({
      error: err.message || 'Internal server error generating judge assignments.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Manually assign a single judge to a submission
 * POST /api/judging/assign/manual
 * Protected: ORGANIZER, ADMIN
 */
async function assignManual(req, res) {
  try {
    const { eventId, judgeId, submissionId } = req.body;

    if (!eventId || !judgeId || !submissionId) {
      return res.status(400).json({
        error: 'Validation error: eventId, judgeId, and submissionId are all required.',
        code: 'VALIDATION_FAILED',
      });
    }

    const [event, judge, submission] = await Promise.all([
      prisma.event.findUnique({ where: { id: eventId } }),
      prisma.user.findUnique({ where: { id: judgeId } }),
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
      return res.status(404).json({ error: 'Event not found.', code: 'EVENT_NOT_FOUND' });
    }

    if (!judge) {
      return res.status(404).json({ error: 'Judge user not found.', code: 'JUDGE_NOT_FOUND' });
    }

    if (!['JUDGE', 'ORGANIZER', 'ADMIN'].includes(judge.role)) {
      return res.status(400).json({
        error: `User ${judge.name} (${judge.email}) does not have judging privileges (Role: ${judge.role}).`,
        code: 'INVALID_JUDGE_ROLE',
      });
    }

    if (!submission || submission.eventId !== eventId) {
      return res.status(404).json({
        error: 'Submission not found for this event.',
        code: 'SUBMISSION_NOT_FOUND',
      });
    }

    // Role check: Only organizer of the event or ADMIN
    if (req.user.role !== 'ADMIN' && event.organizerId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden: Only the event organizer or an admin can manage judge assignments.',
        code: 'FORBIDDEN',
      });
    }

    // Conflict of Interest (COI) check
    if (hasConflictOfInterest(judgeId, submission)) {
      return res.status(400).json({
        error: 'Conflict of Interest: This judge is a member or creator of the team for this submission.',
        code: 'CONFLICT_OF_INTEREST',
      });
    }

    // Check if already assigned
    const existing = await prisma.judgeAssignment.findUnique({
      where: {
        judgeId_submissionId: { judgeId, submissionId },
      },
    });

    if (existing) {
      return res.status(409).json({
        error: 'This judge is already assigned to evaluate this submission.',
        code: 'ASSIGNMENT_EXISTS',
      });
    }

    const assignment = await prisma.judgeAssignment.create({
      data: {
        eventId,
        judgeId,
        submissionId,
        status: 'PENDING',
      },
      include: {
        judge: { select: { id: true, name: true, email: true, role: true } },
        submission: { select: { id: true, title: true, team: { select: { name: true } } } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        eventId,
        actorId: req.user.id,
        action: 'JUDGE_ASSIGNMENT_MANUAL_CREATED',
        targetResource: 'JudgeAssignment',
        targetId: assignment.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: JSON.stringify({ judgeId, submissionId }),
      },
    });

    return res.status(201).json({
      message: 'Judge assigned successfully.',
      assignment,
    });
  } catch (err) {
    console.error('[ASSIGN MANUAL ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error creating manual assignment.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Remove a judge assignment
 * DELETE /api/judging/assignments/:id
 * Protected: ORGANIZER, ADMIN
 */
async function removeAssignment(req, res) {
  try {
    const { id } = req.params;

    const assignment = await prisma.judgeAssignment.findUnique({
      where: { id },
      include: { event: true },
    });

    if (!assignment) {
      return res.status(404).json({
        error: 'Judge assignment not found.',
        code: 'ASSIGNMENT_NOT_FOUND',
      });
    }

    if (req.user.role !== 'ADMIN' && assignment.event.organizerId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden: Only the event organizer or an admin can delete judge assignments.',
        code: 'FORBIDDEN',
      });
    }

    await prisma.judgeAssignment.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        eventId: assignment.eventId,
        actorId: req.user.id,
        action: 'JUDGE_ASSIGNMENT_DELETED',
        targetResource: 'JudgeAssignment',
        targetId: id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: JSON.stringify({ judgeId: assignment.judgeId, submissionId: assignment.submissionId }),
      },
    });

    return res.status(200).json({
      message: 'Judge assignment removed successfully.',
    });
  } catch (err) {
    console.error('[REMOVE ASSIGNMENT ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error removing assignment.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * List all judge assignments and coverage metrics for an event
 * GET /api/judging/assignments
 * Protected: ORGANIZER, ADMIN
 */
async function listAssignments(req, res) {
  try {
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({
        error: 'Validation error: eventId query parameter is required.',
        code: 'VALIDATION_FAILED',
      });
    }

    const assignments = await prisma.judgeAssignment.findMany({
      where: { eventId },
      include: {
        judge: {
          select: { id: true, name: true, email: true, role: true },
        },
        submission: {
          select: {
            id: true,
            title: true,
            tagline: true,
            team: { select: { id: true, name: true } },
            track: { select: { id: true, name: true } },
          },
        },
        scores: true,
      },
      orderBy: { assignedAt: 'desc' },
    });

    const total = assignments.length;
    const completed = assignments.filter(a => a.status === 'COMPLETED').length;
    const pending = assignments.filter(a => a.status === 'PENDING').length;

    return res.status(200).json({
      assignments,
      metrics: {
        totalAssignments: total,
        completedAssignments: completed,
        pendingAssignments: pending,
        completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
    });
  } catch (err) {
    console.error('[LIST ASSIGNMENTS ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error listing assignments.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Get current logged-in judge's assigned evaluations
 * GET /api/judging/my-assignments
 * Protected: JUDGE, ORGANIZER, ADMIN
 */
async function getMyAssignments(req, res) {
  try {
    const { eventId } = req.query;

    const where = { judgeId: req.user.id };
    if (eventId) where.eventId = eventId;

    const assignments = await prisma.judgeAssignment.findMany({
      where,
      include: {
        submission: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                members: {
                  select: {
                    role: true,
                    user: { select: { id: true, name: true } },
                  },
                },
              },
            },
            track: true,
          },
        },
        scores: {
          include: {
            criteria: true,
          },
        },
        event: {
          include: {
            rubricCriteria: true,
          },
        },
      },
      orderBy: { assignedAt: 'asc' },
    });

    return res.status(200).json({
      assignments,
    });
  } catch (err) {
    console.error('[MY ASSIGNMENTS ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error fetching judge assignments.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Submit or update multi-dimensional scores for a judge assignment
 * POST /api/judging/scores
 * Protected: JUDGE, ORGANIZER, ADMIN
 */
async function submitScores(req, res) {
  try {
    const { assignmentId, scores } = req.body;

    if (!assignmentId || !Array.isArray(scores) || scores.length === 0) {
      return res.status(400).json({
        error: 'Validation error: assignmentId and non-empty scores array are required.',
        code: 'VALIDATION_FAILED',
      });
    }

    // 1. Fetch assignment with event and criteria
    const assignment = await prisma.judgeAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        event: {
          include: {
            rubricCriteria: true,
          },
        },
        submission: true,
      },
    });

    if (!assignment) {
      return res.status(404).json({
        error: 'Judge assignment not found.',
        code: 'ASSIGNMENT_NOT_FOUND',
      });
    }

    // 2. Authorization check: must be assigned judge or ADMIN
    if (req.user.role !== 'ADMIN' && assignment.judgeId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden: You can only submit scores for your own assigned evaluations.',
        code: 'NOT_ASSIGNED_JUDGE',
      });
    }

    // 3. Deadline and status check
    const now = new Date();
    if (assignment.event.status === 'FINALIZED') {
      return res.status(403).json({
        error: 'Forbidden: Judging is locked because the event is finalized.',
        code: 'EVENT_FINALIZED',
      });
    }

    if (now > new Date(assignment.event.judgingDeadline) && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: `Forbidden: Judging deadline passed on ${assignment.event.judgingDeadline.toISOString()}.`,
        code: 'JUDGING_DEADLINE_PASSED',
      });
    }

    // 4. Rubric validation
    const validCriteriaMap = new Map();
    assignment.event.rubricCriteria.forEach(c => validCriteriaMap.set(c.id, c));

    for (const item of scores) {
      const { criteriaId, scoreValue } = item;
      const criterion = validCriteriaMap.get(criteriaId);

      if (!criterion) {
        return res.status(400).json({
          error: `Validation error: criteriaId '${criteriaId}' does not belong to this event's rubric.`,
          code: 'INVALID_CRITERIA_ID',
        });
      }

      const numVal = parseFloat(scoreValue);
      if (isNaN(numVal) || numVal < criterion.minScore || numVal > criterion.maxScore) {
        return res.status(400).json({
          error: `Validation error: Score for '${criterion.name}' must be between ${criterion.minScore} and ${criterion.maxScore} (Received: ${scoreValue}).`,
          code: 'SCORE_OUT_OF_BOUNDS',
        });
      }
    }

    // 5. Atomic upsert of scores and assignment completion status
    const result = await prisma.$transaction(async (tx) => {
      // Upsert individual criterion scores
      for (const item of scores) {
        await tx.score.upsert({
          where: {
            assignmentId_criteriaId: {
              assignmentId,
              criteriaId: item.criteriaId,
            },
          },
          update: {
            scoreValue: parseFloat(item.scoreValue),
            feedback: item.feedback ? item.feedback.trim() : null,
          },
          create: {
            assignmentId,
            criteriaId: item.criteriaId,
            scoreValue: parseFloat(item.scoreValue),
            feedback: item.feedback ? item.feedback.trim() : null,
          },
        });
      }

      // Check if all event rubric criteria are scored
      const totalCriteriaCount = assignment.event.rubricCriteria.length;
      const scoredCount = await tx.score.count({
        where: { assignmentId },
      });

      const isCompleted = scoredCount >= totalCriteriaCount;
      const updatedAssignment = await tx.judgeAssignment.update({
        where: { id: assignmentId },
        data: {
          status: isCompleted ? 'COMPLETED' : 'PENDING',
        },
        include: {
          scores: {
            include: { criteria: true },
          },
        },
      });

      // Recalculate raw score mean for this submission across all completed assignments
      const completedAssignments = await tx.judgeAssignment.findMany({
        where: {
          submissionId: assignment.submissionId,
          status: 'COMPLETED',
        },
        include: {
          scores: {
            include: { criteria: true },
          },
        },
      });

      if (completedAssignments.length > 0) {
        let totalWeightedSum = 0;
        for (const ca of completedAssignments) {
          let evalWeightedScore = 0;
          for (const s of ca.scores) {
            evalWeightedScore += s.scoreValue * (s.criteria.weight || 1.0);
          }
          totalWeightedSum += evalWeightedScore;
        }
        const rawMean = parseFloat((totalWeightedSum / completedAssignments.length).toFixed(4));

        await tx.projectScoreSummary.upsert({
          where: { submissionId: assignment.submissionId },
          update: { rawScoreMean: rawMean },
          create: {
            submissionId: assignment.submissionId,
            rawScoreMean: rawMean,
          },
        });
      }

      return updatedAssignment;
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        eventId: assignment.eventId,
        actorId: req.user.id,
        action: 'SCORE_SUBMITTED',
        targetResource: 'Score',
        targetId: assignmentId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: JSON.stringify({
          scoresCount: scores.length,
          status: result.status,
          submissionId: assignment.submissionId,
        }),
      },
    });

    return res.status(200).json({
      message: 'Scores submitted successfully.',
      assignment: result,
    });
  } catch (err) {
    console.error('[SUBMIT SCORES ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error submitting scores.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Get scores submitted for a specific assignment
 * GET /api/judging/scores/:assignmentId
 * Protected: JUDGE, ORGANIZER, ADMIN
 */
async function getScoresByAssignment(req, res) {
  try {
    const { assignmentId } = req.params;

    const assignment = await prisma.judgeAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        event: {
          include: {
            rubricCriteria: true,
          },
        },
        scores: {
          include: {
            criteria: true,
          },
        },
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

    if (!assignment) {
      return res.status(404).json({
        error: 'Judge assignment not found.',
        code: 'ASSIGNMENT_NOT_FOUND',
      });
    }

    if (
      req.user.role !== 'ADMIN' &&
      req.user.role !== 'ORGANIZER' &&
      assignment.judgeId !== req.user.id
    ) {
      return res.status(403).json({
        error: 'Forbidden: You can only view scores for your own assigned evaluations.',
        code: 'FORBIDDEN',
      });
    }

    return res.status(200).json({
      assignment,
    });
  } catch (err) {
    console.error('[GET SCORES BY ASSIGNMENT ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error retrieving scores.',
      code: 'SERVER_ERROR',
    });
  }
}

module.exports = {
  assignRoundRobin,
  assignManual,
  removeAssignment,
  listAssignments,
  getMyAssignments,
  submitScores,
  getScoresByAssignment,
};
