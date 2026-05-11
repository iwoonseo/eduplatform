// middleware для проверки JWT токена
// токен передаётся в заголовке Authorization: Bearer <token>

const jwt = require('jsonwebtoken');

// секрет для подписи токенов — в продакшне берётся из переменной окружения
const JWT_SECRET = process.env.JWT_SECRET || 'eduplatform_secret_2024';

// обязательная авторизация — если токена нет, вернёт 401
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Требуется авторизация' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // добавляем данные юзера в запрос
    next();
  } catch {
    return res.status(401).json({ message: 'Недействительный токен' });
  }
}

// необязательная авторизация — если токен есть то добавляем юзера, если нет — продолжаем без него
// нужно для страниц типа каталога курсов где незарегистрированные тоже могут смотреть
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      // токен невалидный — просто игнорируем и идём дальше без юзера
    }
  }
  next();
}

module.exports = { authMiddleware, optionalAuth, JWT_SECRET };
