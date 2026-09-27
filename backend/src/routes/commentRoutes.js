const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth } = require('../middleware/auth');
const {
  createComment,
  getComments,
  updateComment,
  deleteComment,
  togglePinComment,
} = require('../controllers/commentController');

// Submissions discussion endpoints
router.post('/submissions/:submissionId/comments', requireAuth, createComment);
router.get('/submissions/:submissionId/comments', optionalAuth, getComments);

// Single comment moderation endpoints
router.put('/comments/:commentId', requireAuth, updateComment);
router.delete('/comments/:commentId', requireAuth, deleteComment);
router.patch('/comments/:commentId/pin', requireAuth, togglePinComment);

module.exports = router;
