const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../data/db');
const { authMiddleware } = require('../middleware/auth');

// Middleware: только для admin
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Доступ запрещён' });
  next();
}

// GET /api/admin/stats — общая статистика платформы
router.get('/stats', authMiddleware, adminOnly, (req, res) => {
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
router.get('/users', authMiddleware, adminOnly, (req, res) => {
  const users = db.users.map(u => {
    const { password: _, ...safe } = u;
    const enrollCount = db.enrollments.filter(e => e.userId === u.id).length;
    const courseCount = db.courses.filter(c => c.instructor === u.id).length;
    return { ...safe, enrollCount, courseCount };
  });
  res.json(users);
});

// PUT /api/admin/users/:id/role — изменить роль
router.put('/users/:id/role', authMiddleware, adminOnly, (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
  const { role } = req.body;
  if (!['student', 'instructor', 'admin'].includes(role))
    return res.status(400).json({ message: 'Неверная роль' });
  if (user.id === req.user.id) return res.status(400).json({ message: 'Нельзя изменить свою роль' });
  user.role = role;
  const { password: _, ...safe } = user;
  res.json(safe);
});

// PUT /api/admin/users/:id/ban — заблокировать / разблокировать
router.put('/users/:id/ban', authMiddleware, adminOnly, (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
  if (user.id === req.user.id) return res.status(400).json({ message: 'Нельзя заблокировать себя' });
  user.banned = !user.banned;
  const { password: _, ...safe } = user;
  res.json(safe);
});

// DELETE /api/admin/users/:id — удалить пользователя
router.delete('/users/:id', authMiddleware, adminOnly, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ message: 'Нельзя удалить себя' });
  const idx = db.users.findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Пользователь не найден' });
  db.users.splice(idx, 1);
  // Удалить enrollments этого юзера
  db.enrollments = db.enrollments.filter(e => e.userId !== req.params.id);
  res.json({ message: 'Пользователь удалён' });
});

// GET /api/admin/courses — все курсы с деталями
router.get('/courses', authMiddleware, adminOnly, (req, res) => {
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
router.put('/courses/:id/publish', authMiddleware, adminOnly, (req, res) => {
  const course = db.courses.find(c => c.id === req.params.id);
  if (!course) return res.status(404).json({ message: 'Курс не найден' });
  course.published = !course.published;
  res.json(course);
});

// PUT /api/admin/courses/:id/featured — поставить/убрать в избранное
router.put('/courses/:id/featured', authMiddleware, adminOnly, (req, res) => {
  const course = db.courses.find(c => c.id === req.params.id);
  if (!course) return res.status(404).json({ message: 'Курс не найден' });
  course.featured = !course.featured;
  res.json(course);
});

// DELETE /api/admin/courses/:id — удалить курс
router.delete('/courses/:id', authMiddleware, adminOnly, (req, res) => {
  const idx = db.courses.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Курс не найден' });
  db.courses.splice(idx, 1);
  db.lessons = db.lessons.filter(l => l.courseId !== req.params.id);
  db.enrollments = db.enrollments.filter(e => e.courseId !== req.params.id);
  db.reviews = db.reviews.filter(r => r.courseId !== req.params.id);
  res.json({ message: 'Курс удалён' });
});

// DELETE /api/admin/reviews/:id — удалить отзыв
router.delete('/reviews/:id', authMiddleware, adminOnly, (req, res) => {
  const idx = db.reviews.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Отзыв не найден' });
  db.reviews.splice(idx, 1);
  res.json({ message: 'Отзыв удалён' });
});

// GET /api/admin/reviews — все отзывы
router.get('/reviews', authMiddleware, adminOnly, (req, res) => {
  const reviews = db.reviews.map(r => {
    const course = db.courses.find(c => c.id === r.courseId);
    return { ...r, courseName: course ? course.title : 'Удалён' };
  });
  res.json(reviews);
});

module.exports = router;
