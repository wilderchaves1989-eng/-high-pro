import React, { useEffect, useState, useCallback } from 'react';
import Modal from '../components/Modal';
import { aulas as aulasApi, skills as skillsApi, perfilComportamental as perfilApi } from '../services/api';
import { calcularProgresso } from '../services/estudoUtil';

const STATUS_STYLES = {
  LEAD: { bg: '#E6F2FF', color: '#0073EA' },
  AGENDOU_VISITA: { bg: '#FFF9E6', color: '#B8860B' },
  MATRICULADO: { bg: '#E6F9F3', color: '#00A86B' },
  CONCLUIDO: { bg: '#F3E8FF', color: '#7B3FA3' },
  DESISTENTE: { bg: '#FFE6E9', color: '#E2445C' },
};
const STATUS_LABEL = { LEAD: 'Lead', AGENDOU_VISITA: 'Agendou Visita', MATRICULADO: 'Matriculado', CONCLUIDO: 'Concluido', DESISTENTE: 'Desistente' };
const TIPO_LABEL = { PRATICA: 'Pratica', TEORICA: 'Teorica', VISITA_TECNICA: 'Visita Tecnica' };
const ESTADO_LABEL = { CONFIRMADO: 'Confirmado', PENDENTE: 'Pendente', CANCELADO: 'Cancelado' };

const ESTILO_OPTIONS = ['', 'Visual', 'Auditivo', 'Cinestesico', 'Misto'];
const MOTIVACAO_OPTIONS = ['', 'Colocacao / emprego', 'Mudanca de carreira', 'Complementar formacao', 'Empreendedorismo', 'Exigencia familiar ou social', 'Outro'];
const NIVEL4_OPTIONS = ['', 'Excelente', 'Boa', 'Precisa melhorar', 'Preocupante'];
const EQUIPE_OPTIONS = ['', 'Excelente', 'Boa', 'Regular', 'Dificuldade'];
const RISCO_OPTIONS = ['', 'Baixo', 'Medio', 'Alto'];

const fmtData = (d) => (d ? new Date(d.split('T')[0] + 'T00:00:00').toLocaleDateString('pt-PT') : '--');

