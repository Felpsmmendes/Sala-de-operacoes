import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Client do Supabase separado, só pro Ponto Eletrônico interno
 * (`/ponto-interno`) — pedido do usuário (2026-09-07): dava pra bater
 * ponto no MESMO navegador/aba usado pra administrar o sistema, sem uma
 * sessão derrubar a outra.
 *
 * O supabase-js guarda a sessão logada no `localStorage`, sob uma chave
 * fixa — dois clients apontando pra chaves DIFERENTES (`storageKey`
 * abaixo) mantêm sessões completamente independentes no mesmo navegador:
 * o gestor pode estar logado no painel (client `supabase`, chave padrão)
 * ao mesmo tempo que um funcionário loga aqui pra bater ponto (client
 * `supabasePontoInterno`, chave própria), sem um derrubar o outro. Ainda
 * assim só dá pra ter UM funcionário logado por vez neste client — é
 * assim que o fluxo de kiosk (login → bate ponto → desloga sozinho)
 * continua fazendo sentido pro próximo usar o mesmo dispositivo.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configurados. Copie .env.example para .env.local e preencha com os dados do seu projeto Supabase.');
}

export const supabasePontoInterno = createClient<Database>(url, anonKey, {
  auth: { storageKey: 'emcena-ponto-interno-auth' },
});
