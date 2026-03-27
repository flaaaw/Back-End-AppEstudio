const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const { uploadManager } = require('../config/cloudinaryConfig');
const { sendNotification } = require('../firebaseAdmin');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/chats/:userId  — get all chats for a user
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    if (req.params.userId !== req.user.id) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const chats = await Chat.find({ participants: req.user.id })
      .sort({ lastMessageAt: -1 });
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chats/one/:chatId — get a single chat's info
router.get('/one/:chatId', authMiddleware, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado' });
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chats  — create or retrieve a direct chat between two users
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { userId, userId2, userName, userName2, isGroup, groupName } = req.body;
    if (userId !== req.user.id) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    if (isGroup) {
      const chat = await Chat.create({
        name: groupName || 'Grupo',
        isGroup: true,
        participants: [userId, userId2],
        participantNames: [userName, userName2]
      });
      return res.status(201).json(chat);
    }

    // Look for existing DM
    let chat = await Chat.findOne({
      isGroup: false,
      participants: { $all: [userId, userId2], $size: 2 }
    });

    if (!chat) {
      chat = await Chat.create({
        isGroup: false,
        participants: [userId, userId2],
        participantNames: [userName, userName2]
      });
    }
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chats/:chatId/messages  — get messages in a chat
router.get('/:chatId/messages', authMiddleware, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado' });
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const before = req.query.before;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const filter = { chatId: req.params.chatId };
    if (before) filter.createdAt = { $lt: new Date(before) };

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);
    messages.reverse();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chats/:chatId/messages  — send a text message
router.post('/:chatId/messages', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
    }
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado' });
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const message = await Message.create({
      chatId: req.params.chatId,
      senderId: req.user.id,
      senderName: req.user.name,
      text: text.trim()
    });

    // Update chat's last message
    chat.lastMessage = chat.isGroup ? `${req.user.name}: ${text.trim()}` : text.trim();
    chat.lastMessageAt = new Date();
    await chat.save();

    const io = req.app.get('io');
    io.to(req.params.chatId).emit('message', message);

    // Send Push Notification
    sendNotification(
      `chat_${req.params.chatId}`,
      `Nuevo mensaje de ${senderName}`,
      text.trim().substring(0, 100),
      { chatId: req.params.chatId, type: 'chat' }
    );

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chats/:chatId/messages/media  — send message with file attachment
router.post('/:chatId/messages/media', authMiddleware, uploadManager.single('file'), async (req, res) => {
  try {
    const { text, mediaType } = req.body;
    const mediaUrl = req.file ? req.file.path : null;
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado' });
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const message = await Message.create({
      chatId: req.params.chatId,
      senderId: req.user.id,
      senderName: req.user.name,
      text: text || '',
      mediaUrl,
      mediaType: mediaType || null
    });

    chat.lastMessage = chat.isGroup ? `${req.user.name}: ${text || '📎 Archivo'}` : (text || '📎 Archivo adjunto');
    chat.lastMessageAt = new Date();
    await chat.save();

    const io = req.app.get('io');
    io.to(req.params.chatId).emit('message', message);

    // Send Push Notification
    sendNotification(
      `chat_${req.params.chatId}`,
      `Archivo de ${req.user.name}`,
      text || '📎 Archivo adjunto',
      { chatId: req.params.chatId, type: 'chat' }
    );

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/chats/:chatId — update group info (name/participants)
router.put('/:chatId', authMiddleware, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado' });
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const { name, participants, participantNames } = req.body;
    const updated = await Chat.findByIdAndUpdate(
      req.params.chatId,
      { $set: { name, participants, participantNames } },
      { new: true }
    );
    const io = req.app.get('io');
    io.to(req.params.chatId).emit('chat_updated', updated);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
