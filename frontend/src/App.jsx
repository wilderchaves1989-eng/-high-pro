import React from 'react';
import useAuthStore from './store/authStore';
import LoginPage from './pages/LoginPage';
import Layout from './components/Layout';

export default function App() {
  const user = useAuthStore((s) => s.user);
  return user ? <Layout /> : <LoginPage />;
}
