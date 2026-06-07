import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL ou Key nao configurados. Verifique o ficheiro .env');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
