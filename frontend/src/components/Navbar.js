import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* ── Dark Mode Hook ──────────────────────────────────── */
function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem('eduplatform-theme') === 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('eduplatform-theme', dark ? 'dark' : 'light');
  }, [dark]);
  return [dark, () => setDark(d => !d)];
}

/* ── Role config ─────────────────────────────────────── */
const ROLE_NAV = {
  student: [
    { to: '/courses',   label: '📚 Курсы' },
    { to: '/dashboard', label: '🎓 Моё обучение' },
    { to: '/chat',      label: '💬 Чат' },
  ],
  instructor: [
    { to: '/courses',    label: '📚 Курсы' },
    { to: '/instructor', label: '🏫 Мой кабинет' },
    { to: '/chat',       label: '💬 Чат со студентами' },
  ],
  admin: [
    { to: '/admin',   label: '👑 Панель управления' },
    { to: '/courses', label: '📚 Каталог' },
  ],
  moderator: [
    { to: '/moderator', label: '🛡️ Модерация' },
    { to: '/courses',   label: '📚 Каталог' },
  ],
};

const ROLE_LABEL = {
  student:    { text: 'Студент',        color: '#ec4899' },
  instructor: { text: 'Преподаватель',  color: '#10b981' },
  admin:      { text: 'Администратор',  color: '#6366f1' },
  moderator:  { text: 'Модератор',      color: '#f59e0b' },
};

const ROLE_HOME = {
  student:    '/dashboard',
  instructor: '/instructor',
  admin:      '/admin',
  moderator:  '/moderator',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dark, toggleDark] = useDarkMode();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = e => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
    setDropdownOpen(false);
  };

  const navLinks = user ? (ROLE_NAV[user.role] || []) : [{ to: '/courses', label: '📚 Курсы' }];
  const roleInfo = user ? ROLE_LABEL[user.role] : null;
  const homeLink = user ? (ROLE_HOME[user.role] || '/') : '/';

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to={homeLink} className="navbar-logo">
          <span className="logo-icon">📚</span>
          <span className="logo-text">EduPlatform</span>
          {roleInfo && (
            <span className="role-badge" style={{ background: roleInfo.color + '22', color: roleInfo.color, border: `1px solid ${roleInfo.color}44` }}>
              {roleInfo.text}
            </span>
          )}
        </Link>

        {/* Nav links */}
        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link ${location.pathname === link.to || location.pathname.startsWith(link.to + '/') ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="navbar-actions">
          <button className="theme-toggle" onClick={toggleDark} title={dark ? 'Светлая тема' : 'Тёмная тема'}>
            {dark ? '☀️' : '🌙'}
          </button>

          {user ? (
            <div className="user-menu" ref={dropdownRef} onClick={() => setDropdownOpen(o => !o)}>
              <div className="user-avatar-wrap">
                <img src={user.avatar} alt={user.name} className="user-avatar" />
                <span className="user-dot" style={{ background: roleInfo?.color || '#6366f1' }}></span>
              </div>
              {dropdownOpen && (
                <div className="user-dropdown">
                  <div className="user-info">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                    <span className="dropdown-role" style={{ color: roleInfo?.color }}>
                      {roleInfo?.text}
                    </span>
                  </div>
                  <div className="dropdown-divider"></div>

                  {user.role === 'student' && (
                    <>
                      <Link to="/dashboard" className="dropdown-item" onClick={() => setDropdownOpen(false)}>🎓 Моё обучение</Link>
                      <Link to="/chat"      className="dropdown-item" onClick={() => setDropdownOpen(false)}>💬 Чат с преподавателем</Link>
                    </>
                  )}
                  {user.role === 'instructor' && (
                    <>
                      <Link to="/instructor" className="dropdown-item" onClick={() => setDropdownOpen(false)}>🏫 Кабинет преподавателя</Link>
                      <Link to="/chat"       className="dropdown-item" onClick={() => setDropdownOpen(false)}>💬 Чат со студентами</Link>
                    </>
                  )}
                  {user.role === 'admin' && (
                    <>
                      <Link to="/admin" className="dropdown-item" onClick={() => setDropdownOpen(false)}>👑 Панель управления</Link>
                    </>
                  )}
                  {user.role === 'moderator' && (
                    <>
                      <Link to="/moderator" className="dropdown-item" onClick={() => setDropdownOpen(false)}>🛡️ Панель модератора</Link>
                    </>
                  )}
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item danger" onClick={handleLogout}>🚪 Выйти</button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login"    className="btn btn-ghost">Войти</Link>
              <Link to="/register" className="btn btn-primary">Регистрация</Link>
            </div>
          )}
          <button className="burger" onClick={() => setMenuOpen(!menuOpen)}>
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </nav>
  );
}
