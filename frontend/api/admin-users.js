import { createClient } from '@supabase/supabase-js';

// Mesma URL/anon key usadas no frontend (src/lib/supabase.js) - nao sao secretas.
const SUPABASE_URL = 'https://llxafpasowubzgxkswhl.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxseGFmcGFzb3d1YnpneGtzd2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NDU0ODgsImV4cCI6MjA5NjQyMTQ4OH0.m1FTTrxGYPsBMBJV9c4HotPxYpCKxUtnZfz2D9MFEkM';
// A service_role SO existe aqui (variavel de ambiente do servidor) - nunca no bundle do navegador.
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PERFIS_VALIDOS = ['GESTOR', 'ATENDIMENTO', 'PROFESSOR'];

export default async function handler(req, res) {
  if (!['POST', 'PATCH'].includes(req.method)) {
    res.setHeader('Allow', 'POST, PATCH');
    return res.status(405).json({ error: 'Metodo nao permitido' });
  }

  if (!SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Servidor mal configurado: falta SUPABASE_SERVICE_ROLE_KEY' });
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Sessao ausente. Faca login novamente.' });

  // Valida o chamador com o proprio token dele (nao com a service_role)
  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: callerErr } = await callerClient.auth.getUser(token);
  if (callerErr || !userData?.user) return res.status(401).json({ error: 'Sessao invalida ou expirada.' });

  const { data: callerProfile, error: profErr } = await callerClient
    .from('profiles').select('perfil').eq('id', userData.user.id).single();
  if (profErr || callerProfile?.perfil !== 'GESTOR') {
    return res.status(403).json({ error: 'Apenas o perfil Gestor pode criar ou editar credenciais.' });
  }

  // So depois de confirmar que o chamador e Gestor autenticado e que a service_role e usada.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    if (req.method === 'POST') {
      const { nome, email, senha, perfil, modulosPermitidos } = req.body || {};
      if (!nome || !email || !senha) return res.status(400).json({ error: 'Nome, email e senha sao obrigatorios.' });
      if (String(senha).length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: String(email).toLowerCase(),
        password: senha,
        email_confirm: true,
        user_metadata: { nome },
      });
      if (createErr) return res.status(400).json({ error: createErr.message });

      const perfilFinal = PERFIS_VALIDOS.includes(perfil) ? perfil : 'ATENDIMENTO';
      const modulos = Array.isArray(modulosPermitidos) ? modulosPermitidos : null;
      const { error: updErr } = await admin.from('profiles').update({ nome, perfil: perfilFinal, modulos_permitidos: modulos }).eq('id', created.user.id);
      if (updErr) return res.status(400).json({ error: updErr.message });

      return res.status(200).json({ id: created.user.id, email: created.user.email });
    }

    if (req.method === 'PATCH') {
      const { id, email, senha } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id obrigatorio.' });
      const updates = {};
      if (email) updates.email = String(email).toLowerCase();
      if (senha) {
        if (String(senha).length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
        updates.password = senha;
      }
      if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nada para atualizar.' });

      const { error: updErr } = await admin.auth.admin.updateUserById(id, updates);
      if (updErr) return res.status(400).json({ error: updErr.message });

      if (updates.email) {
        await admin.from('profiles').update({ email: updates.email }).eq('id', id);
      }
      return res.status(200).json({ ok: true });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Erro interno' });
  }
}
