/**
 * Seed script — run once with: node seed.js
 * Creates a test user in MongoDB Atlas for login testing.
 */
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const TEST_USER = {
  name: 'Angel Lorea',
  email: 'angel@correo.com',
  password: 'Test1234', // bcrypt hashed automatically by User model
  career: 'Ingeniería en Software',
  semester: 5
};

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // Remove existing test user if present
    await User.deleteOne({ email: TEST_USER.email });

    const user = await User.create(TEST_USER);
    console.log(`✅ Test user created: ${user.email}`);
    console.log('------------------------------------------');
    console.log('  Email:    angel@correo.com');
    console.log('  Password: Test1234');
    console.log('------------------------------------------');
  } catch (err) {
    console.error('❌ Seed error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected');
  }
}

seed();
