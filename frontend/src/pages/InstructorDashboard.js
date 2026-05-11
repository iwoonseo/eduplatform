import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

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

/* ── SVG Revenue Chart ───────────────────────────────── */
function RevenueChart({ courses }) {
  if (!courses.length) return null;
  const max = Math.max(...courses.map(c => c.enrollCount * c.price), 1);
  const W = 320, H = 120, pad = 30;
  const pts = courses.map((c, i) => {
    const x = pad + (i / Math.max(courses.length - 1, 1)) * (W - 2 * pad);
    const y = H - pad - ((c.enrollCount * c.price) / max) * (H - 2 * pad);
    return { x, y, label: c.title.slice(0, 12) + '…', val: c.enrollCount * c.price };
  });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const area = `${path} L ${pts[pts.length - 1].x} ${H - pad} L ${pts[0].x} ${H - pad} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="revenue-svg">
      <defs>
        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#revGrad)" />
      <path d={path} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#6366f1" />
          <title>{courses[i].title}: {p.val.toLocaleString('ru')} ₸</title>
        </g>
      ))}
    </svg>
  );
}

/* ── Achievement badges for instructor ──────────────── */
const INSTR_BADGES = [
  { id: 'first_course', icon: '🚀', label: 'Первый курс',   desc: 'Создал первый курс',       check: s => s.totalCourses >= 1 },
  { id: 'ten_students', icon: '🎯', label: '10 студентов',  desc: '10+ записей на курсы',      check: s => s.totalStudents >= 10 },
  { id: 'good_rating',  icon: '⭐', label: 'Топ-рейтинг',  desc: 'Средний рейтинг 4.5+',      check: s => s.avgRating >= 4.5 },
  { id: 'reviewed',     icon: '📝', label: 'Популярный',    desc: '5+ отзывов получено',       check: s => s.totalReviews >= 5 },
  { id: 'multi_course', icon: '🎓', label: 'Многокурсник',  desc: '3+ курса создано',          check: s => s.totalCourses >= 3 },
  { id: 'rich',         icon: '💰', label: 'Прибыльный',    desc: '50 000+ ₸ выручки',        check: s => s.totalRevenue >= 50000 },
];

/* ── Course Form Modal ───────────────────────────────── */
function CourseModal({ course, onClose, onSave }) {
  const [form, setForm] = useState(course || {
    title: '', description: '', category: 'Программирование',
    level: 'Начинающий', price: '', originalPrice: '',
    duration: '', thumbnail: '', tags: '', language: 'Русский'
  });
  const [saving, setSaving] = useState(false);
  const { error } = useToast();

  const handleSave = async () => {
    if (!form.title || !form.description) return;
    setSaving(true);
    try {
      let res;
      if (course?.id) res = await api.put(`/instructor/courses/${course.id}`, form);
      else            res = await api.post('/instructor/courses', form);
      onSave(res.data);
      onClose();
    } catch (e) { error(e.response?.data?.message || 'Ошибка сохранения'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{course?.id ? '✏️ Редактировать курс' : '➕ Новый курс'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Название курса *</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Например: React с нуля" />
          </div>
          <div className="form-group">
            <label>Описание *</label>
            <textarea rows={4} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Что студент узнает из этого курса..." />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Категория</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                {['Программирование','Data Science','Дизайн','Бизнес','Маркетинг','Английский'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Уровень</label>
              <select value={form.level} onChange={e => setForm({...form, level: e.target.value})}>
                {['Начинающий','Средний','Продвинутый'].map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Цена (₸)</label>
              <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="4990" />
            </div>
            <div className="form-group">
              <label>Старая цена (₸)</label>
              <input type="number" value={form.originalPrice} onChange={e => setForm({...form, originalPrice: e.target.value})} placeholder="9990" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Продолжительность</label>
              <input value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} placeholder="42 часа" />
            </div>
            <div className="form-group">
              <label>Язык</label>
              <select value={form.language} onChange={e => setForm({...form, language: e.target.value})}>
                {['Русский','Казахский','Английский'].map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Ссылка на обложку (URL)</label>
            <input value={form.thumbnail} onChange={e => setForm({...form, thumbnail: e.target.value})} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label>Теги (через запятую)</label>
            <input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="JavaScript, React, Node.js" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.title}>
            {saving ? 'Сохранение...' : '💾 Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Lesson Modal ────────────────────────────────────── */
function LessonModal({ courseId, lesson, onClose, onSave }) {
  const [form, setForm] = useState({
    title:       lesson?.title       || '',
    description: lesson?.description || '',
    duration:    lesson?.duration    || '',
    isFree:      lesson?.isFree      || false,
  });
  const [videoFile, setVideoFile]       = useState(null);   // выбранный файл
  const [uploading, setUploading]       = useState(false);
  const [uploadPct, setUploadPct]       = useState(0);
  const [saving, setSaving]             = useState(false);
  const fileRef = React.useRef();

  /* Симуляция загрузки файла на сервер */
  const simulateUpload = () => new Promise(resolve => {
    setUploading(true);
    setUploadPct(0);
    let pct = 0;
    const iv = setInterval(() => {
      pct += Math.floor(Math.random() * 15) + 5;
      if (pct >= 100) { pct = 100; clearInterval(iv); setUploading(false); resolve(); }
      setUploadPct(pct);
    }, 150);
  });

  const handleSave = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      // Если выбран файл — симулируем загрузку
      if (videoFile) await simulateUpload();

      const payload = {
        ...form,
        videoFileName: videoFile ? videoFile.name : (lesson?.videoFileName || ''),
        videoFileSize: videoFile ? videoFile.size : (lesson?.videoFileSize || 0),
      };

      let res;
      if (lesson?.id) res = await api.put(`/instructor/courses/${courseId}/lessons/${lesson.id}`, payload);
      else            res = await api.post(`/instructor/courses/${courseId}/lessons`, payload);
      onSave(res.data);
      onClose();
    } catch { /* ignore */ }
    finally { setSaving(false); setUploading(false); }
  };

  const formatSize = bytes => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  };

  const existingVideo = lesson?.videoFileName;
  const existingStatus = lesson?.videoStatus;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{lesson?.id ? '✏️ Редактировать урок' : '➕ Новый урок'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Название урока *</label>
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Введение в тему..." />
          </div>

          {/* ── Загрузка видео ── */}
          <div className="form-group">
            <label>Видео урока</label>

            {/* Текущий статус если редактируем */}
            {existingVideo && !videoFile && (
              <div className={`video-status-bar status-${existingStatus}`}>
                {existingStatus === 'pending'   && <span>⏳ Видео на проверке у модератора: <b>{existingVideo}</b></span>}
                {existingStatus === 'approved'  && <span>✅ Видео одобрено: <b>{existingVideo}</b></span>}
                {existingStatus === 'rejected'  && (
                  <span>❌ Видео отклонено: <b>{existingVideo}</b>
                    {lesson?.videoRejectNote && <em> — {lesson.videoRejectNote}</em>}
                  </span>
                )}
              </div>
            )}

            {/* Выбранный файл */}
            {videoFile && (
              <div className="video-selected">
                <span>🎬 {videoFile.name}</span>
                <span className="video-size">{formatSize(videoFile.size)}</span>
                <button className="btn-icon-sm" onClick={() => { setVideoFile(null); setUploadPct(0); }}>✕</button>
              </div>
            )}

            {/* Прогресс загрузки */}
            {uploading && (
              <div className="upload-progress-wrap">
                <div className="upload-progress-bar" style={{ width: `${uploadPct}%` }} />
                <span>{uploadPct}%</span>
              </div>
            )}

            {/* Кнопка выбора файла */}
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files[0]) setVideoFile(e.target.files[0]); }}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm upload-btn"
              onClick={() => fileRef.current.click()}
            >
              📁 {videoFile || existingVideo ? 'Заменить видео' : 'Выбрать видео файл'}
            </button>
            <small>Форматы: MP4, AVI, MOV, MKV · После загрузки видео отправится на проверку модератору</small>
          </div>

          <div className="form-group">
            <label>Описание урока</label>
            <textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Что будем изучать в этом уроке..." />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Продолжительность</label>
              <input value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} placeholder="15 мин" />
            </div>
            <div className="form-group form-check-group">
              <label className="check-label">
                <input type="checkbox" checked={form.isFree} onChange={e => setForm({...form, isFree: e.target.checked})} />
                Бесплатный урок (превью)
              </label>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || uploading || !form.title}>
            {uploading ? `Загрузка ${uploadPct}%...` : saving ? 'Сохранение...' : '💾 Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────── */
export default function InstructorDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [data, setData]         = useState({ courses: [], stats: {} });
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [courseModal, setCourseModal]   = useState(null);   // null | 'new' | courseObj
  const [lessonModal, setLessonModal]   = useState(null);   // null | { courseId, lesson? }
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [courseLessons, setCourseLessons]   = useState({});
  const { toasts, success, error } = useToast();

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/instructor/dashboard'),
      api.get('/instructor/students'),
    ]).then(([d, s]) => {
      setData(d.data);
      setStudents(s.data);
    }).catch(() => error('Ошибка загрузки'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const loadLessons = async (courseId) => {
    if (courseLessons[courseId]) { setExpandedCourse(expandedCourse === courseId ? null : courseId); return; }
    try {
      const res = await api.get(`/instructor/courses/${courseId}/lessons`);
      setCourseLessons(l => ({ ...l, [courseId]: res.data }));
      setExpandedCourse(courseId);
    } catch { error('Ошибка загрузки уроков'); }
  };

  const deleteCourse = async (courseId) => {
    if (!window.confirm('Удалить курс?')) return;
    try {
      await api.delete(`/instructor/courses/${courseId}`);
      setData(d => ({ ...d, courses: d.courses.filter(c => c.id !== courseId) }));
      success('Курс удалён');
    } catch (e) { error(e.response?.data?.message || 'Ошибка'); }
  };

  const deleteLesson = async (courseId, lessonId) => {
    if (!window.confirm('Удалить урок?')) return;
    try {
      await api.delete(`/instructor/courses/${courseId}/lessons/${lessonId}`);
      setCourseLessons(l => ({ ...l, [courseId]: l[courseId].filter(x => x.id !== lessonId) }));
      setData(d => ({ ...d, courses: d.courses.map(c => c.id === courseId ? { ...c, lessonCount: c.lessonCount - 1 } : c) }));
      success('Урок удалён');
    } catch { error('Ошибка'); }
  };

  const onCourseModalSave = (saved) => {
    if (courseModal?.id) {
      setData(d => ({ ...d, courses: d.courses.map(c => c.id === saved.id ? { ...saved, enrollCount: c.enrollCount, lessonCount: c.lessonCount } : c) }));
      success('Курс обновлён');
    } else {
      setData(d => ({ ...d, courses: [...d.courses, { ...saved, enrollCount: 0, lessonCount: 0 }] }));
      success('Курс создан! Добавьте уроки.');
    }
  };

  const onLessonSave = (saved) => {
    const cId = lessonModal.courseId;
    setCourseLessons(l => ({
      ...l,
      [cId]: lessonModal.lesson?.id
        ? l[cId].map(x => x.id === saved.id ? saved : x)
        : [...(l[cId] || []), saved]
    }));
    if (!lessonModal.lesson?.id) {
      setData(d => ({ ...d, courses: d.courses.map(c => c.id === cId ? { ...c, lessonCount: c.lessonCount + 1 } : c) }));
    }
    success(lessonModal.lesson?.id ? 'Урок обновлён' : 'Урок добавлен');
  };

  const TABS = [
    { id: 'overview',   icon: '📊', label: 'Обзор' },
    { id: 'courses',    icon: '📚', label: 'Мои курсы' },
    { id: 'students',   icon: '🎓', label: 'Мои студенты' },
    { id: 'badges',     icon: '🏅', label: 'Достижения' },
  ];

  const stats = data.stats || {};
  const courses = data.courses || [];

  if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

  return (
    <div className="instructor-page">
      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>)}
      </div>

      {/* Modals */}
      {courseModal !== null && (
        <CourseModal
          course={courseModal === 'new' ? null : courseModal}
          onClose={() => setCourseModal(null)}
          onSave={onCourseModalSave}
        />
      )}
      {lessonModal !== null && (
        <LessonModal
          courseId={lessonModal.courseId}
          lesson={lessonModal.lesson || null}
          onClose={() => setLessonModal(null)}
          onSave={onLessonSave}
        />
      )}

      {/* Header */}
      <div className="instr-header">
        <div className="instr-header-left">
          <img src={user.avatar} alt={user.name} className="instr-avatar" />
          <div>
            <h1>Кабинет преподавателя</h1>
            <p>👋 {user.name} · {user.bio || 'Преподаватель EduPlatform'}</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setCourseModal('new')}>
          ➕ Создать курс
        </button>
      </div>

      {/* Quick stats */}
      <div className="instr-quick-stats">
        {[
          { icon: '📚', val: stats.totalCourses || 0,    label: 'Курсов'       },
          { icon: '🎓', val: stats.totalStudents || 0,   label: 'Студентов'    },
          { icon: '⭐', val: stats.avgRating || 0,       label: 'Рейтинг'      },
          { icon: '📝', val: stats.totalReviews || 0,    label: 'Отзывов'      },
          { icon: '💰', val: `${(stats.totalRevenue || 0).toLocaleString('ru')} ₸`, label: 'Выручка' },
        ].map(s => (
          <div key={s.label} className="iqs-item">
            <div className="iqs-icon">{s.icon}</div>
            <div className="iqs-val">{s.val}</div>
            <div className="iqs-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`admin-tab-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div>
          <div className="instr-overview-grid">
            <div className="instr-card">
              <h3>📈 Выручка по курсам</h3>
              <RevenueChart courses={courses} />
              {courses.map(c => (
                <div key={c.id} className="rev-row">
                  <span>{c.title.slice(0, 30)}{c.title.length > 30 ? '…' : ''}</span>
                  <span>{(c.enrollCount * c.price).toLocaleString('ru')} ₸</span>
                </div>
              ))}
            </div>
            <div className="instr-card">
              <h3>🎓 Недавние студенты</h3>
              {students.slice(0, 6).map(s => (
                <div key={`${s.id}-${s.courseId}`} className="student-mini-row">
                  <img src={s.avatar} alt={s.name} className="mini-avatar" />
                  <div>
                    <div className="student-mini-name">{s.name}</div>
                    <div className="student-mini-course">{s.courseName}</div>
                  </div>
                  <div className="student-mini-progress">
                    <div className="mini-bar-wrap"><div className="mini-bar-fill" style={{width:`${s.progress}%`}} /></div>
                    <span>{s.progress}%</span>
                  </div>
                </div>
              ))}
              {students.length > 6 && <p className="more-hint">+{students.length - 6} студентов</p>}
              {!students.length && <p className="empty-hint">Пока нет студентов</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── MY COURSES ── */}
      {tab === 'courses' && (
        <div className="instr-courses-section">
          <div className="instr-section-header">
            <h2>Мои курсы ({courses.length})</h2>
            <button className="btn btn-primary" onClick={() => setCourseModal('new')}>➕ Создать курс</button>
          </div>

          {courses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h3>Вы ещё не создали ни одного курса</h3>
              <p>Нажмите кнопку выше, чтобы создать свой первый курс</p>
            </div>
          ) : (
            <div className="instr-courses-list">
              {courses.map(c => (
                <div key={c.id} className="instr-course-block">
                  <div className="instr-course-row">
                    <img src={c.thumbnail} alt={c.title} className="instr-course-thumb" />
                    <div className="instr-course-info">
                      <div className="instr-course-title-row">
                        <h3>{c.title}</h3>
                        <div className="course-status-badges">
                          <span className={`status-badge ${c.published ? 'active' : 'draft'}`}>
                            {c.published ? '✅ Опубликован' : '📝 Черновик'}
                          </span>
                        </div>
                      </div>
                      <div className="instr-course-meta">
                        <span>📚 {c.lessonCount} уроков</span>
                        <span>🎓 {c.enrollCount} студентов</span>
                        <span>⭐ {c.rating}</span>
                        <span>💰 {c.price.toLocaleString('ru')} ₸</span>
                        <span className="tag category">{c.category}</span>
                      </div>
                    </div>
                    <div className="instr-course-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => setCourseModal(c)}>✏️ Изменить</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => loadLessons(c.id)}>
                        {expandedCourse === c.id ? '🔼 Уроки' : '📋 Уроки'}
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteCourse(c.id)}>🗑 Удалить</button>
                    </div>
                  </div>

                  {/* Lessons panel */}
                  {expandedCourse === c.id && (
                    <div className="lessons-panel">
                      <div className="lessons-panel-header">
                        <h4>📋 Уроки курса</h4>
                        <button className="btn btn-primary btn-sm" onClick={() => setLessonModal({ courseId: c.id })}>
                          ➕ Добавить урок
                        </button>
                      </div>
                      {(courseLessons[c.id] || []).length === 0 ? (
                        <p className="empty-hint">Уроки ещё не добавлены</p>
                      ) : (
                        <div className="lessons-list">
                          {(courseLessons[c.id] || []).map((l, i) => (
                            <div key={l.id} className="lesson-admin-row">
                              <span className="lesson-num">{i + 1}</span>
                              <div className="lesson-info">
                                <span className="lesson-title">{l.title}</span>
                                <span className="lesson-dur">{l.duration}</span>
                                {l.isFree && <span className="free-tag">Бесплатно</span>}
                                {l.videoStatus === 'pending'  && <span className="video-badge pending">⏳ Видео на проверке</span>}
                                {l.videoStatus === 'approved' && <span className="video-badge approved">✅ Видео одобрено</span>}
                                {l.videoStatus === 'rejected' && <span className="video-badge rejected" title={l.videoRejectNote}>❌ Видео отклонено</span>}
                              </div>
                              <div className="lesson-actions">
                                <button className="action-btn" onClick={() => setLessonModal({ courseId: c.id, lesson: l })}>✏️</button>
                                <button className="action-btn delete" onClick={() => deleteLesson(c.id, l.id)}>🗑</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STUDENTS ── */}
      {tab === 'students' && (
        <div className="instr-courses-section">
          <h2>Мои студенты ({students.length})</h2>
          {students.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎓</div>
              <h3>Нет студентов</h3>
              <p>Студенты появятся когда запишутся на ваши курсы</p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Студент</th><th>Курс</th><th>Прогресс</th><th>Записался</th><th>Статус</th></tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={`${s.id}-${s.courseId}`}>
                      <td>
                        <div className="user-cell">
                          <img src={s.avatar} alt={s.name} className="table-avatar" />
                          <div>
                            <div className="user-cell-name">{s.name}</div>
                            <div className="user-cell-date">{s.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{s.courseName}</td>
                      <td>
                        <div className="progress-cell">
                          <div className="mini-bar-wrap wide">
                            <div className="mini-bar-fill" style={{width:`${s.progress}%`}} />
                          </div>
                          <span>{s.progress}%</span>
                        </div>
                      </td>
                      <td>{new Date(s.enrolledAt).toLocaleDateString('ru-RU')}</td>
                      <td>
                        <span className={`status-badge ${s.completed ? 'active' : 'draft'}`}>
                          {s.completed ? '✅ Завершил' : '📖 Учится'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ACHIEVEMENTS ── */}
      {tab === 'badges' && (
        <div className="instr-courses-section">
          <h2>🏅 Достижения преподавателя</h2>
          <p style={{color:'var(--text-muted)', marginBottom: 24}}>
            Разблокировано: {INSTR_BADGES.filter(b => b.check(stats)).length} / {INSTR_BADGES.length}
          </p>
          <div className="badges-grid">
            {INSTR_BADGES.map(b => {
              const unlocked = b.check(stats);
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
    </div>
  );
}
