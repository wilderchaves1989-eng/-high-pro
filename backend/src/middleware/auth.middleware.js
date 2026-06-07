import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'highpro_dev_secret_change_in_production';

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, perfil: user.perfil },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

export function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token nao fornecido' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalido ou expirado' });
  }
}

export function gestorOnly(req, res, next) {
  if (req.user?.perfil !== 'GESTOR') {
    return res.status(403).json({ error: 'Acesso restrito ao gestor' });
  }
  next();
}

export function gestorOrAtendimento(req, res, next) {
  if (!['GESTOR', 'ATENDIMENTO'].includes(req.user?.perfil)) {
    return res.status(403).json({ error: 'Acesso restrito' });
  }
  next();
}
