import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { auth, gestorOrAtendimento } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/alunos
router.get('/', auth, async (req, res) => {
  try {
    const { busca, cursoId, status } = req.query;
    const where = {};

    if (busca) {
      where.OR = [
        { nome: { contains: busca, mode: 'insensitive' } },
        { email: { contains: busca, mode: 'insensitive' } },
        { telefone: { contains: busca } }
      ];
    }
    if (cursoId) where.cursoId = parseInt(cursoId);
    if (status) where.status = status;

    const alunos = await prisma.aluno.findMany({
      where,
      include: { curso: { select: { id: true, nome: true, valor: true } } },
      orderBy: { criadoEm: 'desc' }
    });
    res.json(alunos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/alunos/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const aluno = await prisma.aluno.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        curso: true,
        aulas: { orderBy: { data: 'desc' }, take: 20 }
      }
    });
    if (!aluno) return res.status(404).json({ error: 'Aluno nao encontrado' });
    res.json(aluno);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/alunos
router.post('/', auth, gestorOrAtendimento, async (req, res) => {
  try {
    const { nome, email, telefone, cursoId, status, origem } = req.body;
    if (!nome || !email) {
      return res.status(400).json({ error: 'Nome e email sao obrigatorios' });
    }

    const existe = await prisma.aluno.findUnique({ where: { email: email.toLowerCase() } });
    if (existe) return res.status(409).json({ error: 'Email ja registado' });

    const aluno = await prisma.aluno.create({
      data: {
        nome,
        email: email.toLowerCase(),
        telefone: telefone || null,
        cursoId: cursoId ? parseInt(cursoId) : null,
        status: status || 'LEAD',
        origem: origem || null
      },
      include: { curso: { select: { id: true, nome: true, valor: true } } }
    });
    res.status(201).json(aluno);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/alunos/:id
router.put('/:id', auth, gestorOrAtendimento, async (req, res) => {
  try {
    const { nome, email, telefone, cursoId, status, origem } = req.body;
    const aluno = await prisma.aluno.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(nome && { nome }),
        ...(email && { email: email.toLowerCase() }),
        ...(telefone !== undefined && { telefone }),
        ...(cursoId !== undefined && { cursoId: cursoId ? parseInt(cursoId) : null }),
        ...(status && { status }),
        ...(origem !== undefined && { origem })
      },
      include: { curso: { select: { id: true, nome: true, valor: true } } }
    });
    res.json(aluno);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/alunos/:id
router.delete('/:id', auth, gestorOrAtendimento, async (req, res) => {
  try {
    await prisma.aluno.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
