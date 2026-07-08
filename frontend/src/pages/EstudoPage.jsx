import React, { useEffect, useState, useCallback } from 'react';
import { alunos as alunosApi, skills as skillsApi } from '../services/api';
import Modal from '../components/Modal';

// Trilhas de fases por processo (base: motor de referencia da escola)
const TRILHAS = {
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

const NIVEIS = ['Nao viu', 'Viu demo', 'Faz com ajuda', 'Faz sozinho', 'Aprovado'];
const NIVEL_COR = ['#9699A6', '#B8860B', '#FFCB00', '#0073EA', '#00C875'];

function trilhaDoProcesso(processo = '') {
  const p = (processo || '').toUpperCase();
  if (p.includes('GTAW') || p.includes('TIG')) return 'tig';
  if (p.includes('SMAW') || p.includes('ELETRODO') || p.includes('REVESTIDO')) return 'eletrodo';
  return 'mig'; // GMAW/MIG/MAG/FCAW/SAW e demais processos de arame
}

export default function EstudoPage() {
  const [alunos, setAlunos] = useState([]);
  const [skills, setSkills] = useState([]);
  const [sel, setSel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupNecessario, setSetupNecessario] = useState(false);
  const [busca, setBusca] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const a = await alunosApi.listar().catch(() => []);
      setAlunos(a || []);
      try {
        const s = await skillsApi.listar();
        setSkills(s || []);
        setSetupNecessario(false);
      } catch (err) {
        if (/skills_alunos|schema cache|does not exist|relation/i.test(err.message || '')) setSetupNecessario(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const calcular = (a) => {
    const trilha = TRILHAS[trilhaDoProcesso(a.cursos?.processo)] || TRILHAS.mig;
    const niveis = {};
    skills.filter((s) => s.aluno_id === a.id).forEach((s) => { niveis[s.skill_key] = s.nivel; });
    const concluidas = trilha.filter((f) => (niveis[f.key] || 0) >= 4).length;
    const faseIdx = trilha.findIndex((f) => (niveis[f.key] || 0) < 4);
    const faseAtual = faseIdx === -1 ? null : trilha[faseIdx];
    const progresso = trilha.length ? Math.round((concluidas / trilha.length) * 100) : 0;
    return { trilha, niveis, concluidas, faseAtual, faseIdx, progresso };
  };

  const lista = alunos
    .filter((a) => a.curso_id)
    .filter((a) => !busca || a.nome.toLowerCase().includes(busca.toLowerCase()))
    .map((a) => ({ aluno: a, ...calcular(a) }))
    .sort((x, y) => y.progresso - x.progresso);

  useEffect(() => {
    if (!sel) return;
    const nova = lista.find((l) => l.aluno.id === sel.aluno.id);
    if (nova) setSel(nova);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skills]);

  const thStyle = { textAlign: 'left', padding: '12px 16px', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3, color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)', background: 'var(--background)' };
  const tdStyle = { padding: '10px 16px', borderBottom: '1px solid var(--border)' };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      {setupNecessario && (
        <div style={{ background: '#FFF9E6', border: '1px solid #FFCB00', borderRadius: 8, padding: '14px 18px', marginBottom: 16, fontSize: 13 }}>
          <strong>Falta criar a tabela no Supabase.</strong> Rode o conteudo de <code>supabase/skills_alunos.sql</code> no SQL Editor para ativar o progresso de estudo.
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <input placeholder="Buscar aluno..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 14, outline: 'none', minWidth: 240 }} />
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>Progresso de Estudo por Fase</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>{['Aluno', 'Curso', 'Fase atual', 'Progresso', ''].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>A carregar...</td></tr>
              ) : lista.length ? lista.map((l) => (
                <tr key={l.aluno.id} style={{ cursor: 'pointer' }} onClick={() => setSel(l)}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{l.aluno.nome}</td>
                  <td style={tdStyle}>{l.aluno.cursos?.nome || '--'}</td>
                  <td style={tdStyle}>
                    {l.faseAtual
                      ? <span>{l.faseIdx + 1}. {l.faseAtual.nome}</span>
                      : <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#E6F9F3', color: '#00A86B' }}>Trilha completa</span>}
                  </td>
                  <td style={{ ...tdStyle, minWidth: 180 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, background: 'var(--background)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                        <div style={{ width: `${l.progresso}%`, height: '100%', background: l.progresso === 100 ? '#00C875' : 'var(--primary)' }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 64 }}>{l.concluidas}/{l.trilha.length} fases</span>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--primary)', fontWeight: 500 }}>Abrir</td>
                </tr>
              )) : (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>Nenhum aluno com curso. Atribua um curso ao aluno para acompanhar o estudo.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {sel && <EstudoModal linha={sel} onClose={() => setSel(null)} onChange={carregar} />}
    </div>
  );
}

function EstudoModal({ linha, onClose, onChange }) {
  const { aluno, trilha, niveis, faseAtual, progresso, concluidas } = linha;
  const [busy, setBusy] = useState(false);

  const definir = async (skillKey, nivel) => {
    setBusy(true);
    try { await skillsApi.definir(aluno.id, skillKey, nivel); await onChange(); }
    catch (err) { alert(err.message || 'Erro'); }
    finally { setBusy(false); }
  };

  return (
    <Modal open onClose={onClose} title={`Estudo - ${aluno.nome}`} maxWidth={720}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Curso: <strong>{aluno.cursos?.nome || '--'}</strong></div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{concluidas}/{trilha.length} fases · {progresso}%</div>
      </div>
      <div style={{ background: 'var(--background)', borderRadius: 4, height: 8, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ width: `${progresso}%`, height: '100%', background: progresso === 100 ? '#00C875' : 'var(--primary)' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {trilha.map((f, i) => {
          const nv = niveis[f.key] || 0;
          const isAtual = faseAtual && faseAtual.key === f.key;
          return (
            <div key={f.key} style={{ border: `1px solid ${isAtual ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 8, padding: '10px 14px', background: isAtual ? 'var(--primary-highlighted)' : 'var(--surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  <span style={{ color: 'var(--text-tertiary)', marginRight: 6 }}>{i + 1}.</span>{f.nome}
                  {isAtual && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: 'var(--primary)' }}>fase atual</span>}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: NIVEL_COR[nv] }}>{NIVEIS[nv]}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {NIVEIS.map((label, n) => (
                  <button
                    key={n}
                    onClick={() => definir(f.key, n)}
                    disabled={busy}
                    title={label}
                    style={{ flex: 1, padding: '6px 4px', borderRadius: 4, border: `1px solid ${n === nv ? NIVEL_COR[n] : 'var(--border)'}`, background: n === nv ? NIVEL_COR[n] : 'transparent', color: n === nv ? '#fff' : 'var(--text-secondary)', fontWeight: n === nv ? 700 : 500, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}
                  >{n}</button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 12 }}>Escala TWI — 0: nao viu · 1: viu demo · 2: faz com ajuda · 3: faz sozinho · 4: aprovado. A fase atual e a primeira ainda nao aprovada.</p>
    </Modal>
  );
}
