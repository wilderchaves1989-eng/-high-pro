import React, { useEffect, useState, useCallback } from 'react';
import { aulas as aulasApi, alunos as alunosApi } from '../services/api';
import Modal from '../components/Modal';

const TIPO_CLS = { PRATICA: { bg: '#E6F9F3', color: '#00A86B', dot: '#00C875' }, TEORICA: { bg: '#E6F2FF', color: '#0073EA', dot: '#0073EA' }, VISITA_TECNICA: { bg: '#FFF9E6', color: '#B8860B', dot: '#FFCB00' } };
const TIPO_LABEL = { PRATICA: 'Aula Pratica', TEORICA: 'Aula Teorica', VISITA_TECNICA: 'Visita Tecnica' };
const ESTADO_LABEL = { CONFIRMADO: 'Confirmado', PENDENTE: 'Pendente', CANCELADO: 'Cancelado' };
const ESTADO_CLS = { CONFIRMADO: { bg: '#E6F9F3', color: '#00A86B' }, PENDENTE: { bg: '#FFF9E6', color: '#B8860B' }, CANCELADO: { bg: '#FFE6E9', color: '#E2445C' } };
const DIAS_SEMANA = [{ n: 'Dom', v: 0 }, { n: 'Seg', v: 1 }, { n: 'Ter', v: 2 }, { n: 'Qua', v: 3 }, { n: 'Qui', v: 4 }, { n: 'Sex', v: 5 }, { n: 'Sab', v: 6 }];
// Formata uma data como YYYY-MM-DD em hora LOCAL (evita o shift de fuso do toISOString)
const toYMD = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

const initialForm = { alunoId: '', tipo: 'PRATICA', data: '', hora: '09:00', duracao: 60, estado: 'CONFIRMADO' };

