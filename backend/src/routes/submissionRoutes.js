const express = require('express');
const router = express.Router();
const submissionController = require('../controllers/submissionController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { upload } = require('../utils/upload');

// Protected drafting & shipping
router.post('/draft', requireAuth, submissionController.saveDraft);
router.post('/:id/ship', requireAuth, submissionController.shipSubmission);
router.get('/my-submission', requireAuth, submissionController.getMySubmission);
router.post('/upload', requireAuth, upload.single('file'), submissionController.uploadMedia);

// Public / Protected query (draft privacy handled inside controller)
router.get('/:id', optionalAuth, submissionController.getSubmissionById);

module.exports = router;
