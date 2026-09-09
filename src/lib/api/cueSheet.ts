import { supabase } from '../supabase';
import { buscarContrato } from './contratos';
import { listarItensParaHorario } from './orcamentos';
import type { Contrato, CueSheetItem } from '../types';

export async function listarCuesDoEvento(eventoId: string): Promise<CueSheetItem[]> {
  // ordem cronológica de verdade (pedido do usuário, "Etapa 8") — `numero`
  // vira só um rótulo de criação, não dita mais a ordem da lista.
  const { data, error } = await supabase.from('cue_sheet_itens').select('*').eq('evento_id', eventoId).order('horario').order('numero');
  if (error) throw new Error(error.message);
  return data as CueSheetItem[];
}

export type NovoCue = { numero: number; horario: string; titulo: string; descricao: string | null };

export async function criarCue(eventoId: string, dados: NovoCue): Promise<void> {
  const { error } = await supabase.from('cue_sheet_itens').insert({ evento_id: eventoId, ...dados, origem: 'manual' });
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

type CueAutomaticoBase = { titulo: string; horario: string };

/** Roteiro base a partir dos horários preenchidos no contrato (pedido do
    usuário, "Etapa 8" — ver migration_021 pros campos de horário). Só
    entra o que estiver de fato preenchido; "início de atração" é um item
    por atração contratada com horário marcado (ver Contratos → horários). */
function calcularCuesAutomaticos(contrato: Contrato, atracoes: { nome: string; horario: string }[]): CueAutomaticoBase[] {
  const itens: CueAutomaticoBase[] = [];
  if (contrato.horario_chegada_convidados) itens.push({ titulo: 'Chegada dos convidados', horario: contrato.horario_chegada_convidados });
  if (contrato.horario_chegada_equipe) itens.push({ titulo: 'Chegada da equipe', horario: contrato.horario_chegada_equipe });
  if (contrato.horario_inicio_bar) itens.push({ titulo: 'Início do bar', horario: contrato.horario_inicio_bar });
  for (const a of atracoes) itens.push({ titulo: `Início de ${a.nome}`, horario: a.horario });
  if (contrato.horario_fim_servico) itens.push({ titulo: 'Fim do serviço', horario: contrato.horario_fim_servico });
  if (contrato.horario_saida_equipe) itens.push({ titulo: 'Saída da equipe', horario: contrato.horario_saida_equipe });
  return itens.sort((a, b) => a.horario.localeCompare(b.horario));
}

/** Sincroniza o roteiro automático deste evento com os horários atuais do
    contrato — chamado toda vez que o evento é selecionado no Roteiro do
    Evento. Casa por TÍTULO entre os cues já marcados `origem: 'automatico'`:
    já existe → só atualiza o horário (nunca mexe em concluído/descrição,
    nunca apaga); não existe ainda → cria um cue novo. Um horário que
    suma do contrato depois NÃO apaga o cue já gerado — exclusão continua
    sendo manual, igual pros cues criados à mão. */
export async function sincronizarCuesAutomaticos(eventoId: string, contratoId: string): Promise<void> {
  const contrato = await buscarContrato(contratoId);
  if (!contrato) return;

  const atracoesComHorario = contrato.orcamento_id
    ? (await listarItensParaHorario(contrato.orcamento_id))
        .filter((i) => i.categoria === 'atracao' && i.horario_inicio_atracao)
        .map((i) => ({ nome: i.nome, horario: i.horario_inicio_atracao as string }))
    : [];

  const esperados = calcularCuesAutomaticos(contrato, atracoesComHorario);
  if (esperados.length === 0) return;

  const { data: existentes, error: erroExistentes } = await supabase.from('cue_sheet_itens').select('id, numero, titulo, horario').eq('evento_id', eventoId).eq('origem', 'automatico');
  if (erroExistentes) throw new Error(erroExistentes.message);

  const { data: todosCues, error: erroTodos } = await supabase.from('cue_sheet_itens').select('numero').eq('evento_id', eventoId);
  if (erroTodos) throw new Error(erroTodos.message);
  let proximoNumero = (todosCues ?? []).reduce((max, c) => Math.max(max, c.numero), 0) + 1;

  const porTitulo = new Map((existentes ?? []).map((e) => [e.titulo, e]));

  for (const esperado of esperados) {
    const atual = porTitulo.get(esperado.titulo);
    if (!atual) {
      const { error } = await supabase.from('cue_sheet_itens').insert({ evento_id: eventoId, numero: proximoNumero++, horario: esperado.horario, titulo: esperado.titulo, origem: 'automatico' });
      if (error) throw new Error(error.message);
    } else if (atual.horario !== esperado.horario) {
      const { error } = await supabase.from('cue_sheet_itens').update({ horario: esperado.horario }).eq('id', atual.id);
      if (error) throw new Error(error.message);
    }
  }
}
