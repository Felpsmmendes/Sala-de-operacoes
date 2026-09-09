import { supabase } from '../supabase';
import { sincronizarLancamento } from './financeiro';
import type { ChecklistExtraItem } from '../types';

export type CategoriaEstoque = 'bebida' | 'insumo' | 'gelo' | 'descartavel' | 'outro';
export type TipoMovimento = 'entrada' | 'saida' | 'avaria' | 'reintegracao';
export type StatusCompra = 'pendente' | 'recebido' | 'cancelado';

export type ItemEstoque = {
  id: string;
  nome: string;
  categoria: CategoriaEstoque;
  unidade: string;
  estoque_atual: number;
  estoque_minimo: number;
  consumo_por_pax: number | null;
  atualizado_em: string;
};

export type NovoItemEstoque = Omit<ItemEstoque, 'id' | 'atualizado_em'>;

export type MovimentoEstoque = {
  id: string;
  item_id: string;
  tipo: TipoMovimento;
  quantidade: number;
  evento_id: string | null;
  observacao: string | null;
  criado_em: string;
};

export type MovimentoComItem = MovimentoEstoque & { item: Pick<ItemEstoque, 'id' | 'nome' | 'unidade'> | null };

export type Compra = {
  id: string;
  item_id: string;
  quantidade: number;
  valor_total: number;
  status: StatusCompra;
  criado_em: string;
  /** Previsão de chegada (2026-09-09) — alimenta a seção "Compras
      chegando" da Logística. Opcional: nem toda compra tem ETA na hora
      em que é gerada. */
  data_chegada_prevista: string | null;
};

export type CompraComItem = Compra & { item: Pick<ItemEstoque, 'id' | 'nome' | 'unidade'> | null };

export async function listarItens(): Promise<ItemEstoque[]> {
  const { data, error } = await supabase.from('estoque_itens').select('*').order('categoria').order('nome');
  if (error) throw new Error(error.message);
  return data as ItemEstoque[];
}

export async function criarItem(dados: NovoItemEstoque): Promise<ItemEstoque> {
  const { data, error } = await supabase.from('estoque_itens').insert(dados).select().single();
  if (error) throw new Error(error.message);
  return data as ItemEstoque;
}

