const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  name: { type: String, default: '' },         // group chat name (optional)
  isGroup: { type: Boolean, default: false },
  participants: [{ type: String }],            // user IDs
  participantNames: [{ type: String }],        // cached display names
  lastMessage: { type: String, default: '' },
  lastMessageAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);
