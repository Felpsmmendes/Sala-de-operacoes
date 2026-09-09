import { supabase } from '../supabase';
import type { CategoriaServico, OrcamentoCompleto, Servico } from '../types';

export type ItemOrcamentoEntrada = {
  servico_id: string;
  quantidade: number;
  /** Já inclui a hora adicional (base + horas_adicionais × valor_hora_adicional) — ver migration_014. */
  valor_unitario: number;
  horas_adicionais: number;
  valor_hora_adicional: number;
};

export type NovoOrcamento = {
  leadId: string;
  dataEvento: string | null;
  convidados: number | null;
  itens: ItemOrcamentoEntrada[];
  /** Frete escolhido (2026-09-09, ver migration_019) — null quando o
      orçamento não cobra frete separado. `valorFreteCobrado` (com
      margem) entra no valor_total; `valorFreteCusto` (sem margem) só é
      usado depois, quando este orçamento virar contrato. */
  regiaoFreteId: string | null;
  veiculoId: string | null;
  valorFreteCobrado: number;
  valorFreteCusto: number;
};

export async function listarOrcamentos(): Promise<OrcamentoCompleto[]> {
  const { data, error } = await supabase
    .from('orcamentos')
    .select('*, lead:leads(id,nome,telefone), itens:orcamento_itens(*, servico:servicos(*))')
    .order('criado_em', { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as OrcamentoCompleto[];
}

export async function criarOrcamento({ leadId, dataEvento, convidados, itens, regiaoFreteId, veiculoId, valorFreteCobrado, valorFreteCusto }: NovoOrcamento): Promise<OrcamentoCompleto> {
  const valorTotal = itens.reduce((soma, item) => soma + item.quantidade * item.valor_unitario, 0) + valorFreteCobrado;

  const { data: orcamento, error: erroOrcamento } = await supabase
    .from('orcamentos')
    .insert({
      lead_id: leadId,
      data_evento: dataEvento,
      convidados,
      valor_total: valorTotal,
      regiao_frete_id: regiaoFreteId,
      veiculo_id: veiculoId,
      valor_frete_cobrado: valorFreteCobrado,
      valor_frete_custo: valorFreteCusto,
    })
    .select()
    .single();
  if (erroOrcamento) throw new Error(erroOrcamento.message);

  const { error: erroItens } = await supabase.from('orcamento_itens').insert(
    itens.map((item) => ({
      orcamento_id: orcamento.id,
      servico_id: item.servico_id,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      horas_adicionais: item.horas_adicionais,
      valor_hora_adicional: item.valor_hora_adicional,
    }))
  );
  if (erroItens) throw new Error(erroItens.message);

  const [completo] = await listarOrcamentos().then((lista) => lista.filter((o) => o.id === orcamento.id));
  return completo;
}

/** Atualiza um orçamento salvo: dados gerais + reconstrói os itens do
    zero (apaga os antigos e insere os novos) — mais simples e seguro do
    que tentar casar item a item quando o serviço selecionado mudou. */
export async function atualizarOrcamento(id: string, { leadId, dataEvento, convidados, itens, regiaoFreteId, veiculoId, valorFreteCobrado, valorFreteCusto }: NovoOrcamento): Promise<OrcamentoCompleto> {
  const valorTotal = itens.reduce((soma, item) => soma + item.quantidade * item.valor_unitario, 0) + valorFreteCobrado;

  const { error: erroOrcamento } = await supabase
    .from('orcamentos')
    .update({
      lead_id: leadId,
      data_evento: dataEvento,
      convidados,
      valor_total: valorTotal,
      regiao_frete_id: regiaoFreteId,
      veiculo_id: veiculoId,
      valor_frete_cobrado: valorFreteCobrado,
      valor_frete_custo: valorFreteCusto,
    })
    .eq('id', id);
  if (erroOrcamento) throw new Error(erroOrcamento.message);

  const { error: erroExcluirItens } = await supabase.from('orcamento_itens').delete().eq('orcamento_id', id);
  if (erroExcluirItens) throw new Error(erroExcluirItens.message);

  const { error: erroItens } = await supabase.from('orcamento_itens').insert(
    itens.map((item) => ({
      orcamento_id: id,
      servico_id: item.servico_id,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      horas_adicionais: item.horas_adicionais,
      valor_hora_adicional: item.valor_hora_adicional,
    }))
  );
  if (erroItens) throw new Error(erroItens.message);

  const [completo] = await listarOrcamentos().then((lista) => lista.filter((o) => o.id === id));
  return completo;
}

export async function excluirOrcamento(id: string): Promise<void> {
  const { error } = await supabase.from('orcamentos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export type ItemParaHorario = { id: string; servico_id: string; nome: string; categoria: CategoriaServico; horario_inicio_atracao: string | null };

/** Itens do orçamento de origem de um contrato, só o necessário pra
    decidir quais campos de horário mostrar em Contratos (2026-09-09):
    se tem algum item 'bar' (mostra "início do bar", 1 campo só) e um
    campo de horário POR item 'atracao' (pode ter 2+). Contrato criado
    do zero (sem orçamento) nunca chama isso — não tem itens pra buscar. */
export async function listarItensParaHorario(orcamentoId: string): Promise<ItemParaHorario[]> {
  const { data, error } = await supabase.from('orcamento_itens').select('id, servico_id, horario_inicio_atracao, servico:servicos(nome, categoria)').eq('orcamento_id', orcamentoId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((i) => {
    const servico = i.servico as unknown as { nome: string; categoria: CategoriaServico } | null;
    return { id: i.id, servico_id: i.servico_id, nome: servico?.nome ?? '—', categoria: servico?.categoria ?? 'adicional', horario_inicio_atracao: i.horario_inicio_atracao };
  });
}

export async function atualizarHorarioAtracao(itemId: string, horario: string | null): Promise<void> {
  const { error } = await supabase.from('orcamento_itens').update({ horario_inicio_atracao: horario }).eq('id', itemId);
  if (error) throw new Error(error.message);
}

/** IDs de orçamento que têm pelo menos um item com hora adicional marcada
    (pedido do usuário, 2026-09-09) — usado em Equipe do Evento pra avisar
    "Evento tem horas adicionais" no card, só informativo por enquanto
    (não calcula nem sugere valor extra pro freelancer). Uma query só pra
    todos os eventos, evita N+1. */
export async function listarOrcamentoIdsComHoraAdicional(): Promise<Set<string>> {
  const { data, error } = await supabase.from('orcamento_itens').select('orcamento_id').gt('horas_adicionais', 0);
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((i) => i.orcamento_id));
}

/** Calcula o valor de um serviço pro orçamento: por convidado (com mínimo de
    100 pax, mesma regra do painel antigo) ou valor fixo. */
export function calcularValorServico(servico: Servico, convidados: number | null): number {
  if (servico.valor_por_convidado != null) {
    return servico.valor_por_convidado * Math.max(convidados ?? 0, 100);
  }
  return servico.valor_base;
}

/** Quanto vale 1 hora adicional deste item (pedido do usuário, 2026-09-09):
    - Bar: duração padrão 5h — hora extra = valor final do item (já com
      convidados aplicado) ÷ 5.
    - Atração fotográfica: duração padrão 4h — hora extra = valor_base da
      atração ÷ 4 (não usa convidados — atrações não têm valor_por_convidado).
    - Qualquer outra categoria (ex.: "adicional"): sem conceito de hora
      extra, retorna 0. */
export function calcularValorHoraAdicional(servico: Servico, valorItemFinal: number): number {
  if (servico.categoria === 'bar') return valorItemFinal / 5;
  if (servico.categoria === 'atracao') return servico.valor_base / 4;
  return 0;
}
