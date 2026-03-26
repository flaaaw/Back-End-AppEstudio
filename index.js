const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const { uploadManager } = require('./config/cloudinaryConfig');
const Post = require('./models/Post');
const authRoutes = require('./routes/authRoutes');

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
    const { author, title, content, tags, timeInfo } = req.body;
    let fileUrl = null;

    if (req.file) {
      fileUrl = req.file.path; // Cloudinary assigns the URL here
    }

    const newPost = new Post({
      author,
      title,
      content,
      tags: tags ? tags.split(',') : [],
      timeInfo: timeInfo || 'Recientemente',
      mediaUrl: fileUrl
    });

    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
