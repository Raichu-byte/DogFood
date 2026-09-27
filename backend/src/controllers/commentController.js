const prisma = require('../db');
const realtimeService = require('../services/realtimeService');

/**
 * Sanitize user object to prevent leaking emails or passwords
 */
function sanitizeAuthor(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    role: user.role,
  };
}

/**
 * Format a comment and its nested replies recursively
 */
function formatCommentNode(comment) {
  const isDeleted = Boolean(comment.isDeleted);
  return {
    id: comment.id,
    submissionId: comment.submissionId,
    parentId: comment.parentId,
    content: isDeleted ? '[This comment has been deleted]' : comment.content,
    isEdited: comment.isEdited,
    isPinned: comment.isPinned,
    isDeleted,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    author: isDeleted ? { id: null, name: '[Deleted]', role: null } : sanitizeAuthor(comment.author),
    replies: (comment.replies || []).map(formatCommentNode),
  };
}

/**
 * Create a new project comment (top-level or threaded reply)
 * POST /api/submissions/:submissionId/comments
 * Protected: PARTICIPANT, JUDGE, ORGANIZER, ADMIN
 */
async function createComment(req, res) {
  try {
    const { submissionId } = req.params;
    const { content, parentId } = req.body;
    const user = req.user;

    // Validation
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        error: 'Comment content is required and cannot be empty.',
        code: 'VALIDATION_FAILED',
      });
    }

    if (content.trim().length > 3000) {
      return res.status(400).json({
        error: 'Comment exceeds maximum allowed length of 3,000 characters.',
        code: 'CONTENT_TOO_LONG',
      });
    }

    // Verify submission exists
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        event: true,
      },
    });

    if (!submission) {
      return res.status(404).json({
        error: 'Submission not found.',
        code: 'SUBMISSION_NOT_FOUND',
      });
    }

    // Verify parent comment exists if parentId provided
    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
      });

      if (!parent || parent.submissionId !== submissionId) {
        return res.status(400).json({
          error: 'Parent comment does not exist for this submission.',
          code: 'INVALID_PARENT_COMMENT',
        });
      }
    }

    // Create comment
    const newComment = await prisma.comment.create({
      data: {
        submissionId,
        authorId: user.id,
        parentId: parentId || null,
        content: content.trim(),
      },
      include: {
        author: true,
      },
    });

    const sanitized = {
      id: newComment.id,
      submissionId: newComment.submissionId,
      parentId: newComment.parentId,
      content: newComment.content,
      isEdited: newComment.isEdited,
      isPinned: newComment.isPinned,
      isDeleted: newComment.isDeleted,
      createdAt: newComment.createdAt,
      updatedAt: newComment.updatedAt,
      author: sanitizeAuthor(newComment.author),
      replies: [],
    };

    // Emit real-time notification
    realtimeService.publish(`submission:${submissionId}`, 'COMMENT_CREATED', sanitized);

    // Audit log
    await prisma.auditLog.create({
      data: {
        eventId: submission.eventId,
        actorId: user.id,
        action: 'COMMENT_CREATED',
        targetResource: 'Comment',
        targetId: newComment.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: JSON.stringify({
          submissionId,
          parentId: parentId || null,
        }),
      },
    });

    return res.status(201).json({
      message: 'Comment posted successfully.',
      comment: sanitized,
    });
  } catch (err) {
    console.error('[CREATE COMMENT ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error creating comment.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Fetch all comments for a submission organized into threaded tree hierarchy
 * GET /api/submissions/:submissionId/comments
 * Public
 */
async function getComments(req, res) {
  try {
    const { submissionId } = req.params;

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      return res.status(404).json({
        error: 'Submission not found.',
        code: 'SUBMISSION_NOT_FOUND',
      });
    }

    // Fetch all comments for this submission
    const rawComments = await prisma.comment.findMany({
      where: { submissionId },
      include: {
        author: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Build comment lookup map
    const commentMap = new Map();
    for (const c of rawComments) {
      commentMap.set(c.id, {
        ...c,
        replies: [],
      });
    }

    const rootComments = [];

    // Assemble threaded hierarchy
    for (const c of rawComments) {
      const node = commentMap.get(c.id);
      if (c.parentId && commentMap.has(c.parentId)) {
        commentMap.get(c.parentId).replies.push(node);
      } else {
        rootComments.push(node);
      }
    }

    // Sort root comments: pinned first, then newest first
    rootComments.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const formattedTree = rootComments.map(formatCommentNode);

    return res.status(200).json({
      submissionId,
      totalCount: rawComments.length,
      comments: formattedTree,
    });
  } catch (err) {
    console.error('[GET COMMENTS ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error fetching comments.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Edit comment content
 * PUT /api/comments/:commentId
 * Protected: Author or ADMIN
 */
async function updateComment(req, res) {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const user = req.user;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        error: 'Updated content cannot be empty.',
        code: 'VALIDATION_FAILED',
      });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { author: true },
    });

    if (!comment) {
      return res.status(404).json({
        error: 'Comment not found.',
        code: 'COMMENT_NOT_FOUND',
      });
    }

    if (comment.isDeleted) {
      return res.status(400).json({
        error: 'Cannot edit a deleted comment.',
        code: 'COMMENT_ALREADY_DELETED',
      });
    }

    // Permission check: Author or ADMIN
    if (user.role !== 'ADMIN' && comment.authorId !== user.id) {
      return res.status(403).json({
        error: 'Forbidden: You can only edit your own comments.',
        code: 'FORBIDDEN',
      });
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content: content.trim(),
        isEdited: true,
      },
      include: {
        author: true,
      },
    });

    const sanitized = {
      id: updated.id,
      submissionId: updated.submissionId,
      parentId: updated.parentId,
      content: updated.content,
      isEdited: updated.isEdited,
      isPinned: updated.isPinned,
      isDeleted: updated.isDeleted,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      author: sanitizeAuthor(updated.author),
    };

    // Emit real-time notification
    realtimeService.publish(`submission:${updated.submissionId}`, 'COMMENT_UPDATED', sanitized);

    return res.status(200).json({
      message: 'Comment updated successfully.',
      comment: sanitized,
    });
  } catch (err) {
    console.error('[UPDATE COMMENT ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error updating comment.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Delete a comment (soft-delete if child replies exist, hard-delete otherwise)
 * DELETE /api/comments/:commentId
 * Protected: Author, Event ORGANIZER, or ADMIN
 */
async function deleteComment(req, res) {
  try {
    const { commentId } = req.params;
    const user = req.user;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        submission: {
          include: {
            event: true,
          },
        },
        replies: true,
      },
    });

    if (!comment) {
      return res.status(404).json({
        error: 'Comment not found.',
        code: 'COMMENT_NOT_FOUND',
      });
    }

    // Permission check: Author, Event Organizer, or ADMIN
    const isAuthor = comment.authorId === user.id;
    const isOrganizer = comment.submission.event.organizerId === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isAuthor && !isOrganizer && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to delete this comment.',
        code: 'FORBIDDEN',
      });
    }

    // If comment has replies, soft-delete to preserve thread structure
    if (comment.replies && comment.replies.length > 0) {
      await prisma.comment.update({
        where: { id: commentId },
        data: {
          isDeleted: true,
          content: '[This comment has been deleted]',
        },
      });
    } else {
      // Hard delete if leaf node
      await prisma.comment.delete({
        where: { id: commentId },
      });
    }

    // Emit real-time notification
    realtimeService.publish(`submission:${comment.submissionId}`, 'COMMENT_DELETED', {
      id: commentId,
      submissionId: comment.submissionId,
      isDeleted: true,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        eventId: comment.submission.eventId,
        actorId: user.id,
        action: 'COMMENT_DELETED',
        targetResource: 'Comment',
        targetId: commentId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    return res.status(200).json({
      message: 'Comment deleted successfully.',
      commentId,
    });
  } catch (err) {
    console.error('[DELETE COMMENT ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error deleting comment.',
      code: 'SERVER_ERROR',
    });
  }
}

