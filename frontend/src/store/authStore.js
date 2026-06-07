import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  error: null,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      set({ user: session.user, profile, loading: false });
    } else {
      set({ loading: false });
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        set({ user: null, profile: null });
      }
      if (event === 'SIGNED_IN' && session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        set({ user: session.user, profile });
      }
    });
  },

  login: async (email, senha) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });

    if (error) {
      set({ error: 'Credenciais invalidas', loading: false });
      return false;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profile && !profile.ativo) {
      await supabase.auth.signOut();
      set({ error: 'Conta desativada', loading: false });
      return false;
    }

    set({ user: data.user, profile, loading: false });
    return true;
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },

  isGestor: () => get().profile?.perfil === 'GESTOR',
  isGestorOrAtendimento: () => ['GESTOR', 'ATENDIMENTO'].includes(get().profile?.perfil),
}));

export default useAuthStore;
