import { supabase } from '../supabase';
import type { BloqueioAgenda, NovoBloqueioAgenda } from '../types';

export async function listarBloqueios(): Promise<BloqueioAgenda[]> {
  const { data, error } = await supabase.from('bloqueios_agenda').select('*').order('data_inicio');
  if (error) throw new Error(error.message);
  return data as BloqueioAgenda[];
}

export async function criarBloqueio(dados: NovoBloqueioAgenda): Promise<BloqueioAgenda> {
  const { data, error } = await supabase
    .from('bloqueios_agenda')
    .insert({ categoria: dados.categoria, observacao: dados.observacao, data_inicio: dados.dataInicio, data_fim: dados.dataFim })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as BloqueioAgenda;
}

export async function excluirBloqueio(id: string): Promise<void> {
  const { error } = await supabase.from('bloqueios_agenda').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Primeiro bloqueio que cobre essa data, se houver — usado em Contratos
    (pedido do usuário) pra avisar (nunca bloquear) na hora de gerar um
    contrato numa data já reservada por outro motivo. Comparação de string
    funciona direto porque são datas ISO (YYYY-MM-DD), que ordenam igual
    a comparação lexicográfica. */
export function bloqueioNaData(bloqueios: BloqueioAgenda[], data: string): BloqueioAgenda | null {
  return bloqueios.find((b) => data >= b.data_inicio && data <= b.data_fim) ?? null;
}
