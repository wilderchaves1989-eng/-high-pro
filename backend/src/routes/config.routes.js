import { Router } from 'express';
import prisma from '../utils/prisma.js';
import { auth, gestorOnly } from '../middleware/auth.middleware.js';

const router = Router();

// GET /api/config
router.get('/', auth, async (_req, res) => {
  try {
    const configs = await prisma.config.findMany();
    const obj = {};
    configs.forEach(c => { obj[c.chave] = c.valor; });
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/config
router.put('/', auth, gestorOnly, async (req, res) => {
  try {
    const entries = Object.entries(req.body);
    for (const [chave, valor] of entries) {
      await prisma.config.upsert({
        where: { chave },
        update: { valor: String(valor) },
        create: { chave, valor: String(valor) }
      });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
