import { supabase } from '../supabase';
import type { Servico } from '../types';

export async function listarServicos(): Promise<Servico[]> {
  const { data, error } = await supabase.from('servicos').select('*').eq('ativo', true).order('categoria').order('valor_base');
  if (error) throw new Error(error.message);
  return data as Servico[];
}
