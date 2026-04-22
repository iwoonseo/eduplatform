import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

/* ── Activity Heatmap ────────────────────────────────── */
function ActivityHeatmap({ completedCount }) {
  const weeks = 15, days = 7;
  const today = new Date();
  const cells = [];
  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < days; d++) {
      const idx = w * days + d;
      const date = new Date(today);
      date.setDate(today.getDate() - (weeks * days - idx - 1));
      const base = Math.sin(idx * 0.7 + completedCount) * 0.5 + 0.5;
      const recency = (idx / (weeks * days)) * 0.6 + 0.2;
      const level = Math.floor(base * recency * 4.5);
      cells.push({ date: date.toISOString().slice(0, 10), level, w, d });
    }
  }
  const colors = ['#eee', '#c7d2fe', '#818cf8', '#6366f1', '#4338ca'];
  const dayLabels = ['Пн', '', 'Ср', '', 'Пт', '', 'Вс'];
  return (
    <div className="heatmap-wrap">
      <div className="heatmap-day-labels">{dayLabels.map((l, i) => <span key={i}>{l}</span>)}</div>
      <div className="heatmap-grid" style={{ gridTemplateColumns: `repeat(${weeks}, 14px)` }}>
        {Array.from({ length: weeks }).map((_, w) => (
          <div key={w} className="heatmap-col">
            {Array.from({ length: days }).map((_, d) => {
              const cell = cells.find(c => c.w === w && c.d === d);
              return <div key={d} className="heatmap-cell" title={cell?.date} style={{ background: colors[cell?.level ?? 0] }} />;
            })}
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        <span>Менее</span>
        {colors.map((c, i) => <div key={i} className="heatmap-cell" style={{ background: c }} />)}
        <span>Больше</span>
      </div>
    </div>
  );
}

/* ── Study Streak Widget ─────────────────────────────── */
function StudyStreak({ stats }) {
  const streak = useRef(0);
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const today = new Date().getDay();
  const todayIdx = today === 0 ? 6 : today - 1;
  const [streakData] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('eduplatform-streak') || '{}');
    const todayStr = new Date().toISOString().slice(0, 10);
    if (stats.totalLessonsCompleted > 0) { saved[todayStr] = true; localStorage.setItem('eduplatform-streak', JSON.stringify(saved)); }
    let count = 0;
    const d = new Date();
    while (true) {
      const s = d.toISOString().slice(0, 10);
      if (saved[s]) { count++; d.setDate(d.getDate() - 1); } else break;
      if (count > 365) break;
    }
    streak.current = count;
    const week = [];
    for (let i = 6; i >= 0; i--) {
      const dd = new Date(); dd.setDate(dd.getDate() - i);
      week.push({ label: weekDays[(6 - i + todayIdx + 1) % 7] || weekDays[0], active: !!saved[dd.toISOString().slice(0, 10)], isToday: i === 0 });
    }
    return { count, week };
  });
  return (
    <div className="streak-widget">
      <div className="streak-fire">🔥</div>
      <div className="streak-info">
        <div className="streak-count">{streakData.count}</div>
        <div className="streak-label">
          {streakData.count === 0 ? 'Начни учиться сегодня!' :
           streakData.count === 1 ? 'день подряд — так держать!' :
           streakData.count < 5 ? 'дня подряд — отличный старт!' :
           streakData.count < 14 ? 'дней подряд — ты молодец!' : 'дней подряд — легенда! 🏆'}
        </div>
      </div>
      <div className="streak-days">
        {streakData.week.map((d, i) => (
          <div key={i} className={`streak-day ${d.isToday ? 'today' : d.active ? 'active' : 'inactive'}`} title={d.label}>{d.label[0]}</div>
        ))}
      </div>
    </div>
  );
}

/* ── SVG Progress Ring ───────────────────────────────── */
function ProgressRing({ pct, size = 52 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="progress-ring-wrap" style={{ width: size, height: size }}>
      <svg className="ring-svg" width={size} height={size}>
        <circle className="ring-bg" cx={size/2} cy={size/2} r={r} />
        <circle className={`ring-fill${pct >= 100 ? ' done' : ''}`} cx={size/2} cy={size/2} r={r} strokeDasharray={circ} strokeDashoffset={offset} />
      </svg>
      <div className="ring-pct">{pct}%</div>
    </div>
  );
}

