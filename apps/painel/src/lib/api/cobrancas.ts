import { supabase } from '../supabase';
import type { CobrancaComEmpresa, TipoCobranca } from '../types';

export async function listarCobrancas(): Promise<CobrancaComEmpresa[]> {
  const { data, error } = await supabase.from('cobrancas_plataforma').select('*, empresa:empresas(id,nome)').order('vencimento', { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as CobrancaComEmpresa[];
}

export type NovaCobranca = { empresa_id: string; descricao: string; tipo: TipoCobranca; valor: number; vencimento: string };

export async function criarCobranca(dados: NovaCobranca): Promise<void> {
  const { error } = await supabase.from('cobrancas_plataforma').insert(dados);
  if (error) throw new Error(error.message);
}

/** Baixa a cobrança. Também atualiza "último pagamento" da empresa — é o que a
    tela Empresas mostra — pra os dois nunca divergirem. */
export async function marcarCobrancaPaga(id: string, empresaId: string, pagoEm: string): Promise<void> {
  const { error } = await supabase.from('cobrancas_plataforma').update({ status: 'pago', pago_em: pagoEm }).eq('id', id);
  if (error) throw new Error(error.message);
  const { error: erroEmpresa } = await supabase.from('empresas').update({ ultimo_pagamento_em: pagoEm }).eq('id', empresaId);
  if (erroEmpresa) throw new Error(erroEmpresa.message);
}

export async function reabrirCobranca(id: string): Promise<void> {
  const { error } = await supabase.from('cobrancas_plataforma').update({ status: 'pendente', pago_em: null }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function cancelarCobranca(id: string): Promise<void> {
  const { error } = await supabase.from('cobrancas_plataforma').update({ status: 'cancelado', pago_em: null }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function excluirCobranca(id: string): Promise<void> {
  const { error } = await supabase.from('cobrancas_plataforma').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
