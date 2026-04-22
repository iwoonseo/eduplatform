import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CourseCard from '../components/CourseCard';
import api from '../api';

/* ── Typewriter hook ─────────────────────────────────── */
const HERO_WORDS = ['изменяющий жизнь', 'открывающий двери', 'дающий навыки', 'строящий карьеру'];

function useTypewriter(speed = 80, pause = 1800) {
  const [display, setDisplay] = useState('');
  const [wordIdx, setWordIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const cur = HERO_WORDS[wordIdx];
    let timeout;
    if (!deleting && display === cur) {
      timeout = setTimeout(() => setDeleting(true), pause);
    } else if (deleting && display === '') {
      setDeleting(false);
      setWordIdx(i => (i + 1) % HERO_WORDS.length);
    } else {
      timeout = setTimeout(() => {
        setDisplay(deleting
          ? cur.slice(0, display.length - 1)
          : cur.slice(0, display.length + 1)
        );
      }, deleting ? speed / 2 : speed);
    }
    return () => clearTimeout(timeout);
  }, [display, deleting, wordIdx, speed, pause]);

  useEffect(() => {
    const id = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(id);
  }, []);

  return { display, blink };
}

/* ── Animated counter hook ───────────────────────────── */
function useCountUp(target, duration = 1600, active = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active || target === 0) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const id = setInterval(() => {
      start = Math.min(start + step, target);
      setVal(start);
      if (start >= target) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [target, duration, active]);
  return val;
}

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [stats, setStats] = useState({ courses: 0, students: 0, instructors: 0 });
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef(null);
  const navigate = useNavigate();

  const { display: typeText, blink } = useTypewriter();

  const animStudents = useCountUp(stats.students, 1800, statsVisible);
  const animCourses  = useCountUp(stats.courses,  1400, statsVisible);
  const animInst     = useCountUp(stats.instructors, 1200, statsVisible);

  useEffect(() => {
    api.get('/courses?featured=true&sort=rating').then(r => setFeatured(r.data.courses.slice(0, 3)));
    api.get('/courses').then(r => {
      const courses = r.data.courses;
      setStats({
        courses: courses.length,
        students: courses.reduce((s, c) => s + c.studentCount, 0),
        instructors: [...new Set(courses.map(c => c.instructorName))].length
      });
      setStatsLoaded(true);
    });
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVisible(true); }, { threshold: 0.3 });
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  const handleSearch = e => {
    e.preventDefault();
    navigate(`/courses?search=${encodeURIComponent(search)}`);
  };

  return (
    <div className="home-page">

      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">🎓 Онлайн-обучение нового поколения</div>
          <h1 className="hero-title">
            Найди курс,<br/>
            <span className="gradient-text typewriter-wrap">
              {typeText}
              <span className={`cursor ${blink ? 'cursor-visible' : ''}`}>|</span>
            </span>
          </h1>
          <p className="hero-subtitle">
            {statsLoaded
              ? <>Более <strong>{stats.courses}</strong> курсов от {stats.instructors} преподавателей.</>
              : 'Онлайн-платформа для обучения и развития.'
            }
            {' '}Учись в удобное время и получай сертификаты.
          </p>
          <form className="hero-search" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Поиск курсов: JavaScript, Python, Дизайн..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="btn btn-primary search-btn">Найти</button>
          </form>
          <div className="hero-tags">
            {['JavaScript', 'Python', 'React', 'Data Science', 'UI/UX'].map(t => (
              <button key={t} className="tag-pill" onClick={() => navigate(`/courses?search=${t}`)}>{t}</button>
            ))}
          </div>
        </div>
        <div className="hero-illustration">
          <div className="hero-card floating">
            <div className="hc-icon">🐍</div>
            <div>
              <div className="hc-title">Python</div>
              <div className="hc-sub">Data Science</div>
            </div>
          </div>
          <div className="hero-card floating delay1">
            <div className="hc-icon">⚛️</div>
            <div>
              <div className="hc-title">React</div>
              <div className="hc-sub">Frontend</div>
            </div>
          </div>
          <div className="hero-card floating delay2">
            <div className="hc-icon">🎨</div>
            <div>
              <div className="hc-title">Figma</div>
              <div className="hc-sub">UI/UX</div>
            </div>
          </div>
          <div className="hero-main-visual">
            <div className="visual-circle c1"></div>
            <div className="visual-circle c2"></div>
            <div className="visual-circle c3"></div>
            <span className="visual-emoji">📚</span>
          </div>
        </div>
      </section>

      {/* STATS — animated counters */}
      <section className="stats-bar" ref={statsRef}>
        <div className="stat-item">
          <div className="stat-num">{animStudents.toLocaleString('ru')}+</div>
          <div className="stat-label">Студентов</div>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item">
          <div className="stat-num">{animCourses}+</div>
          <div className="stat-label">Курсов</div>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item">
          <div className="stat-num">{animInst}+</div>
          <div className="stat-label">Преподавателей</div>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item">
          <div className="stat-num">96%</div>
          <div className="stat-label">Довольны курсом</div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="section categories-section">
        <h2 className="section-title">Направления обучения</h2>
        <div className="categories-grid">
          {[
            { name: 'Программирование', icon: '💻', color: '#6366f1', desc: 'JS, Python, Node.js и другие' },
            { name: 'Data Science', icon: '📊', color: '#10b981', desc: 'ML, AI, аналитика данных' },
            { name: 'Дизайн', icon: '🎨', color: '#f59e0b', desc: 'UI/UX, Figma, графика' },
            { name: 'Бизнес', icon: '💼', color: '#ef4444', desc: 'Менеджмент, маркетинг' },
          ].map(cat => (
            <Link key={cat.name} to={`/courses?category=${cat.name}`} className="category-card" style={{'--cat-color': cat.color}}>
              <div className="cat-icon">{cat.icon}</div>
              <h3>{cat.name}</h3>
              <p>{cat.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED COURSES */}
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Популярные курсы</h2>
          <Link to="/courses" className="btn btn-ghost">Все курсы →</Link>
        </div>
        <div className="courses-grid">
          {featured.map(c => <CourseCard key={c.id} course={c} />)}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section how-section">
        <h2 className="section-title">Как это работает</h2>
        <div className="steps-grid">
          {[
            { step: '01', icon: '🔍', title: 'Выбери курс', desc: 'Используй фильтры по категории, уровню и цене, чтобы найти идеальный курс.' },
            { step: '02', icon: '📝', title: 'Запишись', desc: 'Зарегистрируйся и начни обучение немедленно.' },
            { step: '03', icon: '🎬', title: 'Учись', desc: 'Смотри видеоуроки в удобное время, выполняй задания.' },
            { step: '04', icon: '🎓', title: 'Получи сертификат', desc: 'По завершении курса получи именной сертификат.' },
          ].map(s => (
            <div key={s.step} className="step-card">
              <div className="step-num">{s.step}</div>
              <div className="step-icon">{s.icon}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Начни обучение сегодня</h2>
          <p>Присоединяйся к тысячам студентов и прокачай свои навыки</p>
          <Link to="/register" className="btn btn-white btn-large">Начать бесплатно</Link>
        </div>
      </section>
    </div>
  );
}
