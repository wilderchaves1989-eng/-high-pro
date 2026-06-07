import React, { useState } from 'react';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const { login, loading, error } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(email, senha);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--background)' }}>
      <div style={{ background: 'var(--surface)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: 40, width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src="/images/logo-icon.jpeg" alt="High Pro" style={{ width: 72, height: 72, borderRadius: 16, margin: '0 auto 14px', display: 'block', objectFit: 'cover' }} />
          <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 22 }}>HighPro Solutions</h2>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>Sistema de Gestao de Escola de Solda</p>
        </div>

        {error && (
          <div style={{ background: '#FFE6E9', color: 'var(--danger)', padding: '10px 14px', borderRadius: 4, fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Email</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@highpro.pt"
              required
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 14, outline: 'none' }}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Palavra-passe</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              required
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'inherit', fontSize: 14, outline: 'none' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: 12, background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 4, fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'A verificar...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
