const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  topic:       { type: String, default: 'General' },
  videoUrl:    { type: String, required: true },   // Cloudinary URL
  thumbnailUrl:{ type: String, default: null },
  duration:    { type: String, default: '' },      // e.g. "12:45"
  uploaderId:  { type: String, required: true },
  uploaderName:{ type: String, required: true },
  views:       { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Video', videoSchema);
