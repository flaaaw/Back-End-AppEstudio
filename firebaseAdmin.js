const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('Firebase Admin initialized 🔔');
} else {
  console.log('Firebase: serviceAccountKey.json not found. Notifications disabled ⚠️');
}

const sendNotification = async (topic, title, body, data = {}) => {
  if (!admin.apps.length) return;

  const message = {
    notification: { title, body },
    data: data,
    topic: topic
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Notification sent successfully:', response);
  } catch (error) {
    console.log('Error sending notification:', error);
  }
};

module.exports = { admin, sendNotification };
