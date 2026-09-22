import { supabase } from '../supabase';
import type { EventoComLead, StatusEvento } from '../types';

export async function listarEventos(): Promise<EventoComLead[]> {
  const { data, error } = await supabase
    .from('eventos')
    .select('*, contrato:contratos(id,orcamento_id,lead:leads(id,nome,telefone))')
    .order('data_evento', { ascending: true });
  if (error) throw new Error(error.message);
  return data as unknown as EventoComLead[];
}

export async function atualizarStatusEvento(id: string, status: StatusEvento): Promise<void> {
  const { error } = await supabase.from('eventos').update({ status, atualizado_em: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}
