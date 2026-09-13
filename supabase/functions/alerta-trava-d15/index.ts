// Edge Function — roda 1x por dia via pg_cron (ver migration_025).
// Verifica contratos ativos com evento em até 20 dias e saldo AINDA NÃO
// quitado (mesma regra de "Contratos em risco D-20" do Dashboard,
// src/pages/Dashboard.tsx) e manda um e-mail de alerta via Resend — só
// quando existe pelo menos 1 contrato assim, sem "tudo ok" diário pra
// não virar ruído que todo mundo aprende a ignorar.
//
// Deploy (rodar uma vez, e de novo só quando o código daqui mudar):
//   supabase functions deploy alerta-trava-d15 --no-verify-jwt
//   supabase secrets set RESEND_API_KEY=re_xxx ALERTA_EMAIL_DESTINO=voce@emcena.com.br
//
// `--no-verify-jwt`: decisão consciente, não descuido — esta function só
// ENVIA e-mail (nunca devolve dado sensível na resposta), e é chamada
// só pelo cron interno do próprio projeto. O único risco de deixá-la
// sem exigir um token é alguém que descubra a URL conseguir disparar
// e-mail extra à toa — sem exposição de dado, aceitável pro tamanho
// deste projeto (ver DESIGN.md/README, mesma lógica dos outros
// endpoints públicos do sistema, que usam RPC security definer em vez
// de autenticação de usuário).
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const destinatario = Deno.env.get('ALERTA_EMAIL_DESTINO');

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ erro: 'SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes — devem vir automáticos do runtime da Edge Function.' }), { status: 500 });
  }
  if (!resendApiKey || !destinatario) {
    return new Response(JSON.stringify({ erro: 'RESEND_API_KEY ou ALERTA_EMAIL_DESTINO não configurado — rode "supabase secrets set".' }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);
  const limite = new Date(hoje);
  limite.setUTCDate(limite.getUTCDate() + 20);
  const hojeStr = hoje.toISOString().slice(0, 10);
  const limiteStr = limite.toISOString().slice(0, 10);

  const { data: contratos, error: erroContratos } = await supabase
    .from('contratos')
    .select('id, lead_id, data_evento, valor_saldo, saldo_status')
    .neq('status', 'cancelado')
    .neq('saldo_status', 'quitado')
    .gte('data_evento', hojeStr)
    .lte('data_evento', limiteStr);

  if (erroContratos) return new Response(JSON.stringify({ erro: erroContratos.message }), { status: 500 });
  if (!contratos || contratos.length === 0) {
    return new Response(JSON.stringify({ ok: true, alertados: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const leadIds = [...new Set(contratos.map((c) => c.lead_id))];
  const { data: leads, error: erroLeads } = await supabase.from('leads').select('id, nome').in('id', leadIds);
  if (erroLeads) return new Response(JSON.stringify({ erro: erroLeads.message }), { status: 500 });
  const nomePorLeadId = new Map((leads ?? []).map((l) => [l.id, l.nome]));

  function diasAte(dataEvento: string): number {
    const d = new Date(dataEvento + 'T00:00:00Z');
    return Math.round((d.getTime() - hoje.getTime()) / 86400000);
  }

  const ordenados = [...contratos].sort((a, b) => a.data_evento.localeCompare(b.data_evento));
  const linhas = ordenados
    .map((c) => {
      const dias = diasAte(c.data_evento);
      const nome = nomePorLeadId.get(c.lead_id) ?? 'Cliente sem nome';
      const valor = Number(c.valor_saldo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const statusSaldo = c.saldo_status === 'parcial' ? 'parcial' : 'pendente';
      return `<li><strong>${nome}</strong> — evento em D-${dias}, saldo ${statusSaldo} de ${valor}</li>`;
    })
    .join('');

  const html = `
    <div style="font-family: -apple-system, sans-serif; color:#0f172a; line-height:1.6;">
      <h2 style="margin:0 0 12px;">${contratos.length} contrato(s) em risco D-20</h2>
      <p>Saldo ainda não quitado, evento em 20 dias ou menos:</p>
      <ul>${linhas}</ul>
      <p style="color:#64748b; font-size:12px; margin-top:20px;">Sala de Operações · Em Cena Eventos — alerta automático diário (pg_cron).</p>
    </div>
  `;

  const resposta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Sala de Operações <onboarding@resend.dev>',
      to: [destinatario],
      subject: `${contratos.length} contrato(s) em risco D-20 — Em Cena Eventos`,
      html,
    }),
  });

  if (!resposta.ok) {
    const texto = await resposta.text();
    return new Response(JSON.stringify({ erro: `Resend: ${texto}` }), { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true, alertados: contratos.length }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