export default function AlunoDetalheModal({ aluno, onClose, onEditar }) {
  const [aulas, setAulas] = useState([]);
  const [skills, setSkills] = useState([]);
  const [perfil, setPerfil] = useState({});
  const [loading, setLoading] = useState(true);
  const [busySkill, setBusySkill] = useState(false);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [setupSkills, setSetupSkills] = useState(false);
  const [setupPerfil, setSetupPerfil] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const au = await aulasApi.listar().catch(() => []);
      setAulas(au || []);
      try {
        const s = await skillsApi.listar(aluno.id);
        setSkills(s || []);
        setSetupSkills(false);
      } catch (err) {
        if (/skills_alunos|schema cache|does not exist|relation/i.test(err.message || '')) setSetupSkills(true);
      }
      try {
        const p = await perfilApi.buscar(aluno.id);
        setPerfil(p || {});
        setSetupPerfil(false);
      } catch (err) {
        if (/perfil_comportamental|schema cache|does not exist|relation/i.test(err.message || '')) setSetupPerfil(true);
      }
    } finally {
      setLoading(false);
    }
  }, [aluno.id]);

  useEffect(() => { carregar(); }, [carregar]);

  const { trilha, niveis, faseAtual, faseIdx, progresso, concluidas } = calcularProgresso(aluno, skills);

  const definirEtapa = async (skillKey, concluido) => {
    setBusySkill(true);
    try { await skillsApi.definir(aluno.id, skillKey, concluido ? 4 : 0); await carregar(); }
    catch (err) { alert(err.message || 'Erro'); }
    finally { setBusySkill(false); }
  };

  const aulasAluno = aulas.filter((a) => a.aluno_id === aluno.id).sort((a, b) => (b.data || '').localeCompare(a.data || '') || (b.hora || '').localeCompare(a.hora || ''));
  const hoje = new Date().toISOString().split('T')[0];
  const horasFeitas = aulasAluno
    .filter((a) => a.estado !== 'CANCELADO' && (a.data?.split('T')[0] || '') <= hoje)
    .reduce((s, a) => s + (Number(a.duracao) || 0), 0) / 60;
  const horasTotais = Number(aluno.cursos?.carga || 0);
  const horasPct = horasTotais > 0 ? Math.min(100, Math.round((horasFeitas / horasTotais) * 100)) : 0;

  const salvarPerfil = async () => {
    setSalvandoPerfil(true);
    try { await perfilApi.salvar(aluno.id, perfil); alert('Perfil guardado.'); await carregar(); }
    catch (err) {
      alert(/perfil_comportamental|schema cache|does not exist|relation/i.test(err.message || '')
        ? 'Falta criar a tabela: rode supabase/perfil_comportamental.sql no Supabase.'
        : (err.message || 'Erro ao guardar'));
    } finally { setSalvandoPerfil(false); }
  };

  const ss = STATUS_STYLES[aluno.status] || STATUS_STYLES.LEAD;
  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 14, outline: 'none' };
  const label = { display: 'block', fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' };
  const sectionTitle = { fontWeight: 600, fontSize: 15, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
  const avisoBox = { background: '#FFF9E6', border: '1px solid #FFCB00', borderRadius: 8, padding: '10px 14px', fontSize: 12, marginBottom: 12 };

  return (
    <Modal open onClose={onClose} title={aluno.nome} maxWidth={820}>
      {/* Cabecalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: ss.bg, color: ss.color }}>{STATUS_LABEL[aluno.status]}</span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{aluno.cursos?.nome || 'Sem curso'}</span>
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{aluno.email}{aluno.telefone ? ` · ${aluno.telefone}` : ''}</span>
        </div>
        <button onClick={() => onEditar(aluno)} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: 4, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' }}>Editar dados</button>
      </div>

      {loading ? <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 30 }}>A carregar...</div> : (
        <>
          {/* Estudo - etapas do processo */}
          <div style={{ marginBottom: 24 }}>
            <div style={sectionTitle}>
              <span>Estudo — Etapas do Processo</span>
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)' }}>{concluidas}/{trilha.length} etapas · {progresso}%</span>
            </div>
            {setupSkills && <div style={avisoBox}><strong>Falta criar a tabela no Supabase.</strong> Rode <code>supabase/skills_alunos.sql</code> para ativar o progresso de estudo.</div>}
            {!aluno.curso_id ? (
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '10px 0' }}>Atribua um curso ao aluno para acompanhar as etapas.</div>
            ) : (
              <>
                <div style={{ background: 'var(--background)', borderRadius: 4, height: 8, overflow: 'hidden', marginBottom: 14 }}>
                  <div style={{ width: `${progresso}%`, height: '100%', background: progresso === 100 ? '#00C875' : 'var(--primary)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {trilha.map((f, i) => {
                    const nv = niveis[f.key] || 0;
                    const concluido = nv >= 4;
                    const isAtual = faseAtual && faseAtual.key === f.key;
                    return (
                      <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: `1px solid ${isAtual ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 6, background: isAtual ? 'var(--primary-highlighted)' : 'transparent' }}>
                        <span style={{ fontSize: 13, flex: 1 }}>
                          <span style={{ color: 'var(--text-tertiary)', marginRight: 6 }}>{i + 1}.</span>{f.nome}
                          {isAtual && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: 'var(--primary)' }}>etapa atual</span>}
                        </span>
                        <select
                          value={concluido ? 'CONCLUIDO' : 'PENDENTE'}
                          disabled={busySkill}
                          onChange={(e) => definirEtapa(f.key, e.target.value === 'CONCLUIDO')}
                          style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', border: 'none', background: concluido ? '#E6F9F3' : '#FFF9E6', color: concluido ? '#00A86B' : '#B8860B' }}
                        >
                          <option value="PENDENTE">Pendente</option>
                          <option value="CONCLUIDO">Concluido</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Horas - total vs feitas, linkado ao calendario */}
          <div style={{ marginBottom: 24 }}>
            <div style={sectionTitle}>
              <span>Horas de Formacao</span>
              <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)' }}>{horasFeitas.toFixed(1)}h / {horasTotais}h</span>
            </div>
            <div style={{ background: 'var(--background)', borderRadius: 4, height: 8, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ width: `${horasPct}%`, height: '100%', background: horasPct >= 100 ? '#00C875' : 'var(--primary)' }} />
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
              {aulasAluno.length ? aulasAluno.slice(0, 8).map((a) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ minWidth: 90, color: 'var(--text-secondary)' }}>{fmtData(a.data)}</span>
                  <span style={{ minWidth: 60, color: 'var(--text-secondary)' }}>{a.hora}</span>
                  <span style={{ flex: 1 }}>{TIPO_LABEL[a.tipo] || a.tipo}</span>
                  <span style={{ color: 'var(--text-tertiary)' }}>{a.duracao}min</span>
                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: a.estado === 'CONFIRMADO' ? '#E6F9F3' : a.estado === 'CANCELADO' ? '#FFE6E9' : '#FFF9E6', color: a.estado === 'CONFIRMADO' ? '#00A86B' : a.estado === 'CANCELADO' ? '#E2445C' : '#B8860B' }}>{ESTADO_LABEL[a.estado] || a.estado}</span>
                </div>
              )) : (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>Nenhuma aula na Agenda para este aluno.</div>
              )}
              {aulasAluno.length > 8 && <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--text-tertiary)' }}>+{aulasAluno.length - 8} aula(s) mais antiga(s) — veja a Agenda completa.</div>}
            </div>
          </div>

          {/* Perfil comportamental */}
          <div>
            <div style={sectionTitle}>
              <span>Perfil Comportamental (Dossie)</span>
              {perfil?.atualizado_em && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)' }}>Atualizado em {fmtData(perfil.atualizado_em)}</span>}
            </div>
            {setupPerfil && <div style={avisoBox}><strong>Falta criar a tabela no Supabase.</strong> Rode <code>supabase/perfil_comportamental.sql</code> para guardar o perfil.</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={label}>Estilo de aprendizagem</label>
                <select value={perfil.estiloAprendizagem ?? perfil.estilo_aprendizagem ?? ''} onChange={(e) => setPerfil({ ...perfil, estiloAprendizagem: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {ESTILO_OPTIONS.map((o) => <option key={o} value={o}>{o || 'Selecione...'}</option>)}
                </select>
              </div>
              <div><label style={label}>Motivacao principal</label>
                <select value={perfil.motivacao ?? ''} onChange={(e) => setPerfil({ ...perfil, motivacao: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {MOTIVACAO_OPTIONS.map((o) => <option key={o} value={o}>{o || 'Selecione...'}</option>)}
                </select>
              </div>
              <div><label style={label}>Postura de seguranca / disciplina</label>
                <select value={perfil.posturaSeguranca ?? perfil.postura_seguranca ?? ''} onChange={(e) => setPerfil({ ...perfil, posturaSeguranca: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {NIVEL4_OPTIONS.map((o) => <option key={o} value={o}>{o || 'Selecione...'}</option>)}
                </select>
              </div>
              <div><label style={label}>Trabalho em equipa / comunicacao</label>
                <select value={perfil.trabalhoEquipe ?? perfil.trabalho_equipe ?? ''} onChange={(e) => setPerfil({ ...perfil, trabalhoEquipe: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {EQUIPE_OPTIONS.map((o) => <option key={o} value={o}>{o || 'Selecione...'}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}><label style={label}>Risco de desistencia</label>
                <select value={perfil.riscoDesistencia ?? perfil.risco_desistencia ?? ''} onChange={(e) => setPerfil({ ...perfil, riscoDesistencia: e.target.value })} style={{ ...inputStyle, cursor: 'pointer', maxWidth: 220 }}>
                  {RISCO_OPTIONS.map((o) => <option key={o} value={o}>{o || 'Selecione...'}</option>)}
                </select>
              </div>
              <div><label style={label}>Pontos fortes</label>
                <textarea rows={3} value={perfil.pontosFortes ?? perfil.pontos_fortes ?? ''} onChange={(e) => setPerfil({ ...perfil, pontosFortes: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div><label style={label}>Pontos a desenvolver</label>
                <textarea rows={3} value={perfil.pontosADesenvolver ?? perfil.pontos_a_desenvolver ?? ''} onChange={(e) => setPerfil({ ...perfil, pontosADesenvolver: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}><label style={label}>Objetivo de carreira</label>
                <input value={perfil.objetivoCarreira ?? perfil.objetivo_carreira ?? ''} onChange={(e) => setPerfil({ ...perfil, objetivoCarreira: e.target.value })} placeholder="Ex: Trabalhar como soldador certificado numa naval" style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}><label style={label}>Observacoes do instrutor</label>
                <textarea rows={4} value={perfil.observacoes ?? ''} onChange={(e) => setPerfil({ ...perfil, observacoes: e.target.value })} placeholder="Notas de acompanhamento ao longo do curso..." style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>
            <button onClick={salvarPerfil} disabled={salvandoPerfil} style={{ width: '100%', marginTop: 14, padding: 11, background: 'var(--success)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{salvandoPerfil ? 'A guardar...' : 'Guardar Perfil'}</button>
          </div>
        </>
      )}
    </Modal>
  );
}
