const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);
app.use(cors({
  origin: (origin, cb) => cb(null, true),
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/courses',    require('./routes/courses'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/admin',      require('./routes/admin'));
app.use('/api/instructor', require('./routes/instructor'));
app.use('/api/chat',       require('./routes/chat'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'EduPlatform API running' }));

app.listen(PORT, () => {
  console.log(`🚀 EduPlatform API запущен на http://localhost:${PORT}`);
});
