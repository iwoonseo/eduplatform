import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';

/* ── Confetti ────────────────────────────────────────── */
function Confetti({ active }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      r: Math.random() * 8 + 4,
      d: Math.random() * 120 + 80,
      color: ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'][Math.floor(Math.random()*6)],
      tilt: Math.random() * 10 - 10,
      tiltInc: Math.random() * 0.07 + 0.05,
      angle: 0,
    }));

    let angle = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      angle += 0.01;
      pieces.forEach(p => {
        p.angle += p.tiltInc;
        p.y += Math.cos(angle + p.d) + 2;
        p.x += Math.sin(angle) * 1.5;
        p.tilt = Math.sin(p.angle) * 12;
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random() * canvas.width; }
        ctx.beginPath();
        ctx.lineWidth = p.r / 2;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
        ctx.stroke();
      });
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    const stop = setTimeout(() => cancelAnimationFrame(animRef.current), 4000);
    return () => { cancelAnimationFrame(animRef.current); clearTimeout(stop); };
  }, [active]);

  if (!active) return null;
  return <canvas ref={canvasRef} className="confetti-canvas" />;
}

/* ── Pomodoro Timer ──────────────────────────────────── */
const MODES = { study: 25 * 60, short: 5 * 60, long: 15 * 60 };
const MODE_LABELS = { study: '📖 Учёба', short: '☕ Короткий', long: '🛋️ Длинный' };

