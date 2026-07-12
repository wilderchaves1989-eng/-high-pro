// Trilhas de fases por processo (base: motor de referencia da escola)
// Fonte unica usada por EstudoPage e pelo modal de detalhe do Aluno.
export const TRILHAS = {
  mig: [
    { key: 'setup_maquina', nome: 'Setup da maquina (WFS, gas, tensao)' },
    { key: 'cordao_plano', nome: 'Cordao sobre chapa plana' },
    { key: 'fw_pb_1passe', nome: 'Filete FW posicao PB — 1 passe' },
    { key: 'fw_pb_multipasse', nome: 'Filete FW PB — multipasse' },
    { key: 'posicao_pf', nome: 'Posicao PF (vertical ascendente)' },
  ],
  tig: [
    { key: 'afiacao_tungstenio', nome: 'Afiacao do tungstenio + setup TIG' },
    { key: 'controle_poca', nome: 'Controle de poca e pontos em tubo' },
    { key: 'raiz_tubo_2pol', nome: 'Passe de raiz em tubo 2"' },
  ],
  eletrodo: [
    { key: 'e_setup', nome: 'Setup + abertura de arco' },
    { key: 'e_cordao', nome: 'Cordao sobre chapa plana' },
    { key: 'e_fw_pb', nome: 'Filete FW posicao PB' },
    { key: 'e_vertical', nome: 'Posicao vertical ascendente' },
  ],
};

export function trilhaDoProcesso(processo = '') {
  const p = (processo || '').toUpperCase();
  if (p.includes('GTAW') || p.includes('TIG')) return 'tig';
  if (p.includes('SMAW') || p.includes('ELETRODO') || p.includes('REVESTIDO')) return 'eletrodo';
  return 'mig'; // GMAW/MIG/MAG/FCAW/SAW e demais processos de arame
}

// Calcula o progresso de um aluno na trilha do curso, a partir dos registos de skills_alunos
export function calcularProgresso(aluno, skills) {
  const trilha = TRILHAS[trilhaDoProcesso(aluno.cursos?.processo)] || TRILHAS.mig;
  const niveis = {};
  (skills || []).filter((s) => s.aluno_id === aluno.id).forEach((s) => { niveis[s.skill_key] = s.nivel; });
  const concluidas = trilha.filter((f) => (niveis[f.key] || 0) >= 4).length;
  const faseIdx = trilha.findIndex((f) => (niveis[f.key] || 0) < 4);
  const faseAtual = faseIdx === -1 ? null : trilha[faseIdx];
  const progresso = trilha.length ? Math.round((concluidas / trilha.length) * 100) : 0;
  return { trilha, niveis, concluidas, faseAtual, faseIdx, progresso };
}
