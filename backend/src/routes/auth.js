const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../data/db');
const { JWT_SECRET, authMiddleware } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Заполните все поля' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Пароль минимум 6 символов' });

    const exists = db.users.find(u => u.email === email);
    if (exists) return res.status(400).json({ message: 'Email уже зарегистрирован' });

    // Разрешённые роли при регистрации (admin нельзя выбрать)
    const allowedRoles = ['student', 'instructor'];
    const userRole = allowedRoles.includes(role) ? role : 'student';

    const hashed = await bcrypt.hash(password, 10);
    const user = {
      id: uuidv4(),
      name,
      email,
      password: hashed,
      role: userRole,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`,
      bio: '',
      createdAt: new Date().toISOString()
    };
    db.users.push(user);

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safe } = user;
    res.status(201).json({ token, user: safe });
  } catch (err) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.users.find(u => u.email === email);
    if (!user) return res.status(400).json({ message: 'Неверный email или пароль' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: 'Неверный email или пароль' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safe } = user;
    res.json({ token, user: safe });
  } catch {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
  const { password: _, ...safe } = user;
  res.json(safe);
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
  const { name, bio } = req.body;
  if (name) user.name = name;
  if (bio !== undefined) user.bio = bio;
  const { password: _, ...safe } = user;
  res.json(safe);
});

module.exports = router;
