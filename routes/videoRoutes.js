const express = require('express');
const router = express.Router();
const Video = require('../models/Video');
const { uploadManager } = require('../config/cloudinaryConfig');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/videos — list all videos
router.get('/', async (req, res) => {
  try {
    const { topic } = req.query;
    const filter = topic && topic !== 'Todos' ? { topic } : {};
    const videos = await Video.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/videos — upload a video (requires auth)
router.post('/', authMiddleware, uploadManager.single('file'), async (req, res) => {
  try {
    const { title, description, topic, duration } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Se requiere un archivo de video' });
    const video = await Video.create({
      title,
      description,
      topic: topic || 'General',
      videoUrl: req.file.path,
      duration: duration || '',
      uploaderId: req.user.id,
      uploaderName: req.user.name,
    });
    res.status(201).json(video);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/videos/:id/view — increment view count
router.post('/:id/view', async (req, res) => {
  try {
    await Video.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
