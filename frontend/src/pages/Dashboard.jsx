import React, { useEffect, useState } from 'react';
import api from '../services/api';

const STATUS_COLORS = {
  CONFIRMADO: { bg: '#E6F9F3', color: '#00A86B' },
  PENDENTE: { bg: '#FFF9E6', color: '#B8860B' },
  CANCELADO: { bg: '#FFE6E9', color: '#E2445C' },
};

const TIPO_LABEL = { PRATICA: 'Aula Pratica', TEORICA: 'Aula Teorica', VISITA_TECNICA: 'Visita Tecnica' };

export default function Dashboard() {
  const [stats, setStats] = useState({ totalAlunos: 0, agendaHoje: 0, cursosAtivos: 0, proximasAulas: [] });

  useEffect(() => {
    api.get('/dashboard/stats').then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const cards = [
    { label: 'Total Alunos', value: stats.totalAlunos, color: '#0073EA' },
    { label: 'Agenda Hoje', value: stats.agendaHoje, color: '#00C875' },
    { label: 'Cursos Ativos', value: stats.cursosAtivos, color: '#FFCB00' },
  ];

  return (
    <div style={{ padding: 24, overflowY: 'auto', height: '100%' }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
        {cards.map((c) => (
          <div key={c.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
              {c.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Proximos agendamentos */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 500, fontSize: 14 }}>Proximos Agendamentos</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Aluno', 'Data / Hora', 'Tipo', 'Estado'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.3, color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)', background: 'var(--background)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.proximasAulas.length ? stats.proximasAulas.map((a) => {
                const sc = STATUS_COLORS[a.estado] || STATUS_COLORS.PENDENTE;
                const dataFmt = a.data ? new Date(a.data).toLocaleDateString('pt-PT') : '';
                return (
                  <tr key={a.id}>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{a.aluno?.nome}</td>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>{dataFmt} as {a.hora}</td>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>{TIPO_LABEL[a.tipo] || a.tipo}</td>
                    <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color }}>{a.estado}</span>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: 'var(--text-tertiary)' }}>Nenhum agendamento proximo</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
