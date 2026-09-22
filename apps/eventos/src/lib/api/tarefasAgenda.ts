import { supabase } from '../supabase';
import { registrarInteracao } from './leads';
import { formatarData } from '../status';
import type { NovaTarefaAgenda, TarefaComLead } from '../types';

export async function listarTarefas(): Promise<TarefaComLead[]> {
  const { data, error } = await supabase.from('tarefas_agenda').select('*, lead:leads(id,nome)').order('data').order('horario');
  if (error) throw new Error(error.message);
  return data as unknown as TarefaComLead[];
}

/** Cria a tarefa e, se ligada a um lead, já registra sozinho no histórico
    de conversa dele (`lead_interacoes`) — pra quem olha o CRM depois ver
    que já tem uma degustação (ou outro compromisso) marcada, sem
    precisar checar a Agenda também. */
export async function criarTarefa(dados: NovaTarefaAgenda): Promise<TarefaComLead> {
  const { data, error } = await supabase
    .from('tarefas_agenda')
    .insert({ titulo: dados.titulo, data: dados.data, horario: dados.horario, observacoes: dados.observacoes, lead_id: dados.leadId })
    .select('*, lead:leads(id,nome)')
    .single();
  if (error) throw new Error(error.message);

  if (dados.leadId) {
    const quando = dados.horario ? `${formatarData(dados.data)} às ${dados.horario.slice(0, 5)}` : formatarData(dados.data);
    await registrarInteracao(dados.leadId, 'reuniao', `${dados.titulo} — agendado para ${quando}`).catch(() => {});
  }

  return data as unknown as TarefaComLead;
}

export async function marcarTarefaConcluida(id: string, concluida: boolean): Promise<void> {
  const { error } = await supabase.from('tarefas_agenda').update({ concluida }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function excluirTarefa(id: string): Promise<void> {
  const { error } = await supabase.from('tarefas_agenda').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
