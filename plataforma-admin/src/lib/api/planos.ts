import { supabase } from '../supabase';
import type { ModuloPlataforma, PlanoPlataforma } from '../types';

export async function listarPlanos(): Promise<PlanoPlataforma[]> {
  const { data, error } = await supabase.from('planos_plataforma').select('*').order('preco_mensal');
  if (error) throw new Error(error.message);
  return data as PlanoPlataforma[];
}

export async function atualizarPlano(chave: string, dados: { preco_mensal: number; modulos: ModuloPlataforma[] }): Promise<void> {
  const { error } = await supabase.from('planos_plataforma').update({ ...dados, atualizado_em: new Date().toISOString() }).eq('chave', chave);
  if (error) throw new Error(error.message);
}
