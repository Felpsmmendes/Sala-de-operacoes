import { supabase } from '../supabase';
import { sincronizarLancamento } from './financeiro';
import type { EscalaComMembro, StatusEscala } from '../types';

export async function listarEscalasDoEvento(eventoId: string): Promise<EscalaComMembro[]> {
  // `escalas` não tem coluna de data de criação — ordena pelo nome do membro
  // (via o embed) só pra ter uma ordem estável, não é um requisito real.
  const { data, error } = await supabase.from('escalas').select('*, membro:equipe(*)').eq('evento_id', eventoId);
  if (error) throw new Error(error.message);
  const escalas = data as unknown as EscalaComMembro[];
  return escalas.sort((a, b) => (a.membro?.nome ?? '').localeCompare(b.membro?.nome ?? ''));
}

/** Todas as escalas de vários eventos de uma vez — usado pra listar
    "um evento por caixa" na tela de Escala sem 1 query por evento. */
export async function listarEscalasDosEventos(eventoIds: string[]): Promise<EscalaComMembro[]> {
  if (eventoIds.length === 0) return [];
  const { data, error } = await supabase.from('escalas').select('*, membro:equipe(*)').in('evento_id', eventoIds);
  if (error) throw new Error(error.message);
  return (data as unknown as EscalaComMembro[]).sort((a, b) => (a.membro?.nome ?? '').localeCompare(b.membro?.nome ?? ''));
}

/** Sincroniza a despesa de diária em Finanças (pendente — vira pago só
    quando o gestor de fato pagar o freelancer). `escalas` tem
    `unique(evento_id, membro_id)`, então "Diária — <nome>" já é único
    por evento sozinho, sem precisar de mais nada no prefixo. */
async function sincronizarDespesaDiaria(eventoId: string, membroNome: string, diaria: number, ativar: boolean): Promise<void> {
  await sincronizarLancamento({
    eventoId,
    prefixo: `Diária — ${membroNome}`,
    descricao: `Diária — ${membroNome}`,
    valor: diaria,
    tipo: 'despesa',
    status: 'pendente',
    ativar,
  });
}

export async function convocarMembro(eventoId: string, membroId: string, diaria: number): Promise<void> {
  const { error } = await supabase.from('escalas').insert({ evento_id: eventoId, membro_id: membroId, diaria });
  if (error) throw new Error(error.message);

  const { data: membro } = await supabase.from('equipe').select('nome').eq('id', membroId).maybeSingle();
  await sincronizarDespesaDiaria(eventoId, membro?.nome ?? 'freelancer', diaria, true);
}

export async function atualizarStatusEscala(id: string, status: StatusEscala): Promise<void> {
  const { data: escala, error } = await supabase
    .from('escalas')
    .update({ status, confirmado_em: status === 'confirmado' ? new Date().toISOString() : null })
    .eq('id', id)
    .select('evento_id, diaria, membro:equipe(nome)')
    .single();
  if (error) throw new Error(error.message);

  // recusado = o freelancer não vem, sem custo; qualquer outro status
  // (convocado/confirmado) mantém a despesa pendente.
  const membroNome = (escala as unknown as { membro: { nome: string } | null }).membro?.nome ?? 'freelancer';
  await sincronizarDespesaDiaria(escala.evento_id, membroNome, escala.diaria, status !== 'recusado');
}

export async function atualizarChecklistEscala(id: string, campo: 'traje_ok' | 'epi_ok', valor: boolean): Promise<void> {
  // chave computada (`{ [campo]: valor }`) não dá pra tipar como update
  // exato (o client não sabe se é `traje_ok` ou `epi_ok` só olhando o
  // tipo de `campo`) — ramifica pelos dois literais em vez de perder a
  // checagem de nome de coluna com um cast solto.
  const patch = campo === 'traje_ok' ? { traje_ok: valor } : { epi_ok: valor };
  const { error } = await supabase.from('escalas').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function removerEscala(id: string): Promise<void> {
  const { data: escala } = await supabase.from('escalas').select('evento_id, membro:equipe(nome)').eq('id', id).maybeSingle();
  const { error } = await supabase.from('escalas').delete().eq('id', id);
  if (error) throw new Error(error.message);

  if (escala) {
    const membroNome = (escala as unknown as { membro: { nome: string } | null }).membro?.nome ?? 'freelancer';
    await sincronizarDespesaDiaria(escala.evento_id, membroNome, 0, false);
  }
}

/** Simulador de hora extra: diferença entre o horário real de encerramento e
    o previsto, em blocos de 30min, aplicada sobre um valor/hora informado.
    Regra do PRD: encerramento depois das 04:00 costuma virar hora extra —
    aqui é genérico (compara previsto x real), o horário de corte fica a
    critério de quem está calculando. */
export function calcularHoraExtra(horaFimPrevista: string, horaFimReal: string, valorHora: number): { minutosExtras: number; valorExtra: number } {
  const paraMinutos = (h: string) => {
    const [hh, mm] = h.split(':').map(Number);
    return hh * 60 + mm;
  };
  let diff = paraMinutos(horaFimReal) - paraMinutos(horaFimPrevista);
  if (diff < 0) diff += 24 * 60; // virou a madrugada
  const minutosExtras = Math.max(0, diff);
  const valorExtra = Math.round((minutosExtras / 60) * valorHora * 100) / 100;
  return { minutosExtras, valorExtra };
}
