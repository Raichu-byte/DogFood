const prisma = require('../db');
const { checkSubmissionDeadline } = require('../middleware/deadline');

/**
 * Save or update a project submission draft
 * POST /api/submissions/draft
 * Protected: Authenticated Team Member
 */
async function saveDraft(req, res) {
  try {
    const {
      eventId,
      teamId,
      title = '',
      tagline = '',
      description = '',
      trackId = null,
      techStack = [],
      repoUrl = null,
      demoUrl = null,
      videoUrl = null,
      thumbnailUrl = null,
    } = req.body;

    if (!eventId || !teamId) {
      return res.status(400).json({
        error: 'Validation error: eventId and teamId are required.',
        code: 'VALIDATION_FAILED',
      });
    }

    // 1. Verify user is a member of the team
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: req.user.id,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Forbidden: You must be a member of this team to edit its submission.',
        code: 'NOT_TEAM_MEMBER',
      });
    }

    // 2. Verify submission deadline is open
    const deadlineCheck = await checkSubmissionDeadline(eventId);
    if (!deadlineCheck.allowed) {
      return res.status(403).json({
        error: deadlineCheck.error,
        code: deadlineCheck.code,
      });
    }

    // 3. Format techStack to JSON string
    const formattedTechStack = Array.isArray(techStack)
      ? JSON.stringify(techStack)
      : typeof techStack === 'string'
      ? techStack
      : JSON.stringify([]);

    // 4. Check existing submission
    const existing = await prisma.submission.findUnique({
      where: { teamId },
    });

    if (existing && !existing.isDraft) {
      return res.status(403).json({
        error: 'Forbidden: This submission has already been locked and shipped. Further edits are prohibited.',
        code: 'SUBMISSION_LOCKED',
      });
    }

    let submission;
    if (existing) {
      // Update existing draft
      submission = await prisma.submission.update({
        where: { id: existing.id },
        data: {
          title: title.trim(),
          tagline: tagline.trim(),
          description: description.trim(),
          trackId: trackId || null,
          techStack: formattedTechStack,
          repoUrl: repoUrl ? repoUrl.trim() : null,
          demoUrl: demoUrl ? demoUrl.trim() : null,
          videoUrl: videoUrl ? videoUrl.trim() : null,
          thumbnailUrl: thumbnailUrl ? thumbnailUrl.trim() : null,
        },
        include: {
          team: {
            include: {
              members: {
                include: {
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
          track: true,
        },
      });
    } else {
      // Create new draft
      submission = await prisma.submission.create({
        data: {
          eventId,
          teamId,
          title: title.trim() || 'Untitled Draft',
          tagline: tagline.trim(),
          description: description.trim(),
          trackId: trackId || null,
          techStack: formattedTechStack,
          repoUrl: repoUrl ? repoUrl.trim() : null,
          demoUrl: demoUrl ? demoUrl.trim() : null,
          videoUrl: videoUrl ? videoUrl.trim() : null,
          thumbnailUrl: thumbnailUrl ? thumbnailUrl.trim() : null,
          isDraft: true,
        },
        include: {
          team: {
            include: {
              members: {
                include: {
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
          track: true,
        },
      });
    }

    return res.status(200).json({
      message: 'Draft saved successfully.',
      submission,
    });
  } catch (err) {
    console.error('[SUBMISSION SAVE_DRAFT ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error saving submission draft.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Finalize and lock a submission ("Ship It")
 * POST /api/submissions/:id/ship
 * Protected: Authenticated Team Member
 */
async function shipSubmission(req, res) {
  try {
    const { id } = req.params;

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            members: true,
          },
        },
        event: true,
      },
    });

    if (!submission) {
      return res.status(404).json({
        error: 'Submission not found.',
        code: 'SUBMISSION_NOT_FOUND',
      });
    }

    // 1. Verify user is a member of the team
    const isMember = submission.team.members.some(m => m.userId === req.user.id);
    if (!isMember) {
      return res.status(403).json({
        error: 'Forbidden: You must be a member of this team to finalize the submission.',
        code: 'NOT_TEAM_MEMBER',
      });
    }

    // 2. Verify submission deadline is open
    const deadlineCheck = await checkSubmissionDeadline(submission.eventId);
    if (!deadlineCheck.allowed) {
      return res.status(403).json({
        error: deadlineCheck.error,
        code: deadlineCheck.code,
      });
    }

    // 3. If already finalized, return current status
    if (!submission.isDraft) {
      return res.status(200).json({
        message: 'Submission is already finalized and locked.',
        submission,
      });
    }

    // 4. Pre-flight verification checklist
    const missingFields = [];
    if (!submission.title || submission.title.trim().length < 3) missingFields.push('Project Title (min 3 characters)');
    if (!submission.tagline || submission.tagline.trim().length < 5) missingFields.push('Tagline (min 5 characters)');
    if (!submission.description || submission.description.trim().length < 10) missingFields.push('Description (min 10 characters)');
    if (!submission.trackId) missingFields.push('Selected Track');

    let parsedTech = [];
    try {
      parsedTech = JSON.parse(submission.techStack);
    } catch (e) {
      parsedTech = [];
    }
    if (!Array.isArray(parsedTech) || parsedTech.length === 0) {
      missingFields.push('Tech Stack (at least 1 technology)');
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Pre-flight checklist failed. The following required items are incomplete: ${missingFields.join(', ')}.`,
        code: 'PREFLIGHT_CHECK_FAILED',
        missingFields,
      });
    }

    // 5. Atomic lock transition and audit record
    const shippedSubmission = await prisma.$transaction(async (tx) => {
      const updated = await tx.submission.update({
        where: { id },
        data: {
          isDraft: false,
          submittedAt: new Date(),
        },
        include: {
          team: {
            include: {
              members: {
                include: {
                  user: { select: { id: true, name: true, email: true } },
                },
              },
            },
          },
          track: true,
          event: {
            select: { id: true, name: true, slug: true },
          },
        },
      });

      // Initialize score summary record if missing
      await tx.projectScoreSummary.upsert({
        where: { submissionId: updated.id },
        create: {
          submissionId: updated.id,
          rawScoreMean: 0.0,
          normalizedZScore: 0.0,
        },
        update: {},
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          eventId: updated.eventId,
          actorId: req.user.id,
          action: 'SUBMISSION_FINALIZED',
          targetResource: 'Submission',
          targetId: updated.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          metadata: JSON.stringify({
            title: updated.title,
            teamName: updated.team.name,
            submittedAt: updated.submittedAt,
          }),
        },
      });

      return updated;
    });

    return res.status(200).json({
      message: 'Project successfully shipped and locked for judging!',
      submission: shippedSubmission,
    });
  } catch (err) {
    console.error('[SUBMISSION SHIP ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error finalizing submission.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Get current team's submission
 * GET /api/submissions/my-submission?eventId=...
 * Protected: Authenticated User
 */
async function getMySubmission(req, res) {
  try {
    const { eventId, teamId } = req.query;

    let targetTeamId = teamId;

    if (!targetTeamId && eventId) {
      const membership = await prisma.teamMember.findFirst({
        where: {
          userId: req.user.id,
          team: { eventId },
        },
        select: { teamId: true },
      });

      if (!membership) {
        return res.status(200).json({ submission: null });
      }
      targetTeamId = membership.teamId;
    }

    if (!targetTeamId) {
      return res.status(400).json({
        error: 'Validation error: eventId or teamId is required.',
        code: 'VALIDATION_FAILED',
      });
    }

    const submission = await prisma.submission.findUnique({
      where: { teamId: targetTeamId },
      include: {
        team: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
        track: true,
        scoreSummary: true,
      },
    });

    return res.status(200).json({ submission });
  } catch (err) {
    console.error('[SUBMISSION GET_MY ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error fetching your submission.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Get submission by ID
 * GET /api/submissions/:id
 * Public for Finalized; Protected for Drafts
 */
async function getSubmissionById(req, res) {
  try {
    const { id } = req.params;

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true } }, // Exclude emails for public safety
              },
            },
          },
        },
        track: true,
        event: {
          select: { id: true, name: true, slug: true, status: true },
        },
        scoreSummary: true,
      },
    });

    if (!submission) {
      return res.status(404).json({
        error: 'Submission not found.',
        code: 'SUBMISSION_NOT_FOUND',
      });
    }

    // If draft, only team members, organizer, or admin can inspect
    if (submission.isDraft) {
      if (!req.user) {
        return res.status(403).json({
          error: 'Forbidden: Draft submissions are private.',
          code: 'DRAFT_PRIVATE',
        });
      }

      const isMember = submission.team.members.some(m => m.user.id === req.user.id);
      const isPrivileged = ['ORGANIZER', 'ADMIN'].includes(req.user.role);

      if (!isMember && !isPrivileged) {
        return res.status(403).json({
          error: 'Forbidden: Draft submissions are private to the authoring team.',
          code: 'DRAFT_PRIVATE',
        });
      }
    }

    return res.status(200).json({ submission });
  } catch (err) {
    console.error('[SUBMISSION GET_BY_ID ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error fetching submission.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Local Media Upload
 * POST /api/submissions/upload
 * Protected: Authenticated User
 */
async function uploadMedia(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Validation error: no file uploaded.',
        code: 'FILE_MISSING',
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    return res.status(200).json({
      message: 'File uploaded successfully.',
      fileUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (err) {
    console.error('[SUBMISSION UPLOAD ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error processing file upload.',
      code: 'SERVER_ERROR',
    });
  }
}

module.exports = {
  saveDraft,
  shipSubmission,
  getMySubmission,
  getSubmissionById,
  uploadMedia,
};
