import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { auth, gestorOrAtendimento } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/aulas
router.get('/', auth, async (req, res) => {
  try {
    const { data, mes, ano, tipo, estado } = req.query;
    const where = {};

    if (data) {
      where.data = new Date(data);
    } else if (mes && ano) {
      const inicio = new Date(parseInt(ano), parseInt(mes) - 1, 1);
      const fim = new Date(parseInt(ano), parseInt(mes), 0);
      where.data = { gte: inicio, lte: fim };
    }

    if (tipo) where.tipo = tipo;
    if (estado) where.estado = estado;

    const aulas = await prisma.aula.findMany({
      where,
      include: {
        aluno: { select: { id: true, nome: true, telefone: true } },
        professor: { select: { id: true, nome: true } }
      },
      orderBy: [{ data: 'asc' }, { hora: 'asc' }]
    });
    res.json(aulas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/aulas/proximas
router.get('/proximas', auth, async (_req, res) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const aulas = await prisma.aula.findMany({
      where: { data: { gte: hoje }, estado: { not: 'CANCELADO' } },
      include: {
        aluno: { select: { id: true, nome: true } },
        professor: { select: { id: true, nome: true } }
      },
      orderBy: [{ data: 'asc' }, { hora: 'asc' }],
      take: 10
    });
    res.json(aulas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/aulas
router.post('/', auth, gestorOrAtendimento, async (req, res) => {
  try {
    const { alunoId, professorId, tipo, data, hora, duracao, estado, notas } = req.body;
    if (!alunoId || !data || !hora) {
      return res.status(400).json({ error: 'Aluno, data e hora sao obrigatorios' });
    }

    const aula = await prisma.aula.create({
      data: {
        alunoId: parseInt(alunoId),
        professorId: professorId ? parseInt(professorId) : null,
        tipo: tipo || 'PRATICA',
        data: new Date(data),
        hora,
        duracao: parseInt(duracao) || 60,
        estado: estado || 'CONFIRMADO',
        notas: notas || null
      },
      include: {
        aluno: { select: { id: true, nome: true } },
        professor: { select: { id: true, nome: true } }
      }
    });
    res.status(201).json(aula);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/aulas/:id
router.put('/:id', auth, gestorOrAtendimento, async (req, res) => {
  try {
    const { alunoId, professorId, tipo, data, hora, duracao, estado, notas } = req.body;
    const aula = await prisma.aula.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(alunoId && { alunoId: parseInt(alunoId) }),
        ...(professorId !== undefined && { professorId: professorId ? parseInt(professorId) : null }),
        ...(tipo && { tipo }),
        ...(data && { data: new Date(data) }),
        ...(hora && { hora }),
        ...(duracao && { duracao: parseInt(duracao) }),
        ...(estado && { estado }),
        ...(notas !== undefined && { notas })
      },
      include: {
        aluno: { select: { id: true, nome: true } },
        professor: { select: { id: true, nome: true } }
      }
    });
    res.json(aula);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/aulas/:id
router.delete('/:id', auth, gestorOrAtendimento, async (req, res) => {
  try {
    await prisma.aula.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
