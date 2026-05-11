// База данных в памяти — используется вместо реальной БД для учебного проекта
// При перезапуске сервера данные сбрасываются, но seed заново заполняет всё нужное
// TODO: в реальном проекте заменить на PostgreSQL или MongoDB

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const db = {
  users:         [],
  courses:       [],
  enrollments:   [],
  lessons:       [],
  reviews:       [],
  progress:      [],
  messages:      [],       // сообщения чата (студент <-> преподаватель)
  conversations: [],       // список диалогов
  courseRequests:[],       // заявки от преподавателей на публикацию
  videoRequests: [],       // видео загруженные преподавателями — ждут проверки модератора
};

// ─── Seed Data ────────────────────────────────────────────────────────────────

function seed() {
  const salt = bcrypt.genSaltSync(10);

  // ── USERS ──────────────────────────────────────────────────────────────────
  db.users.push(
    {
      id: 'u0',
      name: 'Сергей Модератов',
      email: 'moderator@edu.ru',
      password: bcrypt.hashSync('moderator123', salt),
      role: 'moderator',
      avatar: 'https://ui-avatars.com/api/?name=Сергей+Модератов&background=f59e0b&color=fff',
      bio: 'Главный модератор платформы EduPlatform',
      createdAt: new Date('2024-01-01').toISOString(),
      banned: false
    },
    {
      id: 'u1',
      name: 'Алексей Петров',
      email: 'admin@edu.ru',
      password: bcrypt.hashSync('admin123', salt),
      role: 'admin',
      avatar: 'https://ui-avatars.com/api/?name=Алексей+Петров&background=6366f1&color=fff',
      bio: 'Администратор платформы EduPlatform',
      createdAt: new Date('2024-01-01').toISOString(),
      banned: false
    },
    {
      id: 'u2',
      name: 'Мария Иванова',
      email: 'student@edu.ru',
      password: bcrypt.hashSync('student123', salt),
      role: 'student',
      avatar: 'https://ui-avatars.com/api/?name=Мария+Иванова&background=ec4899&color=fff',
      bio: 'Студент, увлечённый веб-разработкой',
      createdAt: new Date('2024-02-01').toISOString(),
      banned: false
    },
    {
      id: 'u3',
      name: 'Дмитрий Соколов',
      email: 'instructor@edu.ru',
      password: bcrypt.hashSync('instructor123', salt),
      role: 'instructor',
      avatar: 'https://ui-avatars.com/api/?name=Дмитрий+Соколов&background=10b981&color=fff',
      bio: 'Senior разработчик, 10+ лет опыта в IT',
      specialization: 'Веб-разработка, JavaScript, React',
      createdAt: new Date('2024-01-15').toISOString(),
      banned: false
    },
    {
      id: 'u4',
      name: 'Анна Козлова',
      email: 'instructor2@edu.ru',
      password: bcrypt.hashSync('instructor123', salt),
      role: 'instructor',
      avatar: 'https://ui-avatars.com/api/?name=Анна+Козлова&background=f59e0b&color=fff',
      bio: 'UX/UI дизайнер с 7-летним опытом',
      specialization: 'Дизайн, Figma, UI/UX',
      createdAt: new Date('2024-01-20').toISOString(),
      banned: false
    },
    {
      id: 'u5',
      name: 'Иван Смирнов',
      email: 'student2@edu.ru',
      password: bcrypt.hashSync('student123', salt),
      role: 'student',
      avatar: 'https://ui-avatars.com/api/?name=Иван+Смирнов&background=3b82f6&color=fff',
      bio: 'Изучаю Python и Data Science',
      createdAt: new Date('2024-03-01').toISOString(),
      banned: false
    }
  );

  // ── COURSES ─────────────────────────────────────────────────────────────────
  db.courses.push(
    {
      id: 'c1',
      title: 'JavaScript с нуля до профессионала',
      description: 'Полный курс по JavaScript: от основ до продвинутых концепций. Вы изучите ES6+, асинхронность, работу с DOM, а также создадите несколько реальных проектов.',
      instructor: 'u3',
      instructorName: 'Дмитрий Соколов',
      category: 'Программирование',
      level: 'Начинающий',
      price: 4990,
      originalPrice: 9990,
      duration: '42 часа',
      lessonCount: 85,
      thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=600&auto=format&fit=crop&q=60',
      tags: ['JavaScript', 'ES6', 'Web', 'Frontend'],
      rating: 4.8,
      reviewCount: 342,
      studentCount: 2841,
      language: 'Русский',
      certificate: true,
      featured: true,
      published: true,
      createdAt: new Date('2024-01-10').toISOString()
    },
    {
      id: 'c2',
      title: 'React: Современная разработка интерфейсов',
      description: 'Научитесь создавать мощные и масштабируемые веб-приложения с React, Hooks, Context API, Redux Toolkit. Проекты: интернет-магазин, таск-менеджер.',
      instructor: 'u3',
      instructorName: 'Дмитрий Соколов',
      category: 'Программирование',
      level: 'Средний',
      price: 6990,
      originalPrice: 12990,
      duration: '38 часов',
      lessonCount: 72,
      thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&auto=format&fit=crop&q=60',
      tags: ['React', 'Hooks', 'Redux', 'Frontend'],
      rating: 4.9,
      reviewCount: 218,
      studentCount: 1952,
      language: 'Русский',
      certificate: true,
      featured: true,
      published: true,
      createdAt: new Date('2024-02-05').toISOString()
    },
    {
      id: 'c3',
      title: 'Python для анализа данных',
      description: 'Освойте Python, Pandas, NumPy, Matplotlib для анализа и визуализации данных. Работа с реальными датасетами, машинное обучение с Scikit-learn.',
      instructor: 'u3',
      instructorName: 'Дмитрий Соколов',
      category: 'Data Science',
      level: 'Начинающий',
      price: 5490,
      originalPrice: 10990,
      duration: '50 часов',
      lessonCount: 96,
      thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=60',
      tags: ['Python', 'Pandas', 'NumPy', 'Data Science'],
      rating: 4.7,
      reviewCount: 189,
      studentCount: 1423,
      language: 'Русский',
      certificate: true,
      featured: false,
      published: true,
      createdAt: new Date('2024-01-20').toISOString()
    },
    {
      id: 'c4',
      title: 'UI/UX Дизайн: Figma для начинающих',
      description: 'Научитесь создавать красивые и удобные интерфейсы в Figma. Принципы UX, прототипирование, работа с компонентами, автолейаут.',
      instructor: 'u4',
      instructorName: 'Анна Козлова',
      category: 'Дизайн',
      level: 'Начинающий',
      price: 3990,
      originalPrice: 7990,
      duration: '28 часов',
      lessonCount: 54,
      thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&auto=format&fit=crop&q=60',
      tags: ['Figma', 'UI', 'UX', 'Design'],
      rating: 4.6,
      reviewCount: 156,
      studentCount: 1876,
      language: 'Русский',
      certificate: true,
      featured: false,
      published: true,
      createdAt: new Date('2024-03-01').toISOString()
    },
    {
      id: 'c5',
      title: 'Node.js и Express: Backend разработка',
      description: 'Создавайте серверные приложения на Node.js и Express. REST API, аутентификация JWT, работа с базами данных, деплой в облако.',
      instructor: 'u3',
      instructorName: 'Дмитрий Соколов',
      category: 'Программирование',
      level: 'Средний',
      price: 5990,
      originalPrice: 11990,
      duration: '45 часов',
      lessonCount: 88,
      thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=60',
      tags: ['Node.js', 'Express', 'Backend', 'API'],
      rating: 4.8,
      reviewCount: 97,
      studentCount: 892,
      language: 'Русский',
      certificate: true,
      featured: true,
      published: true,
      createdAt: new Date('2024-02-20').toISOString()
    },
    {
      id: 'c6',
      title: 'Машинное обучение с Python',
      description: 'Погрузитесь в мир ML: классификация, регрессия, кластеризация, нейронные сети. TensorFlow, Keras, Scikit-learn. Дипломный проект.',
      instructor: 'u4',
      instructorName: 'Анна Козлова',
      category: 'Data Science',
      level: 'Продвинутый',
      price: 8990,
      originalPrice: 16990,
      duration: '65 часов',
      lessonCount: 124,
      thumbnail: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&auto=format&fit=crop&q=60',
      tags: ['ML', 'Python', 'TensorFlow', 'AI'],
      rating: 4.9,
      reviewCount: 74,
      studentCount: 612,
      language: 'Русский',
      certificate: true,
      featured: false,
      published: true,
      createdAt: new Date('2024-03-10').toISOString()
    }
  );

  // ── LESSONS ─────────────────────────────────────────────────────────────────
  const c1Lessons = [
    { title: 'Введение в JavaScript',      start: 0 },
    { title: 'Переменные и типы данных',   start: 600 },
    { title: 'Операторы и выражения',      start: 1500 },
    { title: 'Условные конструкции',       start: 2800 },
    { title: 'Циклы',                      start: 4200 },
    { title: 'Функции',                    start: 6000 },
    { title: 'Массивы',                    start: 8100 },
    { title: 'Объекты',                    start: 10500 },
    { title: 'DOM и события',              start: 13200 },
    { title: 'Асинхронный JS',             start: 16800 },
  ];
  c1Lessons.forEach((l, i) => {
    db.lessons.push({
      id: `l${i+1}`, courseId: 'c1', title: l.title,
      duration: `${15 + i * 3} мин`, order: i + 1,
      videoUrl: `https://www.youtube.com/embed/PkZNo7MFNFg?start=${l.start}`,
      description: `В этом уроке мы разберём: ${l.title.toLowerCase()}.`,
      isFree: i < 2
    });
  });

  const c2Lessons = [
    { title: 'Введение в React',                    start: 0 },
    { title: 'JSX и компоненты',                    start: 900 },
    { title: 'Props и State',                       start: 2700 },
    { title: 'Хуки: useState и useEffect',          start: 5400 },
    { title: 'Работа с формами',                    start: 7800 },
    { title: 'React Router',                        start: 10200 },
    { title: 'Context API',                         start: 13500 },
    { title: 'Redux Toolkit',                       start: 16200 },
    { title: 'Оптимизация: useMemo и useCallback',  start: 20700 },
    { title: 'Деплой React-приложения',             start: 24300 },
  ];
  c2Lessons.forEach((l, i) => {
    db.lessons.push({
      id: `c2l${i+1}`, courseId: 'c2', title: l.title,
      duration: `${18 + i * 2} мин`, order: i + 1,
      videoUrl: `https://www.youtube.com/embed/bMknfKXIFA8?start=${l.start}`,
      description: `В этом уроке мы разберём: ${l.title.toLowerCase()}.`,
      isFree: i < 2
    });
  });

  const c3Lessons = [
    { title: 'Введение в Python',              start: 0 },
    { title: 'Типы данных и переменные',       start: 1200 },
    { title: 'Функции и модули',               start: 4500 },
    { title: 'Numpy: массивы и операции',      start: 9000 },
    { title: 'Pandas: DataFrame и Series',     start: 13500 },
    { title: 'Загрузка и очистка данных',      start: 18000 },
    { title: 'Визуализация с Matplotlib',      start: 22500 },
    { title: 'Seaborn: красивые графики',      start: 27000 },
    { title: 'Введение в Scikit-learn',        start: 31500 },
    { title: 'Финальный проект',               start: 36000 },
  ];
  c3Lessons.forEach((l, i) => {
    db.lessons.push({
      id: `c3l${i+1}`, courseId: 'c3', title: l.title,
      duration: `${20 + i * 3} мин`, order: i + 1,
      videoUrl: `https://www.youtube.com/embed/rfscVS0vtbw?start=${l.start}`,
      description: `В этом уроке мы разберём: ${l.title.toLowerCase()}.`,
      isFree: i < 2
    });
  });

  const c4Lessons = [
    { title: 'Введение в Figma',                     start: 0 },
    { title: 'Фреймы и слои',                        start: 1200 },
    { title: 'Компоненты и варианты',                start: 3600 },
    { title: 'Автолейаут',                           start: 6000 },
    { title: 'Цвет и типографика',                   start: 8400 },
    { title: 'Прототипирование',                     start: 10800 },
    { title: 'Принципы UX и исследование',           start: 13200 },
    { title: 'Мобильный дизайн',                     start: 15600 },
    { title: 'Работа с иконками и иллюстрациями',    start: 18000 },
    { title: 'Передача макетов разработчикам',       start: 20400 },
  ];
  c4Lessons.forEach((l, i) => {
    db.lessons.push({
      id: `c4l${i+1}`, courseId: 'c4', title: l.title,
      duration: `${15 + i * 2} мин`, order: i + 1,
      videoUrl: `https://www.youtube.com/embed/c9Wg6Cb_YlU?start=${l.start}`,
      description: `В этом уроке мы разберём: ${l.title.toLowerCase()}.`,
      isFree: i < 2
    });
  });

  const c5Lessons = [
    { title: 'Введение в Node.js',                  start: 0 },
    { title: 'Модули и npm',                        start: 1800 },
    { title: 'Создание HTTP-сервера',               start: 4500 },
    { title: 'Express: маршруты и middleware',      start: 7200 },
    { title: 'REST API: GET, POST, PUT, DELETE',    start: 10800 },
    { title: 'Аутентификация и JWT',                start: 14400 },
    { title: 'Работа с MongoDB',                    start: 18000 },
    { title: 'Валидация данных',                    start: 22500 },
    { title: 'Загрузка файлов',                     start: 27000 },
    { title: 'Деплой на облако',                    start: 31500 },
  ];
  c5Lessons.forEach((l, i) => {
    db.lessons.push({
      id: `c5l${i+1}`, courseId: 'c5', title: l.title,
      duration: `${22 + i * 3} мин`, order: i + 1,
      videoUrl: `https://www.youtube.com/embed/Oe421EPjeBE?start=${l.start}`,
      description: `В этом уроке мы разберём: ${l.title.toLowerCase()}.`,
      isFree: i < 2
    });
  });

  const c6Lessons = [
    { title: 'Введение в машинное обучение',    start: 0 },
    { title: 'Линейная регрессия',              start: 2700 },
    { title: 'Логистическая регрессия',         start: 5400 },
    { title: 'Деревья решений',                 start: 9000 },
    { title: 'Случайный лес и ансамбли',        start: 12600 },
    { title: 'Кластеризация: K-means',          start: 16200 },
    { title: 'Нейронные сети: основы',          start: 20700 },
    { title: 'TensorFlow и Keras',              start: 25200 },
    { title: 'Свёрточные нейросети (CNN)',      start: 30600 },
    { title: 'Дипломный проект ML',             start: 36000 },
  ];
  c6Lessons.forEach((l, i) => {
    db.lessons.push({
      id: `c6l${i+1}`, courseId: 'c6', title: l.title,
      duration: `${25 + i * 3} мин`, order: i + 1,
      videoUrl: `https://www.youtube.com/embed/i_LwzRVP7bg?start=${l.start}`,
      description: `В этом уроке мы разберём: ${l.title.toLowerCase()}.`,
      isFree: i < 2
    });
  });

  // ── ENROLLMENTS ─────────────────────────────────────────────────────────────
  db.enrollments.push(
    { id: 'e1', userId: 'u2', courseId: 'c1', enrolledAt: new Date('2024-04-01').toISOString(), completedLessons: ['l1', 'l2', 'l3'], completed: false },
    { id: 'e2', userId: 'u2', courseId: 'c2', enrolledAt: new Date('2024-04-10').toISOString(), completedLessons: [], completed: false },
    { id: 'e3', userId: 'u5', courseId: 'c3', enrolledAt: new Date('2024-04-05').toISOString(), completedLessons: ['c3l1','c3l2','c3l3','c3l4','c3l5'], completed: false },
    { id: 'e4', userId: 'u5', courseId: 'c6', enrolledAt: new Date('2024-04-15').toISOString(), completedLessons: ['c6l1'], completed: false }
  );

  // ── REVIEWS ─────────────────────────────────────────────────────────────────
  db.reviews.push(
    { id: 'r1', courseId: 'c1', userId: 'u2', userName: 'Мария Иванова', rating: 5, comment: 'Отличный курс! Объясняет очень доступно, много практики.', createdAt: new Date('2024-04-20').toISOString() },
    { id: 'r2', courseId: 'c1', userId: 'u5', userName: 'Иван Смирнов', rating: 5, comment: 'Один из лучших JS-курсов. Рекомендую!', createdAt: new Date('2024-04-15').toISOString() },
    { id: 'r3', courseId: 'c2', userId: 'u2', userName: 'Мария Иванова', rating: 5, comment: 'React крутой, курс ещё круче!', createdAt: new Date('2024-05-01').toISOString() }
  );

  // ── CONVERSATIONS ────────────────────────────────────────────────────────────
  db.conversations.push({
    id: 'conv1',
    participants: ['u2', 'u3'],   // Мария (student) <-> Дмитрий (instructor)
    courseId: 'c1',
    courseName: 'JavaScript с нуля',
    createdAt: new Date('2024-04-25').toISOString(),
    lastMessage: 'Спасибо за объяснение!',
    lastMessageAt: new Date('2024-04-26').toISOString()
  });

  // ── MESSAGES ─────────────────────────────────────────────────────────────────
  db.messages.push(
    { id: 'm1', conversationId: 'conv1', senderId: 'u2', senderName: 'Мария Иванова', text: 'Здравствуйте! Не могу понять тему с async/await. Можете объяснить?', createdAt: new Date('2024-04-25T10:00:00').toISOString(), read: true },
    { id: 'm2', conversationId: 'conv1', senderId: 'u3', senderName: 'Дмитрий Соколов', text: 'Конечно! async/await — это синтаксический сахар над Promise. Функция с async всегда возвращает Promise, а await ждёт его выполнения.', createdAt: new Date('2024-04-25T10:15:00').toISOString(), read: true },
    { id: 'm3', conversationId: 'conv1', senderId: 'u2', senderName: 'Мария Иванова', text: 'Спасибо за объяснение!', createdAt: new Date('2024-04-26T09:30:00').toISOString(), read: false }
  );

  console.log('✅ Database seeded successfully');
}

seed();

module.exports = db;
