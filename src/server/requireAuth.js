// Middleware для internal-api: авторизация отключена (dev mode)
export function requireAuth(req, res, next) {
  next();
} 