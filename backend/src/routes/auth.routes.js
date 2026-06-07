import { Router } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma.js';
import { generateToken, auth } from '../middleware/auth.middleware.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha sao obrigatorios' });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.ativo) {
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }

    const senhaCorreta = await bcrypt.compare(senha, user.senha);
    if (!senhaCorreta) {
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, nome: true, email: true, perfil: true, ativo: true }
    });
    if (!user) return res.status(404).json({ error: 'Utilizador nao encontrado' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
