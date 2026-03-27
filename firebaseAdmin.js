const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

const initFromEnv = () => {
  const project_id = process.env.FIREBASE_PROJECT_ID;
  const private_key = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const client_email = process.env.FIREBASE_CLIENT_EMAIL;
  if (!project_id || !private_key || !client_email) return false;
  admin.initializeApp({
    credential: admin.credential.cert({ project_id, private_key, client_email })
  });
  return true;
};

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  console.log('Firebase Admin initialized from file 🔔');
} else if (initFromEnv()) {
  console.log('Firebase Admin initialized from env vars 🔔');
} else {
  console.log('Firebase credentials not found. Notifications disabled ⚠️');
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
