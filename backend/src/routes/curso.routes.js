import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { auth, gestorOnly } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/cursos
router.get('/', auth, async (_req, res) => {
  try {
    const cursos = await prisma.curso.findMany({
      include: { _count: { select: { alunos: true } } },
      orderBy: { nome: 'asc' }
    });
    res.json(cursos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cursos/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const curso = await prisma.curso.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { alunos: true, _count: { select: { alunos: true } } }
    });
    if (!curso) return res.status(404).json({ error: 'Curso nao encontrado' });
    res.json(curso);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cursos
router.post('/', auth, gestorOnly, async (req, res) => {
  try {
    const { nome, processo, carga, valor, nivel, descricao, ativo } = req.body;
    if (!nome || !carga || valor === undefined) {
      return res.status(400).json({ error: 'Nome, carga e valor sao obrigatorios' });
    }

    const curso = await prisma.curso.create({
      data: {
        nome,
        processo: processo || null,
        carga: parseInt(carga),
        valor: parseFloat(valor),
        nivel: nivel || null,
        descricao: descricao || null,
        ativo: ativo !== false
      }
    });
    res.status(201).json(curso);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/cursos/:id
router.put('/:id', auth, gestorOnly, async (req, res) => {
  try {
    const { nome, processo, carga, valor, nivel, descricao, ativo } = req.body;
    const curso = await prisma.curso.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(nome && { nome }),
        ...(processo !== undefined && { processo }),
        ...(carga && { carga: parseInt(carga) }),
        ...(valor !== undefined && { valor: parseFloat(valor) }),
        ...(nivel !== undefined && { nivel }),
        ...(descricao !== undefined && { descricao }),
        ...(ativo !== undefined && { ativo })
      }
    });
    res.json(curso);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/cursos/:id
router.delete('/:id', auth, gestorOnly, async (req, res) => {
  try {
    await prisma.curso.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
