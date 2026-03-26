const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'appestudio_secret_key_2024';
const generateToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: '7d' });

// Validation helpers
const validateEmail = (email) => /^\S+@\S+\.\S+$/.test(email);
const validatePassword = (password) => {
  if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres';
  if (!/[A-Z]/.test(password)) return 'La contraseña debe contener al menos una mayúscula';
  if (!/[0-9]/.test(password)) return 'La contraseña debe contener al menos un número';
  return null;
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, career, semester } = req.body;
    const errors = {};

    // Field validations
    if (!name || name.trim().length < 2)
      errors.name = 'El nombre debe tener al menos 2 caracteres';
    if (!email || !validateEmail(email))
      errors.email = 'Ingresa un correo electrónico válido';
    if (!password) {
      errors.password = 'La contraseña es requerida';
    } else {
      const passError = validatePassword(password);
      if (passError) errors.password = passError;
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    // Check duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ errors: { email: 'Este correo ya está registrado' } });
    }

    const user = await User.create({ name, email, password, career, semester });
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, career: user.career, semester: user.semester }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const errors = {};

    if (!email || !validateEmail(email))
      errors.email = 'Ingresa un correo electrónico válido';
    if (!password || password.length < 1)
      errors.password = 'La contraseña es requerida';

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ errors: { email: 'No existe una cuenta con este correo' } });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ errors: { password: 'Contraseña incorrecta' } });
    }

    const token = generateToken(user._id);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, career: user.career, semester: user.semester }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
