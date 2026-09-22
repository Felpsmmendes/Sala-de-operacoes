import { supabase } from '../supabase';
import type { NovaRegiaoFrete, RegiaoFrete } from '../types';

export async function listarRegioesFrete(): Promise<RegiaoFrete[]> {
  const { data, error } = await supabase.from('regioes_frete').select('*').order('nome');
  if (error) throw new Error(error.message);
  return data as RegiaoFrete[];
}

export async function criarRegiaoFrete(dados: NovaRegiaoFrete): Promise<RegiaoFrete> {
  const { data, error } = await supabase.from('regioes_frete').insert(dados).select().single();
  if (error) throw new Error(error.message);
  return data as RegiaoFrete;
}

export async function excluirRegiaoFrete(id: string): Promise<void> {
  const { error } = await supabase.from('regioes_frete').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
