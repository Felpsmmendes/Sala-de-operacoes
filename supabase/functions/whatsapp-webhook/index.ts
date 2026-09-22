// Edge Function — webhook de RECEBIMENTO de mensagem do WhatsApp Business
// Cloud API (Meta). Diferente de `enviar-whatsapp`/`whatsapp-status`
// (chamadas pelo próprio app, com JWT do gestor), esta é chamada PELA
// META, sem nenhum jeito de mandar um JWT do Supabase — por isso o
// deploy tem que ser SEM verificação de JWT:
//
//   supabase functions deploy whatsapp-webhook --no-verify-jwt
//
// Depois do deploy, configure no painel da Meta (App > WhatsApp >
// Configuration > Webhook):
//   Callback URL:  https://<seu-projeto>.supabase.co/functions/v1/whatsapp-webhook
//   Verify token:  o MESMO valor que você salvar em `webhook_verify_token`
//                  (aba "Conectar WhatsApp" do CRM)
// Marque o campo "messages" pra assinar.
//
// Segurança sem JWT: (1) a verificação GET (handshake) só passa se o
// `verify_token` bater com o que está no banco — impede alguém configurar
// um endpoint seu com token errado; (2) se você preencher o "App Secret"
// (Meta > Configurações básicas), cada mensagem POST tem a assinatura
// HMAC-SHA256 conferida (header `X-Hub-Signature-256`) — sem isso
// preenchido, o endpoint aceita qualquer POST bem-formado (funciona, só
// sem essa camada extra).
import { buscarIntegracaoPorPhoneNumberId, listarVerifyTokens } from '../_shared/whatsapp.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

type ValorWebhookMeta = {
  metadata?: { phone_number_id?: string };
  messages?: { from?: string; id?: string; type?: string; text?: { body?: string } }[];
  // `statuses` (confirmação de entrega/leitura da mensagem ENVIADA) também
  // chega por aqui — ignorado de propósito, não é o que este webhook
  // guarda (ver comentário na migration).
};

async function assinaturaValida(corpoBruto: string, assinaturaHeader: string | null, appSecret: string): Promise<boolean> {
  if (!assinaturaHeader?.startsWith('sha256=')) return false;
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(appSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const assinaturaCalculada = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(corpoBruto));
  const hex = [...new Uint8Array(assinaturaCalculada)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `sha256=${hex}` === assinaturaHeader;
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return new Response('Variáveis de ambiente ausentes.', { status: 500 });

  // ---------- GET: handshake de verificação da Meta ----------
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const modo = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (modo !== 'subscribe' || !token || !challenge) return new Response('Parâmetros de verificação ausentes.', { status: 400 });

    const tokensValidos = await listarVerifyTokens(supabaseUrl, serviceRoleKey);
    if (!tokensValidos.includes(token)) return new Response('Verify token não confere.', { status: 403 });

    // a Meta exige o challenge de volta como texto puro, sem JSON.
    return new Response(challenge, { status: 200 });
  }

  if (req.method !== 'POST') return new Response('Método não permitido.', { status: 405 });

  const corpoBruto = await req.text();
  let payload: { entry?: { changes?: { value?: ValorWebhookMeta }[] }[] };
  try {
    payload = JSON.parse(corpoBruto);
  } catch {
    return new Response('Body inválido.', { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const alteracoes = payload.entry?.flatMap((e) => e.changes ?? []) ?? [];

  for (const alteracao of alteracoes) {
    const valor = alteracao.value;
    const phoneNumberId = valor?.metadata?.phone_number_id;
    const mensagens = valor?.messages;
    if (!phoneNumberId || !mensagens?.length) continue; // ex.: evento de "status" (entregue/lido), nada a gravar

    const integracao = await buscarIntegracaoPorPhoneNumberId(supabaseUrl, serviceRoleKey, phoneNumberId);
    if (!integracao) continue; // mensagem pra um número que não é nosso (ou desconectado) — ignora

    if (integracao.appSecret) {
      const assinaturaOk = await assinaturaValida(corpoBruto, req.headers.get('X-Hub-Signature-256'), integracao.appSecret);
      if (!assinaturaOk) return new Response('Assinatura inválida.', { status: 401 });
    }

    for (const msg of mensagens) {
      if (!msg.from || !msg.id) continue;

      // casa com um lead existente pelos últimos 8 dígitos do telefone —
      // tolera DDI/DDD/formatação diferente entre o que a Meta manda
      // (só dígitos, com DDI) e o que está cadastrado em `leads.telefone`
      // (texto livre, digitado por humano).
      const ultimosDigitos = msg.from.replace(/\D/g, '').slice(-8);
      let leadId: string | null = null;
      if (ultimosDigitos.length === 8) {
        const { data: leadsAchados } = await supabase.from('leads').select('id').ilike('telefone', `%${ultimosDigitos}%`).limit(1);
        leadId = leadsAchados?.[0]?.id ?? null;
      }

      // `upsert` (não `insert`) de propósito: só `upsert()` aceita
      // `onConflict`/`ignoreDuplicates` no supabase-js — é o que faz um
      // reenvio da Meta (retry de timeout) não duplicar a mensagem.
      const ehTexto = msg.type === 'text'; // valor real que a Meta manda (em inglês)
      await supabase.from('mensagens_whatsapp').upsert(
        {
          empresa_id: integracao.empresaId,
          lead_id: leadId,
          telefone: msg.from,
          direcao: 'recebida',
          tipo: ehTexto ? 'texto' : 'outro',
          conteudo: ehTexto ? (msg.text?.body ?? null) : `[${msg.type ?? 'mensagem'}]`,
          whatsapp_message_id: msg.id,
        },
        { onConflict: 'whatsapp_message_id', ignoreDuplicates: true }
      );
    }
  }

  // A Meta espera 200 rápido — sempre responde ok, mesmo quando não achou
  // integração/lead (isso já foi tratado acima, silenciosamente).
  return new Response('EVENT_RECEIVED', { status: 200 });
});
