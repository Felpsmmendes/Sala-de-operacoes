import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configurados. Copie .env.example para .env.local (mesmo projeto Supabase do app principal).');
}

// Mesmo projeto Supabase do Sala de Operações, mas um `storageKey`
// próprio — login aqui não compartilha sessão com o app principal
// (evita qualquer chance de uma aba interferir na outra, mesma ideia
// do `supabasePontoInterno` de lá).
export const supabase = createClient<Database>(url, anonKey, {
  auth: { storageKey: 'plataforma-admin-auth' },
});
