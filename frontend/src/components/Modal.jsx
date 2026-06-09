import React, { useState } from 'react';

export default function Modal({ open, onClose, title, children, maxWidth = 560 }) {
  const [isMaximized, setIsMaximized] = useState(false);

  if (!open) return null;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div style={{
        background: 'var(--surface)',
        borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        width: '100%',
        maxWidth: isMaximized ? '95vw' : maxWidth,
        maxHeight: isMaximized ? '95vh' : '85vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1, borderRadius: '12px 12px 0 0' }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>{title}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? 'Minimizar' : 'Maximizar'}
              style={{ width: 28, height: 28, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s' }}
            >
              {isMaximized ? '⊡' : '⊞'}
            </button>
            <button
              onClick={onClose}
              style={{ width: 28, height: 28, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              &times;
            </button>
          </div>
        </div>
        <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}
