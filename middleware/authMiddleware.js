const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'appestudio_secret_key_2024';

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado — token requerido' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, name, email }
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

module.exports = authMiddleware;
