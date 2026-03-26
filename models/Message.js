const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  text: { type: String, default: '' },
  mediaUrl: { type: String, default: null },
  mediaType: { type: String, enum: ['image', 'document', 'audio', null], default: null }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);
