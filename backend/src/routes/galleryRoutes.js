const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/galleryController');

// All gallery endpoints are public
router.get('/', galleryController.getGalleryProjects);
router.get('/:id', galleryController.getGalleryProjectById);

module.exports = router;
