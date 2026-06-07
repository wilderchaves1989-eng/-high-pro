import React from 'react';
import useAuthStore from '../store/authStore';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'alunos', label: 'Alunos', badge: true },
  { key: 'agenda', label: 'Agenda', badge: true },
  { key: 'configuracoes', label: 'Configuracoes', gestorOnly: true },
];

export default function Sidebar({ activePage, onNavigate }) {
  const { user, logout } = useAuthStore();
  const initials = user?.nome?.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase() || '?';
  const perfilLabel = { GESTOR: 'Gestor', ATENDIMENTO: 'Atendimento', PROFESSOR: 'Professor' };

  return (
    <nav style={{ width: 240, minWidth: 240, height: '100vh', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, minHeight: 48 }}>
        <div style={{ width: 28, height: 28, borderRadius: 4, background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>H</div>
        <span style={{ fontWeight: 600, fontSize: 15 }}>High Pro</span>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-tertiary)', padding: '8px 8px 4px' }}>Principal</div>
        {NAV_ITEMS.map((item) => {
          if (item.gestorOnly && user?.perfil !== 'GESTOR') return null;
          const isActive = activePage === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 4,
                cursor: 'pointer', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit',
                fontSize: 14, fontWeight: isActive ? 500 : 400, position: 'relative',
                background: isActive ? 'var(--primary-selected)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
                borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
              }}
            >
              <span style={{ flex: 1 }}>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: 12, borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 4 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--success))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>{initials}</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.nome}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{perfilLabel[user?.perfil] || user?.perfil}</div>
          </div>
        </div>
        <button
          onClick={logout}
          style={{ width: '100%', marginTop: 8, padding: '6px 10px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--danger)', fontSize: 12, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}
        >
          Terminar Sessao
        </button>
      </div>
    </nav>
  );
}
