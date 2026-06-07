import { Router } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../utils/prisma.js';
import { auth, gestorOnly } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/users
router.get('/', auth, gestorOnly, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, nome: true, email: true, perfil: true, ativo: true, criadoEm: true },
      orderBy: { nome: 'asc' }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users
router.post('/', auth, gestorOnly, async (req, res) => {
  try {
    const { nome, email, senha, perfil, ativo } = req.body;
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, email e senha sao obrigatorios' });
    }

    const existe = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existe) return res.status(409).json({ error: 'Email ja registado' });

    const hash = await bcrypt.hash(senha, 10);
    const user = await prisma.user.create({
      data: {
        nome,
        email: email.toLowerCase(),
        senha: hash,
        perfil: perfil || 'ATENDIMENTO',
        ativo: ativo !== false
      },
      select: { id: true, nome: true, email: true, perfil: true, ativo: true }
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', auth, gestorOnly, async (req, res) => {
  try {
    const { nome, email, senha, perfil, ativo } = req.body;
    const data = {};
    if (nome) data.nome = nome;
    if (email) data.email = email.toLowerCase();
    if (senha) data.senha = await bcrypt.hash(senha, 10);
    if (perfil) data.perfil = perfil;
    if (ativo !== undefined) data.ativo = ativo;

    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data,
      select: { id: true, nome: true, email: true, perfil: true, ativo: true }
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', auth, gestorOnly, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
