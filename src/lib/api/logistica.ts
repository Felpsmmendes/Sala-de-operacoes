import { supabase } from '../supabase';
import { calcularFrete, type EntradaFrete } from '../freteConfig';
import { registrarMovimento } from './estoque';
import { sincronizarLancamento } from './financeiro';
import type { EventoComLead, FaseRomaneio, RomaneioComVeiculo, RomaneioItem } from '../types';

export async function listarRomaneios(): Promise<RomaneioComVeiculo[]> {
  const { data, error } = await supabase.from('romaneios').select('*, veiculo:veiculos(*)').order('atualizado_em', { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as RomaneioComVeiculo[];
}

/** Vários romaneios de uma vez (por evento) — usado pelo Dashboard pra não
    fazer 1 query por evento ao vivo. */
export async function listarRomaneiosPorEventos(eventoIds: string[]): Promise<RomaneioComVeiculo[]> {
  if (eventoIds.length === 0) return [];
  const { data, error } = await supabase.from('romaneios').select('*, veiculo:veiculos(*)').in('evento_id', eventoIds);
  if (error) throw new Error(error.message);
  return data as unknown as RomaneioComVeiculo[];
}

export async function obterRomaneioDoEvento(eventoId: string): Promise<RomaneioComVeiculo | null> {
  const { data, error } = await supabase.from('romaneios').select('*, veiculo:veiculos(*)').eq('evento_id', eventoId).maybeSingle();
  if (error) throw new Error(error.message);
  return data as unknown as RomaneioComVeiculo | null;
}

export async function listarItensRomaneio(romaneioId: string): Promise<RomaneioItem[]> {
  const { data, error } = await supabase.from('romaneio_itens').select('*').eq('romaneio_id', romaneioId).order('descricao');
  if (error) throw new Error(error.message);
  return data as RomaneioItem[];
}

/**
 * Busca no checklist padrão (dado real migrado das planilhas da empresa) os
 * itens de carga sugeridos pro evento: olha os serviços (bar/atração) do
 * orçamento que originou o contrato do evento + o número de convidados, e
 * traz os itens cuja faixa de convidados bate.
 * Retorna [] se o contrato não veio de um orçamento (criado manualmente) —
 * nesse caso não há como saber qual bar foi contratado.
 */
export type ItemSugerido = { descricao: string; quantidade: number; estoqueItemId: string | null };

export async function buscarItensSugeridos(evento: EventoComLead): Promise<ItemSugerido[]> {
  const orcamentoId = evento.contrato?.orcamento_id;
  if (!orcamentoId) return [];

  const { data: itensOrcamento, error: erroItens } = await supabase.from('orcamento_itens').select('servico_id').eq('orcamento_id', orcamentoId);
  if (erroItens) throw new Error(erroItens.message);
  const servicoIds = [...new Set((itensOrcamento ?? []).map((i) => i.servico_id))];
  if (servicoIds.length === 0) return [];

  const convidados = evento.convidados ?? 0;
  const { data: checklist, error: erroChecklist } = await supabase.from('checklist_padrao_itens').select('*').in('servico_id', servicoIds);
  if (erroChecklist) throw new Error(erroChecklist.message);

  return (checklist ?? [])
    .filter((c) => (c.convidados_min == null || convidados >= c.convidados_min) && (c.convidados_max == null || convidados <= c.convidados_max))
    .map((c) => ({ descricao: c.descricao, quantidade: c.quantidade, estoqueItemId: c.estoque_item_id ?? null }));
}

export async function criarRomaneio(eventoId: string, veiculoId: string, itensSugeridos: ItemSugerido[]): Promise<RomaneioComVeiculo> {
  const { data, error } = await supabase.from('romaneios').insert({ evento_id: eventoId, veiculo_id: veiculoId }).select('*, veiculo:veiculos(*)').single();
  if (error) throw new Error(error.message);

  if (itensSugeridos.length > 0) {
    const { error: erroItens } = await supabase
      .from('romaneio_itens')
      .insert(itensSugeridos.map((i) => ({ romaneio_id: data.id, descricao: i.descricao, quantidade: i.quantidade, estoque_item_id: i.estoqueItemId })));
    if (erroItens) throw new Error(erroItens.message);
  }

  return data as unknown as RomaneioComVeiculo;
}

export async function marcarFaseItem(itemId: string, fase: FaseRomaneio): Promise<void> {
  const { error } = await supabase.from('romaneio_itens').update({ fase_conferida: fase }).eq('id', itemId);
  if (error) throw new Error(error.message);
}

/** Avança a fase do romaneio e, na primeira vez que ele chega em
    "embarcado", debita de verdade o estoque dos itens que já estão
    vinculados a um item real (`estoque_item_id`) — itens do checklist
    ainda não vinculados simplesmente não afetam o estoque (sem inventar
    baixa de algo que não sabemos qual item real é). `estoque_baixado`
    garante que isso só acontece uma vez por romaneio. */
export async function avancarFaseRomaneio(romaneioId: string, fase: FaseRomaneio): Promise<void> {
  const { data: romaneioAtual, error: erroAtual } = await supabase.from('romaneios').select('evento_id, estoque_baixado').eq('id', romaneioId).single();
  if (erroAtual) throw new Error(erroAtual.message);

  const { error } = await supabase.from('romaneios').update({ fase, atualizado_em: new Date().toISOString() }).eq('id', romaneioId);
  if (error) throw new Error(error.message);

  if (fase === 'embarcado' && !romaneioAtual.estoque_baixado) {
    const { data: itens, error: erroItens } = await supabase.from('romaneio_itens').select('estoque_item_id, quantidade').eq('romaneio_id', romaneioId).not('estoque_item_id', 'is', null);
    if (erroItens) throw new Error(erroItens.message);

    for (const item of itens ?? []) {
      if (!item.estoque_item_id) continue;
      await registrarMovimento({
        itemId: item.estoque_item_id,
        tipo: 'saida',
        quantidade: item.quantidade,
        eventoId: romaneioAtual.evento_id,
        observacao: 'Embarque de romaneio',
      });
    }

    const { error: erroFlag } = await supabase.from('romaneios').update({ estoque_baixado: true }).eq('id', romaneioId);
    if (erroFlag) throw new Error(erroFlag.message);
  }
}

export type AtualizarFreteEntrada = EntradaFrete & { romaneioId: string; veiculoTipo: EntradaFrete['tipoVeiculo'] };

/** Recalcula o frete com a fórmula real (ver src/lib/freteConfig.ts) e
    grava o resultado — combustível calculado é guardado à parte, só como
    informação, o valor final gravado é o que já inclui margem/mínimo.
    Também sincroniza a despesa de frete em Finanças (pendente — o
    desembolso normalmente só acontece perto do evento, o gestor marca
    como pago quando de fato pagar). Recalcular de novo só atualiza o
    valor do mesmo lançamento, nunca duplica. */
export async function atualizarFrete(dados: AtualizarFreteEntrada): Promise<void> {
  const resultado = calcularFrete(dados);
  const { data: romaneio, error } = await supabase
    .from('romaneios')
    .update({
      km_ida_volta: dados.kmIdaVolta,
      pedagios: dados.pedagios,
      combustivel_valor: resultado.custoCombustivel,
      qtd_barmen_carro: dados.qtdBarmenCarro,
      pedagios_barmen: dados.pedagiosBarmen,
      valor_lalamove: dados.valorLalamove,
      valor_frete: resultado.valorFrete,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', dados.romaneioId)
    .select('evento_id, veiculo:veiculos(nome)')
    .single();
  if (error) throw new Error(error.message);

  await sincronizarLancamento({
    eventoId: romaneio.evento_id,
    prefixo: 'Frete',
    descricao: `Frete — ${(romaneio as unknown as { veiculo: { nome: string } | null }).veiculo?.nome ?? 'veículo'}`,
    valor: resultado.valorFrete,
    tipo: 'despesa',
    status: 'pendente',
    ativar: true,
  });
}

/** Exclui o romaneio e remove a despesa de frete correspondente (o
    compromisso deixou de existir) — o estoque já debitado (se o romaneio
    chegou a embarcar) NÃO é revertido automaticamente, já que não dá pra
    saber se a carga já saiu de verdade ou não; ajuste manual em Estoque
    se for o caso. */
export async function excluirRomaneio(id: string): Promise<void> {
  const { data: romaneio } = await supabase.from('romaneios').select('evento_id').eq('id', id).maybeSingle();
  const { error } = await supabase.from('romaneios').delete().eq('id', id);
  if (error) throw new Error(error.message);

  if (romaneio) {
    await sincronizarLancamento({ eventoId: romaneio.evento_id, prefixo: 'Frete', descricao: '', valor: 0, tipo: 'despesa', status: 'pendente', ativar: false });
  }
}
