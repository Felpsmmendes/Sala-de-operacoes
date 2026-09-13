import { supabase } from '../supabase';
import { atualizarLead, registrarInteracao } from './leads';
import { criarTarefa } from './tarefasAgenda';
import type { ConexaoFluxo, FluxoAutomacao, FluxoCompleto, GatilhoAutomacao, Lead, NoDados, NoFluxo } from '../types';

// -------------------- CRUD de fluxos --------------------

export async function listarFluxos(): Promise<FluxoAutomacao[]> {
  const { data, error } = await supabase.from('automacoes_fluxos').select('*').order('criado_em', { ascending: false });
  if (error) throw new Error(error.message);
  return data as FluxoAutomacao[];
}

export async function buscarFluxoCompleto(id: string): Promise<FluxoCompleto> {
  const [{ data: fluxo, error: e1 }, { data: nos, error: e2 }, { data: conexoes, error: e3 }] = await Promise.all([
    supabase.from('automacoes_fluxos').select('*').eq('id', id).single(),
    supabase.from('automacoes_nos').select('*').eq('fluxo_id', id),
    supabase.from('automacoes_conexoes').select('*').eq('fluxo_id', id),
  ]);
  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);
  if (e3) throw new Error(e3.message);
  return { ...(fluxo as FluxoAutomacao), nos: (nos ?? []) as NoFluxo[], conexoes: (conexoes ?? []) as ConexaoFluxo[] };
}

/** Cria o fluxo já com o nó de gatilho inicial — o canvas nunca começa
    vazio, sempre com a entrada pronta pro gestor configurar. */
export async function criarFluxo(nome: string): Promise<FluxoAutomacao> {
  const { data: fluxo, error } = await supabase.from('automacoes_fluxos').insert({ nome }).select().single();
  if (error) throw new Error(error.message);
  const dadosGatilho: NoDados = { gatilho_tipo: 'lead_criado' };
  const { error: e2 } = await supabase.from('automacoes_nos').insert({ fluxo_id: fluxo.id, tipo: 'gatilho', pos_x: 60, pos_y: 160, dados: dadosGatilho });
  if (e2) throw new Error(e2.message);
  return fluxo as FluxoAutomacao;
}

