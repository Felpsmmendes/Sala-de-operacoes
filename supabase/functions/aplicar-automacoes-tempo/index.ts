// Edge Function — roda 1x por dia via pg_cron (ver migration_027). Faz 2
// coisas com o motor de fluxo (mesmo modelo de grafo de src/lib/api/
// automacoes.ts — reescrito aqui porque uma Edge Function Deno não
// importa o código do app Vite diretamente; mudar uma ação/tipo de nó
// exige lembrar de mudar as duas):
//
//   1. Retoma execuções PARADAS num nó de espera cujo `aguardando_ate`
//      já passou.
//   2. Inicia execuções NOVAS pro gatilho `tempo_sem_contato` — que não
//      tem "evento" (é ausência de contato ao longo do tempo), então só
//      esta varredura diária consegue detectar.
//
// Deploy:
//   supabase functions deploy aplicar-automacoes-tempo --no-verify-jwt
//
// `--no-verify-jwt`: mesma decisão consciente da `alerta-trava-d15` — só
// o cron interno chama esta function. O que protege de abuso não é
// autenticação, é o índice único de execução ativa por (fluxo, lead) —
// invocar fora de hora não duplica nada, só reavalia mais cedo.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

type NoDados = {
  gatilho_tipo?: string;
  gatilho_funil_id?: string | null;
  gatilho_dias?: number | null;
  espera_dias?: number;
  condicao_campo?: string;
  condicao_valor?: string;
  acao_tipo?: string;
  acao_funil_destino_id?: string | null;
  acao_texto?: string | null;
  acao_dias_prazo?: number | null;
  acao_whatsapp_template?: string | null;
};

type NoFluxo = { id: string; fluxo_id: string; tipo: string; dados: NoDados };
type ConexaoFluxo = { id: string; origem_no_id: string; destino_no_id: string; origem_handle: string | null };
type FluxoCompleto = { nos: NoFluxo[]; conexoes: ConexaoFluxo[] };
type LeadMin = { id: string; nome: string; telefone: string | null; status: string; origem: string | null; criado_em: string };
type Execucao = { id: string; no_atual_id: string | null; aguardando_ate: string | null };

function normalizarTelefoneBR(telefone: string): string | null {
  const digitos = telefone.replace(/\D/g, '');
  if (!digitos) return null;
  if (digitos.startsWith('55') && digitos.length >= 12) return digitos;
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return digitos.length >= 8 ? digitos : null;
}

function avaliarCondicao(dados: NoDados, lead: LeadMin): boolean {
  if (dados.condicao_campo === 'tem_telefone') return !!lead.telefone;
  if (dados.condicao_campo === 'origem') return (lead.origem ?? '').trim().toLowerCase() === (dados.condicao_valor ?? '').trim().toLowerCase();
  return false;
}

async function executarAcaoNo(supabase: SupabaseClient, dados: NoDados, lead: LeadMin): Promise<void> {
  switch (dados.acao_tipo) {
    case 'mover_funil': {
      if (!dados.acao_funil_destino_id) throw new Error('sem funil de destino configurado');
      const { error } = await supabase.from('leads').update({ status: dados.acao_funil_destino_id, atualizado_em: new Date().toISOString() }).eq('id', lead.id);
      if (error) throw new Error(error.message);
      return;
    }
    case 'registrar_nota': {
      const { error } = await supabase.from('lead_interacoes').insert({ lead_id: lead.id, tipo: 'nota', conteudo: dados.acao_texto || 'Automação disparada.' });
      if (error) throw new Error(error.message);
      return;
    }
    case 'criar_tarefa': {
      const dataAlvo = new Date();
      dataAlvo.setUTCDate(dataAlvo.getUTCDate() + (dados.acao_dias_prazo ?? 0));
      const { error } = await supabase.from('tarefas_agenda').insert({
        titulo: dados.acao_texto || 'Tarefa automática',
        data: dataAlvo.toISOString().slice(0, 10),
        horario: null,
        observacoes: 'Criada automaticamente por uma automação do CRM.',
        lead_id: lead.id,
      });
      if (error) throw new Error(error.message);
      return;
    }
    case 'enviar_whatsapp': {
      if (!lead.telefone) throw new Error(`lead "${lead.nome}" sem telefone cadastrado`);
      if (!dados.acao_whatsapp_template) throw new Error('sem template de WhatsApp configurado');
      const numero = normalizarTelefoneBR(lead.telefone);
      if (!numero) throw new Error(`telefone "${lead.telefone}" inválido`);
      const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
      const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
      if (!token || !phoneNumberId) throw new Error('WhatsApp não configurado (WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID)');
      const resposta = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: numero,
          type: 'template',
          template: {
            name: dados.acao_whatsapp_template,
            language: { code: 'pt_BR' },
            components: [{ type: 'body', parameters: [{ type: 'text', text: lead.nome }, { type: 'text', text: dados.acao_texto ?? '' }] }],
          },
        }),
      });
      if (!resposta.ok) throw new Error(await resposta.text());
      return;
    }
    default:
      throw new Error('nó de ação sem tipo configurado');
  }
}

