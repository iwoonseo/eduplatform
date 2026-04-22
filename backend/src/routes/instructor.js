const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../data/db');
const { authMiddleware } = require('../middleware/auth');

// Middleware: только для instructor
function instructorOnly(req, res, next) {
  if (req.user.role !== 'instructor' && req.user.role !== 'admin')
    return res.status(403).json({ message: 'Доступ только для преподавателей' });
  next();
}

// GET /api/instructor/dashboard — статистика препода
router.get('/dashboard', authMiddleware, instructorOnly, (req, res) => {
  const myCourses = db.courses.filter(c => c.instructor === req.user.id);
  const myLessons = db.lessons.filter(l => myCourses.some(c => c.id === l.courseId));

  const totalStudents = myCourses.reduce((s, c) => {
    return s + db.enrollments.filter(e => e.courseId === c.id).length;
  }, 0);

  const totalRevenue = myCourses.reduce((s, c) => {
    const enroll = db.enrollments.filter(e => e.courseId === c.id).length;
    return s + enroll * c.price;
  }, 0);

  const totalReviews = db.reviews.filter(r => myCourses.some(c => c.id === r.courseId)).length;

  const avgRating = myCourses.length
    ? Math.round((myCourses.reduce((s, c) => s + c.rating, 0) / myCourses.length) * 10) / 10
    : 0;

  const coursesWithStats = myCourses.map(c => {
    const enrollCount = db.enrollments.filter(e => e.courseId === c.id).length;
    const lessonCount = db.lessons.filter(l => l.courseId === c.id).length;
    const reviews = db.reviews.filter(r => r.courseId === c.id);
    const completedStudents = db.enrollments.filter(e => e.courseId === c.id && e.completed).length;
    return { ...c, enrollCount, lessonCount, reviewCount: reviews.length, completedStudents };
  });

  res.json({
    courses: coursesWithStats,
    stats: { totalCourses: myCourses.length, totalStudents, totalRevenue, totalReviews, avgRating }
  });
});

// GET /api/instructor/courses — мои курсы
router.get('/courses', authMiddleware, instructorOnly, (req, res) => {
  const courses = db.courses
    .filter(c => c.instructor === req.user.id)
    .map(c => {
      const enrollCount = db.enrollments.filter(e => e.courseId === c.id).length;
      const lessonCount = db.lessons.filter(l => l.courseId === c.id).length;
      return { ...c, enrollCount, lessonCount };
    });
  res.json(courses);
});

// POST /api/instructor/courses — создать курс
router.post('/courses', authMiddleware, instructorOnly, (req, res) => {
  const { title, description, category, level, price, originalPrice, duration, thumbnail, tags, language } = req.body;

  if (!title || !description || !category || !level)
    return res.status(400).json({ message: 'Заполните обязательные поля: название, описание, категория, уровень' });

  const instructor = db.users.find(u => u.id === req.user.id);
  const course = {
    id: uuidv4(),
    title,
    description,
    instructor: req.user.id,
    instructorName: instructor.name,
    category,
    level,
    price: Number(price) || 0,
    originalPrice: Number(originalPrice) || Number(price) || 0,
    duration: duration || '',
    lessonCount: 0,
    thumbnail: thumbnail || 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=600&auto=format&fit=crop&q=60',
    tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
    rating: 0,
    reviewCount: 0,
    studentCount: 0,
    language: language || 'Русский',
    certificate: true,
    featured: false,
    published: false,
    createdAt: new Date().toISOString()
  };
  db.courses.push(course);
  res.status(201).json(course);
});

// PUT /api/instructor/courses/:id — редактировать курс
router.put('/courses/:id', authMiddleware, instructorOnly, (req, res) => {
  const course = db.courses.find(c => c.id === req.params.id);
  if (!course) return res.status(404).json({ message: 'Курс не найден' });
  if (course.instructor !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ message: 'Это не ваш курс' });

  const { title, description, category, level, price, originalPrice, duration, thumbnail, tags, language } = req.body;
  if (title) course.title = title;
  if (description) course.description = description;
  if (category) course.category = category;
  if (level) course.level = level;
  if (price !== undefined) course.price = Number(price);
  if (originalPrice !== undefined) course.originalPrice = Number(originalPrice);
  if (duration) course.duration = duration;
  if (thumbnail) course.thumbnail = thumbnail;
  if (tags) course.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
  if (language) course.language = language;

  res.json(course);
});

