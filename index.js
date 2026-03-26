const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const { uploadManager } = require('./config/cloudinaryConfig');
const Post  = require('./models/Post');
const User  = require('./models/User');
const authRoutes  = require('./routes/authRoutes');
const chatRoutes  = require('./routes/chatRoutes');
const videoRoutes = require('./routes/videoRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
  });

// ─── ROUTES ──────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: '🚀 AppEstudio API corriendo', version: '2.0.0' });
});

app.use('/api/auth',   authRoutes);
app.use('/api/chats',  chatRoutes);
app.use('/api/videos', videoRoutes);

// ── POSTS ──────────────────────────────────────────────────────────────────
// Get all posts (newest first)
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).limit(100);
    res.json(posts);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Get posts by user
app.get('/api/posts/user/:userId', async (req, res) => {
  try {
    const posts = await Post.find({ authorId: req.params.userId }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Create post (with optional file upload to Cloudinary)
app.post('/api/posts', uploadManager.single('file'), async (req, res) => {
  try {
    const { author, authorId, title, content, tags, timeInfo } = req.body;
    const newPost = new Post({
      author,
      authorId: authorId || '',
      title,
      content,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      timeInfo: timeInfo || 'Recientemente',
      mediaUrl: req.file ? req.file.path : null
    });
    const saved = await newPost.save();
    res.status(201).json(saved);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Delete own post
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { userId } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post no encontrado' });
    if (post.authorId !== userId) return res.status(403).json({ error: 'No autorizado' });
    await post.deleteOne();
    res.json({ ok: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Toggle like on a post
app.post('/api/posts/:id/like', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId requerido' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post no encontrado' });
    const idx = post.likedBy.indexOf(userId);
    if (idx === -1) {
      post.likedBy.push(userId);
      post.likes = post.likedBy.length;
    } else {
      post.likedBy.splice(idx, 1);
      post.likes = post.likedBy.length;
    }
    await post.save();
    res.json({ likes: post.likes, liked: idx === -1 });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Increment comment count (basic; no full Comment model yet)
app.post('/api/posts/:id/comment', async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, { $inc: { comments: 1 } }, { new: true });
    res.json({ comments: post.comments });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ── USERS ──────────────────────────────────────────────────────────────────
// Search users by name or email
app.get('/api/users/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json([]);
    const users = await User.find({
      $or: [
        { name:  { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    }).select('_id name email career semester').limit(10);
    res.json(users);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Update own profile (no password change here)
app.put('/api/users/:id', async (req, res) => {
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

// ─────────────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

