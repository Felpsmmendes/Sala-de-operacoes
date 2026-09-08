import { supabase } from '../supabase';
import type { OrcamentoCompleto, Servico } from '../types';

export type ItemOrcamentoEntrada = { servico_id: string; quantidade: number; valor_unitario: number };

export type NovoOrcamento = {
  leadId: string;
  dataEvento: string | null;
  convidados: number | null;
  itens: ItemOrcamentoEntrada[];
};

export async function listarOrcamentos(): Promise<OrcamentoCompleto[]> {
  const { data, error } = await supabase
    .from('orcamentos')
    .select('*, lead:leads(id,nome,telefone), itens:orcamento_itens(*, servico:servicos(*))')
    .order('criado_em', { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as OrcamentoCompleto[];
}

export async function criarOrcamento({ leadId, dataEvento, convidados, itens }: NovoOrcamento): Promise<OrcamentoCompleto> {
  const valorTotal = itens.reduce((soma, item) => soma + item.quantidade * item.valor_unitario, 0);

  const { data: orcamento, error: erroOrcamento } = await supabase
    .from('orcamentos')
    .insert({ lead_id: leadId, data_evento: dataEvento, convidados, valor_total: valorTotal })
    .select()
    .single();
  if (erroOrcamento) throw new Error(erroOrcamento.message);

  const { error: erroItens } = await supabase.from('orcamento_itens').insert(
    itens.map((item) => ({
      orcamento_id: orcamento.id,
      servico_id: item.servico_id,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
    }))
  );
  if (erroItens) throw new Error(erroItens.message);

  const [completo] = await listarOrcamentos().then((lista) => lista.filter((o) => o.id === orcamento.id));
  return completo;
}

/** Atualiza um orçamento salvo: dados gerais + reconstrói os itens do
    zero (apaga os antigos e insere os novos) — mais simples e seguro do
    que tentar casar item a item quando o serviço selecionado mudou. */
export async function atualizarOrcamento(id: string, { leadId, dataEvento, convidados, itens }: NovoOrcamento): Promise<OrcamentoCompleto> {
  const valorTotal = itens.reduce((soma, item) => soma + item.quantidade * item.valor_unitario, 0);

  const { error: erroOrcamento } = await supabase.from('orcamentos').update({ lead_id: leadId, data_evento: dataEvento, convidados, valor_total: valorTotal }).eq('id', id);
  if (erroOrcamento) throw new Error(erroOrcamento.message);

  const { error: erroExcluirItens } = await supabase.from('orcamento_itens').delete().eq('orcamento_id', id);
  if (erroExcluirItens) throw new Error(erroExcluirItens.message);

  const { error: erroItens } = await supabase.from('orcamento_itens').insert(
    itens.map((item) => ({
      orcamento_id: id,
      servico_id: item.servico_id,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
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

/** Calcula o valor de um serviço pro orçamento: por convidado (com mínimo de
    100 pax, mesma regra do painel antigo) ou valor fixo. */
export function calcularValorServico(servico: Servico, convidados: number | null): number {
  if (servico.valor_por_convidado != null) {
    return servico.valor_por_convidado * Math.max(convidados ?? 0, 100);
  }
  return servico.valor_base;
}
