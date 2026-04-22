import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-brand">
          <span className="logo-icon">📚</span>
          <span className="logo-text">EduPlatform</span>
          <p>Интерактивная платформа для подбора курсов и онлайн-обучения</p>
        </div>
        <div className="footer-links">
          <h4>Навигация</h4>
          <Link to="/">Главная</Link>
          <Link to="/courses">Каталог курсов</Link>
          <Link to="/register">Регистрация</Link>
        </div>
        <div className="footer-links">
          <h4>Категории</h4>
          <Link to="/courses?category=Программирование">Программирование</Link>
          <Link to="/courses?category=Data Science">Data Science</Link>
          <Link to="/courses?category=Дизайн">Дизайн</Link>
        </div>
        <div className="footer-contact">
          <h4>Контакты</h4>
          <p>📧 support@eduplatform.ru</p>
          <p>📞 +7 (800) 555-35-35</p>
          <p>© 2024 EduPlatform</p>
        </div>
      </div>
    </footer>
  );
}