export async function renomearFluxo(id: string, nome: string): Promise<void> {
  const { error } = await supabase.from('automacoes_fluxos').update({ nome }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function atualizarAtivoFluxo(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.from('automacoes_fluxos').update({ ativo }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function excluirFluxo(id: string): Promise<void> {
  const { error } = await supabase.from('automacoes_fluxos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Salva o grafo inteiro (nós + conexões) de uma vez — substitui tudo que
    existia. Mais simples que diff incremental e o volume por fluxo é
    pequeno (dezenas de nós no máximo). Se uma execução estava PARADA num
    nó que sumiu nessa edição, ela fica órfã (no_atual_id vira null por
    causa do `on delete set null`) e é tratada como concluída da próxima
    vez que o avanço rodar — é o comportamento razoável pra "o gestor
    editou o fluxo enquanto alguém já estava no meio dele". */
export async function salvarGrafo(fluxoId: string, nos: NoFluxo[], conexoes: ConexaoFluxo[]): Promise<void> {
  const { error: e1 } = await supabase.from('automacoes_conexoes').delete().eq('fluxo_id', fluxoId);
  if (e1) throw new Error(e1.message);
  const { error: e2 } = await supabase.from('automacoes_nos').delete().eq('fluxo_id', fluxoId);
  if (e2) throw new Error(e2.message);
  if (nos.length > 0) {
    const { error: e3 } = await supabase
      .from('automacoes_nos')
      .insert(nos.map((n) => ({ id: n.id, fluxo_id: fluxoId, tipo: n.tipo, pos_x: n.pos_x, pos_y: n.pos_y, dados: n.dados })));
    if (e3) throw new Error(e3.message);
  }
  if (conexoes.length > 0) {
    const { error: e4 } = await supabase
      .from('automacoes_conexoes')
      .insert(conexoes.map((c) => ({ id: c.id, fluxo_id: fluxoId, origem_no_id: c.origem_no_id, destino_no_id: c.destino_no_id, origem_handle: c.origem_handle })));
    if (e4) throw new Error(e4.message);
  }
}

// -------------------- Motor de execução --------------------
// Uma automação não roda "na hora" só porque tem uma ação — o fluxo pode
// ter nós de espera no meio, então uma execução é um estado persistido
// (`automacoes_execucoes`) que anda pelo grafo até: (a) chegar numa
// ponta sem conexão de saída → concluído; (b) cair num erro → erro,
// registrado mas não trava as outras execuções; (c) cair num nó de
// espera → PARA aqui, e só um cron (Edge Function
// aplicar-automacoes-tempo, que reimplementa esta mesma lógica em Deno —
// ver comentário lá) consegue retomar quando `aguardando_ate` passar.

type ExecucaoEmAndamento = { id: string; no_atual_id: string | null; aguardando_ate: string | null; status: string };

function avaliarCondicao(dados: NoDados, lead: Lead): boolean {
  if (dados.condicao_campo === 'tem_telefone') return !!lead.telefone;
  if (dados.condicao_campo === 'origem') {
    return (lead.origem ?? '').trim().toLowerCase() === (dados.condicao_valor ?? '').trim().toLowerCase();
  }
  return false;
}

/** Executa a ação de UM nó sobre UM lead. Erro aqui não deve travar quem
    chama em lote (ver aplicarAutomacoesEvento) — o motor marca a
    execução como "erro" e segue pras outras execuções pendentes. */
async function executarAcaoNo(dados: NoDados, lead: Lead): Promise<void> {
  switch (dados.acao_tipo) {
    case 'mover_funil':
      if (!dados.acao_funil_destino_id) throw new Error('Nó de ação sem funil de destino configurado.');
      await atualizarLead(lead.id, { status: dados.acao_funil_destino_id });
      return;
    case 'registrar_nota':
      await registrarInteracao(lead.id, 'nota', dados.acao_texto || 'Automação disparada.');
      return;
    case 'criar_tarefa': {
      const dataAlvo = new Date();
      dataAlvo.setDate(dataAlvo.getDate() + (dados.acao_dias_prazo ?? 0));
      await criarTarefa({
        titulo: dados.acao_texto || 'Tarefa automática',
        data: dataAlvo.toISOString().slice(0, 10),
        horario: null,
        observacoes: 'Criada automaticamente por uma automação do CRM.',
        leadId: lead.id,
      });
      return;
    }
    case 'enviar_whatsapp': {
      if (!lead.telefone) throw new Error(`Lead "${lead.nome}" não tem telefone cadastrado.`);
      if (!dados.acao_whatsapp_template) throw new Error('Nó de ação sem template de WhatsApp configurado.');
      const { data, error } = await supabase.functions.invoke('enviar-whatsapp', {
        body: { telefone: lead.telefone, template: dados.acao_whatsapp_template, parametros: [lead.nome, dados.acao_texto ?? ''] },
      });
      if (error) throw error;
      if (data?.erro) throw new Error(typeof data.erro === 'string' ? data.erro : JSON.stringify(data.erro));
      return;
    }
    default:
      throw new Error('Nó de ação sem tipo configurado.');
  }
}

async function salvarPasso(execucao: ExecucaoEmAndamento): Promise<void> {
  execucao.status = execucao.no_atual_id ? 'ativo' : 'concluido';
  const { error } = await supabase
    .from('automacoes_execucoes')
    .update({ no_atual_id: execucao.no_atual_id, aguardando_ate: execucao.aguardando_ate, status: execucao.status, atualizado_em: new Date().toISOString() })
    .eq('id', execucao.id);
  if (error) throw new Error(error.message);
}

async function marcarErro(execucao: ExecucaoEmAndamento, motivo: string): Promise<void> {
  execucao.status = 'erro';
  await supabase.from('automacoes_execucoes').update({ status: 'erro', erro_mensagem: motivo, atualizado_em: new Date().toISOString() }).eq('id', execucao.id);
}

const LIMITE_PASSOS = 200; // proteção contra loop desenhado por engano no canvas

/** Anda pelo grafo a partir de `execucao.no_atual_id` até parar (fim do
    fluxo, erro, ou nó de espera). Muta `execucao` conforme avança. */
export async function avancarExecucao(execucao: ExecucaoEmAndamento, fluxo: FluxoCompleto, lead: Lead): Promise<void> {
  const nosPorId = new Map(fluxo.nos.map((n) => [n.id, n]));

  for (let passos = 0; passos < LIMITE_PASSOS; passos++) {
    const no = execucao.no_atual_id ? nosPorId.get(execucao.no_atual_id) : undefined;
    if (!no) {
      execucao.no_atual_id = null;
      await salvarPasso(execucao);
      return;
    }

    let handleNecessario: 'sim' | 'nao' | null = null;

    if (no.tipo === 'espera') {
      if (!execucao.aguardando_ate) {
        const alvo = new Date();
        alvo.setDate(alvo.getDate() + (no.dados.espera_dias ?? 1));
        execucao.aguardando_ate = alvo.toISOString();
        await salvarPasso(execucao);
        return; // pausa aqui — só o cron retoma
      }
      if (new Date(execucao.aguardando_ate) > new Date()) return; // ainda esperando, nada a fazer agora
      execucao.aguardando_ate = null; // esperou o suficiente, segue o fluxo
    } else if (no.tipo === 'acao') {
      try {
        await executarAcaoNo(no.dados, lead);
      } catch (e) {
        await marcarErro(execucao, e instanceof Error ? e.message : String(e));
        return;
      }
    } else if (no.tipo === 'condicao') {
      handleNecessario = avaliarCondicao(no.dados, lead) ? 'sim' : 'nao';
    }
    // gatilho: não faz nada sozinho, só segue pra próxima conexão.

    const proxima = fluxo.conexoes.find((c) => c.origem_no_id === no.id && c.origem_handle === handleNecessario);
    execucao.no_atual_id = proxima ? proxima.destino_no_id : null;
    await salvarPasso(execucao);
  }

  await marcarErro(execucao, 'Fluxo excedeu o limite de passos — provável loop no desenho do canvas.');
}

async function iniciarExecucao(fluxoId: string, gatilhoNoId: string, leadId: string): Promise<ExecucaoEmAndamento | null> {
  const { data, error } = await supabase
    .from('automacoes_execucoes')
    .insert({ fluxo_id: fluxoId, lead_id: leadId, no_atual_id: gatilhoNoId, status: 'ativo' })
    .select('id, no_atual_id, aguardando_ate, status')
    .single();
  if (error) {
    if (error.code === '23505') return null; // já existe execução ativa desse fluxo pro lead
    throw new Error(error.message);
  }
  return data as ExecucaoEmAndamento;
}

export type ResultadoAutomacoes = { aplicadas: string[]; falhas: { nome: string; motivo: string }[] };

/** Dispara os fluxos ATIVOS cujo nó de gatilho combina com um evento
    instantâneo (lead_criado ou mudança de funil) — chamado direto de
    Crm.tsx, logo depois da ação que já gera o evento (criar lead / mover
    card no Pipeline). `tempo_sem_contato` não passa por aqui — não tem
    "evento", é checado 1x/dia pelo cron (aplicar-automacoes-tempo).
    Nunca bloqueia a ação principal por um fluxo falhar — roda os outros
    e devolve o que deu certo/errado pra quem chama decidir como avisar
    o gestor. */
export async function aplicarAutomacoesEvento(
  gatilho: Extract<GatilhoAutomacao, 'lead_criado' | 'mudanca_funil'>,
  lead: Lead,
  contexto: { funilNovoId?: string } = {}
): Promise<ResultadoAutomacoes> {
  const { data, error } = await supabase.from('automacoes_nos').select('id, dados, automacoes_fluxos!inner(id, nome, ativo)').eq('tipo', 'gatilho');
  if (error) throw new Error(error.message);

  type NoGatilhoComFluxo = { id: string; dados: NoDados; automacoes_fluxos: { id: string; nome: string; ativo: boolean } };
  const candidatos = ((data ?? []) as unknown as NoGatilhoComFluxo[]).filter((n) => {
    if (!n.automacoes_fluxos?.ativo) return false;
    if (n.dados.gatilho_tipo !== gatilho) return false;
    if (gatilho === 'mudanca_funil') return n.dados.gatilho_funil_id === contexto.funilNovoId;
    return !n.dados.gatilho_origem || n.dados.gatilho_origem.trim().toLowerCase() === (lead.origem ?? '').trim().toLowerCase();
  });

  const resultado: ResultadoAutomacoes = { aplicadas: [], falhas: [] };
  for (const no of candidatos) {
    const fluxo = no.automacoes_fluxos;
    try {
      const execucao = await iniciarExecucao(fluxo.id, no.id, lead.id);
      if (!execucao) continue; // já tinha uma execução ativa desse fluxo pro lead
      const fluxoCompleto = await buscarFluxoCompleto(fluxo.id);
      await avancarExecucao(execucao, fluxoCompleto, lead);
      resultado.aplicadas.push(fluxo.nome);
    } catch (e) {
      resultado.falhas.push({ nome: fluxo.nome, motivo: e instanceof Error ? e.message : String(e) });
    }
  }
  return resultado;
}
