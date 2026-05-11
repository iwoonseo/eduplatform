const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../data/db');
const { authMiddleware } = require('../middleware/auth');

// Middleware: admin или moderator
function adminOrMod(req, res, next) {
  if (!['admin', 'moderator'].includes(req.user.role))
    return res.status(403).json({ message: 'Доступ запрещён' });
  next();
}

// Middleware: только moderator
function modOnly(req, res, next) {
  if (req.user.role !== 'moderator')
    return res.status(403).json({ message: 'Только модератор может выполнить это действие' });
  next();
}

// GET /api/admin/stats — общая статистика платформы
router.get('/stats', authMiddleware, adminOrMod, (req, res) => {
  const students   = db.users.filter(u => u.role === 'student').length;
  const instructors = db.users.filter(u => u.role === 'instructor').length;
  const courses    = db.courses.length;
  const published  = db.courses.filter(c => c.published).length;
  const enrollments = db.enrollments.length;
  const reviews    = db.reviews.length;
  const revenue    = db.enrollments.reduce((s, e) => {
    const c = db.courses.find(c => c.id === e.courseId);
    return s + (c ? c.price : 0);
  }, 0);
  const completedCourses = db.enrollments.filter(e => e.completed).length;

  res.json({ students, instructors, courses, published, enrollments, reviews, revenue, completedCourses });
});

// GET /api/admin/users — все пользователи
router.get('/users', authMiddleware, adminOrMod, (req, res) => {
  const users = db.users.map(u => {
    const { password: _, ...safe } = u;
    const enrollCount = db.enrollments.filter(e => e.userId === u.id).length;
    const courseCount = db.courses.filter(c => c.instructor === u.id).length;
    return { ...safe, enrollCount, courseCount };
  });
  res.json(users);
});

// PUT /api/admin/users/:id/role — изменить роль
// admin может назначать только student/instructor; moderator — любую роль
router.put('/users/:id/role', authMiddleware, adminOrMod, (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
  const { role } = req.body;
  const allRoles = ['student', 'instructor', 'admin', 'moderator'];
  const limitedRoles = ['student', 'instructor'];
  if (!allRoles.includes(role))
    return res.status(400).json({ message: 'Неверная роль' });
  if (req.user.role === 'admin' && !limitedRoles.includes(role))
    return res.status(403).json({ message: 'Администратор не может назначать эту роль' });
  if (user.id === req.user.id) return res.status(400).json({ message: 'Нельзя изменить свою роль' });
  user.role = role;
  const { password: _, ...safe } = user;
  res.json(safe);
});

// PUT /api/admin/users/:id/ban — заблокировать / разблокировать
router.put('/users/:id/ban', authMiddleware, adminOrMod, (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
  if (user.id === req.user.id) return res.status(400).json({ message: 'Нельзя заблокировать себя' });
  user.banned = !user.banned;
  const { password: _, ...safe } = user;
  res.json(safe);
});

// DELETE /api/admin/users/:id — удалить пользователя (только moderator)
router.delete('/users/:id', authMiddleware, modOnly, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ message: 'Нельзя удалить себя' });
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Пользователь не найден' });
  db.users.splice(idx, 1);
  // Удалить enrollments этого юзера
  db.enrollments = db.enrollments.filter(e => e.userId !== req.params.id);
  res.json({ message: 'Пользователь удалён' });
});

// GET /api/admin/courses — все курсы с деталями
router.get('/courses', authMiddleware, adminOrMod, (req, res) => {
  const courses = db.courses.map(c => {
    const instructor = db.users.find(u => u.id === c.instructor);
    const lessonsCount = db.lessons.filter(l => l.courseId === c.id).length;
    const enrollCount = db.enrollments.filter(e => e.courseId === c.id).length;
    return {
      ...c,
      instructorName: instructor ? instructor.name : 'Неизвестно',
      lessonsCount,
      enrollCount
    };
  });
  res.json(courses);
});

// PUT /api/admin/courses/:id/publish — опубликовать / снять с публикации
router.put('/courses/:id/publish', authMiddleware, adminOrMod, (req, res) => {
  const course = db.courses.find(c => c.id === req.params.id);
  if (!course) return res.status(404).json({ message: 'Курс не найден' });
  course.published = !course.published;
  res.json(course);
});

// PUT /api/admin/courses/:id/featured — поставить/убрать в избранное
router.put('/courses/:id/featured', authMiddleware, adminOrMod, (req, res) => {
  const course = db.courses.find(c => c.id === req.params.id);
  if (!course) return res.status(404).json({ message: 'Курс не найден' });
  course.featured = !course.featured;
  res.json(course);
});

// DELETE /api/admin/courses/:id — удалить курс (только moderator)
router.delete('/courses/:id', authMiddleware, modOnly, (req, res) => {
  const idx = db.courses.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Курс не найден' });
  db.courses.splice(idx, 1);
  db.lessons = db.lessons.filter(l => l.courseId !== req.params.id);
  db.enrollments = db.enrollments.filter(e => e.courseId !== req.params.id);
  db.reviews = db.reviews.filter(r => r.courseId !== req.params.id);
  res.json({ message: 'Курс удалён' });
});

// DELETE /api/admin/reviews/:id — удалить отзыв
router.delete('/reviews/:id', authMiddleware, adminOrMod, (req, res) => {
  const idx = db.reviews.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Отзыв не найден' });
  db.reviews.splice(idx, 1);
  res.json({ message: 'Отзыв удалён' });
});

// GET /api/admin/reviews — все отзывы
router.get('/reviews', authMiddleware, adminOrMod, (req, res) => {
  const reviews = db.reviews.map(r => {
    const course = db.courses.find(c => c.id === r.courseId);
    return { ...r, courseName: course ? course.title : 'Удалён' };
  });
  res.json(reviews);
});

// ── VIDEO MODERATION ──────────────────────────────────────────────────────────

// GET /api/admin/video-requests — все заявки на проверку видео
router.get('/video-requests', authMiddleware, adminOrMod, (req, res) => {
  res.json(db.videoRequests);
});

// PUT /api/admin/video-requests/:id/approve — одобрить видео
router.put('/video-requests/:id/approve', authMiddleware, adminOrMod, (req, res) => {
  const req_ = db.videoRequests.find(v => v.id === req.params.id);
  if (!req_) return res.status(404).json({ message: 'Заявка не найдена' });

  req_.status = 'approved';
  req_.reviewedAt = new Date().toISOString();
  req_.reviewNote = '';

  // Обновить урок
  const lesson = db.lessons.find(l => l.id === req_.lessonId);
  if (lesson) {
    lesson.videoStatus = 'approved';
    // Используем демо-видео (в реальном проекте — ссылка на облако)
    lesson.videoUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';
  }

  res.json({ message: 'Видео одобрено', request: req_ });
});

// PUT /api/admin/video-requests/:id/reject — отклонить видео
router.put('/video-requests/:id/reject', authMiddleware, adminOrMod, (req, res) => {
  const req_ = db.videoRequests.find(v => v.id === req.params.id);
  if (!req_) return res.status(404).json({ message: 'Заявка не найдена' });

  const { note } = req.body;
  req_.status = 'rejected';
  req_.reviewedAt = new Date().toISOString();
  req_.reviewNote = note || 'Видео не прошло проверку';

  // Обновить урок
  const lesson = db.lessons.find(l => l.id === req_.lessonId);
  if (lesson) {
    lesson.videoStatus = 'rejected';
    lesson.videoRejectNote = req_.reviewNote;
    lesson.videoUrl = '';
  }

  res.json({ message: 'Видео отклонено', request: req_ });
});

module.exports = router;