export default function AgendaPage({ actionTrigger }) {
  const [aulas, setAulas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [modal, setModal] = useState(false);
  const [diaAberto, setDiaAberto] = useState(null);
  const [distModal, setDistModal] = useState(false);
  const [dist, setDist] = useState({ alunoId: '', tipo: 'PRATICA', dataInicio: '', hora: '09:00', duracao: 240, dias: [1, 2, 3, 4, 5] });
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [filtros, setFiltros] = useState({ PRATICA: true, TEORICA: true, VISITA_TECNICA: true });
  const [view, setView] = useState('mes');

  const carregar = useCallback(() => {
    aulasApi.listar().then(setAulas).catch(() => {});
  }, []);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { alunosApi.listar().then(setAlunos).catch(() => {}); }, []);
  useEffect(() => { if (actionTrigger > 0) abrirModal(); }, [actionTrigger]);

  const abrirModal = (aula, dataNova) => {
    if (aula) {
      setEditId(aula.id);
      setForm({ alunoId: aula.aluno_id || aula.aluno?.id || '', tipo: aula.tipo, data: aula.data?.split('T')[0], hora: aula.hora, duracao: aula.duracao, estado: aula.estado });
    } else {
      setEditId(null);
      setForm({ ...initialForm, data: dataNova || selectedDate });
    }
    setDiaAberto(null);
    setModal(true);
  };

  const salvar = async (e) => {
    e.preventDefault();
    try {
      if (editId) await aulasApi.atualizar(editId, form);
      else await aulasApi.criar(form);
      setModal(false);
      carregar();
    } catch (err) {
      alert(err.message || 'Erro');
    }
  };

  const excluir = async () => {
    if (!editId) return;
    if (!window.confirm('Tem certeza que quer excluir este agendamento?')) return;
    try {
      await aulasApi.excluir(editId);
      setModal(false);
      carregar();
    } catch (err) {
      alert(err.message || 'Erro ao excluir');
    }
  };

  // Distribuicao automatica de horarios
  const abrirDistribuir = () => {
    const t = new Date().toISOString().split('T')[0];
    setDist((d) => ({ ...d, dataInicio: d.dataInicio || t }));
    setDistModal(true);
  };

  const toggleDia = (v) => setDist((d) => ({ ...d, dias: d.dias.includes(v) ? d.dias.filter((x) => x !== v) : [...d.dias, v] }));

  const gerarDistribuicao = async () => {
    const aluno = alunos.find((a) => String(a.id) === String(dist.alunoId));
    if (!aluno) { alert('Selecione um aluno.'); return; }
    const carga = Number(aluno.cursos?.carga || 0);
    if (!carga) { alert('O curso deste aluno nao tem carga horaria definida (ou o aluno nao tem curso).'); return; }
    if (!dist.dias.length) { alert('Selecione pelo menos um dia da semana.'); return; }
    const durMin = parseInt(dist.duracao) || 60;
    const durH = durMin / 60;
    const nSess = Math.ceil(carga / durH);
    const rows = [];
    let d = new Date(dist.dataInicio + 'T00:00:00');
    let guard = 0;
    while (rows.length < nSess && guard < 3650) {
      if (dist.dias.includes(d.getDay())) {
        rows.push({ alunoId: aluno.id, tipo: dist.tipo, data: toYMD(d), hora: dist.hora, duracao: durMin, estado: 'CONFIRMADO' });
      }
      d.setDate(d.getDate() + 1);
      guard++;
    }
    const inicioFmt = new Date(dist.dataInicio + 'T00:00:00').toLocaleDateString('pt-PT');
    if (!window.confirm(`Vao ser criadas ${rows.length} sessoes de ${durH}h (total ${carga}h) para ${aluno.nome}, a partir de ${inicioFmt}. Depois pode editar cada uma na agenda. Continuar?`)) return;
    try {
      await aulasApi.criarVarias(rows);
      setDistModal(false);
      setCalDate(new Date(dist.dataInicio + 'T00:00:00'));
      carregar();
    } catch (err) {
      alert(err.message || 'Erro ao distribuir horarios');
    }
  };

  const mudarEstado = async (aula, estado) => {
    try { await aulasApi.atualizar(aula.id, { estado }); carregar(); }
    catch (err) { alert(err.message || 'Erro'); }
  };

  const navegar = (dir) => {
    if (view === 'mes') { setCalDate(new Date(calDate.getFullYear(), calDate.getMonth() + dir, 1)); return; }
    const d = new Date(calDate);
    d.setDate(d.getDate() + dir * (view === 'semana' ? 7 : 1));
    setCalDate(d);
  };

  const mudarView = (v) => {
    if ((v === 'dia' || v === 'semana') && selectedDate) setCalDate(new Date(selectedDate + 'T00:00:00'));
    setView(v);
  };

  // Calendar rendering
  const ano = calDate.getFullYear(), mes = calDate.getMonth();
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const hoje = new Date().toISOString().split('T')[0];
  const meses = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const aulasFiltradas = aulas.filter((a) => filtros[a.tipo]);

  // Upcoming
  const proximas = aulasFiltradas.filter((a) => (a.data?.split('T')[0] || '') >= hoje && a.estado !== 'CANCELADO').sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora)).slice(0, 8);

  // Aulas do dia aberto no modal (ordenadas por hora)
  const aulasDoDia = diaAberto
    ? aulasFiltradas.filter((a) => (a.data?.split('T')[0] || '') === diaAberto).sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))
    : [];

  // Previa da distribuicao
  const alunoDist = alunos.find((a) => String(a.id) === String(dist.alunoId));
  const cargaDist = Number(alunoDist?.cursos?.carga || 0);
  const durHDist = (parseInt(dist.duracao) || 60) / 60;
  const nSessDist = cargaDist > 0 && durHDist > 0 ? Math.ceil(cargaDist / durHDist) : 0;

  // Views (dia/semana/mes)
  const dsCalDate = toYMD(calDate);
  const inicioSem = new Date(calDate); inicioSem.setDate(calDate.getDate() - calDate.getDay());
  const diasSemana7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(inicioSem); d.setDate(inicioSem.getDate() + i); return d; });
  const evsPorDia = (ds) => aulasFiltradas.filter((a) => (a.data?.split('T')[0] || '') === ds).sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  let tituloView;
  if (view === 'mes') tituloView = `${meses[mes]} ${ano}`;
  else if (view === 'semana') { const f = diasSemana7[6]; tituloView = `${diasSemana7[0].getDate()} ${meses[diasSemana7[0].getMonth()].slice(0, 3)} - ${f.getDate()} ${meses[f.getMonth()].slice(0, 3)} ${f.getFullYear()}`; }
  else tituloView = calDate.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 14, outline: 'none' };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 280, minWidth: 280, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>{meses[mes]} {ano}</h3>
          {/* Mini calendar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginTop: 12 }}>
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 9, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', padding: '4px 2px' }}>{d}</div>
            ))}
            {Array.from({ length: primeiroDia }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: diasNoMes }).map((_, i) => {
              const dia = i + 1;
              const ds = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
              const isHoje = ds === hoje;
              const isSel = ds === selectedDate;
              return (
                <div key={dia} onClick={() => { setSelectedDate(ds); setCalDate(new Date(ds + 'T00:00:00')); }} style={{ textAlign: 'center', padding: '6px 2px', fontSize: 11, borderRadius: 4, cursor: 'pointer', background: isHoje ? 'var(--primary)' : isSel ? 'var(--primary-selected)' : 'transparent', color: isHoje ? '#fff' : isSel ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: isHoje || isSel ? 600 : 400 }}>{dia}</div>
              );
            })}
          </div>
        </div>

        {/* Filtros */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.entries(TIPO_CLS).map(([tipo, style]) => (
            <label key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', padding: '4px 8px', borderRadius: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: style.dot }} />
              {TIPO_LABEL[tipo]}
              <input type="checkbox" checked={filtros[tipo]} onChange={(e) => setFiltros({ ...filtros, [tipo]: e.target.checked })} style={{ marginLeft: 'auto', accentColor: 'var(--primary)' }} />
            </label>
          ))}
        </div>

        {/* Proximas */}
        <div style={{ padding: 16, flex: 1 }}>
          <h4 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-tertiary)', marginBottom: 12 }}>Proximos</h4>
          {proximas.length ? proximas.map((a) => {
            const tc = TIPO_CLS[a.tipo] || TIPO_CLS.PRATICA;
            return (
              <div key={a.id} onClick={() => abrirModal(a)} style={{ padding: '10px 12px', borderRadius: 8, marginBottom: 8, cursor: 'pointer', borderLeft: `3px solid ${tc.dot}`, background: 'var(--background)', transition: 'all 0.15s ease' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{a.data ? new Date(a.data).toLocaleDateString('pt-PT') : ''} as {a.hora}</div>
                <div style={{ fontWeight: 600, fontSize: 14, margin: '2px 0' }}>{a.aluno?.nome}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{TIPO_LABEL[a.tipo]} — {a.duracao}min</div>
              </div>
            );
          }) : <div style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: 12 }}>Nenhum</div>}
        </div>
      </div>

      {/* Main calendar */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => navegar(-1)} style={{ width: 28, height: 28, padding: 0, border: '1px solid var(--border)', borderRadius: 4, background: 'transparent', cursor: 'pointer', fontSize: 16 }}>&lsaquo;</button>
          <span style={{ fontSize: 18, fontWeight: 700, margin: '0 8px', minWidth: 210, textTransform: 'capitalize' }}>{tituloView}</span>
          <button onClick={() => navegar(1)} style={{ width: 28, height: 28, padding: 0, border: '1px solid var(--border)', borderRadius: 4, background: 'transparent', cursor: 'pointer', fontSize: 16 }}>&rsaquo;</button>
          <button onClick={() => { setCalDate(new Date()); setSelectedDate(hoje); }} style={{ padding: '4px 12px', border: '1px solid var(--border)', borderRadius: 4, background: 'transparent', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', color: 'var(--text-secondary)' }}>Hoje</button>
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', marginLeft: 4 }}>
            {[['dia', 'Dia'], ['semana', 'Semana'], ['mes', 'Mes']].map(([v, label]) => (
              <button key={v} onClick={() => mudarView(v)} style={{ padding: '5px 14px', border: 'none', background: view === v ? 'var(--primary)' : 'transparent', color: view === v ? '#fff' : 'var(--text-secondary)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>{label}</button>
            ))}
          </div>
          <button onClick={abrirDistribuir} style={{ marginLeft: 'auto', padding: '5px 14px', border: 'none', borderRadius: 4, background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>Distribuir horarios</button>
        </div>

        {view === 'mes' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, background: 'var(--border)', gap: 1, border: '1px solid var(--border)', overflow: 'hidden' }}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((d) => (
              <div key={d} style={{ background: 'var(--surface)', padding: 10, textAlign: 'center', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{d}</div>
            ))}
            {Array.from({ length: primeiroDia }).map((_, i) => <div key={`e${i}`} style={{ background: 'var(--surface)' }} />)}
            {Array.from({ length: diasNoMes }).map((_, i) => {
              const dia = i + 1;
              const ds = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
              const isHoje = ds === hoje;
              const evs = evsPorDia(ds);
              return (
                <div key={dia} onClick={() => { setSelectedDate(ds); setDiaAberto(ds); }} style={{ background: isHoje ? '#F0F4FF' : 'var(--surface)', minHeight: 100, padding: 6, cursor: 'pointer', overflow: 'hidden' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, padding: '2px 6px', display: 'inline-block', ...(isHoje ? { background: 'var(--primary)', color: '#fff', borderRadius: 12 } : {}) }}>{dia}</span>
                  {evs.slice(0, 4).map((e) => {
                    const tc = TIPO_CLS[e.tipo] || TIPO_CLS.PRATICA;
                    return (
                      <div key={e.id} onClick={(ev) => { ev.stopPropagation(); abrirModal(e); }} style={{ fontSize: 11, padding: '2px 6px', borderRadius: 3, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500, background: tc.bg, color: tc.color, opacity: e.estado === 'CANCELADO' ? 0.5 : 1 }}>
                        {e.hora} {e.aluno?.nome?.split(' ')[0]}
                      </div>
                    );
                  })}
                  {evs.length > 4 && <div style={{ fontSize: 10, color: 'var(--text-tertiary)', padding: '0 6px' }}>+{evs.length - 4} mais</div>}
                </div>
              );
            })}
          </div>
        )}

        {view === 'semana' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, background: 'var(--border)', gap: 1, border: '1px solid var(--border)', overflow: 'hidden' }}>
            {diasSemana7.map((d) => {
              const ds = toYMD(d);
              const isHoje = ds === hoje;
              const evs = evsPorDia(ds);
              return (
                <div key={ds} onClick={() => { setSelectedDate(ds); setDiaAberto(ds); }} style={{ background: isHoje ? '#F0F4FF' : 'var(--surface)', padding: 6, cursor: 'pointer', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ textAlign: 'center', marginBottom: 6, borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 600 }}>{DIAS_SEMANA[d.getDay()].n}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: isHoje ? 'var(--primary)' : 'var(--text-primary)' }}>{d.getDate()}</div>
                  </div>
                  {evs.map((e) => {
                    const tc = TIPO_CLS[e.tipo] || TIPO_CLS.PRATICA;
                    return (
                      <div key={e.id} onClick={(ev) => { ev.stopPropagation(); abrirModal(e); }} style={{ fontSize: 11, padding: '3px 6px', borderRadius: 3, marginBottom: 3, fontWeight: 500, background: tc.bg, color: tc.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: e.estado === 'CANCELADO' ? 0.5 : 1 }}>
                        {e.hora} {e.aluno?.nome?.split(' ')[0]}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {view === 'dia' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
              {evsPorDia(dsCalDate).length ? evsPorDia(dsCalDate).map((a) => {
                const tc = TIPO_CLS[a.tipo] || TIPO_CLS.PRATICA;
                const sc = ESTADO_CLS[a.estado] || ESTADO_CLS.PENDENTE;
                return (
                  <div key={a.id} onClick={() => abrirModal(a)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', borderLeft: `3px solid ${tc.dot}`, marginBottom: 8, cursor: 'pointer', background: 'var(--surface)' }}>
                    <div style={{ fontWeight: 700, fontSize: 16, minWidth: 56 }}>{a.hora}</div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontWeight: 600 }}>{a.aluno?.nome}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{TIPO_LABEL[a.tipo]} — {a.duracao}min</div>
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color }}>{ESTADO_LABEL[a.estado] || a.estado}</span>
                  </div>
                );
              }) : (
                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 40 }}>Nenhum aluno agendado neste dia.</div>
              )}
              <button onClick={() => abrirModal(null, dsCalDate)} style={{ width: '100%', marginTop: 8, padding: 11, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>+ Novo agendamento neste dia</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: distribuir horarios automaticamente */}
      <Modal open={distModal} onClose={() => setDistModal(false)} title="Distribuir horarios" maxWidth={560}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>Gera as aulas automaticamente com base na carga horaria do curso do aluno. Depois pode ajustar cada uma na agenda.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Aluno <span style={{ color: 'var(--danger)' }}>*</span></label>
            <select value={dist.alunoId} onChange={(e) => setDist({ ...dist, alunoId: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">Selecione...</option>
              {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}{a.cursos?.nome ? ` — ${a.cursos.nome}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Tipo</label>
            <select value={dist.tipo} onChange={(e) => setDist({ ...dist, tipo: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
              {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Data de inicio</label>
            <input type="date" value={dist.dataInicio} onChange={(e) => setDist({ ...dist, dataInicio: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Hora</label>
            <input type="time" value={dist.hora} onChange={(e) => setDist({ ...dist, hora: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Duracao por sessao (min)</label>
            <input type="number" min="30" step="30" value={dist.duracao} onChange={(e) => setDist({ ...dist, duracao: e.target.value })} style={inputStyle} />
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Dias da semana</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {DIAS_SEMANA.map((d) => {
              const on = dist.dias.includes(d.v);
              return (
                <button key={d.v} type="button" onClick={() => toggleDia(d.v)} style={{ padding: '6px 12px', borderRadius: 4, border: `1px solid ${on ? 'var(--primary)' : 'var(--border)'}`, background: on ? 'var(--primary-selected)' : 'transparent', color: on ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: on ? 600 : 400, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>{d.n}</button>
              );
            })}
          </div>
        </div>
        <div style={{ marginTop: 16, background: 'var(--background)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
          {cargaDist > 0
            ? <span>Carga do curso: <strong>{cargaDist}h</strong>. Serao criadas <strong>{nSessDist}</strong> sessoes de <strong>{durHDist}h</strong>.</span>
            : <span>Selecione um aluno com curso e carga horaria definida.</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="button" onClick={() => setDistModal(false)} style={{ flex: 1, padding: 10, background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>Cancelar</button>
          <button type="button" onClick={gerarDistribuicao} disabled={!cargaDist} style={{ flex: 2, padding: 10, background: cargaDist ? 'var(--primary)' : 'var(--border)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: cargaDist ? 'pointer' : 'not-allowed' }}>Gerar na Agenda</button>
        </div>
      </Modal>

      {/* Modal do dia: lista de alunos do dia */}
      <Modal
        open={!!diaAberto}
        onClose={() => setDiaAberto(null)}
        title={diaAberto ? `Alunos de ${new Date(diaAberto + 'T00:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}` : ''}
        maxWidth={560}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {aulasDoDia.length ? aulasDoDia.map((a) => {
            const tc = TIPO_CLS[a.tipo] || TIPO_CLS.PRATICA;
            return (
              <div key={a.id} onClick={() => abrirModal(a)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', borderLeft: `3px solid ${tc.dot}`, cursor: 'pointer', background: 'var(--surface)' }}>
                <div style={{ fontWeight: 700, fontSize: 15, minWidth: 52 }}>{a.hora}</div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.aluno?.nome || 'Aluno'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{TIPO_LABEL[a.tipo]} — {a.duracao}min</div>
                </div>
                <select
                  value={a.estado}
                  onClick={(ev) => ev.stopPropagation()}
                  onChange={(ev) => { ev.stopPropagation(); mudarEstado(a, ev.target.value); }}
                  style={{ padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid var(--border)', background: (ESTADO_CLS[a.estado] || ESTADO_CLS.PENDENTE).bg, color: (ESTADO_CLS[a.estado] || ESTADO_CLS.PENDENTE).color }}
                >
                  {Object.entries(ESTADO_LABEL).map(([k, v]) => <option key={k} value={k} style={{ color: 'var(--text-primary)', background: '#fff' }}>{v}</option>)}
                </select>
                <span style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 500 }}>Editar</span>
              </div>
            );
          }) : (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)' }}>Nenhum aluno agendado neste dia.</div>
          )}
        </div>
        <button onClick={() => abrirModal(null, diaAberto)} style={{ width: '100%', marginTop: 16, padding: 11, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>+ Novo agendamento neste dia</button>
      </Modal>

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Agendamento' : 'Novo Agendamento'} maxWidth={550}>
        <form onSubmit={salvar}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Aluno <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select required value={form.alunoId} onChange={(e) => setForm({ ...form, alunoId: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Selecione...</option>
                {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Tipo</label>
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                {Object.entries(TIPO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Data <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input required type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Hora <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input required type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Duracao (min)</label>
              <input type="number" value={form.duracao} onChange={(e) => setForm({ ...form, duracao: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Estado</label>
              <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                {Object.entries(ESTADO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button type="submit" style={{ flex: 1, padding: 10, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>Guardar</button>
            {editId && <button type="button" onClick={excluir} style={{ padding: '10px 16px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>Excluir</button>}
          </div>
        </form>
      </Modal>
    </div>
  );
}
