import React, { useEffect, useState, useCallback } from 'react';
import { alunos as alunosApi, aulas as aulasApi, config as configApi } from '../services/api';

const STATUS_STYLES = {
  LEAD: { bg: '#E6F2FF', color: '#0073EA' },
  AGENDOU_VISITA: { bg: '#FFF9E6', color: '#B8860B' },
  MATRICULADO: { bg: '#E6F9F3', color: '#00A86B' },
  CONCLUIDO: { bg: '#F3E8FF', color: '#7B3FA3' },
  DESISTENTE: { bg: '#FFE6E9', color: '#E2445C' },
};
const STATUS_LABEL = { LEAD: 'Lead', AGENDOU_VISITA: 'Agendou Visita', MATRICULADO: 'Matriculado', CONCLUIDO: 'Concluido', DESISTENTE: 'Desistente' };
const PROMO_PADRAO = 'Ola {nome}! Foi um prazer receber a sua visita na {empresa}. Esta semana temos uma condicao especial de matricula para quem nos visitou. Quer garantir a sua vaga com desconto? Fale connosco!';

const fmtData = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-PT') : '--');

export default function VisitasPage() {
  const [alunos, setAlunos] = useState([]);
  const [aulas, setAulas] = useState([]);
  const [empresa, setEmpresa] = useState('High Pro');
  const [promo, setPromo] = useState(PROMO_PADRAO);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [a, au, c] = await Promise.all([
        alunosApi.listar().catch(() => []),
        aulasApi.listar().catch(() => []),
        configApi.carregar().catch(() => ({})),
      ]);
      setAlunos(a || []);
      setAulas(au || []);
      if (c?.sistemaNome) setEmpresa(c.sistemaNome);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // aluno_id -> data da visita tecnica mais recente
  const visitasMap = {};
  aulas.filter((a) => a.tipo === 'VISITA_TECNICA').forEach((a) => {
    const d = a.data?.split('T')[0] || '';
    if (!visitasMap[a.aluno_id] || d > visitasMap[a.aluno_id]) visitasMap[a.aluno_id] = d;
  });

  const lista = alunos
    .filter((a) => a.status === 'AGENDOU_VISITA' || visitasMap[a.id])
    .map((a) => ({ ...a, dataVisita: visitasMap[a.id] || null }))
    .filter((a) => !busca || a.nome.toLowerCase().includes(busca.toLowerCase()))
    .sort((x, y) => (y.dataVisita || '').localeCompare(x.dataVisita || ''));

  const naoMatriculados = lista.filter((a) => !['MATRICULADO', 'CONCLUIDO'].includes(a.status)).length;

  const montarPromo = (a) => promo
    .replace(/\{nome\}/g, (a.nome || '').split(' ')[0] || a.nome || '')
    .replace(/\{empresa\}/g, empresa);

  const enviarWhatsapp = (a) => {
    let tel = (a.telefone || '').replace(/\D/g, '');
    if (!tel) { alert('Este aluno nao tem telefone registado.'); return; }
    if (tel.length === 9) tel = '351' + tel;
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(montarPromo(a))}`, '_blank');
  };

  const enviarEmail = (a) => {
    if (!a.email) { alert('Este aluno nao tem email registado.'); return; }
    window.location.href = `mailto:${a.email}?subject=${encodeURIComponent('Promocao ' + empresa)}&body=${encodeURIComponent(montarPromo(a))}`;
  };

  const thStyle = { textAlign: 'left', padding: '12px 16px', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3, color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)', background: 'var(--background)' };
  const tdStyle = { padding: '10px 16px', borderBottom: '1px solid var(--border)' };

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Visitas', value: lista.length, color: '#0073EA' },
          { label: 'Leads a converter', value: naoMatriculados, color: '#FFCB00' },
          { label: 'Ja matriculados', value: lista.length - naoMatriculados, color: '#00C875' },
        ].map((c) => (
          <div key={c.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
              {c.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Mensagem promo editavel */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: 16 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Mensagem da Promo</span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Use {'{nome}'} e {'{empresa}'} — sao substituidos ao enviar</span>
        </div>
        <div style={{ padding: 16 }}>
          <textarea value={promo} onChange={(e) => setPromo(e.target.value)} rows={3} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'inherit', fontSize: 14, outline: 'none', resize: 'vertical' }} />
        </div>
      </div>

      {/* Busca */}
      <div style={{ marginBottom: 16 }}>
        <input placeholder="Buscar aluno..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 14, outline: 'none', minWidth: 240 }} />
      </div>

      {/* Tabela */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>Leads que visitaram</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>{['Aluno', 'Contato', 'Interesse', 'Visita', 'Status', 'Disparar promo'].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>A carregar...</td></tr>
              ) : lista.length ? lista.map((a) => {
                const ss = STATUS_STYLES[a.status] || STATUS_STYLES.LEAD;
                return (
                  <tr key={a.id}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{a.nome}</td>
                    <td style={tdStyle}>
                      <div>{a.telefone || '--'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{a.email || ''}</div>
                    </td>
                    <td style={tdStyle}>{a.cursos?.nome || '--'}</td>
                    <td style={tdStyle}>{fmtData(a.dataVisita)}</td>
                    <td style={tdStyle}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: ss.bg, color: ss.color }}>{STATUS_LABEL[a.status] || a.status}</span>
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      <button onClick={() => enviarWhatsapp(a)} title="Enviar promo por WhatsApp" style={{ padding: '5px 12px', background: '#25D366', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', marginRight: 6 }}>WhatsApp</button>
                      <button onClick={() => enviarEmail(a)} title="Enviar promo por Email" style={{ padding: '5px 12px', background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: 4, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>Email</button>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>Nenhum lead com visita. Marque uma Visita Tecnica na Agenda ou defina o status do aluno como "Agendou Visita".</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
