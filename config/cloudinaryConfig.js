const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Por defecto, Cloudinary intenta adivinar (útil para imágenes y videos)
    let resource_type = 'auto';
    
    // Si el archivo NO es imagen ni video (ej: PDF, DOCX, ZIP), lo forzamos como 'raw'
    if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
      resource_type = 'raw';
    }

    return {
      folder: 'appestudio_archivos',
      resource_type: resource_type,
    };
  },
});

const uploadManager = multer({ storage: storage });

module.exports = { cloudinary, uploadManager };
