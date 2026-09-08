import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Preenchidas em .env.local (nunca commitado — ver .env.example).
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Falha alto e cedo: sem isso configurado, nada no app funciona (auth,
  // leitura/escrita de dado) — melhor um erro claro no console do que um
  // 401 confuso na primeira chamada.
  throw new Error(
    'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configurados. Copie .env.example para .env.local e preencha com os dados do seu projeto Supabase.'
  );
}

export const supabase = createClient<Database>(url, anonKey);
