const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const { uploadManager } = require('./config/cloudinaryConfig');
const Post  = require('./models/Post');
const User  = require('./models/User');
const Comment = require('./models/Comment');
const authRoutes  = require('./routes/authRoutes');
const chatRoutes  = require('./routes/chatRoutes');
const videoRoutes = require('./routes/videoRoutes');
const authMiddleware = require('./middleware/authMiddleware');

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
// Get all posts (with pagination)
app.get('/api/posts', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page  = parseInt(req.query.page)  || 1;
    const skip  = (page - 1) * limit;

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    res.json(posts);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Get posts by user (with pagination)
app.get('/api/posts/user/:userId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const page  = parseInt(req.query.page)  || 1;
    const skip  = (page - 1) * limit;

    const posts = await Post.find({ authorId: req.params.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
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

// Get all comments for a post
app.get('/api/posts/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.id }).sort({ createdAt: 1 });
    res.json(comments);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Create a comment (authenticated)
app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const { authorId, authorName, authorAvatar, content } = req.body;
    if (!content) return res.status(400).json({ error: 'Contenido requerido' });

    const newComment = new Comment({
      postId: req.params.id,
      authorId,
      authorName,
      authorAvatar: authorAvatar || '',
      content
    });

    const saved = await newComment.save();
    
    // Increment post count
    await Post.findByIdAndUpdate(req.params.id, { $inc: { comments: 1 } });
    
    res.status(201).json(saved);
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

// Upload avatar for a user
app.put('/api/users/:id/avatar', uploadManager.single('avatar'), async (req, res) => {
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

