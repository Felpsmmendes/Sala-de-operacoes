import { supabase } from '../supabase';
import type { MembroEquipe, NovoMembroEquipe } from '../types';

export async function listarEquipe(): Promise<MembroEquipe[]> {
  const { data, error } = await supabase.from('equipe').select('*').eq('ativo', true).order('nome');
  if (error) throw new Error(error.message);
  return data as MembroEquipe[];
}

export async function criarMembro(dados: NovoMembroEquipe): Promise<MembroEquipe> {
  const { data, error } = await supabase.from('equipe').insert(dados).select().single();
  if (error) throw new Error(error.message);
  return data as MembroEquipe;
}

export async function inativarMembro(id: string): Promise<void> {
  const { error } = await supabase.from('equipe').update({ ativo: false }).eq('id', id);
  if (error) throw new Error(error.message);
}