function PomodoroTimer() {
  const [mode, setMode]       = useState('study');
  const [seconds, setSeconds] = useState(MODES.study);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef(null);

  const reset = useCallback((m = mode) => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setSeconds(MODES[m]);
  }, [mode]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            if (mode === 'study') setSessions(n => n + 1);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, mode]);

  const switchMode = m => { setMode(m); reset(m); setSeconds(MODES[m]); };

  const total = MODES[mode];
  const pct   = ((total - seconds) / total) * 100;
  const r     = 36;
  const circ  = 2 * Math.PI * r;
  const dash  = circ - (pct / 100) * circ;
  const mins  = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs  = String(seconds % 60).padStart(2, '0');

  return (
    <div className={`pomodoro-widget ${expanded ? 'pomodoro-expanded' : ''}`}>
      <button className="pomodoro-toggle" onClick={() => setExpanded(e => !e)} title="Помодоро-таймер">
        🍅 {!expanded && <span className="pomodoro-mini-time">{mins}:{secs}</span>}
        {running && !expanded && <span className="pomodoro-dot" />}
      </button>

      {expanded && (
        <div className="pomodoro-panel">
          <div className="pomodoro-header">
            <span className="pomodoro-title">⏱ Помодоро</span>
            <span className="pomodoro-sessions">🍅 × {sessions}</span>
          </div>
          <div className="pomodoro-modes">
            {Object.keys(MODES).map(m => (
              <button key={m} className={`pomo-mode-btn ${mode === m ? 'active' : ''}`} onClick={() => switchMode(m)}>
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
          <div className="pomodoro-circle-wrap">
            <svg width="100" height="100" className="pomodoro-svg">
              <circle cx="50" cy="50" r={r} stroke="#e2e8f0" strokeWidth="7" fill="none" />
              <circle
                cx="50" cy="50" r={r}
                stroke={mode === 'study' ? '#6366f1' : '#10b981'}
                strokeWidth="7" fill="none"
                strokeDasharray={circ}
                strokeDashoffset={dash}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div className="pomodoro-time">{mins}:{secs}</div>
          </div>
          <div className="pomodoro-controls">
            <button className="btn btn-primary btn-sm" onClick={() => setRunning(r => !r)}>
              {running ? '⏸ Пауза' : '▶ Старт'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => reset()}>↺ Сброс</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Notes Panel ─────────────────────────────────────── */
function NotesPanel({ lessonId, courseId }) {
  const [open, setOpen] = useState(false);
  const storageKey = `notes-${courseId}-${lessonId}`;
  const [text, setText] = useState(() => localStorage.getItem(storageKey) || '');

  useEffect(() => {
    setText(localStorage.getItem(storageKey) || '');
  }, [storageKey]);

  const handleChange = e => {
    setText(e.target.value);
    localStorage.setItem(storageKey, e.target.value);
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <>
      <button
        className="notes-toggle-btn"
        onClick={() => setOpen(o => !o)}
        title="Мои заметки"
      >
        📝
      </button>
      {open && (
        <div className="notes-panel">
          <div className="notes-header">
            <span>📝 Заметки к уроку</span>
            <button onClick={() => setOpen(false)}>×</button>
          </div>
          <textarea
            value={text}
            onChange={handleChange}
            placeholder="Записывай важные мысли здесь... Заметки сохраняются автоматически."
          />
          <div className="notes-footer">
            <span>Автосохранение ✓</span>
            <span>{wordCount} слов</span>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Certificate Generator ───────────────────────────── */
function CertificateGenerator({ courseName, userName }) {
  const handleDownload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 850;
    const ctx = canvas.getContext('2d');

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 1200, 850);
    grad.addColorStop(0, '#1e1b4b');
    grad.addColorStop(0.5, '#312e81');
    grad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 850);

    // Gold border
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 8;
    ctx.strokeRect(24, 24, 1152, 802);
    ctx.strokeStyle = 'rgba(245,158,11,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, 1120, 770);

    // Corner decorations
    const corners = [[60,60],[1140,60],[60,790],[1140,790]];
    corners.forEach(([x,y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
    });

    // Star decorations
    for (let i = 0; i < 12; i++) {
      const sx = 100 + (i * 90);
      ctx.save();
      ctx.translate(sx, 120);
      ctx.fillStyle = `rgba(245,158,11,${0.15 + Math.random() * 0.15})`;
      ctx.font = '18px serif';
      ctx.fillText('★', 0, 0);
      ctx.restore();
    }

    // Logo/Title area
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('📚 EDUPLATFORM', 600, 130);

    // Main title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 58px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('СЕРТИФИКАТ', 600, 230);
    ctx.font = '28px Arial';
    ctx.fillStyle = '#c7d2fe';
    ctx.fillText('об успешном прохождении курса', 600, 280);

    // Divider line
    ctx.beginPath();
    ctx.moveTo(200, 310); ctx.lineTo(1000, 310);
    ctx.strokeStyle = 'rgba(245,158,11,0.5)'; ctx.lineWidth = 1.5;
    ctx.stroke();

    // Student name
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Настоящим подтверждается, что', 600, 380);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(userName || 'Студент', 600, 450);

    // Underline for name
    const nameWidth = ctx.measureText(userName || 'Студент').width;
    ctx.beginPath();
    ctx.moveTo(600 - nameWidth/2, 462);
    ctx.lineTo(600 + nameWidth/2, 462);
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 2;
    ctx.stroke();

    // Course description
    ctx.fillStyle = '#c7d2fe';
    ctx.font = '22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('успешно завершил(а) курс', 600, 515);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 34px Arial';
    // Truncate long course names
    const maxCourseLen = 40;
    const displayCourse = courseName && courseName.length > maxCourseLen
      ? courseName.slice(0, maxCourseLen) + '…'
      : (courseName || 'Курс');
    ctx.fillText(`"${displayCourse}"`, 600, 570);

    // Date
    const date = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px Arial';
    ctx.fillText(`Дата выдачи: ${date}`, 600, 640);

    // Bottom divider
    ctx.beginPath();
    ctx.moveTo(200, 680); ctx.lineTo(1000, 680);
    ctx.strokeStyle = 'rgba(245,158,11,0.3)'; ctx.lineWidth = 1;
    ctx.stroke();

    // Footer
    ctx.fillStyle = 'rgba(148,163,184,0.7)';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('EduPlatform — Онлайн-обучение нового поколения', 600, 720);

    // Medal emoji area
    ctx.font = '72px serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎓', 600, 790);

    // Download
    const link = document.createElement('a');
    link.download = `certificate-${(courseName || 'course').replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <button className="certificate-btn" onClick={handleDownload}>
      🎓 Скачать сертификат
    </button>
  );
}

/* ── Learn Page ──────────────────────────────────────── */
export default function Learn() {
  const { id } = useParams();
  const { user } = useAuth();
  const [course, setCourse]         = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [justCompleted, setJustCompleted] = useState(false);
  const [showConfetti, setShowConfetti]   = useState(false);
  const [focusMode, setFocusMode]         = useState(false);

  const userName = user?.name || 'Студент';

  const load = () => api.get(`/courses/${id}`).then(r => {
    setCourse(r.data);
    if (!currentLesson && r.data.lessons.length > 0) {
      const first = r.data.lessons.find(l => !r.data.completedLessons.includes(l.id)) || r.data.lessons[0];
      setCurrentLesson(first);
    }
  }).finally(() => setLoading(false));

  useEffect(() => { load(); }, [id]);

  const markComplete = async () => {
    if (!currentLesson) return;
    await api.post(`/courses/${id}/lessons/${currentLesson.id}/complete`);
    setJustCompleted(true);
    setTimeout(() => setJustCompleted(false), 1000);

    const updatedCourse = await api.get(`/courses/${id}`).then(r => r.data);
    setCourse(updatedCourse);

    // Record today in streak
    const todayStr = new Date().toISOString().slice(0, 10);
    const streak = JSON.parse(localStorage.getItem('eduplatform-streak') || '{}');
    streak[todayStr] = true;
    localStorage.setItem('eduplatform-streak', JSON.stringify(streak));

    const completedCount = updatedCourse.completedLessons.length;
    const totalCount     = updatedCourse.lessons.length;
    if (completedCount >= totalCount) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 4500);
    }

    const idx = course.lessons.findIndex(l => l.id === currentLesson.id);
    if (idx < course.lessons.length - 1) setCurrentLesson(course.lessons[idx + 1]);
  };

  if (loading) return <div className="page-loader"><div className="spinner"></div></div>;
  if (!course)  return <div className="error-page">Курс не найден</div>;

  const progress = course.lessons.length > 0
    ? Math.round((course.completedLessons.length / course.lessons.length) * 100) : 0;

  return (
    <div className={`learn-page${focusMode ? ' focus-mode' : ''}`}>
      <Confetti active={showConfetti} />
      <PomodoroTimer />
      <NotesPanel lessonId={currentLesson?.id} courseId={id} />

      {/* SIDEBAR */}
      <aside className="learn-sidebar">
        <div className="learn-course-title">
          <Link to={`/courses/${id}`}>← Назад к курсу</Link>
          <h3>{course.title}</h3>
          <div className="learn-progress">
            <div className="progress-bar-wrap">
              <div className="progress-bar-fill" style={{width: `${progress}%`}}></div>
            </div>
            <span>{progress}% пройдено</span>
          </div>
        </div>
        <div className="lessons-sidebar-list">
          {course.lessons.map(lesson => (
            <button key={lesson.id}
              className={`sidebar-lesson ${currentLesson?.id === lesson.id ? 'active' : ''} ${course.completedLessons.includes(lesson.id) ? 'done' : ''}`}
              onClick={() => setCurrentLesson(lesson)}>
              <span className="sl-num">{lesson.order}</span>
              <span className="sl-title">{lesson.title}</span>
              <span className="sl-dur">{lesson.duration}</span>
              {course.completedLessons.includes(lesson.id) && <span className="sl-check">✓</span>}
            </button>
          ))}
        </div>
      </aside>

      {/* MAIN */}
      <div className="learn-main">
        {currentLesson ? (
          <>
            <div className="video-container">
              {currentLesson.videoUrl ? (
                <iframe title={currentLesson.title} src={currentLesson.videoUrl}
                  width="100%" height="100%" frameBorder="0" allowFullScreen></iframe>
              ) : (
                <div className="video-locked">🔒 Видео недоступно</div>
              )}
            </div>
            <div className="lesson-info-panel">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <h2>{currentLesson.title}</h2>
                {/* Focus Mode toggle */}
                <button
                  className={`focus-mode-btn${focusMode ? ' active' : ''}`}
                  onClick={() => setFocusMode(f => !f)}
                  title="Режим фокуса"
                >
                  {focusMode ? '⊞ Обычный режим' : '⛶ Фокус-режим'}
                </button>
              </div>
              <p>{currentLesson.description}</p>
              <div className="lesson-actions">
                {!course.completedLessons.includes(currentLesson.id) ? (
                  <button
                    className={`btn btn-primary lesson-done-btn ${justCompleted ? 'lesson-done-flash' : ''}`}
                    onClick={markComplete}
                  >
                    ✓ Урок пройден
                  </button>
                ) : (
                  <span className="completed-label">✓ Урок завершён</span>
                )}
                {progress === 100 && (
                  <div className="course-complete-banner">
                    🎉 Поздравляем! Вы прошли курс полностью!
                    <div style={{ marginTop: 8 }}>
                      <CertificateGenerator courseName={course.title} userName={userName} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">Выберите урок для начала обучения</div>
        )}
      </div>
    </div>
  );
}
