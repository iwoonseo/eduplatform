import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  { role: '🎓 Студент',        email: 'student@edu.ru',    pass: 'student123',    redirect: '/dashboard',  color: '#ec4899' },
  { role: '👨‍🏫 Преподаватель', email: 'instructor@edu.ru', pass: 'instructor123', redirect: '/instructor', color: '#10b981' },
  { role: '👑 Администратор',  email: 'admin@edu.ru',      pass: 'admin123',      redirect: '/admin',      color: '#6366f1' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      // Redirect by role
      if (data.user.role === 'admin')       navigate('/admin');
      else if (data.user.role === 'instructor') navigate('/instructor');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (acc) => {
    setForm({ email: acc.email, password: acc.pass });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <Link to="/" className="auth-logo">📚 EduPlatform</Link>
          <h1>Добро пожаловать!</h1>
          <p>Войдите в свой аккаунт</p>
        </div>

        {/* Demo accounts */}
        <div className="demo-accounts">
          <p>Быстрый вход (тестовые аккаунты):</p>
          <div className="demo-btns">
            {DEMO_ACCOUNTS.map(acc => (
              <button
                key={acc.email}
                className="demo-btn"
                style={{ borderColor: acc.color, color: acc.color }}
                onClick={() => fillDemo(acc)}
              >
                {acc.role}
              </button>
            ))}
          </div>
          <div className="demo-hint">
            У каждой роли — своя панель управления
          </div>
        </div>

        {error && <div className="error-alert">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email}
              onChange={e => setForm(v => ({...v, email: e.target.value}))}
              placeholder="example@email.com" required />
          </div>
          <div className="form-group">
            <label>Пароль</label>
            <input type="password" value={form.password}
              onChange={e => setForm(v => ({...v, password: e.target.value}))}
              placeholder="Ваш пароль" required />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <p className="auth-switch">Нет аккаунта? <Link to="/register">Зарегистрируйся</Link></p>
      </div>
    </div>
  );
}
