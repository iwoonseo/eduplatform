const router = require('express').Router();
const db = require('../data/db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/users/dashboard — my enrolled courses + progress
router.get('/dashboard', authMiddleware, (req, res) => {
  const enrollments = db.enrollments.filter(e => e.userId === req.user.id);
  const myCourses = enrollments.map(e => {
    const course = db.courses.find(c => c.id === e.courseId);
    const totalLessons = db.lessons.filter(l => l.courseId === e.courseId).length;
    const progress = totalLessons > 0 ? Math.round((e.completedLessons.length / totalLessons) * 100) : 0;
    return { ...course, enrollment: e, progress, completedLessons: e.completedLessons, totalLessons };
  });

  const stats = {
    totalCourses: enrollments.length,
    completedCourses: enrollments.filter(e => e.completed).length,
    inProgress: enrollments.filter(e => !e.completed && e.completedLessons.length > 0).length,
    totalLessonsCompleted: enrollments.reduce((s, e) => s + e.completedLessons.length, 0)
  };

  res.json({ courses: myCourses, stats });
});

// GET /api/users/stats (for admin and moderator)
router.get('/stats', authMiddleware, (req, res) => {
  if (!['admin', 'moderator'].includes(req.user.role)) return res.status(403).json({ message: 'Нет доступа' });
  res.json({
    users: db.users.length,
    courses: db.courses.length,
    enrollments: db.enrollments.length,
    reviews: db.reviews.length,
    revenue: db.enrollments.reduce((s, e) => {
      const c = db.courses.find(c => c.id === e.courseId);
      return s + (c ? c.price : 0);
    }, 0)
  });
});

module.exports = router;
