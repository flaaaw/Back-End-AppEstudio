const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const { uploadManager } = require('../config/cloudinaryConfig');

// GET /api/chats/:userId  — get all chats for a user
router.get('/:userId', async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.params.userId })
      .sort({ lastMessageAt: -1 });
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chats/one/:chatId — get a single chat's info
router.get('/one/:chatId', async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado' });
    res.json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chats  — create or retrieve a direct chat between two users
router.post('/', async (req, res) => {
  try {
    const { userId, userId2, userName, userName2, isGroup, groupName } = req.body;

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
router.get('/:chatId/messages', async (req, res) => {
  try {
    const messages = await Message.find({ chatId: req.params.chatId })
      .sort({ createdAt: 1 })
      .limit(100);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chats/:chatId/messages  — send a text message
router.post('/:chatId/messages', async (req, res) => {
  try {
    const { senderId, senderName, text } = req.body;
    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
    }

    const message = await Message.create({
      chatId: req.params.chatId,
      senderId,
      senderName,
      text: text.trim()
    });

    // Update chat's last message
    const chat = await Chat.findById(req.params.chatId);
    if (chat) {
      chat.lastMessage = chat.isGroup ? `${senderName}: ${text.trim()}` : text.trim();
      chat.lastMessageAt = new Date();
      await chat.save();
    }

    const io = req.app.get('io');
    io.to(req.params.chatId).emit('message', message);

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chats/:chatId/messages/media  — send message with file attachment
router.post('/:chatId/messages/media', uploadManager.single('file'), async (req, res) => {
  try {
    const { senderId, senderName, text, mediaType } = req.body;
    const mediaUrl = req.file ? req.file.path : null;

    const message = await Message.create({
      chatId: req.params.chatId,
      senderId, senderName,
      text: text || '',
      mediaUrl,
      mediaType: mediaType || null
    });

    const chat = await Chat.findById(req.params.chatId);
    if (chat) {
      chat.lastMessage = chat.isGroup ? `${senderName}: ${text || '📎 Archivo'}` : (text || '📎 Archivo adjunto');
      chat.lastMessageAt = new Date();
      await chat.save();
    }

    const io = req.app.get('io');
    io.to(req.params.chatId).emit('message', message);

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/chats/:chatId — update group info (name/participants)
router.put('/:chatId', async (req, res) => {
  try {
    const { name, participants, participantNames } = req.body;
    const updated = await Chat.findByIdAndUpdate(
      req.params.chatId,
      { $set: { name, participants, participantNames } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Chat no encontrado' });

    const io = req.app.get('io');
    io.to(req.params.chatId).emit('chat_updated', updated);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
