import { supabase } from '../supabase';
import type { DisponibilidadeMembro, MembroEquipe, NovoMembroEquipe } from '../types';

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

/** Disponibilidade (2026-09-19, SPEC_CAMADA2 2D, ver migration_036) —
    janela [inicio, fim] (datas 'YYYY-MM-DD'), só as linhas que existem
    (dia sem linha = disponível, ver DisponibilidadeMembro). */
export async function listarDisponibilidade(membroId: string, inicio: string, fim: string): Promise<DisponibilidadeMembro[]> {
  const { data, error } = await supabase.from('disponibilidade_equipe').select('*').eq('membro_id', membroId).gte('data', inicio).lte('data', fim);
  if (error) throw new Error(error.message);
  return data as DisponibilidadeMembro[];
}

export async function salvarDisponibilidade(membroId: string, data: string, disponivel: boolean, observacao: string | null = null): Promise<void> {
  const { error } = await supabase.from('disponibilidade_equipe').upsert({ membro_id: membroId, data, disponivel, observacao }, { onConflict: 'membro_id,data' });
  if (error) throw new Error(error.message);
}
