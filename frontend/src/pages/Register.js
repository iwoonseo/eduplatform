import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  { value: 'student',    icon: '🎓', title: 'Студент',       desc: 'Учусь, прохожу курсы' },
  { value: 'instructor', icon: '👨‍🏫', title: 'Преподаватель', desc: 'Создаю и веду курсы' },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await register(form.name, form.email, form.password, form.role);
      // Redirect by role
      if (data.user.role === 'instructor') navigate('/instructor');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <div className="auth-header">
          <Link to="/" className="auth-logo">📚 EduPlatform</Link>
          <h1>Создать аккаунт</h1>
          <p>Выберите роль и начните уже сегодня</p>
        </div>

        {error && <div className="error-alert">⚠️ {error}</div>}

        {/* Role selector */}
        <div className="role-selector">
          {ROLES.map(r => (
            <div
              key={r.value}
              className={`role-option ${form.role === r.value ? 'active' : ''}`}
              onClick={() => setForm(f => ({ ...f, role: r.value }))}
            >
              <span className="role-option-icon">{r.icon}</span>
              <div>
                <div className="role-option-title">{r.title}</div>
                <div className="role-option-desc">{r.desc}</div>
              </div>
              {form.role === r.value && <span className="role-check">✓</span>}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Полное имя</label>
            <input type="text" value={form.name}
              onChange={e => setForm(v => ({...v, name: e.target.value}))}
              placeholder="Иван Иванов" required />
          </div>
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
              placeholder="Минимум 6 символов" required minLength={6} />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Создание аккаунта...' : `Зарегистрироваться как ${form.role === 'instructor' ? 'преподаватель' : 'студент'}`}
          </button>
        </form>

        <p className="auth-switch">Уже есть аккаунт? <Link to="/login">Войти</Link></p>
      </div>
    </div>
  );
}
