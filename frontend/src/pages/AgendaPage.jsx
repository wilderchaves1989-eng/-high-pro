import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import Modal from '../components/Modal';

const TIPO_CLS = { PRATICA: { bg: '#E6F9F3', color: '#00A86B', dot: '#00C875' }, TEORICA: { bg: '#E6F2FF', color: '#0073EA', dot: '#0073EA' }, VISITA_TECNICA: { bg: '#FFF9E6', color: '#B8860B', dot: '#FFCB00' } };
const TIPO_LABEL = { PRATICA: 'Aula Pratica', TEORICA: 'Aula Teorica', VISITA_TECNICA: 'Visita Tecnica' };
const ESTADO_LABEL = { CONFIRMADO: 'Confirmado', PENDENTE: 'Pendente', CANCELADO: 'Cancelado' };

const initialForm = { alunoId: '', tipo: 'PRATICA', data: '', hora: '09:00', duracao: 60, estado: 'CONFIRMADO' };

export default function AgendaPage({ actionTrigger }) {
  const [aulas, setAulas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [filtros, setFiltros] = useState({ PRATICA: true, TEORICA: true, VISITA_TECNICA: true });

  const carregar = useCallback(() => {
    const ano = calDate.getFullYear();
    const mes = calDate.getMonth() + 1;
    api.get('/aulas', { params: { ano, mes } }).then((r) => setAulas(r.data)).catch(() => {});
  }, [calDate]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { api.get('/alunos').then((r) => setAlunos(r.data)).catch(() => {}); }, []);
  useEffect(() => { if (actionTrigger > 0) abrirModal(); }, [actionTrigger]);

  const abrirModal = (aula) => {
    if (aula) {
      setEditId(aula.id);
      setForm({ alunoId: aula.alunoId, tipo: aula.tipo, data: aula.data?.split('T')[0], hora: aula.hora, duracao: aula.duracao, estado: aula.estado });
    } else {
      setEditId(null);
      setForm({ ...initialForm, data: selectedDate });
    }
    setModal(true);
  };

  const salvar = async (e) => {
    e.preventDefault();
    try {
      if (editId) await api.put(`/aulas/${editId}`, form);
      else await api.post('/aulas', form);
      setModal(false);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro');
    }
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
                <div key={dia} onClick={() => setSelectedDate(ds)} style={{ textAlign: 'center', padding: '6px 2px', fontSize: 11, borderRadius: 4, cursor: 'pointer', background: isHoje ? 'var(--primary)' : isSel ? 'var(--primary-selected)' : 'transparent', color: isHoje ? '#fff' : isSel ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: isHoje || isSel ? 600 : 400 }}>{dia}</div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setCalDate(new Date(ano, mes - 1, 1))} style={{ width: 28, height: 28, padding: 0, border: '1px solid var(--border)', borderRadius: 4, background: 'transparent', cursor: 'pointer', fontSize: 16 }}>&lsaquo;</button>
          <span style={{ fontSize: 18, fontWeight: 700, margin: '0 12px', minWidth: 200 }}>{meses[mes]} {ano}</span>
          <button onClick={() => setCalDate(new Date(ano, mes + 1, 1))} style={{ width: 28, height: 28, padding: 0, border: '1px solid var(--border)', borderRadius: 4, background: 'transparent', cursor: 'pointer', fontSize: 16 }}>&rsaquo;</button>
          <button onClick={() => { setCalDate(new Date()); setSelectedDate(hoje); }} style={{ padding: '4px 12px', border: '1px solid var(--border)', borderRadius: 4, background: 'transparent', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', color: 'var(--text-secondary)' }}>Hoje</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, background: 'var(--border)', gap: 1, border: '1px solid var(--border)', overflow: 'hidden' }}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((d) => (
            <div key={d} style={{ background: 'var(--surface)', padding: 10, textAlign: 'center', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{d}</div>
          ))}
          {Array.from({ length: primeiroDia }).map((_, i) => <div key={`e${i}`} style={{ background: 'var(--surface)' }} />)}
          {Array.from({ length: diasNoMes }).map((_, i) => {
            const dia = i + 1;
            const ds = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const isHoje = ds === hoje;
            const evs = aulasFiltradas.filter((a) => (a.data?.split('T')[0] || '') === ds);
            return (
              <div key={dia} onClick={() => { setSelectedDate(ds); abrirModal(); }} style={{ background: isHoje ? '#F0F4FF' : 'var(--surface)', minHeight: 100, padding: 6, cursor: 'pointer', overflow: 'hidden' }}>
                <span style={{ fontSize: 13, fontWeight: 500, padding: '2px 6px', display: 'inline-block', ...(isHoje ? { background: 'var(--primary)', color: '#fff', borderRadius: 12 } : {}) }}>{dia}</span>
                {evs.slice(0, 4).map((e) => {
                  const tc = TIPO_CLS[e.tipo] || TIPO_CLS.PRATICA;
                  return (
                    <div key={e.id} onClick={(ev) => { ev.stopPropagation(); abrirModal(e); }} style={{ fontSize: 11, padding: '2px 6px', borderRadius: 3, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500, background: tc.bg, color: tc.color }}>
                      {e.hora} {e.aluno?.nome?.split(' ')[0]}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

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
          <button type="submit" style={{ width: '100%', padding: 10, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', marginTop: 8 }}>Guardar</button>
        </form>
      </Modal>
    </div>
  );
}