/* ── Student Achievement Badges ──────────────────────── */
const STUDENT_BADGES = [
  { id: 'first',    icon: '🌱', label: 'Начало пути',   desc: 'Записался на первый курс',         check: s => s.totalCourses >= 1 },
  { id: 'halfway',  icon: '🔥', label: 'На полпути',    desc: '50%+ прогресс на любом курсе',     check: (s, courses) => courses.some(c => c.progress >= 50) },
  { id: 'done',     icon: '🏆', label: 'Победитель',    desc: 'Завершил курс полностью',          check: s => s.completedCourses >= 1 },
  { id: 'reader',   icon: '📚', label: 'Книжный червь', desc: '10 уроков пройдено',               check: s => s.totalLessonsCompleted >= 10 },
  { id: 'marathon', icon: '⚡', label: 'Марафонец',     desc: '20 уроков пройдено',               check: s => s.totalLessonsCompleted >= 20 },
  { id: 'multi',    icon: '🎯', label: 'Мультизадачник',desc: '3+ курса в процессе',              check: s => s.inProgress >= 3 },
  { id: 'curious',  icon: '🔍', label: 'Любопытный',    desc: 'Записался на 2+ категории',        check: (s, courses) => new Set(courses.map(c=>c.category)).size >= 2 },
  { id: 'consistent',icon:'📅', label: 'Постоянный',    desc: 'Учишься каждый день (streak 3+)',  check: s => (s.streak || 0) >= 3 },
];

