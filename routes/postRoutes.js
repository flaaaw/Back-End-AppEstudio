const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { uploadManager } = require('../config/cloudinaryConfig');
const { sendNotification } = require('../firebaseAdmin');

// GET /api/posts — List all posts with pagination
router.get('/', async (req, res) => {
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

// GET /api/posts/search — Search posts by title, content, or tags
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json([]);
    
    const query = {
      $or: [
        { title:   { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
        { tags:    { $in: [new RegExp(q, 'i')] } }
      ]
    };
    
    const posts = await Post.find(query).sort({ createdAt: -1 }).limit(20);
    res.json(posts);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// GET /api/posts/user/:userId — Get posts by specific user
router.get('/user/:userId', async (req, res) => {
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

// POST /api/posts — Create a new post
router.post('/', uploadManager.single('file'), async (req, res) => {
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

    // Send Notification
    sendNotification(
      'all_users',
      'Nueva publicación en la comunidad',
      `${saved.author} ha compartido algo nuevo: "${saved.content.substring(0, 50)}..."`,
      { type: 'post', postId: saved._id.toString() }
    );

    res.status(201).json(saved);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// DELETE /api/posts/:id — Delete own post
router.delete('/:id', async (req, res) => {
  try {
    const { userId } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post no encontrado' });
    if (post.authorId !== userId) return res.status(403).json({ error: 'No autorizado' });
    await post.deleteOne();
    res.json({ ok: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST /api/posts/:id/like — Toggle like
router.post('/:id/like', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId requerido' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post no encontrado' });
    const idx = post.likedBy.indexOf(userId);
    if (idx === -1) {
      post.likedBy.push(userId);
    } else {
      post.likedBy.splice(idx, 1);
    }
    post.likes = post.likedBy.length;
    await post.save();
    res.json({ likes: post.likes, liked: idx === -1 });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// GET /api/posts/:id/comments — Get all comments for a post
router.get('/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.id }).sort({ createdAt: 1 });
    res.json(comments);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// POST /api/posts/:id/comments — Create a comment
router.post('/:id/comments', async (req, res) => {
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
    
    // Increment post comment count
    await Post.findByIdAndUpdate(req.params.id, { $inc: { comments: 1 } });
    
    res.status(201).json(saved);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
