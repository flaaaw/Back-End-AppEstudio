/**
 * Seed script — run once with: node seed.js
 * Creates 3 test users, sample posts, a direct chat and a group chat
 * with messages between them so you can test multi-user functionality.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User    = require('./models/User');
const Post    = require('./models/Post');
const Chat    = require('./models/Chat');
const Message = require('./models/Message');

// ─── Test Credentials ────────────────────────────────────────────────────────
const USERS = [
  { name: 'Angel Lorea',    email: 'angel@correo.com',   password: 'Test1234', career: 'Ingeniería en Software',     semester: 5 },
  { name: 'Sofía Ramírez',  email: 'sofia@correo.com',   password: 'Test1234', career: 'Mecatrónica',                semester: 3 },
  { name: 'Carlos Mendoza', email: 'carlos@correo.com',  password: 'Test1234', career: 'Sistemas Computacionales',   semester: 7 },
];

// ─── Seed ────────────────────────────────────────────────────────────────────
async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB Atlas\n');

    // ── 1. Clear existing test data ──────────────────────────────────
    const emails = USERS.map(u => u.email);
    const oldUsers = await User.find({ email: { $in: emails } });
    const oldIds   = oldUsers.map(u => u._id.toString());

    await User.deleteMany({ email: { $in: emails } });
    await Post.deleteMany({ authorId: { $in: oldIds } });
    await Chat.deleteMany({ participants: { $elemMatch: { $in: oldIds } } });
    await Message.deleteMany({ senderId: { $in: oldIds } });
    console.log('🗑  Cleared old test data');

    // ── 2. Create users (model hashes passwords via pre-save) ────────
    const createdUsers = await User.insertMany(USERS);
    const [angel, sofia, carlos] = createdUsers;
    console.log(`👤 Users created:`);
    USERS.forEach(u => console.log(`   ${u.email}  /  ${u.password}`));

    // ── 3. Create posts ───────────────────────────────────────────────
    await Post.insertMany([
      {
        author: angel.name,
        authorId: angel._id.toString(),
        title: 'Duda sobre Matrices en Álgebra Lineal',
        content: '¿Alguien podría explicarme cómo sacar la matriz inversa por determinantes? Estoy atascado en el ejercicio 4.',
        tags: ['Matemáticas', 'Duda'],
        timeInfo: 'Hace 2h',
        likes: 12,
        comments: 5,
      },
      {
        author: sofia.name,
        authorId: sofia._id.toString(),
        title: 'Apuntes de Termodinámica',
        content: 'Les comparto mi resumen del primer parcial. ¡Espero les sirva! Cubre los 3 primeros temas con ejemplos resueltos.',
        tags: ['Química', 'Material'],
        timeInfo: 'Hace 5h',
        likes: 45,
        comments: 12,
      },
      {
        author: carlos.name,
        authorId: carlos._id.toString(),
        title: 'Repositorio de Estructuras de Datos en Python',
        content: 'Subí mi repositorio con implementaciones de pilas, colas, árboles binarios y grafos. Todo comentado y con casos de prueba.',
        tags: ['Programación', 'Material'],
        timeInfo: 'Ayer',
        likes: 30,
        comments: 8,
      },
      {
        author: angel.name,
        authorId: angel._id.toString(),
        title: '¿Alguien tiene el libro de Runge-Kutta?',
        content: 'Necesito el libro "Métodos Numéricos para Ingenieros" de Chapra. ¿Alguien lo tiene en PDF?',
        tags: ['Matemáticas', 'Duda'],
        timeInfo: 'Hace 3h',
        likes: 5,
        comments: 2,
      },
    ]);
    console.log('\n📝 Posts created: 4 sample posts');

    // ── 4. Create a direct chat (Angel ↔ Sofía) ──────────────────────
    const dmChat = await Chat.create({
      isGroup: false,
      participants: [angel._id.toString(), sofia._id.toString()],
      participantNames: [angel.name, sofia.name],
      lastMessage: '¡Claro, con gusto te explico!',
      lastMessageAt: new Date(),
    });

    await Message.insertMany([
      { chatId: dmChat._id, senderId: angel._id.toString(),  senderName: angel.name,  text: 'Hola Sofía, ¿me puedes ayudar con álgebra lineal?' },
      { chatId: dmChat._id, senderId: sofia._id.toString(),  senderName: sofia.name,  text: '¡Hola Angel! Claro, ¿qué parte te cuesta más?' },
      { chatId: dmChat._id, senderId: angel._id.toString(),  senderName: angel.name,  text: 'La parte de matrices inversas con determinantes' },
      { chatId: dmChat._id, senderId: sofia._id.toString(),  senderName: sofia.name,  text: '¡Claro, con gusto te explico!' },
    ]);
    console.log('\n💬 DM Chat created: Angel ↔ Sofía (4 messages)');

    // ── 5. Create a group chat (Angel + Sofía + Carlos) ──────────────
    const groupChat = await Chat.create({
      name: 'Grupo Estudio — Parcial 2',
      isGroup: true,
      participants: [angel._id.toString(), sofia._id.toString(), carlos._id.toString()],
      participantNames: [angel.name, sofia.name, carlos.name],
      lastMessage: 'Yo llevo el resumen de termodinámica',
      lastMessageAt: new Date(),
    });

    await Message.insertMany([
      { chatId: groupChat._id, senderId: carlos._id.toString(), senderName: carlos.name, text: 'Bienvenidos al grupo de estudio para el parcial 👋' },
      { chatId: groupChat._id, senderId: sofia._id.toString(),  senderName: sofia.name,  text: '¡Gracias Carlos! ¿A qué hora nos reunimos?' },
      { chatId: groupChat._id, senderId: angel._id.toString(),  senderName: angel.name,  text: '¿Puede ser el jueves a las 5pm?' },
      { chatId: groupChat._id, senderId: carlos._id.toString(), senderName: carlos.name, text: 'Perfecto. Yo llevo el resumen de termodinámica.' },
      { chatId: groupChat._id, senderId: sofia._id.toString(),  senderName: sofia.name,  text: 'Yo llevo el resumen de termodinámica' },
    ]);
    console.log('👥 Group Chat created: 3 participants (5 messages)');

    // ── Summary ───────────────────────────────────────────────────────
    console.log('\n────────────────────────────────────────────');
    console.log('  CREDENCIALES DE PRUEBA');
    console.log('────────────────────────────────────────────');
    USERS.forEach(u => {
      console.log(`  📧 ${u.email}`);
      console.log(`  🔑 ${u.password}`);
      console.log(`  👤 ${u.name} — ${u.career}`);
      console.log('  ─────────────────────────────────────────');
    });

  } catch (err) {
    console.error('❌ Seed error:', err.message);
    console.error(err);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected');
  }
}

seed();
