import { supabase } from '../lib/supabase';

// ── ALUNOS ──────────────────────────────────────────────────
export const alunos = {
  async listar({ busca, cursoId, status } = {}) {
    let query = supabase.from('alunos').select('*, cursos(id, nome, valor, carga, processo)').order('criado_em', { ascending: false });
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
    }]).select('*, cursos(id, nome, valor, carga, processo)').single();
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

    const { data, error } = await supabase.from('alunos').update(update).eq('id', id).select('*, cursos(id, nome, valor, carga, processo)').single();
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

  // Cria varias aulas de uma vez (distribuicao automatica de horarios)
  async criarVarias(rows) {
    const payload = rows.map((r) => ({
      aluno_id: parseInt(r.alunoId),
      professor_id: r.professorId || null,
      tipo: r.tipo || 'PRATICA',
      data: r.data,
      hora: r.hora,
      duracao: parseInt(r.duracao) || 60,
      estado: r.estado || 'CONFIRMADO',
      notas: r.notas || null,
    }));
    const { data, error } = await supabase.from('aulas').insert(payload).select('*, alunos!inner(id, nome), profiles(id, nome)');
    if (error) throw error;
    return data;
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

// ── SKILLS (Progresso de estudo por fase) ───────────────────
export const skills = {
  async listar(alunoId) {
    let query = supabase.from('skills_alunos').select('*');
    if (alunoId) query = query.eq('aluno_id', alunoId);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async definir(alunoId, skillKey, nivel) {
    const { data, error } = await supabase.from('skills_alunos')
      .upsert({ aluno_id: parseInt(alunoId), skill_key: skillKey, nivel: parseInt(nivel), atualizado_em: new Date().toISOString() }, { onConflict: 'aluno_id,skill_key' })
      .select().single();
    if (error) throw error;
    return data;
  },
};

// ── PROPOSTAS (Calculadora de Pacotes) ──────────────────────
export const propostas = {
  async listar() {
    const { data, error } = await supabase.from('propostas').select('*').order('criado_em', { ascending: false });
    if (error) throw error;
    return data;
  },

  async criar(dados) {
    const { data, error } = await supabase.from('propostas').insert([{
      aluno_id: dados.alunoId ? parseInt(dados.alunoId) : null,
      cliente_nome: dados.clienteNome || null,
      cliente_email: dados.clienteEmail || null,
      cliente_telefone: dados.clienteTelefone || null,
      nome_pacote: dados.nomePacote || null,
      itens: dados.itens || [],
      desconto_pct: parseFloat(dados.descontoPct) || 0,
      total: parseFloat(dados.total) || 0,
      validade: dados.validade || null,
    }]).select().single();
    if (error) throw error;
    return data;
  },

  async excluir(id) {
    const { error } = await supabase.from('propostas').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── PLANOS DE CUSTO (Consumo) ───────────────────────────────
export const planosCusto = {
  async listar() {
    const { data, error } = await supabase.from('planos_custo').select('*').order('criado_em', { ascending: false });
    if (error) throw error;
    return data;
  },

  async criar(dados) {
    const { data, error } = await supabase.from('planos_custo').insert([{
      aluno_id: dados.alunoId ? parseInt(dados.alunoId) : null,
      aluno_nome: dados.alunoNome || null,
      nome_plano: dados.nomePlano || null,
      linhas: dados.linhas || [],
      total_horas: parseFloat(dados.totais?.totalHoras) || 0,
      total_pecas: parseInt(dados.totais?.totalPecas) || 0,
      total_custo: parseFloat(dados.totais?.totalCusto) || 0,
      media_hora: parseFloat(dados.totais?.mediaHora) || 0,
      params: dados.params || {},
    }]).select().single();
    if (error) throw error;
    return data;
  },

  async excluir(id) {
    const { error } = await supabase.from('planos_custo').delete().eq('id', id);
    if (error) throw error;
  },
};

// ── PERFIL COMPORTAMENTAL (dossie de formacao) ──────────────
export const perfilComportamental = {
  async buscar(alunoId) {
    const { data, error } = await supabase.from('perfil_comportamental').select('*').eq('aluno_id', alunoId).maybeSingle();
    if (error) throw error;
    return data;
  },

  async salvar(alunoId, dados) {
    const { data, error } = await supabase.from('perfil_comportamental').upsert({
      aluno_id: parseInt(alunoId),
      estilo_aprendizagem: dados.estiloAprendizagem || null,
      motivacao: dados.motivacao || null,
      postura_seguranca: dados.posturaSeguranca || null,
      trabalho_equipe: dados.trabalhoEquipe || null,
      risco_desistencia: dados.riscoDesistencia || null,
      pontos_fortes: dados.pontosFortes || null,
      pontos_a_desenvolver: dados.pontosADesenvolver || null,
      objetivo_carreira: dados.objetivoCarreira || null,
      observacoes: dados.observacoes || null,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: 'aluno_id' }).select().single();
    if (error) throw error;
    return data;
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
