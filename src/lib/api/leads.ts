import { supabase } from '../supabase';
import type { Lead, LeadInteracao, NovoLead, StatusLead, TipoInteracao } from '../types';

export type FiltrosLead = { busca?: string; status?: StatusLead | '' };

export async function listarLeads(filtros: FiltrosLead = {}): Promise<Lead[]> {
  let query = supabase.from('leads').select('*').order('criado_em', { ascending: false });
  if (filtros.status) query = query.eq('status', filtros.status);
  if (filtros.busca) query = query.or(`nome.ilike.%${filtros.busca}%,telefone.ilike.%${filtros.busca}%,email.ilike.%${filtros.busca}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as Lead[];
}

export async function obterLead(id: string): Promise<Lead> {
  const { data, error } = await supabase.from('leads').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data as Lead;
}

export async function criarLead(dados: NovoLead): Promise<Lead> {
  const { data, error } = await supabase.from('leads').insert(dados).select().single();
  if (error) throw new Error(error.message);
  return data as Lead;
}

export async function atualizarLead(id: string, dados: Partial<NovoLead>): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .update({ ...dados, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Lead;
}

export async function excluirLead(id: string): Promise<void> {
  const { error } = await supabase.from('leads').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* -------------------- Canal de conversa/contato (histórico) -------------------- */

export async function listarInteracoesDoLead(leadId: string): Promise<LeadInteracao[]> {
  const { data, error } = await supabase.from('lead_interacoes').select('*').eq('lead_id', leadId).order('criado_em', { ascending: false });
  if (error) throw new Error(error.message);
  return data as LeadInteracao[];
}

export async function registrarInteracao(leadId: string, tipo: TipoInteracao, conteudo: string): Promise<void> {
  const { error } = await supabase.from('lead_interacoes').insert({ lead_id: leadId, tipo, conteudo });
  if (error) throw new Error(error.message);
}

/** Data da interação mais recente por lead, numa única consulta (evita
    1 chamada por lead) — usado pra achar quem está "esfriando" (Fase D
    do roadmap, 2026-09-11). Lead sem nenhuma linha aqui simplesmente não
    aparece no Map — quem chama decide o fallback (normalmente:
    `lead.criado_em`, é a única data de referência que sobra). */
export async function buscarUltimoContatoPorLead(leadIds: string[]): Promise<Map<string, string>> {
  if (leadIds.length === 0) return new Map();
  const { data, error } = await supabase.from('lead_interacoes').select('lead_id, criado_em').in('lead_id', leadIds);
  if (error) throw new Error(error.message);
  const mapa = new Map<string, string>();
  for (const linha of data ?? []) {
    const atual = mapa.get(linha.lead_id);
    if (!atual || linha.criado_em > atual) mapa.set(linha.lead_id, linha.criado_em);
  }
  return mapa;
}
