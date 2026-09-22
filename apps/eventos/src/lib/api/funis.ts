import { supabase } from '../supabase';
import type { FunilLead } from '../types';

/** Colunas do Pipeline de Leads — ver nota em `funis_lead` no schema. */

export async function listarFunis(): Promise<FunilLead[]> {
  const { data, error } = await supabase.from('funis_lead').select('*').order('ordem', { ascending: true });
  if (error) throw new Error(error.message);
  return data as FunilLead[];
}

function slugificar(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'funil';
}

export async function criarFunil(nome: string, cor: FunilLead['cor']): Promise<FunilLead> {
  const existentes = await listarFunis();
  const base = slugificar(nome);
  let id = base;
  let sufixo = 2;
  while (existentes.some((f) => f.id === id)) {
    id = `${base}_${sufixo}`;
    sufixo += 1;
  }
  const ordem = existentes.length > 0 ? Math.max(...existentes.map((f) => f.ordem)) + 1 : 0;
  const { data, error } = await supabase.from('funis_lead').insert({ id, nome, cor, ordem }).select().single();
  if (error) throw new Error(error.message);
  return data as FunilLead;
}

export async function atualizarFunil(id: string, dados: { nome?: string; cor?: FunilLead['cor'] }): Promise<FunilLead> {
  const { data, error } = await supabase.from('funis_lead').update(dados).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data as FunilLead;
}

/** Grava a nova ordem de todos os funis de uma vez (arrastar coluna). */
export async function reordenarFunis(idsNaOrdem: string[]): Promise<void> {
  await Promise.all(idsNaOrdem.map((id, ordem) => supabase.from('funis_lead').update({ ordem }).eq('id', id)));
}

export async function excluirFunil(id: string): Promise<void> {
  const { error } = await supabase.from('funis_lead').delete().eq('id', id);
  if (error) {
    // FK "on delete restrict": ainda tem lead usando esse funil.
    if (error.code === '23503') throw new Error('Existem leads nesse funil — mova-os antes de excluir.');
    throw new Error(error.message);
  }
}
