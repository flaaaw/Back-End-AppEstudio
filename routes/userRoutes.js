const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { uploadManager } = require('../config/cloudinaryConfig');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/users/search — Search users by name or email
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json([]);
    const users = await User.find({
      $or: [
        { name:  { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    }).select('_id name email career semester avatarUrl').limit(10);
    res.json(users);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// GET /api/users/:id — Get a single user profile
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// PUT /api/users/:id/avatar — Upload avatar
router.put('/:id/avatar', uploadManager.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Se requiere una imagen' });
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { avatarUrl: req.file.path } },
      { new: true, select: '-password' }
    );
    if (!updated) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ avatarUrl: updated.avatarUrl });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// PUT /api/users/:id — Update profile
router.put('/:id', async (req, res) => {
  try {
    const { name, career, semester, avatarUrl } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { name, career: career || 'Sin especificar', semester: semester || 1, avatarUrl } },
      { new: true, select: '-password' }
    );
    if (!updated) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(updated);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
