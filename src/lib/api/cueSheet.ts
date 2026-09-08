import { supabase } from '../supabase';
import type { CueSheetItem } from '../types';

export async function listarCuesDoEvento(eventoId: string): Promise<CueSheetItem[]> {
  const { data, error } = await supabase.from('cue_sheet_itens').select('*').eq('evento_id', eventoId).order('numero');
  if (error) throw new Error(error.message);
  return data as CueSheetItem[];
}

export type NovoCue = { numero: number; horario: string; titulo: string; descricao: string | null };

export async function criarCue(eventoId: string, dados: NovoCue): Promise<void> {
  const { error } = await supabase.from('cue_sheet_itens').insert({ evento_id: eventoId, ...dados });
  if (error) throw new Error(error.message);
}

export async function marcarCueConcluido(id: string, concluido: boolean): Promise<void> {
  const { error } = await supabase
    .from('cue_sheet_itens')
    .update({ concluido, concluido_em: concluido ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function excluirCue(id: string): Promise<void> {
  const { error } = await supabase.from('cue_sheet_itens').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
