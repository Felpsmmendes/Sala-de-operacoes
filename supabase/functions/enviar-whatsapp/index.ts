// Edge Function — dispara UMA mensagem de template do WhatsApp Business
// Cloud API (Meta) por chamada. Ao contrário de `alerta-trava-d15`
// (cron, sem verificação), esta é chamada pelo próprio app com o gestor
// logado — por isso o deploy é SEM `--no-verify-jwt` (verificação de JWT
// ligada, padrão), e ainda confere `eh_gestor()` por dentro: só a conta
// travada nessa função pode disparar mensagem em nome da empresa.
//
// Deploy:
//   supabase functions deploy enviar-whatsapp
//   supabase secrets set WHATSAPP_ACCESS_TOKEN=xxx WHATSAPP_PHONE_NUMBER_ID=xxx
//
// Chamada esperada (body JSON): { telefone, template, parametros: string[] }
// — `template` é o nome exato aprovado na Meta (ver templates em
// docs/ROADMAP.md, Fase B), `parametros` preenche {{1}}, {{2}}... na ordem.
import { createClient } from 'jsr:@supabase/supabase-js@2';

/** Telefone livre (qualquer formato que o cadastro de equipe aceitar) pro
    formato E.164 que a API da Meta exige (só dígitos, com DDI). Assume
    Brasil quando não vem DDI — é a única realidade do negócio hoje. */
function normalizarTelefoneBR(telefone: string): string | null {
  const digitos = telefone.replace(/\D/g, '');
  if (!digitos) return null;
  if (digitos.startsWith('55') && digitos.length >= 12) return digitos;
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos.length >= 8 ? digitos : null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response(JSON.stringify({ erro: 'Método não permitido.' }), { status: 405 });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) return new Response(JSON.stringify({ erro: 'SUPABASE_URL/SUPABASE_ANON_KEY ausentes.' }), { status: 500 });

  // repassa o Authorization de quem chamou — supabase.functions.invoke()
  // no frontend já manda o JWT da sessão atual sozinho.
  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });

  const { data: ehGestor, error: erroRpc } = await supabase.rpc('eh_gestor');
  if (erroRpc || !ehGestor) return new Response(JSON.stringify({ erro: 'Só o gestor pode enviar mensagem em nome da empresa.' }), { status: 403 });

  const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  if (!token || !phoneNumberId) return new Response(JSON.stringify({ erro: 'WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID não configurado — rode "supabase secrets set".' }), { status: 500 });

  let corpo: { telefone?: string; template?: string; parametros?: string[] };
  try {
    corpo = await req.json();
  } catch {
    return new Response(JSON.stringify({ erro: 'Body inválido — esperado JSON.' }), { status: 400 });
  }

  const { telefone, template, parametros } = corpo;
  if (!telefone || !template || !Array.isArray(parametros)) {
    return new Response(JSON.stringify({ erro: 'Faltou "telefone", "template" ou "parametros" no body.' }), { status: 400 });
  }

  const numero = normalizarTelefoneBR(telefone);
  if (!numero) return new Response(JSON.stringify({ erro: `Telefone "${telefone}" inválido ou não cadastrado.` }), { status: 400 });

  const respostaMeta = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: numero,
      type: 'template',
      template: {
        name: template,
        language: { code: 'pt_BR' },
        components: [{ type: 'body', parameters: parametros.map((texto) => ({ type: 'text', text: texto })) }],
      },
    }),
  });

  const respostaJson = await respostaMeta.json();
  if (!respostaMeta.ok) return new Response(JSON.stringify({ erro: respostaJson }), { status: 502 });

  return new Response(JSON.stringify({ ok: true, whatsappId: respostaJson.messages?.[0]?.id ?? null }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
