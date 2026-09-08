import { supabase } from '../supabase';
import type { AuditoriaPosEvento, DadosAuditoria } from '../types';

export async function listarAuditorias(): Promise<AuditoriaPosEvento[]> {
  const { data, error } = await supabase.from('auditoria_pos_evento').select('*');
  if (error) throw new Error(error.message);
  return data as AuditoriaPosEvento[];
}

export async function buscarAuditoriaDoEvento(eventoId: string): Promise<AuditoriaPosEvento | null> {
  const { data, error } = await supabase.from('auditoria_pos_evento').select('*').eq('evento_id', eventoId).maybeSingle();
  if (error) throw new Error(error.message);
  return data as AuditoriaPosEvento | null;
}

/** `evento_id` é unique em `auditoria_pos_evento` — upsert em vez de
    criar/atualizar separado, já que a tela sempre edita "a auditoria
    deste evento" (existente ou não). */
export async function salvarAuditoria(eventoId: string, dados: DadosAuditoria): Promise<void> {
  const { error } = await supabase.from('auditoria_pos_evento').upsert({ evento_id: eventoId, ...dados }, { onConflict: 'evento_id' });
  if (error) throw new Error(error.message);
}
