const cloudinary = require('cloudinary').v2;
require('dotenv').config({ path: __dirname + '/../.env' }); // Just in case, try direct path if we run this script directly
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);

cloudinary.uploader.upload('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', {
  folder: 'test_folder',
  resource_type: 'auto'
}).then(result => {
  console.log('Upload successful:', result.secure_url);
}).catch(err => {
  console.error('Upload error:', err);
});