export async function excluirItem(id: string): Promise<void> {
  const { error } = await supabase.from('estoque_itens').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Registra um movimento e já ajusta `estoque_atual` do item (entrada/
    reintegração somam, saída/avaria subtraem) via RPC
    `estoque_registrar_movimento` (`supabase/migration_009_estoque_atomico.sql`)
    — leitura e escrita do saldo viram uma única instrução SQL
    (`estoque_atual = estoque_atual + delta`) dentro da função, então duas
    chamadas concorrentes no mesmo item nunca se sobrescrevem (o Postgres
    resolve com lock de linha normal, sem round-trip nenhum do cliente). */
export async function registrarMovimento(dados: { itemId: string; tipo: TipoMovimento; quantidade: number; eventoId?: string | null; observacao?: string | null }): Promise<void> {
  const { error } = await supabase.rpc('estoque_registrar_movimento', {
    p_item_id: dados.itemId,
    p_tipo: dados.tipo,
    p_quantidade: dados.quantidade,
    p_evento_id: dados.eventoId ?? null,
    p_observacao: dados.observacao ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function listarMovimentos(tipo?: TipoMovimento): Promise<MovimentoComItem[]> {
  let query = supabase.from('estoque_movimentos').select('*, item:estoque_itens(id,nome,unidade)').order('criado_em', { ascending: false }).limit(50);
  if (tipo) query = query.eq('tipo', tipo);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as unknown as MovimentoComItem[];
}

export async function listarCompras(): Promise<CompraComItem[]> {
  const { data, error } = await supabase.from('compras').select('*, item:estoque_itens(id,nome,unidade)').order('criado_em', { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as CompraComItem[];
}

export async function criarCompra(dados: { itemId: string; quantidade: number; valorTotal: number; dataChegadaPrevista?: string | null }): Promise<void> {
  const { error } = await supabase
    .from('compras')
    .insert({ item_id: dados.itemId, quantidade: dados.quantidade, valor_total: dados.valorTotal, data_chegada_prevista: dados.dataChegadaPrevista ?? null });
  if (error) throw new Error(error.message);
}

/** Define/edita a previsão de chegada de uma compra já criada — a
    Logística usa isso quando o ETA só é conhecido depois (ex.: o
    fornecedor confirma o prazo por telefone). */
export async function definirDataChegadaCompra(id: string, data: string | null): Promise<void> {
  const { error } = await supabase.from('compras').update({ data_chegada_prevista: data }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Marca a compra como recebida, já lança a entrada correspondente no
    estoque, E gera a despesa em Finanças (o dinheiro sai quando a compra
    chega, não quando ela é só criada como pendente) — ponte automática
    da revisão de coerência geral, mesma lógica do sinal/saldo de
    contrato: nunca duplica, procura pelo prefixo antes de criar. */
export async function receberCompra(compra: Compra): Promise<void> {
  await registrarMovimento({ itemId: compra.item_id, tipo: 'entrada', quantidade: compra.quantidade, observacao: 'Recebimento de compra' });
  const { error } = await supabase.from('compras').update({ status: 'recebido' }).eq('id', compra.id);
  if (error) throw new Error(error.message);

  const { data: item } = await supabase.from('estoque_itens').select('nome').eq('id', compra.item_id).maybeSingle();
  await sincronizarLancamento({
    eventoId: null,
    prefixo: `Compra estoque #${compra.id}`,
    descricao: `Compra estoque #${compra.id} — ${item?.nome ?? 'item'} (${compra.quantidade})`,
    valor: compra.valor_total,
    tipo: 'despesa',
    status: 'pago',
    ativar: true,
  });
}

export async function cancelarCompra(id: string): Promise<void> {
  const { error } = await supabase.from('compras').update({ status: 'cancelado' }).eq('id', id);
  if (error) throw new Error(error.message);
}

/* -------------------- Ligação Estoque ⇄ Logística -------------------- */

/** Descrições distintas do checklist padrão de carga que ainda não têm
    item real do estoque vinculado — pra o gestor ligar aos poucos, sem a
    gente fabricar um catálogo automático a partir de texto bagunçado
    (ver nota na migration_005). */
export async function listarDescricoesChecklistNaoVinculadas(): Promise<string[]> {
  const { data, error } = await supabase.from('checklist_padrao_itens').select('descricao').is('estoque_item_id', null);
  if (error) throw new Error(error.message);
  return [...new Set((data ?? []).map((r) => r.descricao))].sort((a, b) => a.localeCompare(b));
}

/** Vincula TODAS as linhas do checklist com essa descrição (ela se repete
    entre Black/Premium/Intermediário etc.) ao item real do estoque de
    uma vez. */
export async function vincularDescricaoAoEstoque(descricao: string, estoqueItemId: string): Promise<void> {
  const { error } = await supabase.from('checklist_padrao_itens').update({ estoque_item_id: estoqueItemId }).eq('descricao', descricao).is('estoque_item_id', null);
  if (error) throw new Error(error.message);
}

/* -------------------- Checklist de carga por contrato (2026-09-09) --------------------
   Reaproveita a mesma lógica que existia na Logística antes de o
   romaneio ser removido: contrato → orçamento → serviços → checklist
   padrão filtrado por faixa de convidados. Nunca persistido — é sempre
   recalculado (o padrão pode mudar, e não tem "fase" pra rastrear mais). */

export type ItemChecklistPadrao = { descricao: string; quantidade: number; unidade: string | null };

export async function buscarChecklistPadrao(orcamentoId: string | null, convidados: number | null): Promise<ItemChecklistPadrao[]> {
  if (!orcamentoId) return [];
  const { data: itensOrcamento, error: erroItens } = await supabase.from('orcamento_itens').select('servico_id').eq('orcamento_id', orcamentoId);
  if (erroItens) throw new Error(erroItens.message);
  const servicoIds = [...new Set((itensOrcamento ?? []).map((i) => i.servico_id))];
  if (servicoIds.length === 0) return [];

  const cv = convidados ?? 0;
  const { data: checklist, error: erroChecklist } = await supabase.from('checklist_padrao_itens').select('*').in('servico_id', servicoIds);
  if (erroChecklist) throw new Error(erroChecklist.message);

  return (checklist ?? [])
    .filter((c) => (c.convidados_min == null || cv >= c.convidados_min) && (c.convidados_max == null || cv <= c.convidados_max))
    .map((c) => ({ descricao: c.descricao, quantidade: c.quantidade, unidade: c.unidade }));
}

export async function listarChecklistExtra(contratoId: string): Promise<ChecklistExtraItem[]> {
  const { data, error } = await supabase.from('contrato_checklist_extra').select('*').eq('contrato_id', contratoId).order('criado_em');
  if (error) throw new Error(error.message);
  return data as ChecklistExtraItem[];
}

/** Sincroniza os itens extras do checklist a partir de
    `contratos.observacoes_brindes` (pedido do usuário, "Etapa 7"): cada
    linha não-vazia vira uma linha em `contrato_checklist_extra`, quantidade
    1 por padrão. Chamado toda vez que o contrato é salvo (`atualizarContrato`)
    E toda vez que o checklist é aberto em Estoque (rede de segurança pra
    contratos cujas observações já existiam antes desta sincronização
    existir). Descrição já cadastrada MANTÉM a quantidade editada — só
    entra com 1 se for linha nova; linha removida do texto é apagada daqui. */
export async function sincronizarChecklistExtraDoContrato(contratoId: string, observacoesBrindes: string | null): Promise<void> {
  const linhas = [...new Set((observacoesBrindes ?? '').split('\n').map((l) => l.trim()).filter(Boolean))];

  const { data: existentes, error: erroExistentes } = await supabase.from('contrato_checklist_extra').select('id, descricao').eq('contrato_id', contratoId);
  if (erroExistentes) throw new Error(erroExistentes.message);

  const descricoesExistentes = new Set((existentes ?? []).map((e) => e.descricao));
  const novas = linhas.filter((l) => !descricoesExistentes.has(l));
  const remover = (existentes ?? []).filter((e) => !linhas.includes(e.descricao));

  if (novas.length > 0) {
    const { error } = await supabase.from('contrato_checklist_extra').insert(novas.map((descricao) => ({ contrato_id: contratoId, descricao })));
    if (error) throw new Error(error.message);
  }
  if (remover.length > 0) {
    const { error } = await supabase
      .from('contrato_checklist_extra')
      .delete()
      .in('id', remover.map((r) => r.id));
    if (error) throw new Error(error.message);
  }
}

export async function atualizarQuantidadeChecklistExtra(id: string, quantidade: number): Promise<void> {
  const { error } = await supabase.from('contrato_checklist_extra').update({ quantidade }).eq('id', id);
  if (error) throw new Error(error.message);
}
