import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

function StarRating({ rating, interactive, onRate }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="star-rating">
      {[1,2,3,4,5].map(s => (
        <span key={s}
          className={`star ${s <= (hover || Math.round(rating)) ? 'filled' : ''} ${interactive ? 'interactive' : ''}`}
          onMouseEnter={() => interactive && setHover(s)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onRate && onRate(s)}
        >★</span>
      ))}
      {!interactive && <span className="rating-value">{rating.toFixed(1)}</span>}
    </div>
  );
}

export default function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [activeTab, setActiveTab] = useState('program');
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [openLesson, setOpenLesson] = useState(null);
  const [completingLesson, setCompletingLesson] = useState(null);

  const handleMarkComplete = async (e, lessonId) => {
    e.stopPropagation();
    setCompletingLesson(lessonId);
    await api.post(`/courses/${id}/lessons/${lessonId}/complete`).catch(() => {});
    load();
    setCompletingLesson(null);
  };

  const load = () => {
    api.get(`/courses/${id}`).then(r => setCourse(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleEnroll = async () => {
    if (!user) return navigate('/login');
    setEnrolling(true);
    await api.post(`/courses/${id}/enroll`).catch(() => {});
    load();
    setEnrolling(false);
  };

  const handleReview = async e => {
    e.preventDefault();
    if (!user) return navigate('/login');
    setSubmittingReview(true);
    await api.post(`/courses/${id}/reviews`, review).catch(() => {});
    load();
    setSubmittingReview(false);
    setReview({ rating: 5, comment: '' });
  };

  if (loading) return <div className="page-loader"><div className="spinner"></div></div>;
  if (!course) return <div className="error-page">Курс не найден</div>;

  const discount = Math.round(((course.originalPrice - course.price) / course.originalPrice) * 100);
  const progress = course.completedLessons.length > 0 && course.lessons.length > 0
    ? Math.round((course.completedLessons.length / course.lessons.length) * 100) : 0;

  return (
    <div className="course-detail-page">
      {/* HEADER */}
      <div className="detail-hero">
        <div className="detail-hero-content">
          <div className="breadcrumb">
            <Link to="/">Главная</Link> / <Link to="/courses">Курсы</Link> / <span>{course.title}</span>
          </div>
          <div className="course-tags-row">
            <span className="tag category">{course.category}</span>
            <span className="tag level">{course.level}</span>
            {course.certificate && <span className="tag cert">🎓 Сертификат</span>}
          </div>
          <h1 className="detail-title">{course.title}</h1>
          <p className="detail-desc">{course.description}</p>
          <div className="detail-meta">
            <StarRating rating={course.rating} />
            <span>({course.reviewCount} отзывов)</span>
            <span>•</span>
            <span>👥 {course.studentCount.toLocaleString('ru')} студентов</span>
            <span>•</span>
            <span>🌐 {course.language}</span>
          </div>
          {course.instructor && (
            <div className="instructor-mini">
              <img src={course.instructor.avatar} alt={course.instructor.name} />
              <span>Преподаватель: <strong>{course.instructor.name}</strong></span>
            </div>
          )}
        </div>
        <div className="detail-card">
          <img src={course.thumbnail} alt={course.title} className="detail-thumb" />
          <div className="detail-pricing">
            <div className="price-row">
              <span className="price-big">{course.price.toLocaleString('ru')} ₸</span>
              {discount > 0 && <>
                <span className="price-old">{course.originalPrice.toLocaleString('ru')} ₸</span>
                <span className="price-badge">-{discount}%</span>
              </>}
            </div>
            {course.isEnrolled ? (
              <div className="enrolled-block">
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{width: `${progress}%`}}></div>
                </div>
                <p className="progress-label">{progress}% пройдено</p>
                <Link to={`/learn/${course.id}`} className="btn btn-primary btn-block">
                  {progress > 0 ? '▶ Продолжить обучение' : '▶ Начать обучение'}
                </Link>
              </div>
            ) : (
              <button className="btn btn-primary btn-block" onClick={handleEnroll} disabled={enrolling}>
                {enrolling ? 'Запись...' : '🎓 Записаться на курс'}
              </button>
            )}
            <div className="detail-features">
              <div className="feature-item">📚 {course.lessonCount} уроков</div>
              <div className="feature-item">⏱ {course.duration}</div>
              <div className="feature-item">📶 Бессрочный доступ</div>
              <div className="feature-item">📱 Любое устройство</div>
              {course.certificate && <div className="feature-item">🎓 Сертификат по окончании</div>}
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="detail-body">
        <div className="tabs">
          {['program', 'instructor', 'reviews'].map(tab => (
            <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab === 'program' ? 'Программа' : tab === 'instructor' ? 'Преподаватель' : 'Отзывы'}
            </button>
          ))}
        </div>

        {activeTab === 'program' && (
          <div className="program-tab">
            <h2>Программа курса <span className="lessons-count">({course.lessons.length} уроков)</span></h2>
            <div className="lessons-list">
              {course.lessons.map(lesson => (
                <div key={lesson.id} className={`lesson-item ${course.completedLessons.includes(lesson.id) ? 'completed' : ''}`}
                  onClick={() => setOpenLesson(openLesson === lesson.id ? null : lesson.id)}>
                  <div className="lesson-header">
                    <span className="lesson-num">{lesson.order}</span>
                    <span className="lesson-title">{lesson.title}</span>
                    <div className="lesson-right">
                      {course.completedLessons.includes(lesson.id) && <span className="done-check">✓</span>}
                      <span className="lesson-dur">{lesson.duration}</span>
                      {lesson.isFree && <span className="free-tag">Бесплатно</span>}
                      {!course.isEnrolled && !lesson.isFree && <span className="lock-icon">🔒</span>}
                      <span className="chevron">{openLesson === lesson.id ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  {openLesson === lesson.id && (
                    <div className="lesson-body">
                      <p>{lesson.description}</p>
                      {(course.isEnrolled || lesson.isFree) && lesson.videoUrl && (
                        <iframe title={lesson.title} src={lesson.videoUrl} width="100%" height="315"
                          frameBorder="0" allowFullScreen className="lesson-video"></iframe>
                      )}
                      {course.isEnrolled && (
                        <div style={{marginTop: '12px'}}>
                          {course.completedLessons.includes(lesson.id) ? (
                            <span className="completed-label">✓ Урок завершён</span>
                          ) : (
                            <button className="btn btn-primary" style={{fontSize:'14px', padding:'8px 18px'}}
                              onClick={e => handleMarkComplete(e, lesson.id)}
                              disabled={completingLesson === lesson.id}>
                              {completingLesson === lesson.id ? '...' : '✓ Урок пройден'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'instructor' && course.instructor && (
          <div className="instructor-tab">
            <img src={course.instructor.avatar} alt={course.instructor.name} className="instructor-avatar" />
            <h2>{course.instructor.name}</h2>
            <p className="instructor-bio">{course.instructor.bio}</p>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="reviews-tab">
            <div className="reviews-summary">
              <div className="reviews-big-rating">{course.rating.toFixed(1)}</div>
              <div>
                <StarRating rating={course.rating} />
                <p>{course.reviewCount} отзывов</p>
              </div>
            </div>
            {user && course.isEnrolled && (
              <form className="review-form" onSubmit={handleReview}>
                <h3>Оставить отзыв</h3>
                <StarRating rating={review.rating} interactive onRate={r => setReview(v => ({...v, rating: r}))} />
                <textarea value={review.comment} onChange={e => setReview(v => ({...v, comment: e.target.value}))}
                  placeholder="Напишите ваш отзыв..." rows={4} />
                <button type="submit" className="btn btn-primary" disabled={submittingReview}>
                  {submittingReview ? 'Отправка...' : 'Отправить'}
                </button>
              </form>
            )}
            <div className="reviews-list">
              {course.reviews.map(r => (
                <div key={r.id} className="review-card">
                  <div className="review-header">
                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(r.userName)}&background=6366f1&color=fff&size=40`} alt={r.userName} />
                    <div>
                      <strong>{r.userName}</strong>
                      <StarRating rating={r.rating} />
                    </div>
                    <span className="review-date">{new Date(r.createdAt).toLocaleDateString('ru-RU')}</span>
                  </div>
                  <p>{r.comment}</p>
                </div>
              ))}
              {course.reviews.length === 0 && <p className="no-reviews">Отзывов пока нет. Будьте первым!</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