/* ── AI Recommender ──────────────────────────────────── */
function AIRecommender({ enrolledCourses, allCourses }) {
  const [visible, setVisible] = useState(false);
  const [recs, setRecs] = useState([]);
  useEffect(() => {
    if (!allCourses.length) return;
    const enrolledIds = new Set(enrolledCourses.map(c => c.id));
    const enrolledCategories = [...new Set(enrolledCourses.map(c => c.category))];
    const scored = allCourses
      .filter(c => !enrolledIds.has(c.id))
      .map(c => ({
        ...c,
        matchScore: Math.min(
          Math.round((enrolledCategories.includes(c.category) ? 40 : 0) + (c.rating || 0) * 10 + Math.min((c.studentCount || 0) / 50, 20)),
          98
        )
      }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3);
    setRecs(scored);
  }, [enrolledCourses, allCourses]);

  if (!recs.length) return null;
  return (
    <div className="dashboard-section">
      <div className="section-header">
        <h2>🤖 ИИ-рекомендации для вас</h2>
        <button className="btn btn-ghost btn-sm" onClick={() => setVisible(v => !v)}>
          {visible ? 'Скрыть' : 'Показать'}
        </button>
      </div>
      {!visible && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>На основе ваших курсов ИИ подобрал персональные рекомендации</p>}
      {visible && (
        <div className="ai-recs-grid">
          {recs.map(c => (
            <Link key={c.id} to={`/courses/${c.id}`} className="ai-rec-card">
              <img src={c.thumbnail} alt={c.title} className="ai-rec-thumb" />
              <div className="ai-rec-body">
                <div className="ai-match-bar-wrap"><div className="ai-match-bar" style={{ width: `${c.matchScore}%` }} /></div>
                <div className="ai-match-label">Совпадение {c.matchScore}%</div>
                <h4>{c.title}</h4>
                <span className="tag category">{c.category}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Dashboard (Student Only) ────────────────────────── */
export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData]       = useState({ courses: [], stats: {} });
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('courses');

  useEffect(() => {
    Promise.all([
      api.get('/users/dashboard'),
      api.get('/courses'),
    ]).then(([dash, all]) => {
      setData(dash.data);
      setAllCourses(all.data.courses || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

  const stats = data.stats || {};
  const courses = data.courses || [];

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-welcome">
          <img src={user.avatar} alt={user.name} className="dashboard-avatar" />
          <div>
            <h1>Привет, {user.name}! 👋</h1>
            <p>Продолжай учиться и достигай своих целей</p>
          </div>
        </div>
        {/* Quick action: chat with instructor */}
        <Link to="/chat" className="btn btn-primary">
          💬 Написать преподавателю
        </Link>
      </div>

      {/* Streak */}
      <StudyStreak stats={stats} />

      {/* Stats */}
      <div className="dashboard-stats">
        {[
          { num: stats.totalCourses || 0,           label: 'Всего курсов' },
          { num: stats.inProgress || 0,             label: 'В процессе' },
          { num: stats.completedCourses || 0,       label: 'Завершено' },
          { num: stats.totalLessonsCompleted || 0,  label: 'Уроков пройдено' },
        ].map(s => (
          <div key={s.label} className="dash-stat">
            <div className="dash-stat-num">{s.num}</div>
            <div className="dash-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="dash-tabs">
        {[
          { id: 'courses',      label: '📚 Мои курсы' },
          { id: 'achievements', label: '🏅 Достижения' },
          { id: 'activity',     label: '📅 Активность' },
        ].map(t => (
          <button key={t.id} className={`dash-tab-btn ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: MY COURSES */}
      {activeTab === 'courses' && (
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Мои курсы</h2>
            <Link to="/courses" className="btn btn-ghost">+ Найти курс</Link>
          </div>
          {courses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h3>Вы ещё не записаны на курсы</h3>
              <p>Найдите курс по душе и начните обучение</p>
              <Link to="/courses" className="btn btn-primary">Перейти в каталог</Link>
            </div>
          ) : (
            <div className="my-courses-grid">
              {courses.map(course => (
                <div key={course.id} className="my-course-card">
                  <ProgressRing pct={course.progress || 0} />
                  <img src={course.thumbnail} alt={course.title} className="my-course-thumb" />
                  <div className="my-course-body">
                    <span className="tag category">{course.category}</span>
                    <h3>{course.title}</h3>
                    <div className="progress-section">
                      <div className="progress-labels">
                        <span>{course.completedLessons?.length || 0} / {course.totalLessons} уроков</span>
                        <span className="progress-pct">{course.progress}%</span>
                      </div>
                      <div className="progress-bar-wrap">
                        <div className="progress-bar-fill" style={{width: `${course.progress}%`}}></div>
                      </div>
                    </div>
                    <div className="my-course-btns">
                      {course.enrollment?.completed ? (
                        <span className="completed-badge">🎓 Курс завершён!</span>
                      ) : (
                        <Link to={`/learn/${course.id}`} className="btn btn-primary btn-sm">
                          {course.progress > 0 ? '▶ Продолжить' : '▶ Начать'}
                        </Link>
                      )}
                      {/* Chat with this course's instructor */}
                      <Link to="/chat" className="btn btn-ghost btn-sm" title="Написать преподавателю">💬</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 40 }}>
            <AIRecommender enrolledCourses={courses} allCourses={allCourses} />
          </div>
        </div>
      )}

      {/* TAB: ACHIEVEMENTS (student-specific) */}
      {activeTab === 'achievements' && (
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Достижения студента</h2>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              {STUDENT_BADGES.filter(b => b.check(stats, courses)).length} / {STUDENT_BADGES.length} разблокировано
            </span>
          </div>
          <div className="badges-grid">
            {STUDENT_BADGES.map(b => {
              const unlocked = b.check(stats, courses);
              return (
                <div key={b.id} className={`badge-card ${unlocked ? 'badge-unlocked' : 'badge-locked'}`} title={b.desc}>
                  <div className="badge-icon">{b.icon}</div>
                  <div className="badge-label">{b.label}</div>
                  <div className="badge-desc">{b.desc}</div>
                  {unlocked && <div className="badge-glow" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: ACTIVITY */}
      {activeTab === 'activity' && (
        <div className="dashboard-section">
          <div className="section-header">
            <h2>История активности</h2>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Последние 15 недель</span>
          </div>
          <div className="activity-card">
            <ActivityHeatmap completedCount={stats.totalLessonsCompleted || 0} />
          </div>
          <div className="activity-summary">
            <div className="act-sum-item">
              <div className="act-sum-num">{stats.totalLessonsCompleted || 0}</div>
              <div className="act-sum-label">Уроков пройдено</div>
            </div>
            <div className="act-sum-item">
              <div className="act-sum-num">{stats.completedCourses || 0}</div>
              <div className="act-sum-label">Курсов завершено</div>
            </div>
            <div className="act-sum-item">
              <div className="act-sum-num">{stats.totalCourses || 0}</div>
              <div className="act-sum-label">Записей всего</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
