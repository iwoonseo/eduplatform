const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../data/db');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

// роуты для работы с курсами
// optionalAuth — значит авторизация не обязательна, но если токен есть — добавляем данные записи

// GET /api/courses — список курсов с фильтрацией
router.get('/', optionalAuth, (req, res) => {
  // копируем массив чтобы не мутировать оригинал при сортировке
  let courses = [...db.courses];
  const { category, level, search, featured, sort } = req.query;

  // применяем фильтры последовательно
  if (category) courses = courses.filter(c => c.category === category);
  if (level)    courses = courses.filter(c => c.level === level);
  if (featured === 'true') courses = courses.filter(c => c.featured);

  // поиск по названию, описанию и тегам — регистр не учитываем
  if (search) {
    const searchLower = search.toLowerCase();
    courses = courses.filter(c =>
      c.title.toLowerCase().includes(searchLower) ||
      c.description.toLowerCase().includes(searchLower) ||
      c.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }

  if (sort === 'price_asc') courses.sort((a, b) => a.price - b.price);
  else if (sort === 'price_desc') courses.sort((a, b) => b.price - a.price);
  else if (sort === 'rating') courses.sort((a, b) => b.rating - a.rating);
  else if (sort === 'popular') courses.sort((a, b) => b.studentCount - a.studentCount);
  else if (sort === 'new') courses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Add enrollment status if logged in
  if (req.user) {
    courses = courses.map(c => ({
      ...c,
      isEnrolled: db.enrollments.some(e => e.userId === req.user.id && e.courseId === c.id)
    }));
  }

  res.json({
    courses,
    total: courses.length,
    categories: [...new Set(db.courses.map(c => c.category))],
    levels: [...new Set(db.courses.map(c => c.level))]
  });
});

// GET /api/courses/:id
router.get('/:id', optionalAuth, (req, res) => {
  const course = db.courses.find(c => c.id === req.params.id);
  if (!course) return res.status(404).json({ message: 'Курс не найден' });

  const lessons = db.lessons.filter(l => l.courseId === course.id);
  const reviews = db.reviews.filter(r => r.courseId === course.id);
  const instructor = db.users.find(u => u.id === course.instructor);
  let isEnrolled = false;
  let enrollment = null;
  if (req.user) {
    enrollment = db.enrollments.find(e => e.userId === req.user.id && e.courseId === course.id);
    isEnrolled = !!enrollment;
  }

  res.json({
    ...course,
    lessons: lessons.map(l => ({
      ...l,
      videoUrl: isEnrolled || l.isFree ? l.videoUrl : null
    })),
    reviews,
    instructor: instructor ? { id: instructor.id, name: instructor.name, avatar: instructor.avatar, bio: instructor.bio } : null,
    isEnrolled,
    completedLessons: enrollment ? enrollment.completedLessons : []
  });
});

// POST /api/courses/:id/enroll
router.post('/:id/enroll', authMiddleware, (req, res) => {
  const course = db.courses.find(c => c.id === req.params.id);
  if (!course) return res.status(404).json({ message: 'Курс не найден' });

  const exists = db.enrollments.find(e => e.userId === req.user.id && e.courseId === course.id);
  if (exists) return res.status(400).json({ message: 'Вы уже записаны на этот курс' });

  const enrollment = {
    id: uuidv4(),
    userId: req.user.id,
    courseId: course.id,
    enrolledAt: new Date().toISOString(),
    completedLessons: [],
    completed: false
  };
  db.enrollments.push(enrollment);
  course.studentCount++;

  res.status(201).json({ message: 'Успешная запись на курс', enrollment });
});

// POST /api/courses/:id/lessons/:lessonId/complete
router.post('/:id/lessons/:lessonId/complete', authMiddleware, (req, res) => {
  const enrollment = db.enrollments.find(e => e.userId === req.user.id && e.courseId === req.params.id);
  if (!enrollment) return res.status(403).json({ message: 'Вы не записаны на этот курс' });

  if (!enrollment.completedLessons.includes(req.params.lessonId)) {
    enrollment.completedLessons.push(req.params.lessonId);
  }

  const totalLessons = db.lessons.filter(l => l.courseId === req.params.id).length;
  enrollment.completed = enrollment.completedLessons.length >= totalLessons;
  res.json({ completedLessons: enrollment.completedLessons, completed: enrollment.completed });
});

// POST /api/courses/:id/reviews
router.post('/:id/reviews', authMiddleware, (req, res) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5)
    return res.status(400).json({ message: 'Оценка должна быть от 1 до 5' });

  const user = db.users.find(u => u.id === req.user.id);
  const review = {
    id: uuidv4(),
    courseId: req.params.id,
    userId: req.user.id,
    userName: user.name,
    rating,
    comment: comment || '',
    createdAt: new Date().toISOString()
  };
  db.reviews.push(review);

  // Update course rating
  const course = db.courses.find(c => c.id === req.params.id);
  if (course) {
    const reviews = db.reviews.filter(r => r.courseId === course.id);
    course.rating = Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
    course.reviewCount = reviews.length;
  }

  res.status(201).json(review);
});

module.exports = router;
