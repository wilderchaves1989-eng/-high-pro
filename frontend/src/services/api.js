import { supabase } from '../lib/supabase';

// ── ALUNOS ──────────────────────────────────────────────────
export const alunos = {
  async listar({ busca, cursoId, status } = {}) {
    let query = supabase.from('alunos').select('*, cursos(id, nome, valor)').order('criado_em', { ascending: false });
    if (busca) query = query.or(`nome.ilike.%${busca}%,email.ilike.%${busca}%,telefone.ilike.%${busca}%`);
    if (cursoId) query = query.eq('curso_id', cursoId);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async criar(dados) {
    const { data, error } = await supabase.from('alunos').insert([{
      nome: dados.nome,
      email: dados.email.toLowerCase(),
      telefone: dados.telefone || null,
      curso_id: dados.cursoId ? parseInt(dados.cursoId) : null,
      status: dados.status || 'LEAD',
      origem: dados.origem || null,
      faixa_etaria: dados.faixaEtaria || null,
      profissao: dados.profissao || null,
    }]).select('*, cursos(id, nome, valor)').single();
    if (error) throw error;
    return data;
  },

  async atualizar(id, dados) {
    const update = {};
    if (dados.nome) update.nome = dados.nome;
    if (dados.email) update.email = dados.email.toLowerCase();
    if (dados.telefone !== undefined) update.telefone = dados.telefone;
    if (dados.cursoId !== undefined) update.curso_id = dados.cursoId ? parseInt(dados.cursoId) : null;
    if (dados.status) update.status = dados.status;
    if (dados.origem !== undefined) update.origem = dados.origem;
    if (dados.faixaEtaria !== undefined) update.faixa_etaria = dados.faixaEtaria;
    if (dados.profissao !== undefined) update.profissao = dados.profissao;

    const { data, error } = await supabase.from('alunos').update(update).eq('id', id).select('*, cursos(id, nome, valor)').single();
    if (error) throw error;
    return data;
  },

  async excluir(id) {
    const { error } = await supabase.from('alunos').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── CURSOS ──────────────────────────────────────────────────
export const cursos = {
  async listar() {
    const { data, error } = await supabase.from('cursos').select('*, alunos(count)').order('nome');
    if (error) throw error;
    return data.map(c => ({ ...c, _count: { alunos: c.alunos?.[0]?.count || 0 } }));
  },

  async criar(dados) {
    const { data, error } = await supabase.from('cursos').insert([{
      nome: dados.nome,
      processo: dados.processo || null,
      carga: parseInt(dados.carga),
      valor: parseFloat(dados.valor),
      nivel: dados.nivel || null,
      descricao: dados.descricao || null,
      ativo: dados.ativo !== false,
    }]).select().single();
    if (error) throw error;
    return data;
  },

  async atualizar(id, dados) {
    const update = {};
    if (dados.nome) update.nome = dados.nome;
    if (dados.processo !== undefined) update.processo = dados.processo;
    if (dados.carga) update.carga = parseInt(dados.carga);
    if (dados.valor !== undefined) update.valor = parseFloat(dados.valor);
    if (dados.nivel !== undefined) update.nivel = dados.nivel;
    if (dados.descricao !== undefined) update.descricao = dados.descricao;
    if (dados.ativo !== undefined) update.ativo = dados.ativo;

    const { data, error } = await supabase.from('cursos').update(update).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async excluir(id) {
    const { error } = await supabase.from('cursos').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── AULAS ───────────────────────────────────────────────────
export const aulas = {
  async listar({ mes, ano, tipo, estado } = {}) {
    let query = supabase.from('aulas').select('*, alunos!inner(id, nome, telefone), profiles(id, nome)').order('data').order('hora');

    if (mes && ano) {
      const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
      const lastDay = new Date(parseInt(ano), parseInt(mes), 0).getDate();
      const fim = `${ano}-${String(mes).padStart(2, '0')}-${lastDay}`;
      query = query.gte('data', inicio).lte('data', fim);
    }
    if (tipo) query = query.eq('tipo', tipo);
    if (estado) query = query.eq('estado', estado);

    const { data, error } = await query;
    if (error) throw error;
    return data.map(a => ({ ...a, aluno: a.alunos, professor: a.profiles }));
  },

  async proximas() {
    const hoje = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('aulas')
      .select('*, alunos!inner(id, nome), profiles(id, nome)')
      .gte('data', hoje)
      .neq('estado', 'CANCELADO')
      .order('data')
      .order('hora')
      .limit(10);
    if (error) throw error;
    return data.map(a => ({ ...a, aluno: a.alunos, professor: a.profiles }));
  },

  async criar(dados) {
    const { data, error } = await supabase.from('aulas').insert([{
      aluno_id: parseInt(dados.alunoId),
      professor_id: dados.professorId || null,
      tipo: dados.tipo || 'PRATICA',
      data: dados.data,
      hora: dados.hora,
      duracao: parseInt(dados.duracao) || 60,
      estado: dados.estado || 'CONFIRMADO',
      notas: dados.notas || null,
    }]).select('*, alunos!inner(id, nome), profiles(id, nome)').single();
    if (error) throw error;
    return { ...data, aluno: data.alunos, professor: data.profiles };
  },

  async atualizar(id, dados) {
    const update = {};
    if (dados.alunoId) update.aluno_id = parseInt(dados.alunoId);
    if (dados.professorId !== undefined) update.professor_id = dados.professorId || null;
    if (dados.tipo) update.tipo = dados.tipo;
    if (dados.data) update.data = dados.data;
    if (dados.hora) update.hora = dados.hora;
    if (dados.duracao) update.duracao = parseInt(dados.duracao);
    if (dados.estado) update.estado = dados.estado;
    if (dados.notas !== undefined) update.notas = dados.notas;

    const { data, error } = await supabase.from('aulas').update(update).eq('id', id).select('*, alunos!inner(id, nome), profiles(id, nome)').single();
    if (error) throw error;
    return { ...data, aluno: data.alunos, professor: data.profiles };
  },

  async excluir(id) {
    const { error } = await supabase.from('aulas').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── USERS (profiles) ────────────────────────────────────────
export const users = {
  async listar() {
    const { data, error } = await supabase.from('profiles').select('*').order('nome');
    if (error) throw error;
    return data;
  },

  async criar(dados) {
    const { data, error } = await supabase.auth.admin?.createUser?.({
      email: dados.email.toLowerCase(),
      password: dados.senha,
      email_confirm: true,
      user_metadata: { nome: dados.nome, perfil: dados.perfil || 'ATENDIMENTO' },
    });
    // Fallback: se admin API nao disponivel, usar signUp normal
    if (error || !data) {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: dados.email.toLowerCase(),
        password: dados.senha,
        options: { data: { nome: dados.nome, perfil: dados.perfil || 'ATENDIMENTO' } },
      });
      if (signUpError) throw signUpError;
      return signUpData;
    }
    return data;
  },

  async atualizar(id, dados) {
    const update = {};
    if (dados.nome) update.nome = dados.nome;
    if (dados.perfil) update.perfil = dados.perfil;
    if (dados.ativo !== undefined) update.ativo = dados.ativo;

    const { data, error } = await supabase.from('profiles').update(update).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};

// ── DASHBOARD ───────────────────────────────────────────────
export const dashboard = {
  async stats() {
    const { data, error } = await supabase.from('dashboard_stats').select('*').single();
    if (error) {
      // Fallback manual
      const [a, h, c] = await Promise.all([
        supabase.from('alunos').select('id', { count: 'exact', head: true }),
        supabase.from('aulas').select('id', { count: 'exact', head: true }).eq('data', new Date().toISOString().split('T')[0]).neq('estado', 'CANCELADO'),
        supabase.from('cursos').select('id', { count: 'exact', head: true }).eq('ativo', true),
      ]);
      return { total_alunos: a.count || 0, agenda_hoje: h.count || 0, cursos_ativos: c.count || 0 };
    }
    return data;
  },

  async cursoStats() {
    const { data, error } = await supabase.from('alunos').select('curso_id, cursos(id, nome)').eq('status', 'MATRICULADO').order('curso_id');
    if (error) return [];

    const stats = {};
    data?.forEach(a => {
      const cursoNome = a.cursos?.nome || 'Sem Curso';
      stats[cursoNome] = (stats[cursoNome] || 0) + 1;
    });

    return Object.entries(stats)
      .map(([nome, count]) => ({ nome, count }))
      .sort((a, b) => b.count - a.count);
  },
};

// ── LANCAMENTOS (Financeiro interno) ────────────────────────
export const lancamentos = {
  async listar(alunoId) {
    let query = supabase
      .from('lancamentos')
      .select('*, alunos!inner(id, nome, telefone, curso_id, cursos(id, nome, valor))')
      .order('data', { ascending: false });
    if (alunoId) query = query.eq('aluno_id', alunoId);
    const { data, error } = await query;
    if (error) throw error;
    return data.map((l) => ({ ...l, aluno: l.alunos, curso: l.alunos?.cursos }));
  },

  async criar(dados) {
    const { data, error } = await supabase.from('lancamentos').insert([{
      aluno_id: parseInt(dados.alunoId),
      data: dados.data || new Date().toISOString().split('T')[0],
      descricao: dados.descricao || null,
      valor: parseFloat(dados.valor) || 0,
      metodo: dados.metodo || null,
    }]).select().single();
    if (error) throw error;
    return data;
  },

  async excluir(id) {
    const { error } = await supabase.from('lancamentos').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── CONFIG ──────────────────────────────────────────────────
export const config = {
  async carregar() {
    const { data, error } = await supabase.from('config').select('*');
    if (error) throw error;
    const obj = {};
    data?.forEach(c => { obj[c.chave] = c.valor; });
    return obj;
  },

  async salvar(chave, valor) {
    const { error } = await supabase.from('config').upsert({ chave, valor: String(valor) }, { onConflict: 'chave' });
    if (error) throw error;
  },
};
