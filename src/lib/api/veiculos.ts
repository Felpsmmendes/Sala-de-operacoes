import { supabase } from '../supabase';
import type { AlocacaoVeiculo, NovoVeiculo, Veiculo } from '../types';

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

/** Alocação veículo↔evento (migration_035, REVIEW_DECISOES_V2 Parte 6/08
    — grid semanal + conflito de veículo). Lista tudo de uma vez (nunca
    por evento/veículo individual) — a tela de Logística já carrega
    eventos e veículos inteiros, então cruzar os ids localmente evita
    N+1 consulta. */
export async function listarAlocacoesVeiculo(): Promise<AlocacaoVeiculo[]> {
  const { data, error } = await supabase.from('evento_veiculos').select('*');
  if (error) throw new Error(error.message);
  return data as AlocacaoVeiculo[];
}

export async function alocarVeiculo(eventoId: string, veiculoId: string): Promise<void> {
  const { error } = await supabase.from('evento_veiculos').insert({ evento_id: eventoId, veiculo_id: veiculoId });
  if (error) throw new Error(error.message);
}

export async function desalocarVeiculo(eventoId: string, veiculoId: string): Promise<void> {
  const { error } = await supabase.from('evento_veiculos').delete().eq('evento_id', eventoId).eq('veiculo_id', veiculoId);
  if (error) throw new Error(error.message);
}
