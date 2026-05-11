import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

/* ── Stat Card ───────────────────────────────────────── */
function StatCard({ icon, label, value, color, sub }) {
  return (
    <div className="admin-stat-card" style={{ '--card-color': color }}>
      <div className="asc-icon">{icon}</div>
      <div className="asc-value">{value}</div>
      <div className="asc-label">{label}</div>
      {sub && <div className="asc-sub">{sub}</div>}
    </div>
  );
}

/* ── Toast ───────────────────────────────────────────── */
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = (msg, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  };
  return { toasts, success: msg => add(msg, 'success'), error: msg => add(msg, 'error') };
}

const ROLE_COLORS = {
  admin:      '#6366f1',
  moderator:  '#f59e0b',
  instructor: '#10b981',
  student:    '#ec4899',
};

export default function ModeratorPanel() {
  const { user } = useAuth();
  const [tab, setTab]               = useState('overview');
  const [stats, setStats]           = useState({});
  const [users, setUsers]           = useState([]);
  const [courses, setCourses]       = useState([]);
  const [reviews, setReviews]       = useState([]);
  const [videoRequests, setVideoRequests] = useState([]);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectTarget, setRejectTarget]   = useState(null); // id заявки
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const { toasts, success, error }  = useToast();

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/users'),
      api.get('/admin/courses'),
      api.get('/admin/reviews'),
      api.get('/admin/video-requests'),
    ]).then(([s, u, c, r, v]) => {
      setStats(s.data);
      setUsers(u.data);
      setCourses(c.data);
      setReviews(r.data);
      setVideoRequests(v.data);
    }).catch(() => error('Ошибка загрузки данных'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  /* ── Actions ── */
  const changeRole = async (userId, role) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role });
      setUsers(u => u.map(x => x.id === userId ? { ...x, role } : x));
      success(`Роль изменена на "${role}"`);
    } catch (e) { error(e.response?.data?.message || 'Ошибка'); }
  };

  const toggleBan = async (userId) => {
    try {
      const res = await api.put(`/admin/users/${userId}/ban`);
      setUsers(u => u.map(x => x.id === userId ? { ...x, banned: res.data.banned } : x));
      success(res.data.banned ? 'Пользователь заблокирован' : 'Пользователь разблокирован');
    } catch (e) { error(e.response?.data?.message || 'Ошибка'); }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Удалить пользователя? Это действие необратимо.')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(u => u.filter(x => x.id !== userId));
      success('Пользователь удалён');
    } catch (e) { error(e.response?.data?.message || 'Ошибка'); }
  };

  const togglePublish = async (courseId) => {
    try {
      const res = await api.put(`/admin/courses/${courseId}/publish`);
      setCourses(c => c.map(x => x.id === courseId ? { ...x, published: res.data.published } : x));
      success(res.data.published ? 'Курс опубликован' : 'Курс снят с публикации');
    } catch (e) { error('Ошибка'); }
  };

  const toggleFeatured = async (courseId) => {
    try {
      const res = await api.put(`/admin/courses/${courseId}/featured`);
      setCourses(c => c.map(x => x.id === courseId ? { ...x, featured: res.data.featured } : x));
      success(res.data.featured ? 'Добавлен в топ' : 'Убран из топа');
    } catch (e) { error('Ошибка'); }
  };

  const deleteCourse = async (courseId) => {
    if (!window.confirm('Удалить курс? Все записи студентов будут удалены.')) return;
    try {
      await api.delete(`/admin/courses/${courseId}`);
      setCourses(c => c.filter(x => x.id !== courseId));
      success('Курс удалён');
    } catch (e) { error('Ошибка'); }
  };

  const approveVideo = async (reqId) => {
    try {
      await api.put(`/admin/video-requests/${reqId}/approve`);
      setVideoRequests(v => v.map(x => x.id === reqId ? { ...x, status: 'approved', reviewedAt: new Date().toISOString() } : x));
      success('Видео одобрено — урок доступен студентам');
    } catch (e) { error(e.response?.data?.message || 'Ошибка'); }
  };

  const rejectVideo = async (reqId) => {
    try {
      await api.put(`/admin/video-requests/${reqId}/reject`, { note: rejectNote || 'Видео не прошло проверку' });
      setVideoRequests(v => v.map(x => x.id === reqId ? { ...x, status: 'rejected', reviewedAt: new Date().toISOString(), reviewNote: rejectNote } : x));
      setRejectTarget(null);
      setRejectNote('');
      success('Видео отклонено');
    } catch (e) { error(e.response?.data?.message || 'Ошибка'); }
  };

  const deleteReview = async (reviewId) => {
    if (!window.confirm('Удалить отзыв?')) return;
    try {
      await api.delete(`/admin/reviews/${reviewId}`);
      setReviews(r => r.filter(x => x.id !== reviewId));
      success('Отзыв удалён');
    } catch (e) { error('Ошибка'); }
  };

  const pendingVideos = videoRequests.filter(v => v.status === 'pending').length;

  const TABS = [
    { id: 'overview', icon: '📊', label: 'Обзор' },
    { id: 'videos',   icon: '🎬', label: `Видео${pendingVideos ? ` (${pendingVideos})` : ''}` },
    { id: 'users',    icon: '👥', label: 'Пользователи' },
    { id: 'courses',  icon: '📚', label: 'Курсы' },
    { id: 'reviews',  icon: '⭐', label: 'Отзывы' },
  ];

  const filteredUsers   = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );
  const filteredCourses = courses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.instructorName.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

  return (
    <div className="admin-page">
      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
        ))}
      </div>

      {/* Header */}
      <div className="admin-header">
        <div>
          <h1>🛡️ Панель модератора</h1>
          <p>Полное управление платформой EduPlatform</p>
        </div>
        <div className="admin-header-stats">
          <span style={{ color: '#f59e0b', fontWeight: 600 }}>👤 {user?.name}</span>
          <span style={{ marginLeft: 16 }}>🕐 {new Date().toLocaleString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`admin-tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => { setTab(t.id); setSearch(''); }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div>
          <div className="admin-stats-grid">
            <StatCard icon="🎓" label="Студентов"       value={stats.students}         color="#ec4899" sub="зарегистрировано" />
            <StatCard icon="👨‍🏫" label="Преподавателей" value={stats.instructors}       color="#10b981" sub="активных" />
            <StatCard icon="📚" label="Курсов"          value={stats.courses}          color="#6366f1" sub={`${stats.published} опубликовано`} />
            <StatCard icon="📝" label="Записей"         value={stats.enrollments}      color="#f59e0b" sub="на курсы" />
            <StatCard icon="⭐" label="Отзывов"         value={stats.reviews}          color="#3b82f6" sub="оставлено" />
            <StatCard icon="✅" label="Завершений"      value={stats.completedCourses} color="#06b6d4" sub="курсов пройдено" />
            <StatCard icon="💰" label="Выручка"         value={`${(stats.revenue || 0).toLocaleString('ru')} ₸`} color="#84cc16" sub="суммарная" />
          </div>

          <div className="admin-charts">
            <div className="admin-chart-card">
              <h3>📈 Распределение ролей</h3>
              <div className="role-chart">
                {[
                  { label: 'Студенты',      count: stats.students,    color: '#ec4899' },
                  { label: 'Преподаватели', count: stats.instructors, color: '#10b981' },
                ].map(r => {
                  const total = (stats.students || 0) + (stats.instructors || 0);
                  const pct = total ? Math.round((r.count / total) * 100) : 0;
                  return (
                    <div key={r.label} className="role-bar-row">
                      <span className="role-bar-label">{r.label}</span>
                      <div className="role-bar-wrap">
                        <div className="role-bar-fill" style={{ width: `${pct}%`, background: r.color }} />
                      </div>
                      <span className="role-bar-pct">{r.count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="admin-chart-card">
              <h3>📚 Топ курсов по студентам</h3>
              <div className="top-courses-list">
                {[...courses].sort((a, b) => b.enrollCount - a.enrollCount).slice(0, 5).map((c, i) => (
                  <div key={c.id} className="top-course-row">
                    <span className="top-num">{i + 1}</span>
                    <span className="top-title">{c.title}</span>
                    <span className="top-count">{c.enrollCount} студентов</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="admin-quick-actions">
            <h3>⚡ Быстрые действия</h3>
            <div className="quick-actions-grid">
              <button className="qa-btn" onClick={() => setTab('users')}>👥 Управление пользователями</button>
              <button className="qa-btn" onClick={() => setTab('courses')}>📚 Управление курсами</button>
              <button className="qa-btn" onClick={() => setTab('reviews')}>⭐ Модерация отзывов</button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIDEOS ── */}
      {tab === 'videos' && (
        <div className="admin-section">
          <div className="admin-section-header">
            <h2>🎬 Видео на проверке</h2>
            <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              {videoRequests.filter(v => v.status === 'pending').length} ожидают · {videoRequests.filter(v => v.status === 'approved').length} одобрено · {videoRequests.filter(v => v.status === 'rejected').length} отклонено
            </span>
          </div>

          {videoRequests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎬</div>
              <h3>Нет видео на проверке</h3>
              <p>Преподаватели ещё не загрузили видео</p>
            </div>
          ) : (
            <div className="video-requests-list">
              {videoRequests.map(v => (
                <div key={v.id} className={`video-request-card status-${v.status}`}>
                  <div className="vrc-header">
                    <div className="vrc-info">
                      <div className="vrc-title">🎬 {v.lessonTitle}</div>
                      <div className="vrc-meta">
                        <span>📚 {v.courseTitle}</span>
                        <span>👨‍🏫 {v.instructorName}</span>
                        <span>📁 {v.videoFileName}</span>
                        {v.videoFileSize > 0 && (
                          <span>💾 {(v.videoFileSize / (1024*1024)).toFixed(1)} МБ</span>
                        )}
                        <span>🕐 {new Date(v.submittedAt).toLocaleDateString('ru-RU')}</span>
                      </div>
                    </div>
                    <div className="vrc-status">
                      {v.status === 'pending'  && <span className="status-badge draft">⏳ На проверке</span>}
                      {v.status === 'approved' && <span className="status-badge active">✅ Одобрено</span>}
                      {v.status === 'rejected' && <span className="status-badge banned">❌ Отклонено</span>}
                    </div>
                  </div>

                  {v.reviewNote && (
                    <div className="vrc-note">💬 Комментарий: {v.reviewNote}</div>
                  )}

                  {/* Модальное поле для причины отклонения */}
                  {rejectTarget === v.id && (
                    <div className="vrc-reject-form">
                      <input
                        className="admin-search"
                        placeholder="Причина отклонения (необязательно)..."
                        value={rejectNote}
                        onChange={e => setRejectNote(e.target.value)}
                        autoFocus
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button className="action-btn delete" onClick={() => rejectVideo(v.id)}>❌ Подтвердить отклонение</button>
                        <button className="action-btn" onClick={() => { setRejectTarget(null); setRejectNote(''); }}>Отмена</button>
                      </div>
                    </div>
                  )}

                  {v.status === 'pending' && rejectTarget !== v.id && (
                    <div className="vrc-actions">
                      <button className="action-btn unban" onClick={() => approveVideo(v.id)} title="Одобрить видео">✅ Одобрить</button>
                      <button className="action-btn ban" onClick={() => { setRejectTarget(v.id); setRejectNote(''); }} title="Отклонить видео">❌ Отклонить</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── USERS ── (полный доступ: смена любой роли + удаление) */}
      {tab === 'users' && (
        <div className="admin-section">
          <div className="admin-section-header">
            <h2>👥 Пользователи ({users.length})</h2>
            <input
              className="admin-search"
              placeholder="🔍 Поиск по имени или email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Пользователь</th>
                  <th>Email</th>
                  <th>Роль</th>
                  <th>Курсов</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id} className={u.banned ? 'row-banned' : ''}>
                    <td>
                      <div className="user-cell">
                        <img src={u.avatar} alt={u.name} className="table-avatar" />
                        <div>
                          <div className="user-cell-name">{u.name}</div>
                          <div className="user-cell-date">с {new Date(u.createdAt).toLocaleDateString('ru-RU')}</div>
                        </div>
                      </div>
                    </td>
                    <td className="email-cell">{u.email}</td>
                    <td>
                      {/* Модератор может назначать любую роль, включая admin и moderator */}
                      <select
                        className="role-select"
                        value={u.role}
                        style={{ color: ROLE_COLORS[u.role] }}
                        onChange={e => changeRole(u.id, e.target.value)}
                        disabled={u.id === user?.id}
                      >
                        <option value="student">🎓 Студент</option>
                        <option value="instructor">👨‍🏫 Преподаватель</option>
                        <option value="admin">👑 Администратор</option>
                        <option value="moderator">🛡️ Модератор</option>
                      </select>
                    </td>
                    <td className="center">
                      {u.role === 'student' ? u.enrollCount : u.courseCount}
                    </td>
                    <td>
                      <span className={`status-badge ${u.banned ? 'banned' : 'active'}`}>
                        {u.banned ? '🔒 Заблокирован' : '✅ Активен'}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button
                          className={`action-btn ${u.banned ? 'unban' : 'ban'}`}
                          onClick={() => toggleBan(u.id)}
                          title={u.banned ? 'Разблокировать' : 'Заблокировать'}
                          disabled={u.id === user?.id}
                        >
                          {u.banned ? '🔓' : '🔒'}
                        </button>
                        {/* Только модератор может удалять пользователей */}
                        <button
                          className="action-btn delete"
                          onClick={() => deleteUser(u.id)}
                          title="Удалить пользователя"
                          disabled={u.id === user?.id}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── COURSES ── (полный доступ: публикация + удаление) */}
      {tab === 'courses' && (
        <div className="admin-section">
          <div className="admin-section-header">
            <h2>📚 Курсы ({courses.length})</h2>
            <input
              className="admin-search"
              placeholder="🔍 Поиск по названию или преподавателю..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Курс</th>
                  <th>Преподаватель</th>
                  <th>Категория</th>
                  <th>Уроков</th>
                  <th>Студентов</th>
                  <th>Цена</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredCourses.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div className="course-cell">
                        <img src={c.thumbnail} alt={c.title} className="table-thumb" />
                        <div>
                          <div className="course-cell-title">{c.title}</div>
                          <div className="course-cell-rating">⭐ {c.rating}</div>
                        </div>
                      </div>
                    </td>
                    <td>{c.instructorName}</td>
                    <td><span className="tag category">{c.category}</span></td>
                    <td className="center">{c.lessonsCount}</td>
                    <td className="center">{c.enrollCount}</td>
                    <td>{c.price.toLocaleString('ru')} ₸</td>
                    <td>
                      <div className="course-status-badges">
                        <span className={`status-badge ${c.published ? 'active' : 'draft'}`}>
                          {c.published ? '✅ Опубликован' : '📝 Черновик'}
                        </span>
                        {c.featured && <span className="status-badge featured">⭐ Топ</span>}
                      </div>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button
                          className={`action-btn ${c.published ? 'ban' : 'unban'}`}
                          onClick={() => togglePublish(c.id)}
                          title={c.published ? 'Снять' : 'Опубликовать'}
                        >
                          {c.published ? '🙈' : '👁'}
                        </button>
                        <button
                          className={`action-btn ${c.featured ? 'ban' : 'unban'}`}
                          onClick={() => toggleFeatured(c.id)}
                          title={c.featured ? 'Убрать из топа' : 'В топ'}
                        >
                          ⭐
                        </button>
                        {/* Только модератор может удалять курсы */}
                        <button
                          className="action-btn delete"
                          onClick={() => deleteCourse(c.id)}
                          title="Удалить курс"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── REVIEWS ── */}
      {tab === 'reviews' && (
        <div className="admin-section">
          <div className="admin-section-header">
            <h2>⭐ Отзывы ({reviews.length})</h2>
          </div>
          <div className="reviews-admin-grid">
            {reviews.map(r => (
              <div key={r.id} className="review-admin-card">
                <div className="rac-header">
                  <div className="rac-user">
                    <strong>{r.userName}</strong>
                    <span className="stars">{'⭐'.repeat(r.rating)}</span>
                  </div>
                  <button className="action-btn delete small" onClick={() => deleteReview(r.id)} title="Удалить">🗑</button>
                </div>
                <div className="rac-course">📚 {r.courseName}</div>
                <p className="rac-comment">"{r.comment}"</p>
                <div className="rac-date">{new Date(r.createdAt).toLocaleDateString('ru-RU')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
