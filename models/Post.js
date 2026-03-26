const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: String,
    required: true
  },
  timeInfo: {
    type: String,
    default: 'Recientemente'
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  mediaUrl: {
    type: String,  // Here we store the Cloudinary URL
    default: null
  },
  likes: {
    type: Number,
    default: 0
  },
  comments: {
    type: Number,
    default: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
