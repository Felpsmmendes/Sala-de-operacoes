// Edge Function — status da conexão do WhatsApp Business Cloud API
// (Meta), pra aba "Conectar WhatsApp" do CRM mostrar se está configurado
// e funcionando. A credencial vive em `integracao_whatsapp` (ver
// migration_031 + _shared/whatsapp.ts) desde 2026-09-14 — antes disso
// era secret fixo de Edge Function. JWT verificado (deploy sem
// --no-verify-jwt) + confere eh_gestor() por dentro, mesmo padrão de
// enviar-whatsapp.
//
// Deploy:
//   supabase functions deploy whatsapp-status
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { buscarCredenciaisWhatsapp } from '../_shared/whatsapp.ts';

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return new Response(JSON.stringify({ erro: 'Variáveis de ambiente ausentes.' }), { status: 500 });

  const authHeader = req.headers.get('Authorization') ?? '';
  const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });

  const { data: ehGestor, error: erroRpc } = await supabase.rpc('eh_gestor');
  if (erroRpc || !ehGestor) return new Response(JSON.stringify({ erro: 'Só o gestor pode ver o status da conexão.' }), { status: 403 });

  const credenciais = await buscarCredenciaisWhatsapp(supabaseUrl, serviceRoleKey);
  if (!credenciais) {
    return new Response(JSON.stringify({ configurado: false, valido: false }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // credencial existe na tabela — confirma que ainda funciona de verdade
  // (token pode ter expirado/sido revogado na Meta sem ter sido
  // desconectado aqui) e busca o número/nome verificado, só pra exibir.
  try {
    const resposta = await fetch(`https://graph.facebook.com/v20.0/${credenciais.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`, {
      headers: { Authorization: `Bearer ${credenciais.accessToken}` },
    });
    const corpo = await resposta.json();
    if (!resposta.ok) {
      return new Response(JSON.stringify({ configurado: true, valido: false, erro: corpo?.error?.message ?? 'Token ou ID inválido junto à Meta.' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({ configurado: true, valido: true, numero: corpo.display_phone_number ?? null, nomeVerificado: corpo.verified_name ?? null, qualidade: corpo.quality_rating ?? null }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ configurado: true, valido: false, erro: e instanceof Error ? e.message : 'Falha ao contatar a Meta.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
