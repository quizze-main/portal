// Middleware для internal-api: проверяет наличие авторизованного пользователя
export function requireAuth(req, res, next) {
  if (process.env.NODE_ENV === 'production' && !req.user) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  next();
} 