import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('hp_user') || 'null'),
  token: localStorage.getItem('hp_token') || null,
  loading: false,
  error: null,

  login: async (email, senha) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', { email, senha });
      localStorage.setItem('hp_token', data.token);
      localStorage.setItem('hp_user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, loading: false });
      return true;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Erro de conexao', loading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('hp_token');
    localStorage.removeItem('hp_user');
    set({ user: null, token: null });
  },

  isGestor: () => {
    const state = useAuthStore.getState();
    return state.user?.perfil === 'GESTOR';
  },

  isGestorOrAtendimento: () => {
    const state = useAuthStore.getState();
    return ['GESTOR', 'ATENDIMENTO'].includes(state.user?.perfil);
  }
}));

export default useAuthStore;