const LIMITE_PASSOS = 200;

/** Mesmo motor de src/lib/api/automacoes.ts#avancarExecucao — ver
    comentário lá pro porquê do modelo (execução para num nó de espera,
    só um cron retoma). */
async function avancarExecucao(supabase: SupabaseClient, execucao: Execucao, fluxo: FluxoCompleto, lead: LeadMin): Promise<void> {
  const nosPorId = new Map(fluxo.nos.map((n) => [n.id, n]));

  for (let passos = 0; passos < LIMITE_PASSOS; passos++) {
    const no = execucao.no_atual_id ? nosPorId.get(execucao.no_atual_id) : undefined;
    if (!no) {
      await supabase.from('automacoes_execucoes').update({ no_atual_id: null, status: 'concluido', atualizado_em: new Date().toISOString() }).eq('id', execucao.id);
      return;
    }

    let handleNecessario: string | null = null;

    if (no.tipo === 'espera') {
      if (!execucao.aguardando_ate) {
        const alvo = new Date();
        alvo.setUTCDate(alvo.getUTCDate() + (no.dados.espera_dias ?? 1));
        execucao.aguardando_ate = alvo.toISOString();
        await supabase.from('automacoes_execucoes').update({ aguardando_ate: execucao.aguardando_ate, atualizado_em: new Date().toISOString() }).eq('id', execucao.id);
        return;
      }
      if (new Date(execucao.aguardando_ate) > new Date()) return;
      execucao.aguardando_ate = null;
    } else if (no.tipo === 'acao') {
      try {
        await executarAcaoNo(supabase, no.dados, lead);
      } catch (e) {
        await supabase
          .from('automacoes_execucoes')
          .update({ status: 'erro', erro_mensagem: e instanceof Error ? e.message : String(e), atualizado_em: new Date().toISOString() })
          .eq('id', execucao.id);
        return;
      }
    } else if (no.tipo === 'condicao') {
      handleNecessario = avaliarCondicao(no.dados, lead) ? 'sim' : 'nao';
    }

    const proxima = fluxo.conexoes.find((c) => c.origem_no_id === no.id && c.origem_handle === handleNecessario);
    execucao.no_atual_id = proxima ? proxima.destino_no_id : null;
    const status = execucao.no_atual_id ? 'ativo' : 'concluido';
    await supabase.from('automacoes_execucoes').update({ no_atual_id: execucao.no_atual_id, aguardando_ate: null, status, atualizado_em: new Date().toISOString() }).eq('id', execucao.id);
  }

  await supabase.from('automacoes_execucoes').update({ status: 'erro', erro_mensagem: 'fluxo excedeu o limite de passos (possível loop)', atualizado_em: new Date().toISOString() }).eq('id', execucao.id);
}

