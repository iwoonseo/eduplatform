import React from 'react';
import { Link } from 'react-router-dom';

function StarRating({ rating }) {
  return (
    <div className="star-rating">
      {[1,2,3,4,5].map(s => (
        <span key={s} className={s <= Math.round(rating) ? 'star filled' : 'star'}>★</span>
      ))}
      <span className="rating-value">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function CourseCard({ course }) {
  const discount = Math.round(((course.originalPrice - course.price) / course.originalPrice) * 100);

  return (
    <Link to={`/courses/${course.id}`} className="course-card">
      <div className="card-image-wrap">
        <img src={course.thumbnail} alt={course.title} className="card-image" loading="lazy" />
        {discount > 0 && <span className="discount-badge">-{discount}%</span>}
        {course.featured && <span className="featured-badge">⭐ Хит</span>}
        {course.isEnrolled && <span className="enrolled-badge">✓ Записан</span>}
      </div>
      <div className="card-body">
        <div className="card-tags">
          <span className="tag category">{course.category}</span>
          <span className={`tag level level-${course.level.toLowerCase().replace(' ', '-')}`}>{course.level}</span>
        </div>
        <h3 className="card-title">{course.title}</h3>
        <p className="card-instructor">👤 {course.instructorName}</p>
        <StarRating rating={course.rating} />
        <p className="card-meta">
          <span>📚 {course.lessonCount} уроков</span>
          <span>⏱ {course.duration}</span>
          <span>👥 {course.studentCount.toLocaleString('ru')} студентов</span>
        </p>
        <div className="card-footer">
          <div className="price-block">
            <span className="price-current">{course.price.toLocaleString('ru')} ₸</span>
            {course.originalPrice > course.price && (
              <span className="price-old">{course.originalPrice.toLocaleString('ru')} ₸</span>
            )}
          </div>
          {course.certificate && <span className="cert-badge">🎓 Сертификат</span>}
        </div>
      </div>
    </Link>
  );
}
