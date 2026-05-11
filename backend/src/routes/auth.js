const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../data/db');
const { JWT_SECRET, authMiddleware } = require('../middleware/auth');

// маршруты авторизации: регистрация, вход, получение профиля

// POST /api/auth/register — новый пользователь
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // базовая проверка полей
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Заполните все поля' });
    if (password.length < 6)
      return res.status(400).json({ message: 'Пароль минимум 6 символов' });

    // проверяем нет ли уже такого email в базе
    const exists = db.users.find(u => u.email === email);
    if (exists) return res.status(400).json({ message: 'Email уже зарегистрирован' });

    // admin и moderator нельзя выбрать при регистрации — только через панель
    const allowedRoles = ['student', 'instructor'];
    const userRole = allowedRoles.includes(role) ? role : 'student';

    // хешируем пароль перед сохранением — bcrypt сам добавляет соль
    const hashed = await bcrypt.hash(password, 10);

    const newUser = {
      id: uuidv4(),
      name,
      email,
      password: hashed,
      role: userRole,
      // аватар генерируется автоматически из имени — удобно для демо
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`,
      bio: '',
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);

    // выдаём токен сразу после регистрации чтобы не надо было отдельно логиниться
    const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _pw, ...safeUser } = newUser; // пароль не отдаём клиенту
    res.status(201).json({ token, user: safeUser });
  } catch (err) {
    console.error('Ошибка при регистрации:', err.message);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// POST /api/auth/login — вход в систему
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // ищем пользователя по email (без учёта регистра не делал — TODO)
    const user = db.users.find(u => u.email === email);
    if (!user) return res.status(400).json({ message: 'Неверный email или пароль' });

    // нельзя войти если аккаунт заблокирован
    if (user.banned) return res.status(403).json({ message: 'Аккаунт заблокирован. Обратитесь к администратору.' });

    const isPasswordOk = await bcrypt.compare(password, user.password);
    if (!isPasswordOk) return res.status(400).json({ message: 'Неверный email или пароль' });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _pw, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
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
