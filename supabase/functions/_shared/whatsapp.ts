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

export type IntegracaoWebhook = { empresaId: string; webhookVerifyToken: string | null; appSecret: string | null };

/** Usada só pelo webhook (`whatsapp-webhook`) — acha a integração pelo
    `phone_number_id` que a Meta manda no payload, não pelo `id='atual'`
    fixo (as outras funções assumem 1 número só; o webhook já busca do
    jeito certo pra quando existir mais de uma empresa conectada). */
export async function buscarIntegracaoPorPhoneNumberId(supabaseUrl: string, serviceRoleKey: string, phoneNumberId: string): Promise<IntegracaoWebhook | null> {
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.from('integracao_whatsapp').select('empresa_id, webhook_verify_token, app_secret').eq('phone_number_id', phoneNumberId).maybeSingle();
  if (error || !data) return null;
  return { empresaId: data.empresa_id, webhookVerifyToken: data.webhook_verify_token, appSecret: data.app_secret };
}

/** Todo `webhook_verify_token` cadastrado hoje (não filtrado por número,
    porque a verificação GET da Meta acontece ANTES dela mandar qualquer
    payload de mensagem — não tem `phone_number_id` nesse momento, só o
    token que você colou no painel da Meta). */
export async function listarVerifyTokens(supabaseUrl: string, serviceRoleKey: string): Promise<string[]> {
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase.from('integracao_whatsapp').select('webhook_verify_token').not('webhook_verify_token', 'is', null);
  if (error || !data) return [];
  return data.map((r) => r.webhook_verify_token as string).filter(Boolean);
}
