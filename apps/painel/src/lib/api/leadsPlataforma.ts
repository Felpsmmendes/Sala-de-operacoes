import { supabase } from '../supabase';
import type { EtapaLeadPlataforma, InteracaoLeadPlataforma, LeadPlataforma, TipoInteracaoLeadPlataforma } from '../types';

export async function listarLeadsPlataforma(): Promise<LeadPlataforma[]> {
  const { data, error } = await supabase.from('leads_plataforma').select('*').order('criado_em', { ascending: false });
  if (error) throw new Error(error.message);
  return data as LeadPlataforma[];
}

export type NovoLeadPlataforma = {
  nome_empresa: string;
  contato_nome: string | null;
  contato_telefone: string | null;
  contato_email: string | null;
  origem: string | null;
  plano_interesse: LeadPlataforma['plano_interesse'];
  valor_potencial: number | null;
  observacoes: string | null;
};

export async function criarLeadPlataforma(dados: NovoLeadPlataforma): Promise<LeadPlataforma> {
  const { data, error } = await supabase.from('leads_plataforma').insert(dados).select().single();
  if (error) throw new Error(error.message);
  return data as LeadPlataforma;
}

export async function atualizarLeadPlataforma(id: string, dados: Partial<NovoLeadPlataforma>): Promise<void> {
  const { error } = await supabase.from('leads_plataforma').update({ ...dados, atualizado_em: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function moverEtapaLeadPlataforma(id: string, etapa: EtapaLeadPlataforma): Promise<void> {
  const { error } = await supabase.from('leads_plataforma').update({ etapa, atualizado_em: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function excluirLeadPlataforma(id: string): Promise<void> {
  const { error } = await supabase.from('leads_plataforma').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function listarInteracoesLeadPlataforma(leadId: string): Promise<InteracaoLeadPlataforma[]> {
  const { data, error } = await supabase.from('leads_plataforma_interacoes').select('*').eq('lead_id', leadId).order('criado_em', { ascending: false });
  if (error) throw new Error(error.message);
  return data as InteracaoLeadPlataforma[];
}

export async function registrarInteracaoLeadPlataforma(leadId: string, tipo: TipoInteracaoLeadPlataforma, conteudo: string): Promise<void> {
  const { error } = await supabase.from('leads_plataforma_interacoes').insert({ lead_id: leadId, tipo, conteudo });
  if (error) throw new Error(error.message);
}

/** Últimas interações de qualquer lead (com o nome da empresa-alvo) — alimenta a tela de Atividades. */
export async function listarInteracoesRecentes(limite = 30): Promise<(InteracaoLeadPlataforma & { lead: { nome_empresa: string } | null })[]> {
  const { data, error } = await supabase.from('leads_plataforma_interacoes').select('*, lead:leads_plataforma(nome_empresa)').order('criado_em', { ascending: false }).limit(limite);
  if (error) throw new Error(error.message);
  return data as unknown as (InteracaoLeadPlataforma & { lead: { nome_empresa: string } | null })[];
}
