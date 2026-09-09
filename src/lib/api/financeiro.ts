import { supabase } from '../supabase';
import type { DreMes, Lancamento, NovoLancamento, StatusLancamento, TipoLancamento } from '../types';

export async function listarLancamentos(): Promise<Lancamento[]> {
  const { data, error } = await supabase.from('lancamentos_financeiros').select('*').order('criado_em', { ascending: false });
  if (error) throw new Error(error.message);
  return data as Lancamento[];
}

export async function criarLancamento(dados: NovoLancamento): Promise<void> {
  const { error } = await supabase.from('lancamentos_financeiros').insert({
    tipo: dados.tipo,
    evento_id: dados.eventoId,
    descricao: dados.descricao,
    valor: dados.valor,
    vencimento: dados.vencimento,
    observacoes: dados.observacoes,
  });
  if (error) throw new Error(error.message);
}

export async function atualizarStatusLancamento(id: string, status: StatusLancamento): Promise<void> {
  const { error } = await supabase
    .from('lancamentos_financeiros')
    .update({ status, data_pagamento: status === 'pago' ? new Date().toISOString().slice(0, 10) : null })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function excluirLancamento(id: string): Promise<void> {
  const { error } = await supabase.from('lancamentos_financeiros').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function listarDreMensal(): Promise<DreMes[]> {
  const { data, error } = await supabase.from('dre_mensal').select('*');
  if (error) throw new Error(error.message);
  return data as DreMes[];
}

/**
 * Ponte genérica <módulo> → Finanças: outros módulos (Contratos, Escala,
 * Logística, Estoque) chamam isso pra gerar/atualizar/remover sozinho o
 * lançamento que corresponde a uma ação de negócio já registrada em outro
 * lugar — pra não duplicar trabalho de digitar de novo (e pro
 * Fechamento/DRE refletir a realidade sem passo manual). Nunca cria
 * duplicata: procura primeiro por evento_id + prefixo da descrição
 * (cada prefixo só tem 1 lançamento vivo por evento).
 *
 * `ativar: false` remove o lançamento (a ação de origem foi desfeita —
 * ex.: desmarcou pagamento, removeu escala).
 */
/** Escapa os curingas do LIKE/ILIKE (`%`, `_`, e o próprio escape `\`) —
    sem isso, um prefixo com `%`/`_` de verdade (ex.: "Sinal (20%)") vira
    curinga sem querer no filtro abaixo. Funcionava até aqui só por
    coincidência de como o Postgres interpretava esse `%` literal. */
function escaparCuringasLike(texto: string): string {
  return texto.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export async function sincronizarLancamento(params: {
  eventoId: string | null;
  prefixo: string;
  descricao: string;
  valor: number;
  tipo: TipoLancamento;
  status: StatusLancamento;
  ativar: boolean;
}): Promise<void> {
  let query = supabase.from('lancamentos_financeiros').select('id').ilike('descricao', `${escaparCuringasLike(params.prefixo)}%`).limit(1);
  query = params.eventoId ? query.eq('evento_id', params.eventoId) : query.is('evento_id', null);
  const { data: existentes, error: erroBusca } = await query;
  if (erroBusca) throw new Error(erroBusca.message);
  const existente = existentes?.[0];

  if (!params.ativar) {
    if (existente) {
      const { error } = await supabase.from('lancamentos_financeiros').delete().eq('id', existente.id);
      if (error) throw new Error(error.message);
    }
    return;
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const dataPagamento = params.status === 'pago' ? hoje : null;
  if (existente) {
    const { error } = await supabase.from('lancamentos_financeiros').update({ valor: params.valor, descricao: params.descricao, status: params.status, data_pagamento: dataPagamento }).eq('id', existente.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('lancamentos_financeiros')
      .insert({ tipo: params.tipo, evento_id: params.eventoId, descricao: params.descricao, valor: params.valor, status: params.status, data_pagamento: dataPagamento });
    if (error) throw new Error(error.message);
  }
}