// DELETE /api/instructor/courses/:id — удалить свой курс
router.delete('/courses/:id', authMiddleware, instructorOnly, (req, res) => {
  const idx = db.courses.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ message: 'Курс не найден' });
  if (db.courses[idx].instructor !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ message: 'Это не ваш курс' });

  db.courses.splice(idx, 1);
  db.lessons = db.lessons.filter(l => l.courseId !== req.params.id);
  res.json({ message: 'Курс удалён' });
});

// GET /api/instructor/courses/:id/lessons — уроки моего курса
router.get('/courses/:id/lessons', authMiddleware, instructorOnly, (req, res) => {
  const course = db.courses.find(c => c.id === req.params.id);
  if (!course) return res.status(404).json({ message: 'Курс не найден' });
  if (course.instructor !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ message: 'Это не ваш курс' });
  const lessons = db.lessons.filter(l => l.courseId === req.params.id).sort((a, b) => a.order - b.order);
  res.json(lessons);
});

// POST /api/instructor/courses/:id/lessons — добавить урок
router.post('/courses/:id/lessons', authMiddleware, instructorOnly, (req, res) => {
  const course = db.courses.find(c => c.id === req.params.id);
  if (!course) return res.status(404).json({ message: 'Курс не найден' });
  if (course.instructor !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ message: 'Это не ваш курс' });

  const { title, videoUrl, description, duration, isFree } = req.body;
  if (!title) return res.status(400).json({ message: 'Укажите название урока' });

  const existingLessons = db.lessons.filter(l => l.courseId === req.params.id);
  const lesson = {
    id: uuidv4(),
    courseId: req.params.id,
    title,
    videoUrl: videoUrl || '',
    description: description || '',
    duration: duration || '0 мин',
    order: existingLessons.length + 1,
    isFree: isFree || false
  };
  db.lessons.push(lesson);
  // Обновить lessonCount
  course.lessonCount = db.lessons.filter(l => l.courseId === course.id).length;
  res.status(201).json(lesson);
});

// PUT /api/instructor/courses/:courseId/lessons/:lessonId — редактировать урок
router.put('/courses/:courseId/lessons/:lessonId', authMiddleware, instructorOnly, (req, res) => {
  const course = db.courses.find(c => c.id === req.params.courseId);
  if (!course) return res.status(404).json({ message: 'Курс не найден' });
  if (course.instructor !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ message: 'Это не ваш курс' });

  const lesson = db.lessons.find(l => l.id === req.params.lessonId);
  if (!lesson) return res.status(404).json({ message: 'Урок не найден' });

  const { title, videoUrl, description, duration, isFree } = req.body;
  if (title) lesson.title = title;
  if (videoUrl !== undefined) lesson.videoUrl = videoUrl;
  if (description !== undefined) lesson.description = description;
  if (duration) lesson.duration = duration;
  if (isFree !== undefined) lesson.isFree = isFree;
  res.json(lesson);
});

// DELETE /api/instructor/courses/:courseId/lessons/:lessonId — удалить урок
router.delete('/courses/:courseId/lessons/:lessonId', authMiddleware, instructorOnly, (req, res) => {
  const course = db.courses.find(c => c.id === req.params.courseId);
  if (!course) return res.status(404).json({ message: 'Курс не найден' });
  if (course.instructor !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ message: 'Это не ваш курс' });

  const idx = db.lessons.findIndex(l => l.id === req.params.lessonId);
  if (idx === -1) return res.status(404).json({ message: 'Урок не найден' });
  db.lessons.splice(idx, 1);
  course.lessonCount = db.lessons.filter(l => l.courseId === course.id).length;
  res.json({ message: 'Урок удалён' });
});

// GET /api/instructor/students — мои студенты (записанные на мои курсы)
router.get('/students', authMiddleware, instructorOnly, (req, res) => {
  const myCourses = db.courses.filter(c => c.instructor === req.user.id).map(c => c.id);
  const enrollments = db.enrollments.filter(e => myCourses.includes(e.courseId));

  const students = enrollments.map(e => {
    const user = db.users.find(u => u.id === e.userId);
    const course = db.courses.find(c => c.id === e.courseId);
    const totalLessons = db.lessons.filter(l => l.courseId === e.courseId).length;
    const progress = totalLessons > 0 ? Math.round((e.completedLessons.length / totalLessons) * 100) : 0;
    if (!user) return null;
    const { password: _, ...safeUser } = user;
    return {
      ...safeUser,
      courseId: e.courseId,
      courseName: course ? course.title : 'Удалён',
      progress,
      enrolledAt: e.enrolledAt,
      completed: e.completed
    };
  }).filter(Boolean);

  res.json(students);
});

module.exports = router;
