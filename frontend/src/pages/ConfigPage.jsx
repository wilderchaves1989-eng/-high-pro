import React, { useEffect, useState } from 'react';
import { cursos as cursosApi, users as usersApi, alunos as alunosApi, config as configApi } from '../services/api';
import Modal from '../components/Modal';
import { CalculadoraPacotes } from './CalculadoraPage';

const PROCESSOS = [
  'SMAW (111) - Eletrodo Revestido',
  'GMAW (135/136) - MIG/MAG',
  'GTAW (141) - TIG',
  'SAW (121) - Arco Submerso',
  'FCAW (136/138) - Arame Tubular',
  'OAW (311) - Oxiacetilenica',
];

const initialCurso = { nome: '', processo: '', carga: '', valor: '', nivel: '', descricao: '', ativo: true };
const initialCred = { nome: '', email: '', senha: '', perfil: 'ATENDIMENTO', ativo: true };

export default function ConfigPage() {
  const [sistemaNome, setSistemaNome] = useState('High Pro');
  const [cursos, setCursos] = useState([]);
  const [users, setUsers] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [modalCurso, setModalCurso] = useState(false);
  const [modalCred, setModalCred] = useState(false);
  const [modalCalc, setModalCalc] = useState(false);
  const [modalCriarInfo, setModalCriarInfo] = useState(false);
  const [cursoForm, setCursoForm] = useState(initialCurso);
  const [credForm, setCredForm] = useState(initialCred);
  const [editCursoId, setEditCursoId] = useState(null);
  const [editCredId, setEditCredId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    configApi.carregar().then((c) => setSistemaNome(c.sistemaNome || 'High Pro')).catch(() => {});
    alunosApi.listar().then(setAlunos).catch(() => {});
    Promise.all([
      cursosApi.listar().then(setCursos).catch(() => {}),
      usersApi.listar().then(setUsers).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const salvarNome = () => {
    configApi.salvar('sistemaNome', sistemaNome).catch(() => {});
  };

  // Cursos
  const abrirCurso = (c) => {
    if (c) {
      setEditCursoId(c.id);
      setCursoForm({ nome: c.nome, processo: c.processo || '', carga: c.carga, valor: c.valor, nivel: c.nivel || '', descricao: c.descricao || '', ativo: c.ativo });
    } else {
      setEditCursoId(null);
      setCursoForm(initialCurso);
    }
    setModalCurso(true);
  };

  const salvarCurso = async (e) => {
    e.preventDefault();
    try {
      if (editCursoId) await cursosApi.atualizar(editCursoId, cursoForm);
      else await cursosApi.criar(cursoForm);
      setModalCurso(false);
      setCursos(await cursosApi.listar());
    } catch (err) { alert(err.message || 'Erro'); }
  };

  const excluirCurso = async (id) => {
    if (!confirm('Remover curso?')) return;
    await cursosApi.excluir(id);
    setCursos(await cursosApi.listar());
  };

  // Credenciais
  const abrirCred = (c) => {
    if (c) {
      setEditCredId(c.id);
      setCredForm({ nome: c.nome, email: c.email, senha: '', perfil: c.perfil, ativo: c.ativo });
    } else {
      setEditCredId(null);
      setCredForm(initialCred);
    }
    setModalCred(true);
  };

  const salvarCred = async (e) => {
    e.preventDefault();
    try {
      const data = { ...credForm };
      if (!data.senha && editCredId) delete data.senha;
      if (editCredId) await usersApi.atualizar(editCredId, data);
      else await usersApi.criar(data);
      setModalCred(false);
      setUsers(await usersApi.listar());
    } catch (err) { alert(err.message || 'Erro'); }
  };

  const excluirCred = async (id) => {
    if (!confirm('Remover credencial?')) return;
    // Nao e possivel remover utilizadores via client-side, apenas desativar
    await usersApi.atualizar(id, { ativo: false });
    setUsers(await usersApi.listar());
  };

  const fmtValor = (v) => `EUR ${Number(v).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}`;
  const perfilLabel = { GESTOR: 'Gestao Geral', ATENDIMENTO: 'Atendimento', PROFESSOR: 'Professor' };
  const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 14, outline: 'none' };
  const thStyle = { textAlign: 'left', padding: '12px 16px', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3, color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)', background: 'var(--background)' };
  const tdStyle = { padding: '10px 16px', borderBottom: '1px solid var(--border)' };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      {/* Nome empresa */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>Nome da Empresa</div>
        <div style={{ padding: '16px 20px' }}>
          <input value={sistemaNome} onChange={(e) => setSistemaNome(e.target.value)} onBlur={salvarNome} style={inputStyle} />
        </div>
      </div>

      {/* Cursos */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Cursos e Valores</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setModalCalc(true)} style={{ padding: '6px 14px', background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: 4, fontSize: 12, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>Calculadora de Pacotes</button>
            <button onClick={() => abrirCurso()} style={{ padding: '6px 14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>+ Novo Curso</button>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>{['Curso', 'Processo', 'Carga', 'Valor', 'Alunos', 'Estado', 'Acoes'].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {loading && <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>A carregar...</td></tr>}
              {!loading && cursos.map((c) => (
                <tr key={c.id}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{c.nome}</td>
                  <td style={{ ...tdStyle, fontSize: 12 }}>{c.processo || '--'}</td>
                  <td style={tdStyle}>{c.carga}h</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{fmtValor(c.valor)}</td>
                  <td style={tdStyle}>{c._count?.alunos || 0}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.ativo ? '#E6F9F3' : '#FFE6E9', color: c.ativo ? '#00A86B' : '#E2445C' }}>{c.ativo ? 'Ativo' : 'Inativo'}</span>
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    <button onClick={() => abrirCurso(c)} style={{ padding: '2px 8px', background: 'transparent', border: 'none', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-secondary)' }}>Editar</button>
                    <button onClick={() => excluirCurso(c.id)} style={{ padding: '2px 8px', background: 'transparent', border: 'none', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--danger)' }}>x</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Credenciais */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Credenciais de Acesso</span>
          <button onClick={() => setModalCriarInfo(true)} style={{ padding: '6px 14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>+ Criar Acesso</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>{['Nome', 'Email', 'Perfil', 'Estado', 'Acoes'].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {loading && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>A carregar...</td></tr>}
              {!loading && users.map((u) => (
                <tr key={u.id}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{u.nome}</td>
                  <td style={tdStyle}>{u.email}</td>
                  <td style={tdStyle}>{perfilLabel[u.perfil] || u.perfil}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: u.ativo ? '#E6F9F3' : '#FFE6E9', color: u.ativo ? '#00A86B' : '#E2445C' }}>{u.ativo ? 'Ativo' : 'Inativo'}</span>
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    <button onClick={() => abrirCred(u)} style={{ padding: '2px 8px', background: 'transparent', border: 'none', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-secondary)' }}>Editar</button>
                    <button onClick={() => excluirCred(u.id)} style={{ padding: '2px 8px', background: 'transparent', border: 'none', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--danger)' }}>x</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Curso */}
      <Modal open={modalCurso} onClose={() => setModalCurso(false)} title={editCursoId ? 'Editar Curso' : 'Novo Curso'} maxWidth={600}>
        <form onSubmit={salvarCurso}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Nome do Curso <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input required value={cursoForm.nome} onChange={(e) => setCursoForm({ ...cursoForm, nome: e.target.value })} placeholder="Ex: Eletrodo Revestido Basico" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Processos <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400 }}>(pode escolher mais de um)</span></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {PROCESSOS.map((p) => {
                const sel = cursoForm.processo ? cursoForm.processo.split(' | ') : [];
                const on = sel.includes(p);
                return (
                  <label key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', padding: '7px 10px', borderRadius: 4, border: `1px solid ${on ? 'var(--primary)' : 'var(--border)'}`, background: on ? 'var(--primary-selected)' : 'transparent' }}>
                    <input type="checkbox" checked={on} onChange={() => {
                      const novo = on ? sel.filter((x) => x !== p) : [...sel, p];
                      setCursoForm({ ...cursoForm, processo: novo.join(' | ') });
                    }} style={{ accentColor: 'var(--primary)' }} />
                    <span>{p}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Carga Horaria <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input required type="number" min="1" value={cursoForm.carga} onChange={(e) => setCursoForm({ ...cursoForm, carga: e.target.value })} placeholder="Horas" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Valor (EUR) <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input required type="number" step="0.01" min="0" value={cursoForm.valor} onChange={(e) => setCursoForm({ ...cursoForm, valor: e.target.value })} placeholder="0,00" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Nivel</label>
              <select value={cursoForm.nivel} onChange={(e) => setCursoForm({ ...cursoForm, nivel: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Selecione...</option>
                {['Iniciante', 'Intermediario', 'Avancado', 'Profissional'].map((n) => <option key={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Estado</label>
              <select value={cursoForm.ativo} onChange={(e) => setCursoForm({ ...cursoForm, ativo: e.target.value === 'true' })} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" onClick={() => setModalCurso(false)} style={{ flex: 1, padding: 10, background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" style={{ flex: 1, padding: 10, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>Guardar Curso</button>
          </div>
        </form>
      </Modal>

      {/* Modal Calculadora de Pacotes */}
      <Modal open={modalCalc} onClose={() => setModalCalc(false)} title="Calculadora de Pacotes" maxWidth={820}>
        <CalculadoraPacotes empresa={sistemaNome} />
      </Modal>

      {/* Modal: como criar acesso (instrucoes, sem sequestrar a sessao do admin) */}
      <Modal open={modalCriarInfo} onClose={() => setModalCriarInfo(false)} title="Criar Acesso" maxWidth={520}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>Por seguranca, novos acessos sao criados direto no Supabase (o navegador nao tem permissao para criar utilizadores).</p>
        <ol style={{ fontSize: 13, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <li>Abra o <strong>Supabase Dashboard</strong> do projeto.</li>
          <li>Va em <strong>Authentication → Users</strong>.</li>
          <li>Clique em <strong>Add user</strong>, preencha email e senha.</li>
          <li>Marque <strong>Auto Confirm User</strong> e clique em Create.</li>
          <li>Volte aqui, clique em <strong>Editar</strong> na nova linha (o acesso aparece automaticamente) e defina o Perfil correto.</li>
        </ol>
        <button onClick={async () => { setModalCriarInfo(false); setUsers(await usersApi.listar()); }} style={{ width: '100%', marginTop: 16, padding: 10, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>Ja criei, atualizar lista</button>
      </Modal>

      {/* Modal Credencial (edicao) */}
      <Modal open={modalCred} onClose={() => setModalCred(false)} title="Editar Credencial" maxWidth={550}>
        <form onSubmit={salvarCred}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Nome <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input required value={credForm.nome} onChange={(e) => setCredForm({ ...credForm, nome: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Email</label>
              <input disabled value={credForm.email} style={{ ...inputStyle, background: 'var(--background)', color: 'var(--text-tertiary)', cursor: 'not-allowed' }} title="Email e senha so podem ser alterados no Supabase Dashboard" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Perfil</label>
              <select value={credForm.perfil} onChange={(e) => setCredForm({ ...credForm, perfil: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="GESTOR">Gestao Geral</option>
                <option value="ATENDIMENTO">Atendimento</option>
                <option value="PROFESSOR">Professor</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" onClick={() => setModalCred(false)} style={{ flex: 1, padding: 10, background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" style={{ flex: 1, padding: 10, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