async function buscarFluxoCompleto(supabase: SupabaseClient, fluxoId: string): Promise<FluxoCompleto> {
  const { data: nos } = await supabase.from('automacoes_nos').select('id, fluxo_id, tipo, dados').eq('fluxo_id', fluxoId);
  const { data: conexoes } = await supabase.from('automacoes_conexoes').select('id, origem_no_id, destino_no_id, origem_handle').eq('fluxo_id', fluxoId);
  return { nos: (nos ?? []) as NoFluxo[], conexoes: (conexoes ?? []) as ConexaoFluxo[] };
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ erro: 'SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes.' }), { status: 500 });
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let retomadas = 0;
  let iniciadas = 0;
  const erros: string[] = [];
  const fluxosCache = new Map<string, FluxoCompleto>();
  async function fluxoDe(fluxoId: string): Promise<FluxoCompleto> {
    if (!fluxosCache.has(fluxoId)) fluxosCache.set(fluxoId, await buscarFluxoCompleto(supabase, fluxoId));
    return fluxosCache.get(fluxoId)!;
  }

  // -------------------- 1. Retoma execuções cuja espera passou --------------------
  const { data: pendentes, error: erroPendentes } = await supabase
    .from('automacoes_execucoes')
    .select('id, fluxo_id, lead_id, no_atual_id, aguardando_ate')
    .eq('status', 'ativo')
    .not('aguardando_ate', 'is', null)
    .lte('aguardando_ate', new Date().toISOString());
  if (erroPendentes) return new Response(JSON.stringify({ erro: erroPendentes.message }), { status: 500 });

  if (pendentes && pendentes.length > 0) {
    const leadIds = [...new Set(pendentes.map((p) => p.lead_id))];
    const { data: leads } = await supabase.from('leads').select('id, nome, telefone, status, origem, criado_em').in('id', leadIds);
    const leadsPorId = new Map(((leads ?? []) as LeadMin[]).map((l) => [l.id, l]));

    for (const p of pendentes) {
      const lead = leadsPorId.get(p.lead_id);
      if (!lead) continue;
      try {
        const fluxo = await fluxoDe(p.fluxo_id);
        await avancarExecucao(supabase, { id: p.id, no_atual_id: p.no_atual_id, aguardando_ate: p.aguardando_ate }, fluxo, lead);
        retomadas++;
      } catch (e) {
        erros.push(`retomada ${p.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // -------------------- 2. Inicia execuções novas de tempo_sem_contato --------------------
  // filtra `ativo` do lado de cá (não no `.eq` embutido do PostgREST) —
  // mais simples de confiar sem um banco real à mão pra testar a sintaxe
  // de filtro em recurso embutido.
  const { data: nosGatilho, error: erroNos } = await supabase.from('automacoes_nos').select('id, fluxo_id, dados, automacoes_fluxos!inner(ativo)').eq('tipo', 'gatilho');
  if (erroNos) return new Response(JSON.stringify({ erro: erroNos.message }), { status: 500 });

  type NoGatilhoComFluxo = { id: string; fluxo_id: string; dados: NoDados; automacoes_fluxos: { ativo: boolean } };
  const gatilhosTempo = ((nosGatilho ?? []) as unknown as NoGatilhoComFluxo[]).filter((n) => n.automacoes_fluxos?.ativo && n.dados.gatilho_tipo === 'tempo_sem_contato');

  if (gatilhosTempo.length > 0) {
    const { data: funis } = await supabase.from('funis_lead').select('id, papel');
    const funisEmNegociacao = new Set((funis ?? []).filter((f) => f.papel == null).map((f) => f.id));

    const { data: leads } = await supabase.from('leads').select('id, nome, telefone, status, origem, criado_em');
    const leadsAtivos = ((leads ?? []) as LeadMin[]).filter((l) => funisEmNegociacao.has(l.status));

    const leadIds = leadsAtivos.map((l) => l.id);
    const { data: interacoes } = leadIds.length > 0 ? await supabase.from('lead_interacoes').select('lead_id, criado_em').in('lead_id', leadIds) : { data: [] };
    const ultimoContatoPorLead = new Map<string, string>();
    for (const i of interacoes ?? []) {
      const atual = ultimoContatoPorLead.get(i.lead_id);
      if (!atual || i.criado_em > atual) ultimoContatoPorLead.set(i.lead_id, i.criado_em);
    }

    for (const no of gatilhosTempo) {
      const candidatos = leadsAtivos.filter((l) => !no.dados.gatilho_funil_id || l.status === no.dados.gatilho_funil_id);
      for (const lead of candidatos) {
        const ultimoContato = ultimoContatoPorLead.get(lead.id) ?? lead.criado_em;
        const dias = Math.floor((Date.now() - new Date(ultimoContato).getTime()) / 86_400_000);
        if (dias < (no.dados.gatilho_dias ?? 0)) continue;

        const { data: execucao, error: erroInsert } = await supabase
          .from('automacoes_execucoes')
          .insert({ fluxo_id: no.fluxo_id, lead_id: lead.id, no_atual_id: no.id, status: 'ativo' })
          .select('id, no_atual_id, aguardando_ate')
          .single();
        if (erroInsert) {
          if (erroInsert.code === '23505') continue; // já tem execução ativa desse fluxo pro lead
          erros.push(`início ${no.fluxo_id} → ${lead.nome}: ${erroInsert.message}`);
          continue;
        }
        try {
          const fluxo = await fluxoDe(no.fluxo_id);
          await avancarExecucao(supabase, execucao as Execucao, fluxo, lead);
          iniciadas++;
        } catch (e) {
          erros.push(`${no.fluxo_id} → ${lead.nome}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }
  }

  return new Response(JSON.stringify({ ok: true, retomadas, iniciadas, erros }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
