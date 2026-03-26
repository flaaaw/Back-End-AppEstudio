const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const { uploadManager } = require('./config/cloudinaryConfig');
const Post = require('./models/Post');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => {
      console.error('❌ MongoDB Connection Error. Make sure you set the MONGO_URI in .env');
      console.error(err);
  });

// --- ROUTES ---
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: '🚀 AppEstudio API corriendo', version: '1.0.0' });
});
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);

// 1. Get all community posts
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Create a new post with an optional file upload to Cloudinary
app.post('/api/posts', uploadManager.single('file'), async (req, res) => {
  try {
    const { author, authorId, title, content, tags, timeInfo } = req.body;
    let fileUrl = null;

    if (req.file) {
      fileUrl = req.file.path; // Cloudinary assigns the URL here
    }

    const newPost = new Post({
      author,
      authorId: authorId || '',
      title,
      content,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      timeInfo: timeInfo || 'Recientemente',
      mediaUrl: fileUrl
    });

    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Get posts by a specific user
app.get('/api/posts/user/:userId', async (req, res) => {
  try {
    const posts = await Post.find({ authorId: req.params.userId }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Search users by name or email
app.get('/api/users/search', async (req, res) => {
  const User = require('./models/User');
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
