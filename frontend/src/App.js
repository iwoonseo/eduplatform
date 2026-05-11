import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import Home             from './pages/Home';
import Courses          from './pages/Courses';
import CourseDetail     from './pages/CourseDetail';
import Login            from './pages/Login';
import Register         from './pages/Register';
import Learn            from './pages/Learn';

// Role pages
import Dashboard        from './pages/Dashboard';          // student
import InstructorDashboard from './pages/InstructorDashboard'; // instructor
import AdminPanel       from './pages/AdminPanel';          // admin
import ModeratorPanel   from './pages/ModeratorPanel';      // moderator
import Chat             from './pages/Chat';                // student + instructor

// ── Guards ────────────────────────────────────────────────────────────────────
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loader"><div className="spinner"></div></div>;
  return user ? children : <Navigate to="/login" replace />;
}

function RequireRole({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loader"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

// Авто-редирект в нужный кабинет после входа
function DashboardRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loader"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin')       return <Navigate to="/admin"      replace />;
  if (user.role === 'moderator')   return <Navigate to="/moderator"  replace />;
  if (user.role === 'instructor')  return <Navigate to="/instructor" replace />;
  return <Navigate to="/dashboard" replace />;
}

function AppLayout() {
  const location = useLocation();
  const isChat = location.pathname.startsWith('/chat');
  return (
    <div className="app-layout">
      <Navbar />
      <main className={`main-content${isChat ? ' no-padding' : ''}`}>
        <Routes>
              {/* Публичные */}
              <Route path="/"          element={<Home />} />
              <Route path="/courses"   element={<Courses />} />
              <Route path="/courses/:id" element={<CourseDetail />} />
              <Route path="/login"     element={<Login />} />
              <Route path="/register"  element={<Register />} />

              {/* Авто-редирект по роли */}
              <Route path="/me" element={<DashboardRedirect />} />

              {/* 🎓 Студент */}
              <Route path="/dashboard" element={
                <RequireRole roles={['student']}>
                  <Dashboard />
                </RequireRole>
              } />

              {/* 📺 Просмотр урока — студент */}
              <Route path="/learn/:id" element={
                <RequireRole roles={['student']}>
                  <Learn />
                </RequireRole>
              } />

              {/* 💬 Чат — студент и преподаватель */}
              <Route path="/chat"   element={<RequireRole roles={['student','instructor']}><Chat /></RequireRole>} />
              <Route path="/chat/:id" element={<RequireRole roles={['student','instructor']}><Chat /></RequireRole>} />

              {/* 👨‍🏫 Преподаватель */}
              <Route path="/instructor" element={
                <RequireRole roles={['instructor']}>
                  <InstructorDashboard />
                </RequireRole>
              } />
              <Route path="/instructor/*" element={
                <RequireRole roles={['instructor']}>
                  <InstructorDashboard />
                </RequireRole>
              } />

              {/* 👑 Администратор */}
              <Route path="/admin"    element={<RequireRole roles={['admin']}><AdminPanel /></RequireRole>} />
              <Route path="/admin/*"  element={<RequireRole roles={['admin']}><AdminPanel /></RequireRole>} />

              {/* 🛡️ Модератор */}
              <Route path="/moderator"   element={<RequireRole roles={['moderator']}><ModeratorPanel /></RequireRole>} />
              <Route path="/moderator/*" element={<RequireRole roles={['moderator']}><ModeratorPanel /></RequireRole>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isChat && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout />
      </Router>
    </AuthProvider>
  );
}
