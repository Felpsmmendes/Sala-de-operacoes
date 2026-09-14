// Compartilhado entre as Edge Functions de WhatsApp (enviar-whatsapp,
// whatsapp-status, aplicar-automacoes-tempo) — Supabase empacota
// pastas `_shared/` junto de cada function que a importa por caminho
// relativo, então isso não duplica em 3 lugares (diferente da duplicação
// entre Deno e o app Vite, que aí sim é inevitável).
import { createClient } from 'jsr:@supabase/supabase-js@2';

export type CredenciaisWhatsapp = { phoneNumberId: string; accessToken: string };

/** Lê a credencial ativa de `integracao_whatsapp` com a SERVICE ROLE key
    — de propósito ignora RLS (a tabela não tem nenhuma policy de SELECT
    pra `authenticated`, nem o gestor lê o token de volta pela tela; só
    Edge Function, com a service role, consegue). Substitui os secrets
    fixos WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID de antes
    (2026-09-14) — agora o gestor conecta/desconecta pela própria tela,
    sem depender de `supabase secrets set` toda vez que o número mudar. */
export async function buscarCredenciaisWhatsapp(supabaseUrl: string, serviceRoleKey: string): Promise<CredenciaisWhatsapp | null> {
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.from('integracao_whatsapp').select('phone_number_id, access_token').eq('id', 'atual').maybeSingle();
  if (error || !data) return null;
  return { phoneNumberId: data.phone_number_id, accessToken: data.access_token };
}
