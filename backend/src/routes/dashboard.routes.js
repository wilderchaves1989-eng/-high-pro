import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { auth } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', auth, async (_req, res) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const [totalAlunos, agendaHoje, cursosAtivos, proximasAulas] = await Promise.all([
      prisma.aluno.count(),
      prisma.aula.count({ where: { data: { gte: hoje, lt: amanha } } }),
      prisma.curso.count({ where: { ativo: true } }),
      prisma.aula.findMany({
        where: { data: { gte: hoje }, estado: { not: 'CANCELADO' } },
        include: {
          aluno: { select: { nome: true } },
          professor: { select: { nome: true } }
        },
        orderBy: [{ data: 'asc' }, { hora: 'asc' }],
        take: 8
      })
    ]);

    res.json({ totalAlunos, agendaHoje, cursosAtivos, proximasAulas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
