const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../data/db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/chat/conversations — мои диалоги
router.get('/conversations', authMiddleware, (req, res) => {
  const convs = db.conversations
    .filter(c => c.participants.includes(req.user.id))
    .map(c => {
      const other = c.participants.find(id => id !== req.user.id);
      const otherUser = db.users.find(u => u.id === other);
      const unread = db.messages.filter(m => m.conversationId === c.id && m.senderId !== req.user.id && !m.read).length;
      return {
        ...c,
        otherUser: otherUser ? { id: otherUser.id, name: otherUser.name, avatar: otherUser.avatar, role: otherUser.role } : null,
        unreadCount: unread
      };
    })
    .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
  res.json(convs);
});

// GET /api/chat/conversations/:id/messages — сообщения диалога
router.get('/conversations/:id/messages', authMiddleware, (req, res) => {
  const conv = db.conversations.find(c => c.id === req.params.id);
  if (!conv) return res.status(404).json({ message: 'Диалог не найден' });
  if (!conv.participants.includes(req.user.id))
    return res.status(403).json({ message: 'Нет доступа к этому диалогу' });

  // Пометить как прочитанные
  db.messages
    .filter(m => m.conversationId === req.params.id && m.senderId !== req.user.id)
    .forEach(m => { m.read = true; });

  const messages = db.messages
    .filter(m => m.conversationId === req.params.id)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  res.json({ conversation: conv, messages });
});

// POST /api/chat/conversations — начать диалог (студент → препод)
router.post('/conversations', authMiddleware, (req, res) => {
  const { instructorId, courseId } = req.body;
  if (!instructorId) return res.status(400).json({ message: 'Укажите преподавателя' });

  const instructor = db.users.find(u => u.id === instructorId && (u.role === 'instructor' || u.role === 'admin'));
  if (!instructor) return res.status(404).json({ message: 'Преподаватель не найден' });

  // Проверить существующий диалог
  const existing = db.conversations.find(c =>
    c.participants.includes(req.user.id) &&
    c.participants.includes(instructorId) &&
    (!courseId || c.courseId === courseId)
  );
  if (existing) return res.json(existing);

  const course = courseId ? db.courses.find(c => c.id === courseId) : null;
  const conv = {
    id: uuidv4(),
    participants: [req.user.id, instructorId],
    courseId: courseId || null,
    courseName: course ? course.title : null,
    createdAt: new Date().toISOString(),
    lastMessage: '',
    lastMessageAt: new Date().toISOString()
  };
  db.conversations.push(conv);
  res.status(201).json(conv);
});

// POST /api/chat/conversations/:id/messages — отправить сообщение
router.post('/conversations/:id/messages', authMiddleware, (req, res) => {
  const conv = db.conversations.find(c => c.id === req.params.id);
  if (!conv) return res.status(404).json({ message: 'Диалог не найден' });
  if (!conv.participants.includes(req.user.id))
    return res.status(403).json({ message: 'Нет доступа' });

  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ message: 'Сообщение не может быть пустым' });

  const sender = db.users.find(u => u.id === req.user.id);
  const message = {
    id: uuidv4(),
    conversationId: req.params.id,
    senderId: req.user.id,
    senderName: sender.name,
    senderAvatar: sender.avatar,
    text: text.trim(),
    createdAt: new Date().toISOString(),
    read: false
  };
  db.messages.push(message);

  // Обновить последнее сообщение
  conv.lastMessage = text.trim();
  conv.lastMessageAt = message.createdAt;

  res.status(201).json(message);
});

// GET /api/chat/instructors — список преподавателей для начала диалога
router.get('/instructors', authMiddleware, (req, res) => {
  const instructors = db.users
    .filter(u => u.role === 'instructor')
    .map(u => {
      const { password: _, ...safe } = u;
      const courseCount = db.courses.filter(c => c.instructor === u.id).length;
      return { ...safe, courseCount };
    });
  res.json(instructors);
});

module.exports = router;
