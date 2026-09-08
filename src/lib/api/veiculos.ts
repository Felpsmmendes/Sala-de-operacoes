import { supabase } from '../supabase';
import type { NovoVeiculo, Veiculo } from '../types';

export async function listarVeiculos(): Promise<Veiculo[]> {
  const { data, error } = await supabase.from('veiculos').select('*').order('nome');
  if (error) throw new Error(error.message);
  return data as Veiculo[];
}

export async function criarVeiculo(dados: NovoVeiculo): Promise<Veiculo> {
  const { data, error } = await supabase.from('veiculos').insert(dados).select().single();
  if (error) throw new Error(error.message);
  return data as Veiculo;
}

export async function excluirVeiculo(id: string): Promise<void> {
  const { error } = await supabase.from('veiculos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