/**
 * Toggle pin status for a comment
 * PATCH /api/comments/:commentId/pin
 * Protected: Event ORGANIZER or ADMIN
 */
async function togglePinComment(req, res) {
  try {
    const { commentId } = req.params;
    const user = req.user;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        submission: {
          include: {
            event: true,
          },
        },
        author: true,
      },
    });

    if (!comment) {
      return res.status(404).json({
        error: 'Comment not found.',
        code: 'COMMENT_NOT_FOUND',
      });
    }

    // Only Organizer or Admin can pin/unpin comments
    const isOrganizer = comment.submission.event.organizerId === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isOrganizer && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden: Only the event organizer or an admin can pin comments.',
        code: 'FORBIDDEN',
      });
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: {
        isPinned: !comment.isPinned,
      },
      include: {
        author: true,
      },
    });

    const sanitized = {
      id: updated.id,
      submissionId: updated.submissionId,
      parentId: updated.parentId,
      content: updated.content,
      isPinned: updated.isPinned,
      isEdited: updated.isEdited,
      isDeleted: updated.isDeleted,
      author: sanitizeAuthor(updated.author),
    };

    realtimeService.publish(`submission:${updated.submissionId}`, 'COMMENT_PINNED', sanitized);

    return res.status(200).json({
      message: `Comment ${updated.isPinned ? 'pinned' : 'unpinned'} successfully.`,
      comment: sanitized,
    });
  } catch (err) {
    console.error('[TOGGLE PIN COMMENT ERROR]', err);
    return res.status(500).json({
      error: 'Internal server error pinning comment.',
      code: 'SERVER_ERROR',
    });
  }
}

module.exports = {
  createComment,
  getComments,
  updateComment,
  deleteComment,
  togglePinComment,
};
