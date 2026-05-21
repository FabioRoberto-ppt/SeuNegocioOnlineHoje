// src/middleware/auth.js

function requireAuth(req, res, next) {
  if (req.session && req.session.admin === true) {
    return next();
  }
  // Se for requisição de API, retorna JSON
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ erro: 'Não autorizado.' });
  }
  // Senão redireciona para o login
  res.redirect('/admin/login');
}

module.exports = { requireAuth };