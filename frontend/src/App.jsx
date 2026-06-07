import React, { useEffect } from 'react';
import useAuthStore from './store/authStore';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';

export default function App() {
  const { user, loading, init } = useAuthStore();

  useEffect(() => { init(); }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--background)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, background: 'var(--primary)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: '#fff', fontWeight: 700, fontSize: 22 }}>H</div>
          <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>A carregar...</p>
        </div>
      </div>
    );
  }

  return user ? <Layout /> : <LoginPage />;
}
