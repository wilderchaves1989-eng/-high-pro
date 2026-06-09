import React, { useEffect, useState, useCallback } from 'react';
import { alunos as alunosApi, cursos as cursosApi } from '../services/api';
import Modal from '../components/Modal';
import useAuthStore from '../store/authStore';

const STATUS_STYLES = {
  LEAD: { bg: '#E6F2FF', color: '#0073EA' },
  AGENDOU_VISITA: { bg: '#FFF9E6', color: '#B8860B' },
  MATRICULADO: { bg: '#E6F9F3', color: '#00A86B' },
  CONCLUIDO: { bg: '#F3E8FF', color: '#7B3FA3' },
  DESISTENTE: { bg: '#FFE6E9', color: '#E2445C' },
};

const STATUS_LABEL = { LEAD: 'Lead', AGENDOU_VISITA: 'Agendou Visita', MATRICULADO: 'Matriculado', CONCLUIDO: 'Concluido', DESISTENTE: 'Desistente' };

const FAIXA_ETARIA_OPTIONS = ['18 - 24 anos', '25 - 34 anos', '35 - 44 anos', '45 - 54 anos', '55+ anos'];

const initialForm = { nome: '', email: '', telefone: '', cursoId: '', status: 'LEAD', origem: 'Instagram', faixaEtaria: '', profissao: '' };

export default function AlunosPage({ actionTrigger }) {
  const [alunos, setAlunos] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtroCurso, setFiltroCurso] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const canEdit = useAuthStore.getState().isGestorOrAtendimento();

  const carregar = useCallback(() => {
    alunosApi.listar({ busca, cursoId: filtroCurso, status: filtroStatus }).then(setAlunos).catch(() => {});
  }, [busca, filtroCurso, filtroStatus]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { cursosApi.listar().then(setCursos).catch(() => {}); }, []);
  useEffect(() => { if (actionTrigger > 0) abrirModal(); }, [actionTrigger]);

  const abrirModal = (aluno) => {
    if (aluno) {
      setEditId(aluno.id);
      setForm({ nome: aluno.nome, email: aluno.email, telefone: aluno.telefone || '', cursoId: aluno.curso_id || '', status: aluno.status, origem: aluno.origem || 'Instagram', faixaEtaria: aluno.faixa_etaria || '', profissao: aluno.profissao || '' });
    } else {
      setEditId(null);
      setForm(initialForm);
    }
    setModal(true);
  };

  const salvar = async (e) => {
    e.preventDefault();
    try {
      if (editId) await alunosApi.atualizar(editId, form);
      else await alunosApi.criar(form);
      setModal(false);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro');
    }
  };

  const excluir = async (id) => {
    if (!confirm('Excluir este aluno?')) return;
    await alunosApi.excluir(id);
    carregar();
  };

  const fmtValor = (v) => v ? `EUR ${Number(v).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}` : '--';

  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 14, outline: 'none' };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <input placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ ...inputStyle, minWidth: 200 }} />
        <select value={filtroCurso} onChange={(e) => setFiltroCurso(e.target.value)} style={{ ...inputStyle, minWidth: 160, cursor: 'pointer' }}>
          <option value="">Todos Cursos</option>
          {cursos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={{ ...inputStyle, minWidth: 140, cursor: 'pointer' }}>
          <option value="">Todos Status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={() => { setBusca(''); setFiltroCurso(''); setFiltroStatus(''); }} style={{ padding: '7px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', color: 'var(--text-secondary)' }}>Limpar</button>
      </div>

      {/* Tabela */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Nome', 'Email', 'Telefone', 'Curso', 'Valor', 'Status', ''].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3, color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)', background: 'var(--background)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alunos.length ? alunos.map((a) => {
                const ss = STATUS_STYLES[a.status] || STATUS_STYLES.LEAD;
                return (
                  <tr key={a.id} style={{ cursor: 'pointer' }} onClick={() => abrirModal(a)}>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{a.nome}</td>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>{a.email}</td>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>{a.telefone || ''}</td>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>{a.cursos?.nome || '--'}</td>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>{fmtValor(a.cursos?.valor)}</td>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: ss.bg, color: ss.color }}>{STATUS_LABEL[a.status]}</span>
                    </td>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                      {canEdit && <button onClick={() => excluir(a.id)} style={{ padding: '2px 8px', background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Excluir</button>}
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>Nenhum aluno</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editId ? 'Editar Aluno' : 'Novo Aluno'} maxWidth={600}>
        <form onSubmit={salvar}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Nome <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Email <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Telefone</label>
              <input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Curso</label>
              <select value={form.cursoId} onChange={(e) => setForm({ ...form, cursoId: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Selecione...</option>
                {cursos.filter((c) => c.ativo).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Origem</label>
              <select value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                {['Instagram', 'Facebook', 'Google', 'Indicacao', 'Outros'].map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Faixa Etaria</label>
              <select value={form.faixaEtaria} onChange={(e) => setForm({ ...form, faixaEtaria: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Selecione...</option>
                {FAIXA_ETARIA_OPTIONS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Profissao Exercida</label>
              <input value={form.profissao} onChange={(e) => setForm({ ...form, profissao: e.target.value })} placeholder="Ex: Serralheiro, Desempregado, Estudante..." style={inputStyle} />
            </div>
          </div>
          <button type="submit" style={{ width: '100%', padding: 10, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', marginTop: 8 }}>Guardar</button>
        </form>
      </Modal>
    </div>
  );
}
